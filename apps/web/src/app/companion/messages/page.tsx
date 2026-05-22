import Link from 'next/link';
import { MessageSquare, ChevronRight, Plus } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { requireCompanion } from '@/lib/auth-helpers';
import { openDirectThread } from '@/lib/messaging';
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

export default async function CompanionMessagesPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const { user, companion } = await requireCompanion('/companion/messages');
  const state = parsePagination(searchParams, { pageSize: 20 });

  // OPS_COMPANION (partyId) + FAMILY_COMPANION (companionUserId).
  const where = {
    OR: [{ partyId: user.id }, { companionUserId: user.id }],
  };
  const [total, threads, startable] = await Promise.all([
    prisma.thread.count({ where }),
    prisma.thread.findMany({
      where,
      orderBy: { lastMessageAt: 'desc' },
      skip: state.skip,
      take: state.pageSize,
      include: {
        operator: { select: { firstName: true, lastName: true } },
        familyUser: { select: { firstName: true, lastName: true } },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { body: true, createdAt: true, senderId: true },
        },
      },
    }),
    // M.2.3: matches the office has cleared for direct messaging but
    // that have no FAMILY_COMPANION thread yet.
    companion.directMessagingEnabled
      ? findStartableDirectThreadsForCompanion(companion.id, user.id)
      : Promise.resolve([] as { matchId: string; label: string }[]),
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
        Threads with the office. We will start a thread when something
        comes up; you can reply on any open one.
      </p>

      {startable.length > 0 ? (
        <section className="mb-6 bg-paper border border-terracotta/20 rounded-[12px] p-5">
          <h2 className="font-body text-[0.75rem] font-medium uppercase tracking-[0.1em] text-stone mb-2">
            Start a direct thread
          </h2>
          <p className="text-charcoal text-[0.875rem] leading-[1.55] mb-4 max-w-[60ch]">
            The office has cleared you to message these families directly.
            Every message is still visible to them.
          </p>
          <div className="flex flex-wrap gap-2">
            {startable.map((s) => (
              <form action={openDirectThread} key={s.matchId}>
                <input type="hidden" name="matchId" value={s.matchId} />
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-md bg-moss text-cream text-sm font-medium hover:bg-moss-deep transition-colors"
                >
                  <Plus size={14} strokeWidth={1.75} aria-hidden="true" />
                  Message {s.label}
                </button>
              </form>
            ))}
          </div>
        </section>
      ) : null}

      {threads.length === 0 ? (
        <div className="bg-paper border border-moss/[0.08] rounded-[12px] px-6 py-12 text-center text-stone">
          No messages yet.
        </div>
      ) : (
        <div className="bg-paper border border-moss/[0.08] rounded-[12px] overflow-hidden">
          <ul className="divide-y divide-moss/[0.08]">
            {threads.map((t) => {
              const last = t.messages[0];
              const isDirect = t.kind === 'FAMILY_COMPANION';
              const lastReadAt = isDirect
                ? t.companionLastReadAt
                : t.partyLastReadAt;
              const counterpartUserId = isDirect ? t.familyUserId : t.operatorId;
              const unread =
                last && (!lastReadAt || last.createdAt > lastReadAt)
                  ? last.senderId === counterpartUserId
                  : false;
              const familyLabel =
                [t.familyUser?.firstName, t.familyUser?.lastName]
                  .filter(Boolean)
                  .join(' ') || 'the family';
              const title = isDirect
                ? `Direct thread with ${familyLabel}`
                : t.subject || 'A thread with the office';
              return (
                <li key={t.id}>
                  <Link
                    href={`/companion/messages/${t.id}`}
                    className="flex items-center gap-4 px-5 py-4 hover:bg-cream-deep/40 transition-colors group"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        {unread ? (
                          <span className="inline-flex items-center font-body text-[0.65rem] font-medium uppercase tracking-[0.08em] px-2 py-0.5 rounded bg-moss text-cream">
                            New
                          </span>
                        ) : null}
                        {isDirect ? (
                          <span className="inline-flex items-center font-body text-[0.65rem] font-medium uppercase tracking-[0.08em] px-2 py-0.5 rounded bg-terracotta/15 text-terracotta">
                            Direct
                          </span>
                        ) : null}
                        <time className="text-stone text-[0.75rem] font-mono">
                          {formatRelative(t.lastMessageAt)}
                        </time>
                      </div>
                      <div className="font-head text-moss text-[1.0625rem] font-medium">
                        {title}
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
        basePath="/companion/messages"
        searchParams={searchParams}
        view={view}
        label="thread"
      />
    </div>
  );
}

// M.2.3: families this companion can open a direct thread with, minus
// the ones that already have one. The companion's directMessagingEnabled
// gate is checked by the caller before invoking this.
async function findStartableDirectThreadsForCompanion(
  companionId: string,
  userId: string,
): Promise<{ matchId: string; label: string }[]> {
  const eligible = await prisma.match.findMany({
    where: {
      candidateCompanionId: companionId,
      status: 'accepted',
      endedAt: null,
    },
    select: {
      id: true,
      family: {
        select: {
          billingName: true,
          members: {
            where: { role: 'payer', deletedAt: null },
            select: { userId: true },
            take: 1,
          },
        },
      },
    },
  });
  const counterpartUserIds = eligible
    .map((m) => m.family.members[0]?.userId)
    .filter((id): id is string => Boolean(id));
  if (counterpartUserIds.length === 0) return [];

  const existing = await prisma.thread.findMany({
    where: {
      kind: 'FAMILY_COMPANION',
      companionUserId: userId,
      familyUserId: { in: counterpartUserIds },
    },
    select: { familyUserId: true },
  });
  const taken = new Set(existing.map((t) => t.familyUserId));

  return eligible
    .map((m) => {
      const payerUserId = m.family.members[0]?.userId;
      if (!payerUserId || taken.has(payerUserId)) return null;
      return { matchId: m.id, label: m.family.billingName };
    })
    .filter((x): x is { matchId: string; label: string } => x !== null);
}
