import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft, MessageSquare, Eye, Lock } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { requireFamilyMember } from '@/lib/auth-helpers';
import { markThreadRead, isDirectThreadWritable } from '@/lib/messaging';
import { ThreadView } from '@/components/messaging/ThreadView';

export const metadata = { title: 'Thread' };

export default async function FamilyThreadDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const { user } = await requireFamilyMember(`/family/messages/${params.id}`);

  const thread = await prisma.thread.findUnique({
    where: { id: params.id },
    include: {
      operator: { select: { id: true, firstName: true, lastName: true } },
      companionUser: { select: { id: true, firstName: true, lastName: true } },
      messages: {
        orderBy: { createdAt: 'asc' },
        include: {
          sender: { select: { id: true, firstName: true, lastName: true } },
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
    if (thread.familyUserId !== user.id || !thread.companionUser) notFound();
  } else {
    if (thread.partyId !== user.id || !thread.operator) notFound();
  }

  // M.2.5: direct threads can fall read-only when the underlying
  // Match ends or the companion's directMessagingEnabled gate is
  // toggled off. We still let the family see the history.
  const directReadOnly =
    isDirect &&
    !(await isDirectThreadWritable(
      thread.familyUserId!,
      thread.companionUserId!,
    ));

  await markThreadRead(thread.id);

  const otherPartyLabel = isDirect
    ? thread.companionUser!.firstName ?? 'your companion'
    : [thread.operator!.firstName, thread.operator!.lastName]
        .filter(Boolean)
        .join(' ') || 'The office';

  const heading = isDirect
    ? `Direct thread with ${thread.companionUser!.firstName ?? 'your companion'}`
    : thread.subject || 'A thread with the office';

  return (
    <div>
      <Link
        href="/family/messages"
        className="inline-flex items-center gap-1 text-stone hover:text-moss text-sm mb-4 transition-colors"
      >
        <ChevronLeft size={14} strokeWidth={1.75} aria-hidden="true" />
        All threads
      </Link>

      <header className="mb-6 flex items-center gap-3">
        <MessageSquare size={22} strokeWidth={1.75} className="text-moss" aria-hidden="true" />
        <h1 className="font-head font-normal text-moss text-[clamp(1.5rem,3vw,2rem)] leading-[1.15] break-words">
          {heading}
        </h1>
      </header>

      {isDirect ? (
        directReadOnly ? <EndedBanner /> : <OversightBanner />
      ) : null}

      <ThreadView
        threadId={thread.id}
        otherPartyLabel={otherPartyLabel}
        currentUserId={user.id}
        readOnly={directReadOnly}
        messages={thread.messages.map((m) => ({
          id: m.id,
          body: m.body,
          createdAt: m.createdAt.toISOString(),
          fromCurrentUser: m.senderId === user.id,
          senderLabel:
            m.senderId === user.id
              ? 'You'
              : [m.sender.firstName, m.sender.lastName].filter(Boolean).join(' ') ||
                otherPartyLabel,
          attachments: m.attachments,
          deletedAt: m.deletedAt ? m.deletedAt.toISOString() : null,
        }))}
      />
    </div>
  );
}

// M.2.3 - disclosure banner. Both sides of a direct thread are told
// up-front that the office can read their messages. Per the M.2
// design decision: no surprise oversight.
function OversightBanner() {
  return (
    <div className="mb-5 rounded-md border border-terracotta/30 bg-terracotta/[0.06] px-4 py-3 flex items-start gap-3">
      <Eye
        size={18}
        strokeWidth={1.75}
        aria-hidden="true"
        className="text-terracotta flex-shrink-0 mt-0.5"
      />
      <p className="text-charcoal text-[0.875rem] leading-[1.55]">
        The office can read messages in this thread. We are here if
        anything ever goes wrong.
      </p>
    </div>
  );
}

// M.2.5 - shown when the underlying match has ended or the office has
// turned direct messaging off for the companion. The history stays
// visible; no new messages can be sent.
function EndedBanner() {
  return (
    <div className="mb-5 rounded-md border border-stone/30 bg-stone/[0.06] px-4 py-3 flex items-start gap-3">
      <Lock
        size={18}
        strokeWidth={1.75}
        aria-hidden="true"
        className="text-stone flex-shrink-0 mt-0.5"
      />
      <p className="text-charcoal text-[0.875rem] leading-[1.55]">
        This thread is now read-only. If you need to reach the office,
        use the operator thread under Messages.
      </p>
    </div>
  );
}
