// Server-only helpers for reading/writing post-visit report photos on
// disk. Files live outside the Next.js public/ tree at
// /home/username/igc-platform/uploads/post-visit-reports/<reportId>/. The API
// route at /api/visit-photos/[id] auth-checks the operator session
// before streaming the bytes back.

import { mkdir, writeFile, readFile, unlink } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import path from 'node:path';

const UPLOADS_ROOT = path.resolve(
  process.cwd(),
  '..',
  '..',
  'uploads',
  'post-visit-reports',
);

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
  absPath: string;
}

/**
 * Validate + persist a single uploaded File to the report's directory.
 * Throws PhotoValidationError for any client-fixable problem.
 */
export async function savePhoto(
  reportId: string,
  file: File,
): Promise<SavedPhoto> {
  // Defensive: cuid format - no path traversal.
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

  const dir = path.join(UPLOADS_ROOT, reportId);
  await mkdir(dir, { recursive: true, mode: 0o750 });

  const filename = `${randomBytes(12).toString('hex')}${ext}`;
  const absPath = path.join(dir, filename);

  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(absPath, buffer, { mode: 0o640 });

  return { filename, contentType: file.type, sizeBytes: file.size, absPath };
}

export function photoPath(reportId: string, filename: string): string {
  if (!/^[a-z0-9]{20,40}$/i.test(reportId)) {
    throw new Error('Invalid report id.');
  }
  if (!/^[a-z0-9]+\.(jpg|png)$/i.test(filename)) {
    throw new Error('Invalid filename.');
  }
  return path.join(UPLOADS_ROOT, reportId, filename);
}

export async function readPhotoBytes(
  reportId: string,
  filename: string,
): Promise<Buffer> {
  return readFile(photoPath(reportId, filename));
}

export async function deletePhotoFile(
  reportId: string,
  filename: string,
): Promise<void> {
  try {
    await unlink(photoPath(reportId, filename));
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err;
  }
}
