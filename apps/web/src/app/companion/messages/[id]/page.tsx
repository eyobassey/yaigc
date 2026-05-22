import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft, MessageSquare } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { requireCompanion } from '@/lib/auth-helpers';
import { markThreadRead } from '@/lib/messaging';
import { ThreadView } from '@/components/messaging/ThreadView';

export const metadata = { title: 'Thread' };

export default async function CompanionThreadDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const { user } = await requireCompanion(`/companion/messages/${params.id}`);

  const thread = await prisma.thread.findUnique({
    where: { id: params.id },
    include: {
      operator: { select: { id: true, firstName: true, lastName: true } },
      messages: {
        orderBy: { createdAt: 'asc' },
        include: {
          sender: { select: { id: true, firstName: true, lastName: true } },
        },
      },
    },
  });
  if (!thread || thread.partyId !== user.id) notFound();

  await markThreadRead(thread.id);

  const operatorLabel =
    [thread.operator.firstName, thread.operator.lastName]
      .filter(Boolean)
      .join(' ') || 'The office';

  return (
    <div>
      <Link
        href="/companion/messages"
        className="inline-flex items-center gap-1 text-stone hover:text-moss text-sm mb-4 transition-colors"
      >
        <ChevronLeft size={14} strokeWidth={1.75} aria-hidden="true" />
        All threads
      </Link>

      <header className="mb-6 flex items-center gap-3">
        <MessageSquare size={22} strokeWidth={1.75} className="text-moss" aria-hidden="true" />
        <h1 className="font-head font-normal text-moss text-[clamp(1.5rem,3vw,2rem)] leading-[1.15] break-words">
          {thread.subject || 'A thread with the office'}
        </h1>
      </header>

      <ThreadView
        threadId={thread.id}
        otherPartyLabel={operatorLabel}
        messages={thread.messages.map((m) => ({
          id: m.id,
          body: m.body,
          createdAt: m.createdAt.toISOString(),
          fromCurrentUser: m.senderId === user.id,
          senderLabel:
            m.senderId === user.id
              ? 'You'
              : [m.sender.firstName, m.sender.lastName].filter(Boolean).join(' ') ||
                operatorLabel,
        }))}
      />
    </div>
  );
}
