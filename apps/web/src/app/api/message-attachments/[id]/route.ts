// GET /api/message-attachments/[id]
//
// Auth-gated streaming of an attachment to a thread participant. The
// route looks up the attachment, walks back to its parent Thread,
// and confirms the caller is either the thread's operator or the
// thread's named party. Operators are not granted blanket access
// here - only operators who are participants in this specific thread
// can read (so an operator who is not the assigned operator on a
// thread does not get to see private attachments).

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { audit } from '@/lib/audit';
import { getSessionUser, isOperator } from '@/lib/auth-helpers';
import { readAttachmentBytes } from '@/lib/message-attachment-storage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  req: Request,
  { params }: { params: { id: string } },
) {
  const user = await getSessionUser();
  if (!user) return new NextResponse('Forbidden', { status: 403 });

  const att = await prisma.messageAttachment.findUnique({
    where: { id: params.id },
    select: {
      threadId: true,
      filename: true,
      contentType: true,
      sizeBytes: true,
      originalFilename: true,
      thread: {
        select: {
          kind: true,
          operatorId: true,
          partyId: true,
          familyUserId: true,
          companionUserId: true,
        },
      },
    },
  });
  if (!att) return new NextResponse('Not found', { status: 404 });

  // Any of the four participant columns (kind-dependent) identifies
  // the caller. For FAMILY_COMPANION threads, operators with the
  // oversight role also see attachments - mirrors the page-level
  // gate on /ops/messages/[id]. Operators on OPS_* threads must be
  // the assigned operator, no blanket access.
  const isParticipant =
    user.id === att.thread.operatorId ||
    user.id === att.thread.partyId ||
    user.id === att.thread.familyUserId ||
    user.id === att.thread.companionUserId;
  const isOversight =
    att.thread.kind === 'FAMILY_COMPANION' && isOperator(user.role);
  if (!isParticipant && !isOversight) {
    return new NextResponse('Forbidden', { status: 403 });
  }
  if (isOversight) {
    await audit({
      actorType: 'user',
      actorId: user.id,
      actorRole: user.role,
      actionType: 'read_sensitive',
      targetType: 'MessageAttachment',
      targetId: params.id,
      metadata: {
        event: 'direct_attachment_read',
        threadId: att.threadId,
      },
    });
  }

  let bytes: Buffer;
  try {
    bytes = await readAttachmentBytes(att.threadId, att.filename);
  } catch (err) {
    console.error('[message-attachments] read failed', { id: params.id, err });
    return new NextResponse('Not found', { status: 404 });
  }

  // ?download=1 forces a download with the original filename so users
  // can save documents/videos under a recognisable name. Inline (no
  // query) keeps images/videos rendering in the message bubble.
  const url = new URL(req.url);
  const download = url.searchParams.get('download') === '1';
  const disposition = download
    ? `attachment; filename="${encodeFilename(att.originalFilename || att.filename)}"`
    : `inline; filename="${encodeFilename(att.originalFilename || att.filename)}"`;

  return new NextResponse(new Uint8Array(bytes), {
    status: 200,
    headers: {
      'Content-Type': att.contentType,
      'Content-Length': String(bytes.length),
      'Content-Disposition': disposition,
      'Cache-Control': 'private, max-age=3600',
    },
  });
}

function encodeFilename(name: string): string {
  // Strip CR/LF + quote chars so the Content-Disposition header
  // can't be header-injected via a hostile filename.
  return name.replace(/["\r\n]/g, '').slice(0, 200);
}
