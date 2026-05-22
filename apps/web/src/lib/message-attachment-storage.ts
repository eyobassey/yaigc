// M.1.2 - storage helpers for message attachments (files, photos,
// videos). S3 prefix is messaging/<threadId>/<filename> so an entire
// thread's blobs sit in one logical folder. Bucket is private; objects
// are streamed back through /api/message-attachments/[id]/route.ts
// after the same auth-gate that protects the thread itself.
//
// Validation policy per the M.1.2 scoping decision:
//   - images (jpeg, png, webp, heic):     10 MB
//   - documents (pdf, doc, docx, xls,
//     xlsx, ppt, pptx, txt, csv):         25 MB
//   - videos (mp4, mov, webm):           100 MB
// All sizes enforced server-side. Content-type is checked against the
// claimed Content-Type AND the magic bytes of the file head so a
// renamed .exe cannot sneak through as image/jpeg.
//
// Images are resized via sharp (max 2400px on the longer edge) to keep
// thread payloads sane. Per the M.1.2 scoping decision we deliberately
// KEEP EXIF metadata - the operator chose this trade-off (against my
// recommendation) on the basis that they want photos to round-trip
// untouched between operator and family/companion devices. See task
// #134 for the discussion.

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  NoSuchKey,
} from '@aws-sdk/client-s3';
import { randomBytes } from 'node:crypto';
import sharp from 'sharp';

const BUCKET = process.env.S3_BUCKET || 'igc-app-files-prod';
const REGION =
  process.env.S3_REGION || process.env.AWS_DEFAULT_REGION || 'eu-west-2';
const KEY_PREFIX = 'messaging';

const s3 = new S3Client({ region: REGION });

export type AttachmentKind = 'image' | 'document' | 'video';

interface TypeSpec {
  kind: AttachmentKind;
  ext: string;
  // First N bytes that must match to accept the file. `null` means we
  // skip magic-byte sniffing (e.g. text/csv).
  magic: number[] | null;
  // Offset where the magic bytes are expected. Most formats start at
  // 0; MP4/MOV use a 4-byte size prefix then 'ftyp' at offset 4.
  magicOffset?: number;
}

// Whitelist. Filename extension is server-generated from this map.
const TYPES: Record<string, TypeSpec> = {
  // Images
  'image/jpeg': { kind: 'image', ext: '.jpg', magic: [0xff, 0xd8, 0xff] },
  'image/png': {
    kind: 'image',
    ext: '.png',
    magic: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
  },
  'image/webp': { kind: 'image', ext: '.webp', magic: [0x52, 0x49, 0x46, 0x46] },
  'image/heic': { kind: 'image', ext: '.heic', magic: [0x66, 0x74, 0x79, 0x70], magicOffset: 4 },
  'image/heif': { kind: 'image', ext: '.heif', magic: [0x66, 0x74, 0x79, 0x70], magicOffset: 4 },
  // Documents
  'application/pdf': { kind: 'document', ext: '.pdf', magic: [0x25, 0x50, 0x44, 0x46] },
  'application/msword': { kind: 'document', ext: '.doc', magic: [0xd0, 0xcf, 0x11, 0xe0] },
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': {
    kind: 'document',
    ext: '.docx',
    magic: [0x50, 0x4b, 0x03, 0x04],
  },
  'application/vnd.ms-excel': { kind: 'document', ext: '.xls', magic: [0xd0, 0xcf, 0x11, 0xe0] },
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {
    kind: 'document',
    ext: '.xlsx',
    magic: [0x50, 0x4b, 0x03, 0x04],
  },
  'application/vnd.ms-powerpoint': {
    kind: 'document',
    ext: '.ppt',
    magic: [0xd0, 0xcf, 0x11, 0xe0],
  },
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': {
    kind: 'document',
    ext: '.pptx',
    magic: [0x50, 0x4b, 0x03, 0x04],
  },
  'text/plain': { kind: 'document', ext: '.txt', magic: null },
  'text/csv': { kind: 'document', ext: '.csv', magic: null },
  // Videos
  'video/mp4': {
    kind: 'video',
    ext: '.mp4',
    magic: [0x66, 0x74, 0x79, 0x70],
    magicOffset: 4,
  },
  'video/quicktime': {
    kind: 'video',
    ext: '.mov',
    magic: [0x66, 0x74, 0x79, 0x70],
    magicOffset: 4,
  },
  'video/webm': {
    kind: 'video',
    ext: '.webm',
    magic: [0x1a, 0x45, 0xdf, 0xa3],
  },
};

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export const MAX_DOCUMENT_BYTES = 25 * 1024 * 1024;
export const MAX_VIDEO_BYTES = 100 * 1024 * 1024;
export const MAX_ATTACHMENTS_PER_MESSAGE = 5;
export const MAX_TOTAL_BYTES_PER_MESSAGE = 100 * 1024 * 1024;
const IMAGE_MAX_EDGE = 2400;

export class AttachmentValidationError extends Error {}

export interface SavedAttachment {
  filename: string;
  contentType: string;
  sizeBytes: number;
  kind: AttachmentKind;
  width: number | null;
  height: number | null;
}

function keyFor(threadId: string, filename: string): string {
  if (!/^[a-z0-9]{20,40}$/i.test(threadId)) {
    throw new Error('Invalid thread id.');
  }
  if (!/^[a-z0-9]+\.[a-z0-9]{2,5}$/i.test(filename)) {
    throw new Error('Invalid filename.');
  }
  return `${KEY_PREFIX}/${threadId}/${filename}`;
}

function maxBytesFor(kind: AttachmentKind): number {
  switch (kind) {
    case 'image':
      return MAX_IMAGE_BYTES;
    case 'document':
      return MAX_DOCUMENT_BYTES;
    case 'video':
      return MAX_VIDEO_BYTES;
  }
}

function magicMatches(buf: Buffer, spec: TypeSpec): boolean {
  if (!spec.magic) return true;
  const offset = spec.magicOffset ?? 0;
  if (buf.length < offset + spec.magic.length) return false;
  for (let i = 0; i < spec.magic.length; i++) {
    if (buf[offset + i] !== spec.magic[i]) return false;
  }
  return true;
}

export async function saveAttachment(
  threadId: string,
  file: File,
): Promise<SavedAttachment> {
  if (!/^[a-z0-9]{20,40}$/i.test(threadId)) {
    throw new AttachmentValidationError('Invalid thread id.');
  }
  const spec = TYPES[file.type];
  if (!spec) {
    throw new AttachmentValidationError(
      `Unsupported file type ${file.type || '(unknown)'}.`,
    );
  }
  if (file.size <= 0) {
    throw new AttachmentValidationError('Empty file.');
  }
  const limit = maxBytesFor(spec.kind);
  if (file.size > limit) {
    throw new AttachmentValidationError(
      `${spec.kind} too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Max ${(
        limit / 1024 / 1024
      ).toFixed(0)}MB.`,
    );
  }

  let buffer = Buffer.from(await file.arrayBuffer());

  // Magic-byte sniff against the claimed Content-Type. Trust nothing
  // the browser hands us.
  if (!magicMatches(buffer, spec)) {
    throw new AttachmentValidationError(
      `File contents do not match the declared type (${file.type}).`,
    );
  }

  let width: number | null = null;
  let height: number | null = null;
  let outContentType = file.type;
  let outExt = spec.ext;

  // Image resize. HEIC/HEIF transcode to JPEG because browsers can't
  // render HEIC inline - we prefer the universal format for inline
  // chat. Other images stay in their original format but get resized
  // if they exceed the max edge.
  if (spec.kind === 'image') {
    try {
      // withMetadata() preserves EXIF (orientation, GPS, device). Per
      // the M.1.2 decision we keep EXIF intentionally.
      let pipeline = sharp(buffer, { failOn: 'none' }).rotate().withMetadata();
      const meta = await sharp(buffer, { failOn: 'none' }).metadata();
      const w = meta.width ?? 0;
      const h = meta.height ?? 0;
      const longer = Math.max(w, h);
      if (longer > IMAGE_MAX_EDGE) {
        pipeline = pipeline.resize({
          width: w >= h ? IMAGE_MAX_EDGE : undefined,
          height: h > w ? IMAGE_MAX_EDGE : undefined,
          fit: 'inside',
          withoutEnlargement: true,
        });
      }
      if (file.type === 'image/heic' || file.type === 'image/heif') {
        pipeline = pipeline.jpeg({ quality: 88 });
        outContentType = 'image/jpeg';
        outExt = '.jpg';
      }
      const processed = await pipeline.toBuffer({ resolveWithObject: true });
      buffer = Buffer.from(processed.data);
      width = processed.info.width;
      height = processed.info.height;
    } catch (err) {
      console.error('[messaging-attachments] sharp failed', { err });
      throw new AttachmentValidationError(
        'Could not process this image; try a different file.',
      );
    }
  }

  const filename = `${randomBytes(12).toString('hex')}${outExt}`;
  const key = keyFor(threadId, filename);

  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: buffer,
      ContentType: outContentType,
      ACL: 'private',
    }),
  );

  return {
    filename,
    contentType: outContentType,
    sizeBytes: buffer.length,
    kind: spec.kind,
    width,
    height,
  };
}

export async function readAttachmentBytes(
  threadId: string,
  filename: string,
): Promise<Buffer> {
  const key = keyFor(threadId, filename);
  try {
    const r = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
    if (!r.Body) throw new Error('S3 returned empty body.');
    const chunks: Buffer[] = [];
    for await (const chunk of r.Body as AsyncIterable<Uint8Array>) {
      chunks.push(Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  } catch (err) {
    if (err instanceof NoSuchKey) {
      throw new Error(`Attachment not found: ${key}`);
    }
    throw err;
  }
}

export async function deleteAttachmentFile(
  threadId: string,
  filename: string,
): Promise<void> {
  const key = keyFor(threadId, filename);
  try {
    await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
  } catch (err) {
    console.error('[messaging-attachments] delete failed', { key, err });
  }
}

export function attachmentKindForContentType(
  contentType: string,
): AttachmentKind | null {
  return TYPES[contentType]?.kind ?? null;
}
