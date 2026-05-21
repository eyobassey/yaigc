// Server-only helpers for reading/writing post-visit report photos to
// S3 (s3://igc-app-files-prod). Files are stored under
// post-visit-reports/<reportId>/<filename> matching the prior on-disk
// layout. Bucket is private; objects are never publicly readable. The
// API route at /api/visit-photos/[id] auth-checks the operator session
// and streams bytes back.
//
// AWS credentials picked up from AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY
// in the env file (PM2 passes them through via --env-file=).

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  NoSuchKey,
} from '@aws-sdk/client-s3';
import { randomBytes } from 'node:crypto';

const BUCKET = process.env.S3_BUCKET || 'igc-app-files-prod';
const REGION =
  process.env.S3_REGION || process.env.AWS_DEFAULT_REGION || 'eu-west-2';
const KEY_PREFIX = 'post-visit-reports';

const s3 = new S3Client({ region: REGION });

const ALLOWED_TYPES: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
};

export const MAX_PHOTOS_PER_REPORT = 4;
export const MAX_BYTES_PER_PHOTO = 5 * 1024 * 1024;

export class PhotoValidationError extends Error {}

export interface SavedPhoto {
  filename: string;
  contentType: string;
  sizeBytes: number;
}

function keyFor(reportId: string, filename: string): string {
  // Defensive: cuid format on reportId, server-generated filename
  // format on the file. Both feed directly into the S3 key so
  // tightening these prevents anything weird ending up in the bucket.
  if (!/^[a-z0-9]{20,40}$/i.test(reportId)) {
    throw new Error('Invalid report id.');
  }
  if (!/^[a-z0-9]+\.(jpg|png)$/i.test(filename)) {
    throw new Error('Invalid filename.');
  }
  return `${KEY_PREFIX}/${reportId}/${filename}`;
}

export async function savePhoto(
  reportId: string,
  file: File,
): Promise<SavedPhoto> {
  if (!/^[a-z0-9]{20,40}$/i.test(reportId)) {
    throw new PhotoValidationError('Invalid report id.');
  }
  const ext = ALLOWED_TYPES[file.type];
  if (!ext) {
    throw new PhotoValidationError(
      `Unsupported image type ${file.type}. Use JPEG or PNG.`,
    );
  }
  if (file.size <= 0) {
    throw new PhotoValidationError('Empty file.');
  }
  if (file.size > MAX_BYTES_PER_PHOTO) {
    throw new PhotoValidationError(
      `Photo too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Max 5MB.`,
    );
  }

  const filename = `${randomBytes(12).toString('hex')}${ext}`;
  const key = keyFor(reportId, filename);
  const buffer = Buffer.from(await file.arrayBuffer());

  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: buffer,
      ContentType: file.type,
      // Defensive: we never want these objects publicly readable.
      // ACLs are off on the bucket so this is redundant with the
      // bucket policy, but explicit is fine.
      ACL: 'private',
    }),
  );

  return { filename, contentType: file.type, sizeBytes: file.size };
}

export async function readPhotoBytes(
  reportId: string,
  filename: string,
): Promise<Buffer> {
  const key = keyFor(reportId, filename);
  try {
    const r = await s3.send(
      new GetObjectCommand({ Bucket: BUCKET, Key: key }),
    );
    if (!r.Body) throw new Error('S3 returned empty body.');
    // Body is a Readable stream in Node. Buffer it - photos are <=5MB
    // and we are auth-streaming through Next.js, not piping to client
    // directly, so the simple Buffer path is fine.
    const chunks: Buffer[] = [];
    for await (const chunk of r.Body as AsyncIterable<Uint8Array>) {
      chunks.push(Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  } catch (err) {
    if (err instanceof NoSuchKey) {
      throw new Error(`Photo not found: ${key}`);
    }
    throw err;
  }
}

export async function deletePhotoFile(
  reportId: string,
  filename: string,
): Promise<void> {
  const key = keyFor(reportId, filename);
  try {
    await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
  } catch (err) {
    // S3 DeleteObject returns 204 even for non-existent keys, so a
    // real error here is something other than "not found" - log and
    // continue rather than crashing the form action.
    console.error('[s3] delete failed', { key, err });
  }
}
