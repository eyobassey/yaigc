// Single source of truth for "where do I render this companion's
// photo from?". The new S3-backed flow lives at
// /api/companion-photos/<id> (auth-gated). Legacy data may still have
// a non-null photoUrl from before C.6; honour that as a fallback.

export interface PhotoSourceCompanion {
  id: string;
  photoFilename?: string | null;
  photoUrl?: string | null;
}

export function companionPhotoSrc(c: PhotoSourceCompanion): string | null {
  if (c.photoFilename) return `/api/companion-photos/${c.id}`;
  if (c.photoUrl) return c.photoUrl;
  return null;
}
