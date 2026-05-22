// POST /api/message-attachments
//
// M.1.2: pre-upload step for message attachments. The composer
// uploads each file here BEFORE the message is sent. The route auth-
// checks that the caller is a participant in the thread, validates +
// stores the file in S3, and returns the MessageAttachment row id (with
// messageId still null). The composer then sends those ids along to
// the sendMessage server action, which binds them by setting messageId
// inside the transaction that creates the Message.
//
// Why pre-upload instead of stuffing files into the server action's
// FormData? Two reasons: (a) videos can be 100 MB so the upload should
// stream as it lands rather than block the action's heap; (b) splitting
// upload from send lets us surface per-file errors in the composer UI
// without losing the user's typed body.

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { audit } from '@/lib/audit';
import { getSessionUser } from '@/lib/auth-helpers';
import {
  saveAttachment,
  AttachmentValidationError,
} from '@/lib/message-attachment-storage';

// Tell Next.js this route uses Node runtime (default for app router
// API but explicit because we depend on the AWS SDK's Node streams).
export const runtime = 'nodejs';
// Disable any caching - upload responses are unique per call.
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 });

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid upload.' }, { status: 400 });
  }
  const threadId = String(form.get('threadId') ?? '');
  const file = form.get('file');
  if (!threadId || !(file instanceof File)) {
    return NextResponse.json(
      { error: 'Missing threadId or file.' },
      { status: 400 },
    );
  }

  // Participant check. Matches sendMessage's gate: operator-mediated
  // threads have operatorId + partyId; FAMILY_COMPANION threads
  // (M.2.3) have familyUserId + companionUserId. The two pairs are
  // mutually exclusive per the M.2.1 schema invariant.
  const thread = await prisma.thread.findUnique({
    where: { id: threadId },
    select: {
      id: true,
      operatorId: true,
      partyId: true,
      familyUserId: true,
      companionUserId: true,
    },
  });
  if (!thread) {
    return NextResponse.json({ error: 'Thread not found.' }, { status: 404 });
  }
  const isParticipant =
    user.id === thread.operatorId ||
    user.id === thread.partyId ||
    user.id === thread.familyUserId ||
    user.id === thread.companionUserId;
  if (!isParticipant) {
    return NextResponse.json(
      { error: 'You are not a participant in this thread.' },
      { status: 403 },
    );
  }

  let saved;
  try {
    saved = await saveAttachment(thread.id, file);
  } catch (err) {
    if (err instanceof AttachmentValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error('[message-attachments] save failed', { err });
    return NextResponse.json(
      { error: 'Upload failed; try again.' },
      { status: 500 },
    );
  }

  const row = await prisma.messageAttachment.create({
    data: {
      threadId: thread.id,
      uploadedById: user.id,
      filename: saved.filename,
      originalFilename: file.name?.slice(0, 240) || null,
      contentType: saved.contentType,
      sizeBytes: saved.sizeBytes,
      width: saved.width,
      height: saved.height,
    },
    select: {
      id: true,
      contentType: true,
      sizeBytes: true,
      width: true,
      height: true,
      originalFilename: true,
    },
  });

  await audit({
    actorType: 'user',
    actorId: user.id,
    actorRole: user.role,
    actionType: 'create',
    targetType: 'MessageAttachment',
    targetId: row.id,
    metadata: {
      event: 'attachment_uploaded',
      threadId: thread.id,
      contentType: row.contentType,
      sizeBytes: row.sizeBytes,
    },
  });

  return NextResponse.json({
    id: row.id,
    contentType: row.contentType,
    sizeBytes: row.sizeBytes,
    width: row.width,
    height: row.height,
    originalFilename: row.originalFilename,
    kind: saved.kind,
  });
}
