// S3 storage for companion profile photos. Bucket is private; the
// /api/companion-photos/[id] route auth-gates each fetch (operator,
// the companion themselves, or any family-member with a current or
// proposed Match against this companion).

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
const KEY_PREFIX = 'companion-profiles';

const s3 = new S3Client({ region: REGION });

const ALLOWED_TYPES: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
};

export const MAX_BYTES_PER_PROFILE_PHOTO = 5 * 1024 * 1024;

export class ProfilePhotoValidationError extends Error {}

export interface SavedProfilePhoto {
  filename: string;
  contentType: string;
  sizeBytes: number;
}

function keyFor(companionId: string, filename: string): string {
  if (!/^[a-z0-9]{20,40}$/i.test(companionId)) {
    throw new Error('Invalid companion id.');
  }
  if (!/^[a-z0-9]+\.(jpg|png)$/i.test(filename)) {
    throw new Error('Invalid filename.');
  }
  return `${KEY_PREFIX}/${companionId}/${filename}`;
}

export async function saveProfilePhoto(
  companionId: string,
  file: File,
): Promise<SavedProfilePhoto> {
  if (!/^[a-z0-9]{20,40}$/i.test(companionId)) {
    throw new ProfilePhotoValidationError('Invalid companion id.');
  }
  const ext = ALLOWED_TYPES[file.type];
  if (!ext) {
    throw new ProfilePhotoValidationError(
      `Unsupported image type ${file.type}. Use JPEG or PNG.`,
    );
  }
  if (file.size <= 0) {
    throw new ProfilePhotoValidationError('Empty file.');
  }
  if (file.size > MAX_BYTES_PER_PROFILE_PHOTO) {
    throw new ProfilePhotoValidationError(
      `Photo too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Max 5MB.`,
    );
  }

  const filename = `${randomBytes(12).toString('hex')}${ext}`;
  const key = keyFor(companionId, filename);
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

export async function readProfilePhotoBytes(
  companionId: string,
  filename: string,
): Promise<{ bytes: Buffer; contentType: string }> {
  const key = keyFor(companionId, filename);
  try {
    const r = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
    if (!r.Body) throw new Error('S3 returned empty body.');
    const chunks: Buffer[] = [];
    for await (const chunk of r.Body as AsyncIterable<Uint8Array>) {
      chunks.push(Buffer.from(chunk));
    }
    return {
      bytes: Buffer.concat(chunks),
      contentType: r.ContentType ?? 'application/octet-stream',
    };
  } catch (err) {
    if (err instanceof NoSuchKey) {
      throw new Error(`Profile photo not found: ${key}`);
    }
    throw err;
  }
}

export async function deleteProfilePhoto(
  companionId: string,
  filename: string,
): Promise<void> {
  const key = keyFor(companionId, filename);
  try {
    await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
  } catch (err) {
    console.error('[s3] companion-profile delete failed', { key, err });
  }
}
