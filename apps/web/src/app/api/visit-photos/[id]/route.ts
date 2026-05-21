import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth-helpers';
import { readPhotoBytes } from '@/lib/visit-photo-storage';

// Auth-gated photo streaming. v1: operators only. When the family
// portal lands (Phase 2) we will expand to allow a Family-Member user
// to fetch photos from visits in their own family.

const OPERATOR_ROLES = new Set([
  'operator_coordinator',
  'operator_safeguarding',
  'operator_finance',
  'operator_admin',
  'operator_read_only',
]);

export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const user = await getSessionUser();
  if (!user || !OPERATOR_ROLES.has(user.role)) {
    return new NextResponse('Forbidden', { status: 403 });
  }

  const photo = await prisma.postVisitReportPhoto.findUnique({
    where: { id: params.id },
    select: { postVisitReportId: true, filename: true, contentType: true },
  });
  if (!photo) return new NextResponse('Not found', { status: 404 });

  let bytes: Buffer;
  try {
    bytes = await readPhotoBytes(photo.postVisitReportId, photo.filename);
  } catch (err) {
    console.error('[visit-photos] read failed', { id: params.id, err });
    return new NextResponse('Not found', { status: 404 });
  }

  // Cast Buffer to Uint8Array to satisfy the BodyInit type. They share
  // the same underlying memory; no copy.
  return new NextResponse(new Uint8Array(bytes), {
    status: 200,
    headers: {
      'Content-Type': photo.contentType,
      'Content-Length': String(bytes.length),
      'Cache-Control': 'private, max-age=3600',
    },
  });
}
