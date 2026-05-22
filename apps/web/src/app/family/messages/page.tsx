import Link from 'next/link';
import { MessageSquare, ChevronRight } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { requireFamilyMember } from '@/lib/auth-helpers';
import { Paginator } from '@/components/ui/Paginator';
import { parsePagination, buildView } from '@/lib/pagination';

export const metadata = { title: 'Messages' };

function formatRelative(d: Date): string {
  const ms = Date.now() - d.getTime();
  const m = Math.floor(ms / 60_000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default async function FamilyMessagesPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const { user } = await requireFamilyMember('/family/messages');
  const state = parsePagination(searchParams, { pageSize: 20 });

  const where = { partyId: user.id };
  const [total, threads] = await Promise.all([
    prisma.thread.count({ where }),
    prisma.thread.findMany({
      where,
      orderBy: { lastMessageAt: 'desc' },
      skip: state.skip,
      take: state.pageSize,
      include: {
        operator: { select: { firstName: true, lastName: true } },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { body: true, createdAt: true, senderId: true },
        },
      },
    }),
  ]);
  const view = buildView(state, total);

  return (
    <div>
      <header className="mb-6 flex items-center gap-3">
        <MessageSquare size={22} strokeWidth={1.75} className="text-moss" aria-hidden="true" />
        <h1 className="font-head font-normal text-moss text-[clamp(1.75rem,3vw,2.25rem)] leading-[1.1]">
          Messages
        </h1>
      </header>
      <p className="text-charcoal text-[0.9375rem] leading-[1.55] max-w-[60ch] mb-6">
        Threads with the office. We will start a thread when there is
        something to discuss; you can reply on any open one.
      </p>

      {threads.length === 0 ? (
        <div className="bg-paper border border-moss/[0.08] rounded-[12px] px-6 py-12 text-center text-stone">
          No messages yet.
        </div>
      ) : (
        <div className="bg-paper border border-moss/[0.08] rounded-[12px] overflow-hidden">
          <ul className="divide-y divide-moss/[0.08]">
            {threads.map((t) => {
              const last = t.messages[0];
              const unread =
                last && (!t.partyLastReadAt || last.createdAt > t.partyLastReadAt)
                  ? last.senderId === t.operatorId
                  : false;
              return (
                <li key={t.id}>
                  <Link
                    href={`/family/messages/${t.id}`}
                    className="flex items-center gap-4 px-5 py-4 hover:bg-cream-deep/40 transition-colors group"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        {unread ? (
                          <span className="inline-flex items-center font-body text-[0.65rem] font-medium uppercase tracking-[0.08em] px-2 py-0.5 rounded bg-moss text-cream">
                            New
                          </span>
                        ) : null}
                        <time className="text-stone text-[0.75rem] font-mono">
                          {formatRelative(t.lastMessageAt)}
                        </time>
                      </div>
                      <div className="font-head text-moss text-[1.0625rem] font-medium">
                        {t.subject || 'A thread with the office'}
                      </div>
                      <div className="text-stone text-[0.875rem] mt-0.5 truncate">
                        {last ? last.body : 'No messages.'}
                      </div>
                    </div>
                    <ChevronRight
                      size={20}
                      strokeWidth={1.5}
                      aria-hidden="true"
                      className="text-stone/50 group-hover:text-moss flex-shrink-0 transition-colors"
                    />
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <Paginator
        basePath="/family/messages"
        searchParams={searchParams}
        view={view}
        label="thread"
      />
    </div>
  );
}
