import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser, isOperator } from '@/lib/auth-helpers';
import { readDocumentBytes } from '@/lib/companion-document-storage';

// Auth-gated streaming for CompanionDocument files. Allowed:
//   - Operators (compliance review).
//   - The companion whose application owns this document (they
//     uploaded it, they can re-download it).
// Anyone else: 403.

export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const user = await getSessionUser();
  if (!user) return new NextResponse('Forbidden', { status: 403 });

  const doc = await prisma.companionDocument.findUnique({
    where: { id: params.id },
    select: {
      companionApplicationId: true,
      filename: true,
      contentType: true,
      application: {
        select: {
          companion: { select: { userId: true } },
        },
      },
    },
  });
  if (!doc) return new NextResponse('Not found', { status: 404 });

  let allowed = isOperator(user.role);
  if (!allowed) {
    // Companion ownership: the application has at most one Companion
    // (one-to-one). If the signed-in user is that Companion, allow.
    allowed = doc.application.companion?.userId === user.id;
  }
  if (!allowed) return new NextResponse('Forbidden', { status: 403 });

  let bytes: Buffer;
  try {
    bytes = await readDocumentBytes(doc.companionApplicationId, doc.filename);
  } catch (err) {
    console.error('[companion-documents] read failed', { id: params.id, err });
    return new NextResponse('Not found', { status: 404 });
  }

  return new NextResponse(new Uint8Array(bytes), {
    status: 200,
    headers: {
      'Content-Type': doc.contentType,
      'Content-Length': String(bytes.length),
      'Cache-Control': 'private, max-age=3600',
    },
  });
}
