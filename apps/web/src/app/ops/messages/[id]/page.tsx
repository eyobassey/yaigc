import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft, Eye, MessageSquare } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { audit } from '@/lib/audit';
import { requireOperator } from '@/lib/auth-helpers';
import { markThreadRead } from '@/lib/messaging';
import { ThreadView } from '@/components/messaging/ThreadView';

export const metadata = { title: 'Thread' };

export default async function OpsThreadDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const actor = await requireOperator(`/ops/messages/${params.id}`);

  const thread = await prisma.thread.findUnique({
    where: { id: params.id },
    include: {
      party: {
        select: { id: true, firstName: true, lastName: true, email: true, role: true },
      },
      familyUser: {
        select: { id: true, firstName: true, lastName: true, email: true },
      },
      companionUser: {
        select: { id: true, firstName: true, lastName: true, email: true },
      },
      messages: {
        orderBy: { createdAt: 'asc' },
        include: {
          sender: { select: { id: true, firstName: true, lastName: true, role: true } },
          attachments: {
            orderBy: { createdAt: 'asc' },
            select: {
              id: true,
              contentType: true,
              sizeBytes: true,
              width: true,
              height: true,
              originalFilename: true,
            },
          },
        },
      },
    },
  });
  if (!thread) notFound();

  const isDirect = thread.kind === 'FAMILY_COMPANION';

  if (isDirect) {
    if (!thread.familyUser || !thread.companionUser) notFound();

    // M.2.4: every operator open of a direct thread is logged so we
    // have a record of who reviewed what. read_sensitive is the
    // existing audit category for PII/private reads.
    await audit({
      actorType: 'user',
      actorId: actor.id,
      actorRole: actor.role,
      actionType: 'read_sensitive',
      targetType: 'Thread',
      targetId: thread.id,
      metadata: { event: 'direct_thread_read', threadKind: 'FAMILY_COMPANION' },
    });

    const familyLabel =
      [thread.familyUser.firstName, thread.familyUser.lastName]
        .filter(Boolean)
        .join(' ') || thread.familyUser.email;
    const companionLabel =
      [thread.companionUser.firstName, thread.companionUser.lastName]
        .filter(Boolean)
        .join(' ') || thread.companionUser.email;

    return (
      <div className="max-w-[820px]">
        <Link
          href="/ops/messages?tab=direct"
          className="inline-flex items-center gap-1 text-stone hover:text-moss text-sm mb-4 transition-colors"
        >
          <ChevronLeft size={14} strokeWidth={1.75} aria-hidden="true" />
          All direct threads
        </Link>

        <header className="mb-6 flex items-center gap-3">
          <MessageSquare size={22} strokeWidth={1.75} className="text-moss" aria-hidden="true" />
          <h1 className="font-head font-normal text-moss text-[clamp(1.5rem,3vw,2rem)] leading-[1.15] break-words">
            {familyLabel} &#8594; {companionLabel}
          </h1>
        </header>

        <div className="mb-5 rounded-md border border-terracotta/30 bg-terracotta/[0.06] px-4 py-3 flex items-start gap-3">
          <Eye
            size={18}
            strokeWidth={1.75}
            aria-hidden="true"
            className="text-terracotta flex-shrink-0 mt-0.5"
          />
          <p className="text-charcoal text-[0.875rem] leading-[1.55]">
            Oversight view. You can read this thread but cannot reply.
            Your open of this thread has been audit-logged.
          </p>
        </div>

        <p className="text-stone text-[0.875rem] mb-4">
          Between{' '}
          <Link href={`/ops/users/${thread.familyUser.id}`} className="link">
            {familyLabel}
          </Link>{' '}
          (Family) and{' '}
          <Link href={`/ops/users/${thread.companionUser.id}`} className="link">
            {companionLabel}
          </Link>{' '}
          (Companion).
        </p>

        <ThreadView
          threadId={thread.id}
          otherPartyLabel={`${familyLabel} & ${companionLabel}`}
          currentUserId={actor.id}
          readOnly
          // M.3.4: operator_admin gets the original body of deleted
          // messages (strike-through + marker). Non-admin operators
          // see the standard tombstone like everyone else.
          revealDeleted={actor.role === 'operator_admin'}
          messages={thread.messages.map((m) => {
            const senderName =
              [m.sender.firstName, m.sender.lastName].filter(Boolean).join(' ') ||
              (m.senderId === thread.familyUserId ? familyLabel : companionLabel);
            return {
              id: m.id,
              body: m.body,
              createdAt: m.createdAt.toISOString(),
              fromCurrentUser: false, // ops is never a participant in a direct thread
              senderLabel: senderName,
              attachments: m.attachments,
              deletedAt: m.deletedAt ? m.deletedAt.toISOString() : null,
            };
          })}
        />
      </div>
    );
  }

  // OPS_FAMILY | OPS_COMPANION (original M.1 path).
  if (!thread.party) notFound();

  // Mark read as soon as the operator opens the thread.
  await markThreadRead(thread.id);

  const partyFullName =
    [thread.party.firstName, thread.party.lastName].filter(Boolean).join(' ') ||
    thread.party.email;

  return (
    <div className="max-w-[820px]">
      <Link
        href="/ops/messages"
        className="inline-flex items-center gap-1 text-stone hover:text-moss text-sm mb-4 transition-colors"
      >
        <ChevronLeft size={14} strokeWidth={1.75} aria-hidden="true" />
        All threads
      </Link>

      <header className="mb-6 flex items-center gap-3">
        <MessageSquare size={22} strokeWidth={1.75} className="text-moss" aria-hidden="true" />
        <h1 className="font-head font-normal text-moss text-[clamp(1.5rem,3vw,2rem)] leading-[1.15] break-words">
          {thread.subject || `Thread with ${partyFullName}`}
        </h1>
      </header>
      <p className="text-stone text-[0.875rem] mb-6">
        With{' '}
        <Link
          href={`/ops/users/${thread.party.id}`}
          className="link"
        >
          {partyFullName}
        </Link>{' '}
        ({thread.partyRole === 'companion' ? 'Companion' : 'Family'})
      </p>

      <ThreadView
        threadId={thread.id}
        otherPartyLabel={partyFullName}
        currentUserId={actor.id}
        messages={thread.messages.map((m) => {
          const senderName =
            [m.sender.firstName, m.sender.lastName].filter(Boolean).join(' ') ||
            (m.senderId === thread.operatorId ? 'Operator' : partyFullName);
          return {
            id: m.id,
            body: m.body,
            createdAt: m.createdAt.toISOString(),
            fromCurrentUser: m.senderId === actor.id,
            senderLabel: senderName,
            attachments: m.attachments,
            deletedAt: m.deletedAt ? m.deletedAt.toISOString() : null,
          };
        })}
      />
    </div>
  );
}
