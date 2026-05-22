import Link from 'next/link';
import { MessageSquare, ChevronRight, Plus } from 'lucide-react';
import { ThreadKind } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireOperator } from '@/lib/auth-helpers';
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

export default async function OpsMessagesPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  await requireOperator('/ops/messages');
  const state = parsePagination(searchParams, { pageSize: 25 });

  // M.2.1: this list is operator-mediated threads only. Direct
  // FAMILY_COMPANION threads land on the oversight tab in M.2.4.
  const opsKindFilter = { kind: { in: [ThreadKind.OPS_FAMILY, ThreadKind.OPS_COMPANION] } };
  const [total, threads] = await Promise.all([
    prisma.thread.count({ where: opsKindFilter }),
    prisma.thread.findMany({
      where: opsKindFilter,
      orderBy: { lastMessageAt: 'desc' },
      skip: state.skip,
      take: state.pageSize,
      include: {
        party: {
          select: { id: true, firstName: true, lastName: true, email: true, role: true },
        },
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
    <div className="max-w-[960px]">
      <header className="mb-6 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <MessageSquare size={22} strokeWidth={1.75} className="text-moss" aria-hidden="true" />
          <h1 className="font-head font-normal text-moss text-[clamp(1.75rem,3vw,2.25rem)] leading-[1.1]">
            Messages
          </h1>
        </div>
        <Link
          href="/ops/messages/new"
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-moss text-cream text-sm hover:bg-moss-deep transition-colors"
        >
          <Plus size={14} strokeWidth={1.75} aria-hidden="true" />
          Start a thread
        </Link>
      </header>
      <p className="text-charcoal text-[0.9375rem] leading-[1.55] max-w-[70ch] mb-6">
        Operator-mediated threads with families and companions. Every
        message is audit-logged. Each side gets an email when a new
        message arrives, debounced to one notification per five minutes.
      </p>

      <div className="bg-paper border border-moss/[0.08] rounded-[12px] overflow-hidden">
        {threads.length === 0 ? (
          <div className="px-6 py-12 text-center text-stone">
            No threads yet. Start one from a user's detail page or with the
            button above.
          </div>
        ) : (
          <ul className="divide-y divide-moss/[0.08]">
            {threads.map((t) => {
              const last = t.messages[0];
              const unread =
                last && (!t.operatorLastReadAt || last.createdAt > t.operatorLastReadAt)
                  ? last.senderId !== t.operatorId
                  : false;
              // party is non-null by construction (kind filter above
              // restricts to OPS_* threads, which always have a party).
              const party = t.party!;
              const partyName =
                [party.firstName, party.lastName].filter(Boolean).join(' ') ||
                party.email;
              return (
                <li key={t.id}>
                  <Link
                    href={`/ops/messages/${t.id}`}
                    className="flex items-center gap-4 px-5 py-4 hover:bg-cream-deep/40 transition-colors group"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span
                          className={`inline-flex items-center font-body text-[0.65rem] font-medium uppercase tracking-[0.08em] px-2 py-0.5 rounded ${
                            t.partyRole === 'companion'
                              ? 'bg-terracotta/15 text-terracotta'
                              : 'bg-moss/10 text-moss'
                          }`}
                        >
                          {t.partyRole === 'companion' ? 'Companion' : 'Family'}
                        </span>
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
                        {t.subject || `Thread with ${partyName}`}
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
        )}
      </div>

      <Paginator
        basePath="/ops/messages"
        searchParams={searchParams}
        view={view}
        label="thread"
      />
    </div>
  );
}
