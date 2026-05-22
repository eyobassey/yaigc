'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createTransport } from 'nodemailer';
import { brand } from '@igc/content';
import { prisma } from '@/lib/prisma';
import { audit } from '@/lib/audit';
import { getSessionUser, isOperator, isCompanion, isFamily } from '@/lib/auth-helpers';
import {
  newMessageHtml,
  newMessageText,
  newMessageSubject,
} from '@/lib/email/new-message';
import { publishMessageToUsers } from '@/lib/realtime';

// M.1: operator-mediated messaging. Threads always have one operator
// and one customer-side party (family_payer or companion). The
// operator initiates. Both sides can reply. v1 deliberately does NOT
// support direct family <-> companion threads.

const NOTIFICATION_DEBOUNCE_MS = 5 * 60 * 1000;
const MESSAGE_MAX_LEN = 4000;
const SUBJECT_MAX_LEN = 120;
const PREVIEW_LEN = 120;

function buildTransport() {
  return createTransport({
    host: process.env.SMTP_HOST!,
    port: Number(process.env.SMTP_PORT ?? 587),
    auth: { user: process.env.SMTP_USER!, pass: process.env.SMTP_PASSWORD! },
  });
}

// ---------------------------------------------------------------
// CREATE THREAD (operator only)
// ---------------------------------------------------------------

const CreateThreadSchema = z.object({
  partyUserId: z.string().min(1),
  subject: z.string().trim().max(SUBJECT_MAX_LEN).optional(),
  body: z.string().trim().min(1, 'Type a message.').max(MESSAGE_MAX_LEN),
});

export type CreateThreadState = {
  ok: boolean;
  error?: string;
  values?: { subject?: string; body?: string; partyUserId?: string };
};

export async function createThread(
  _prev: CreateThreadState,
  formData: FormData,
): Promise<CreateThreadState> {
  const actor = await getSessionUser();
  if (!actor) return { ok: false, error: 'Sign in first.' };
  if (!isOperator(actor.role)) {
    return { ok: false, error: 'Only operators can start a thread.' };
  }

  const raw = {
    partyUserId: String(formData.get('partyUserId') ?? ''),
    subject: String(formData.get('subject') ?? '').trim() || undefined,
    body: String(formData.get('body') ?? '').trim(),
  };
  const parsed = CreateThreadSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? 'Invalid input.',
      values: raw,
    };
  }
  const d = parsed.data;

  if (d.partyUserId === actor.id) {
    return { ok: false, error: 'You cannot start a thread with yourself.' };
  }

  const party = await prisma.user.findUnique({
    where: { id: d.partyUserId },
    select: { id: true, role: true, deletedAt: true, firstName: true, email: true },
  });
  if (!party || party.deletedAt) {
    return { ok: false, error: 'That user is not available.' };
  }
  const partyRole = isCompanion(party.role)
    ? 'companion'
    : isFamily(party.role)
    ? 'family_member'
    : null;
  if (!partyRole) {
    return {
      ok: false,
      error: 'Threads can only be started with family payers or companions.',
    };
  }

  const thread = await prisma.thread.create({
    data: {
      subject: d.subject ?? null,
      operatorId: actor.id,
      partyId: party.id,
      partyRole,
      messages: {
        create: { senderId: actor.id, body: d.body },
      },
      // Sender (operator) marks the thread as read by them at create time.
      operatorLastReadAt: new Date(),
      operatorLastNotifiedAt: new Date(),
    },
    select: {
      id: true,
      messages: {
        select: { id: true, body: true, senderId: true, createdAt: true },
        orderBy: { createdAt: 'asc' },
        take: 1,
      },
    },
  });

  // Fan-out to both participants' WebSocket subscribers. Sender echoes
  // their own message so the optimistic UI can confirm.
  const first = thread.messages[0];
  if (first) {
    await publishMessageToUsers([actor.id, party.id], {
      kind: 'message',
      threadId: thread.id,
      message: {
        id: first.id,
        body: first.body,
        senderId: first.senderId,
        createdAt: first.createdAt.toISOString(),
      },
    });
  }

  await audit({
    actorType: 'user',
    actorId: actor.id,
    actorRole: actor.role,
    actionType: 'create',
    targetType: 'Thread',
    targetId: thread.id,
    metadata: {
      event: 'thread_created',
      partyId: party.id,
      partyRole,
      withSubject: Boolean(d.subject),
    },
  });

  await notifyPartyOfMessage({
    threadId: thread.id,
    partyId: party.id,
    partyFirstName: party.firstName,
    partyEmail: party.email,
    partyRole,
    preview: d.body,
    fromOperator: true,
  });

  revalidatePath('/ops/messages');
  redirect(`/ops/messages/${thread.id}`);
}

// ---------------------------------------------------------------
// SEND MESSAGE (operator or party)
// ---------------------------------------------------------------

const SendMessageSchema = z.object({
  threadId: z.string().min(1),
  body: z.string().trim().min(1, 'Type a message.').max(MESSAGE_MAX_LEN),
});

export type SendMessageState = {
  ok: boolean;
  error?: string;
  values?: { body?: string };
};

export async function sendMessage(
  _prev: SendMessageState,
  formData: FormData,
): Promise<SendMessageState> {
  const actor = await getSessionUser();
  if (!actor) return { ok: false, error: 'Sign in first.' };

  const parsed = SendMessageSchema.safeParse({
    threadId: String(formData.get('threadId') ?? ''),
    body: String(formData.get('body') ?? '').trim(),
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? 'Invalid input.',
      values: { body: String(formData.get('body') ?? '') },
    };
  }
  const d = parsed.data;

  const thread = await prisma.thread.findUnique({
    where: { id: d.threadId },
    include: {
      operator: { select: { id: true, firstName: true, email: true } },
      party: { select: { id: true, firstName: true, email: true, deletedAt: true } },
    },
  });
  if (!thread) return { ok: false, error: 'Thread not found.' };
  if (thread.party.deletedAt) {
    return { ok: false, error: 'The other party is no longer available.' };
  }

  const isActorOperator = actor.id === thread.operatorId;
  const isActorParty = actor.id === thread.partyId;
  if (!isActorOperator && !isActorParty) {
    return { ok: false, error: 'You are not a participant in this thread.' };
  }

  const newMessage = await prisma.$transaction(async (tx) => {
    const created = await tx.message.create({
      data: { threadId: thread.id, senderId: actor.id, body: d.body },
      select: { id: true, body: true, senderId: true, createdAt: true },
    });
    await tx.thread.update({
      where: { id: thread.id },
      data: {
        lastMessageAt: new Date(),
        ...(isActorOperator
          ? { operatorLastReadAt: new Date() }
          : { partyLastReadAt: new Date() }),
      },
    });
    return created;
  });

  await publishMessageToUsers([thread.operatorId, thread.partyId], {
    kind: 'message',
    threadId: thread.id,
    message: {
      id: newMessage.id,
      body: newMessage.body,
      senderId: newMessage.senderId,
      createdAt: newMessage.createdAt.toISOString(),
    },
  });

  await audit({
    actorType: 'user',
    actorId: actor.id,
    actorRole: actor.role,
    actionType: 'create',
    targetType: 'Message',
    targetId: thread.id,
    metadata: {
      event: 'message_sent',
      threadId: thread.id,
      senderRole: isActorOperator ? 'operator' : thread.partyRole,
    },
  });

  // Notify the OTHER side, respecting the 5-min debounce.
  if (isActorOperator) {
    await notifyPartyOfMessage({
      threadId: thread.id,
      partyId: thread.party.id,
      partyFirstName: thread.party.firstName,
      partyEmail: thread.party.email,
      partyRole: thread.partyRole,
      preview: d.body,
      fromOperator: true,
    });
  } else {
    await notifyOperatorOfMessage({
      threadId: thread.id,
      operatorId: thread.operator.id,
      operatorFirstName: thread.operator.firstName,
      operatorEmail: thread.operator.email,
      preview: d.body,
    });
  }

  revalidatePath(`/ops/messages/${thread.id}`);
  revalidatePath(`/family/messages/${thread.id}`);
  revalidatePath(`/companion/messages/${thread.id}`);
  return { ok: true };
}

// ---------------------------------------------------------------
// MARK READ (called when a participant opens the thread)
// ---------------------------------------------------------------

export async function markThreadRead(threadId: string): Promise<void> {
  const actor = await getSessionUser();
  if (!actor) return;
  const thread = await prisma.thread.findUnique({
    where: { id: threadId },
    select: { id: true, operatorId: true, partyId: true },
  });
  if (!thread) return;
  if (actor.id === thread.operatorId) {
    await prisma.thread.update({
      where: { id: thread.id },
      data: { operatorLastReadAt: new Date() },
    });
  } else if (actor.id === thread.partyId) {
    await prisma.thread.update({
      where: { id: thread.id },
      data: { partyLastReadAt: new Date() },
    });
  }
}

// ---------------------------------------------------------------
// EMAIL HELPERS (5-min debounce per recipient per thread)
// ---------------------------------------------------------------

function previewOf(body: string): string {
  const single = body.replace(/\s+/g, ' ').trim();
  return single.length > PREVIEW_LEN ? `${single.slice(0, PREVIEW_LEN - 1)}…` : single;
}

async function notifyPartyOfMessage(input: {
  threadId: string;
  partyId: string;
  partyFirstName: string | null;
  partyEmail: string;
  partyRole: string;
  preview: string;
  fromOperator: boolean;
}): Promise<void> {
  const thread = await prisma.thread.findUnique({
    where: { id: input.threadId },
    select: { partyLastNotifiedAt: true },
  });
  if (!thread) return;
  const now = Date.now();
  if (
    thread.partyLastNotifiedAt &&
    now - thread.partyLastNotifiedAt.getTime() < NOTIFICATION_DEBOUNCE_MS
  ) {
    return;
  }
  await prisma.thread.update({
    where: { id: input.threadId },
    data: { partyLastNotifiedAt: new Date() },
  });
  try {
    const transport = buildTransport();
    const payload = {
      recipientFirstName: input.partyFirstName,
      recipientRoleHint: input.partyRole === 'companion' ? ('companion' as const) : ('family' as const),
      threadId: input.threadId,
      preview: previewOf(input.preview),
      fromOperator: input.fromOperator,
    };
    await transport.sendMail({
      to: input.partyEmail,
      from: `${brand.fullName} <${process.env.EMAIL_SENDER}>`,
      subject: newMessageSubject(payload),
      text: newMessageText(payload),
      html: newMessageHtml(payload),
    });
  } catch (err) {
    console.error('[messaging] party notification failed', { threadId: input.threadId, err });
  }
}

async function notifyOperatorOfMessage(input: {
  threadId: string;
  operatorId: string;
  operatorFirstName: string | null;
  operatorEmail: string;
  preview: string;
}): Promise<void> {
  const thread = await prisma.thread.findUnique({
    where: { id: input.threadId },
    select: { operatorLastNotifiedAt: true },
  });
  if (!thread) return;
  const now = Date.now();
  if (
    thread.operatorLastNotifiedAt &&
    now - thread.operatorLastNotifiedAt.getTime() < NOTIFICATION_DEBOUNCE_MS
  ) {
    return;
  }
  await prisma.thread.update({
    where: { id: input.threadId },
    data: { operatorLastNotifiedAt: new Date() },
  });
  try {
    const transport = buildTransport();
    const payload = {
      recipientFirstName: input.operatorFirstName,
      recipientRoleHint: 'operator' as const,
      threadId: input.threadId,
      preview: previewOf(input.preview),
      fromOperator: false,
    };
    await transport.sendMail({
      to: input.operatorEmail,
      from: `${brand.fullName} <${process.env.EMAIL_SENDER}>`,
      subject: newMessageSubject(payload),
      text: newMessageText(payload),
      html: newMessageHtml(payload),
    });
  } catch (err) {
    console.error('[messaging] operator notification failed', { threadId: input.threadId, err });
  }
}
