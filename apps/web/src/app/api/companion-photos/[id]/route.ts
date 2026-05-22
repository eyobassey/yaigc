import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser, isOperator } from '@/lib/auth-helpers';
import { readProfilePhotoBytes } from '@/lib/companion-photo-storage';

// Auth-gated profile photo streaming. Allowed:
//   - Operators (always)
//   - The companion themselves
//   - Any FamilyMember of a family that has a current or proposed
//     Match against this companion. Pre-acceptance OK because the
//     family portal renders the photo on the proposed-match detail
//     page.
// id param is the Companion.id.

export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const user = await getSessionUser();
  if (!user) return new NextResponse('Forbidden', { status: 403 });

  if (!/^[a-z0-9]{20,40}$/i.test(params.id)) {
    return new NextResponse('Not found', { status: 404 });
  }

  const companion = await prisma.companion.findUnique({
    where: { id: params.id },
    select: { id: true, userId: true, photoFilename: true },
  });
  if (!companion || !companion.photoFilename) {
    return new NextResponse('Not found', { status: 404 });
  }

  let allowed = isOperator(user.role);
  if (!allowed && companion.userId === user.id) allowed = true;
  if (!allowed) {
    // Family member with a current or proposed Match against this
    // companion. Single round trip covers the subscriptions + matches
    // disjunction.
    const familyAccess = await prisma.familyMember.findFirst({
      where: {
        userId: user.id,
        deletedAt: null,
        family: {
          OR: [
            {
              subscriptions: {
                some: {
                  companionId: companion.id,
                  status: { in: ['active', 'paused'] },
                },
              },
            },
            {
              matches: {
                some: {
                  candidateCompanionId: companion.id,
                  status: { in: ['proposed', 'accepted'] },
                },
              },
            },
          ],
        },
      },
      select: { id: true },
    });
    allowed = Boolean(familyAccess);
  }
  if (!allowed) return new NextResponse('Forbidden', { status: 403 });

  let bytes: Buffer;
  let contentType: string;
  try {
    const r = await readProfilePhotoBytes(companion.id, companion.photoFilename);
    bytes = r.bytes;
    contentType = r.contentType;
  } catch (err) {
    console.error('[companion-photos] read failed', { id: params.id, err });
    return new NextResponse('Not found', { status: 404 });
  }

  return new NextResponse(new Uint8Array(bytes), {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'Content-Length': String(bytes.length),
      'Cache-Control': 'private, max-age=3600',
    },
  });
}
