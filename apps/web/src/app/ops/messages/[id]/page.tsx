import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft, MessageSquare } from 'lucide-react';
import { prisma } from '@/lib/prisma';
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
          };
        })}
      />
    </div>
  );
}
