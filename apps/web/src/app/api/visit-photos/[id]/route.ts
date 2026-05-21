import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser, isOperator } from '@/lib/auth-helpers';
import { readPhotoBytes } from '@/lib/visit-photo-storage';

// Auth-gated photo streaming. Two paths in:
//   - Operators always allowed (safeguarding triage trumps consent).
//   - Family members of the visit's family allowed, but only when the
//     recipient consented to report sharing - matches the rule we use
//     for the post-visit-report family email.

export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const user = await getSessionUser();
  if (!user) return new NextResponse('Forbidden', { status: 403 });

  // Single query gathers everything we need for the auth decision.
  const photo = await prisma.postVisitReportPhoto.findUnique({
    where: { id: params.id },
    select: {
      postVisitReportId: true,
      filename: true,
      contentType: true,
      report: {
        select: {
          visit: {
            select: {
              familyId: true,
              recipient: { select: { consentToReportSharing: true } },
            },
          },
        },
      },
    },
  });
  if (!photo) return new NextResponse('Not found', { status: 404 });

  let allowed = isOperator(user.role);
  if (!allowed) {
    if (!photo.report.visit.recipient.consentToReportSharing) {
      // Family member without consent - same as 'not found' from their
      // perspective; do not leak the existence of the photo.
      return new NextResponse('Not found', { status: 404 });
    }
    const fm = await prisma.familyMember.findFirst({
      where: {
        userId: user.id,
        familyId: photo.report.visit.familyId,
        deletedAt: null,
      },
      select: { id: true },
    });
    allowed = Boolean(fm);
  }
  if (!allowed) return new NextResponse('Forbidden', { status: 403 });

  let bytes: Buffer;
  try {
    bytes = await readPhotoBytes(photo.postVisitReportId, photo.filename);
  } catch (err) {
    console.error('[visit-photos] read failed', { id: params.id, err });
    return new NextResponse('Not found', { status: 404 });
  }

  return new NextResponse(new Uint8Array(bytes), {
    status: 200,
    headers: {
      'Content-Type': photo.contentType,
      'Content-Length': String(bytes.length),
      'Cache-Control': 'private, max-age=3600',
    },
  });
}
