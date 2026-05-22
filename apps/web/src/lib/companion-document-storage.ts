// S3 storage for compliance documents on a CompanionApplication.
// Mirrors visit-photo-storage.ts but with a wider file-type whitelist
// (PDF in addition to JPEG/PNG, since gov.uk share-code documents are
// PDFs) and a longer per-file size budget.
//
// Files live under s3://igc-app-files-prod/companion-documents/
// <applicationId>/<filename>. The bucket is private; the
// /api/companion-documents/[id] route auth-gates each fetch.

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
const KEY_PREFIX = 'companion-documents';

const s3 = new S3Client({ region: REGION });

const ALLOWED_TYPES: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'application/pdf': '.pdf',
};

export const MAX_DOCS_PER_APPLICATION = 8;
export const MAX_BYTES_PER_DOC = 10 * 1024 * 1024; // 10MB

export class DocumentValidationError extends Error {}

export interface SavedDocument {
  filename: string;
  contentType: string;
  sizeBytes: number;
}

function keyFor(applicationId: string, filename: string): string {
  if (!/^[a-z0-9]{20,40}$/i.test(applicationId)) {
    throw new Error('Invalid application id.');
  }
  if (!/^[a-z0-9]+\.(jpg|png|pdf)$/i.test(filename)) {
    throw new Error('Invalid filename.');
  }
  return `${KEY_PREFIX}/${applicationId}/${filename}`;
}

export async function saveDocument(
  applicationId: string,
  file: File,
): Promise<SavedDocument> {
  if (!/^[a-z0-9]{20,40}$/i.test(applicationId)) {
    throw new DocumentValidationError('Invalid application id.');
  }
  const ext = ALLOWED_TYPES[file.type];
  if (!ext) {
    throw new DocumentValidationError(
      `Unsupported file type ${file.type}. Use PDF, JPEG or PNG.`,
    );
  }
  if (file.size <= 0) {
    throw new DocumentValidationError('Empty file.');
  }
  if (file.size > MAX_BYTES_PER_DOC) {
    throw new DocumentValidationError(
      `Document too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Max 10MB.`,
    );
  }

  const filename = `${randomBytes(12).toString('hex')}${ext}`;
  const key = keyFor(applicationId, filename);
  const buffer = Buffer.from(await file.arrayBuffer());

  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: buffer,
      ContentType: file.type,
      ACL: 'private',
    }),
  );

  return { filename, contentType: file.type, sizeBytes: file.size };
}

export async function readDocumentBytes(
  applicationId: string,
  filename: string,
): Promise<Buffer> {
  const key = keyFor(applicationId, filename);
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
      throw new Error(`Document not found: ${key}`);
    }
    throw err;
  }
}

export async function deleteDocumentFile(
  applicationId: string,
  filename: string,
): Promise<void> {
  const key = keyFor(applicationId, filename);
  try {
    await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
  } catch (err) {
    console.error('[s3] companion-document delete failed', { key, err });
  }
}
