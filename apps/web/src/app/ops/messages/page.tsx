import Link from 'next/link';
import { MessageSquare, ChevronRight, Plus, Eye } from 'lucide-react';
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

type Tab = 'ops' | 'direct';

export default async function OpsMessagesPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  await requireOperator('/ops/messages');
  const state = parsePagination(searchParams, { pageSize: 25 });
  const tab: Tab = searchParams.tab === 'direct' ? 'direct' : 'ops';

  // Tab counts. Cheap because Thread.kind is indexed (M.2.1) and both
  // sides typically have small numbers.
  const [opsCount, directCount] = await Promise.all([
    prisma.thread.count({
      where: { kind: { in: [ThreadKind.OPS_FAMILY, ThreadKind.OPS_COMPANION] } },
    }),
    prisma.thread.count({ where: { kind: ThreadKind.FAMILY_COMPANION } }),
  ]);

  return (
    <div className="max-w-[960px]">
      <header className="mb-6 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <MessageSquare size={22} strokeWidth={1.75} className="text-moss" aria-hidden="true" />
          <h1 className="font-head font-normal text-moss text-[clamp(1.75rem,3vw,2.25rem)] leading-[1.1]">
            Messages
          </h1>
        </div>
        {tab === 'ops' ? (
          <Link
            href="/ops/messages/new"
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-moss text-cream text-sm hover:bg-moss-deep transition-colors"
          >
            <Plus size={14} strokeWidth={1.75} aria-hidden="true" />
            Start a thread
          </Link>
        ) : null}
      </header>

      <nav className="mb-5 flex items-center gap-1 border-b border-moss/15" aria-label="Thread kind">
        <TabLink active={tab === 'ops'} href="/ops/messages">
          Operator threads
          <Count value={opsCount} />
        </TabLink>
        <TabLink active={tab === 'direct'} href="/ops/messages?tab=direct">
          Direct F&#8594;C
          <Count value={directCount} />
        </TabLink>
      </nav>

      {tab === 'ops' ? (
        <OpsThreadsList searchParams={searchParams} state={state} />
      ) : (
        <DirectThreadsList searchParams={searchParams} state={state} />
      )}
    </div>
  );
}

function Count({ value }: { value: number }) {
  return (
    <span className="ml-2 inline-flex items-center font-mono text-[0.7rem] text-stone bg-moss/[0.06] rounded px-1.5 py-0.5">
      {value}
    </span>
  );
}

function TabLink({
  active,
  href,
  children,
}: {
  active: boolean;
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={
        'px-4 py-2 text-[0.875rem] font-medium border-b-2 -mb-px transition-colors ' +
        (active
          ? 'text-moss border-moss'
          : 'text-stone border-transparent hover:text-moss')
      }
    >
      {children}
    </Link>
  );
}

// -------------------------------------------------------------------------
// OPS_FAMILY + OPS_COMPANION list (existing surface)
// -------------------------------------------------------------------------

async function OpsThreadsList({
  searchParams,
  state,
}: {
  searchParams: Record<string, string | string[] | undefined>;
  state: ReturnType<typeof parsePagination>;
}) {
  const opsKindFilter = {
    kind: { in: [ThreadKind.OPS_FAMILY, ThreadKind.OPS_COMPANION] },
  };
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
    <>
      <p className="text-charcoal text-[0.9375rem] leading-[1.55] max-w-[70ch] mb-6">
        Operator-mediated threads with families and companions. Every
        message is audit-logged. Each side gets an email when a new
        message arrives, debounced to one notification per five minutes.
      </p>

      <div className="bg-paper border border-moss/[0.08] rounded-[12px] overflow-hidden">
        {threads.length === 0 ? (
          <div className="px-6 py-12 text-center text-stone">
            No threads yet. Start one from a user&apos;s detail page or with the
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
    </>
  );
}

// -------------------------------------------------------------------------
// FAMILY_COMPANION oversight list (M.2.4)
// -------------------------------------------------------------------------

async function DirectThreadsList({
  searchParams,
  state,
}: {
  searchParams: Record<string, string | string[] | undefined>;
  state: ReturnType<typeof parsePagination>;
}) {
  const where = { kind: ThreadKind.FAMILY_COMPANION };
  const [total, threads] = await Promise.all([
    prisma.thread.count({ where }),
    prisma.thread.findMany({
      where,
      orderBy: { lastMessageAt: 'desc' },
      skip: state.skip,
      take: state.pageSize,
      include: {
        familyUser: { select: { firstName: true, lastName: true, email: true } },
        companionUser: { select: { firstName: true, lastName: true, email: true } },
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
    <>
      <div className="mb-6 rounded-md border border-terracotta/30 bg-terracotta/[0.06] px-4 py-3 flex items-start gap-3">
        <Eye
          size={18}
          strokeWidth={1.75}
          aria-hidden="true"
          className="text-terracotta flex-shrink-0 mt-0.5"
        />
        <p className="text-charcoal text-[0.875rem] leading-[1.55] max-w-[70ch]">
          Direct family &#8594; companion threads. The office has read
          access but cannot post into these. Every open is audit-logged
          as a read of the thread.
        </p>
      </div>

      <div className="bg-paper border border-moss/[0.08] rounded-[12px] overflow-hidden">
        {threads.length === 0 ? (
          <div className="px-6 py-12 text-center text-stone">
            No direct threads yet. They appear when a family + companion pair
            with the gate enabled start chatting.
          </div>
        ) : (
          <ul className="divide-y divide-moss/[0.08]">
            {threads.map((t) => {
              const last = t.messages[0];
              const familyName =
                [t.familyUser?.firstName, t.familyUser?.lastName]
                  .filter(Boolean)
                  .join(' ') ||
                t.familyUser?.email ||
                'family';
              const companionName =
                [t.companionUser?.firstName, t.companionUser?.lastName]
                  .filter(Boolean)
                  .join(' ') ||
                t.companionUser?.email ||
                'companion';
              return (
                <li key={t.id}>
                  <Link
                    href={`/ops/messages/${t.id}`}
                    className="flex items-center gap-4 px-5 py-4 hover:bg-cream-deep/40 transition-colors group"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="inline-flex items-center font-body text-[0.65rem] font-medium uppercase tracking-[0.08em] px-2 py-0.5 rounded bg-terracotta/15 text-terracotta">
                          Direct
                        </span>
                        <time className="text-stone text-[0.75rem] font-mono">
                          {formatRelative(t.lastMessageAt)}
                        </time>
                      </div>
                      <div className="font-head text-moss text-[1.0625rem] font-medium">
                        {familyName} &#8594; {companionName}
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
        basePath="/ops/messages?tab=direct"
        searchParams={searchParams}
        view={view}
        label="thread"
      />
    </>
  );
}
