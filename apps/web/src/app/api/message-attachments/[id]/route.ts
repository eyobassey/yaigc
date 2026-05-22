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
import { getSessionUser } from '@/lib/auth-helpers';
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
      thread: { select: { operatorId: true, partyId: true } },
    },
  });
  if (!att) return new NextResponse('Not found', { status: 404 });

  if (user.id !== att.thread.operatorId && user.id !== att.thread.partyId) {
    return new NextResponse('Forbidden', { status: 403 });
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
