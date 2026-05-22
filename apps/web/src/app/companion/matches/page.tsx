import Link from 'next/link';
import { Sparkles, ChevronRight } from 'lucide-react';
import { type MatchStatus, type Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireCompanion } from '@/lib/auth-helpers';

export const metadata = { title: 'Matches' };

const FILTERS: { value: 'open' | 'accepted' | 'declined' | 'all'; label: string }[] = [
  { value: 'open', label: 'Awaiting your response' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'declined', label: 'Declined' },
  { value: 'all', label: 'All' },
];

export default async function CompanionMatchesPage({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  const { companion } = await requireCompanion('/companion/matches');

  const raw = searchParams.status ?? 'open';
  const status = (FILTERS.find((f) => f.value === raw)?.value ?? 'open') as
    | 'open'
    | 'accepted'
    | 'declined'
    | 'all';

  // 'Open' for the companion means status=proposed AND companion has
  // not yet responded. Once they accept, the match either flips to
  // accepted (if family already responded) or stays in 'proposed'
  // awaiting family - either way we move it out of the companion's
  // 'open' bucket on the assumption that they have already acted.
  let where: Prisma.MatchWhereInput;
  if (status === 'open') {
    where = {
      candidateCompanionId: companion.id,
      status: 'proposed',
      companionResponseAt: null,
    };
  } else if (status === 'accepted') {
    where = { candidateCompanionId: companion.id, status: 'accepted' };
  } else if (status === 'declined') {
    where = {
      candidateCompanionId: companion.id,
      status: { in: ['declined', 'withdrawn', 'ended'] as MatchStatus[] },
    };
  } else {
    where = { candidateCompanionId: companion.id };
  }

  const [openCount, acceptedCount, declinedCount, allCount, matches] = await Promise.all([
    prisma.match.count({
      where: {
        candidateCompanionId: companion.id,
        status: 'proposed',
        companionResponseAt: null,
      },
    }),
    prisma.match.count({
      where: { candidateCompanionId: companion.id, status: 'accepted' },
    }),
    prisma.match.count({
      where: {
        candidateCompanionId: companion.id,
        status: { in: ['declined', 'withdrawn', 'ended'] as MatchStatus[] },
      },
    }),
    prisma.match.count({ where: { candidateCompanionId: companion.id } }),
    prisma.match.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        family: { select: { billingName: true } },
        recipient: { select: { firstName: true, preferredName: true } },
      },
    }),
  ]);

  const counts: Record<string, number> = {
    open: openCount,
    accepted: acceptedCount,
    declined: declinedCount,
    all: allCount,
  };

  return (
    <div>
      <header className="mb-6 flex items-center gap-3">
        <Sparkles size={22} strokeWidth={1.75} className="text-moss" aria-hidden="true" />
        <h1 className="font-head font-normal text-moss text-[clamp(1.75rem,3vw,2.25rem)] leading-[1.1]">
          Matches
        </h1>
      </header>

      <nav aria-label="Match filter" className="mb-6 flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const active = f.value === status;
          return (
            <Link
              key={f.value}
              href={f.value === 'open' ? '/companion/matches' : `/companion/matches?status=${f.value}`}
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm border transition-colors ${
                active
                  ? 'bg-moss text-cream border-moss'
                  : 'bg-paper border-moss/15 text-charcoal hover:border-moss/30'
              }`}
              aria-current={active ? 'page' : undefined}
            >
              <span>{f.label}</span>
              <span
                className={`text-[0.7rem] font-medium ${active ? 'text-cream/70' : 'text-stone'}`}
              >
                {counts[f.value] ?? 0}
              </span>
            </Link>
          );
        })}
      </nav>

      <div className="bg-paper border border-moss/[0.08] rounded-[12px] overflow-hidden">
        {matches.length === 0 ? (
          <div className="px-6 py-12 text-center text-stone">
            Nothing to look at in <strong>{status === 'open' ? 'awaiting your response' : status}</strong>.
          </div>
        ) : (
          <ul className="divide-y divide-moss/[0.08]">
            {matches.map((m) => {
              const recipientLabel = m.recipient
                ? m.recipient.preferredName || m.recipient.firstName
                : 'unspecified recipient';
              return (
                <li key={m.id}>
                  <Link
                    href={`/companion/matches/${m.id}`}
                    className="flex items-center gap-4 px-5 py-4 hover:bg-cream-deep/40 transition-colors group"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <CompanionMatchStatusPill
                          status={m.status}
                          companionResponded={Boolean(m.companionResponseAt)}
                        />
                        <time
                          dateTime={m.createdAt.toISOString()}
                          className="text-stone text-[0.75rem] font-mono"
                        >
                          {m.createdAt.toISOString().slice(0, 10)}
                        </time>
                      </div>
                      <div className="font-head text-moss text-[1.0625rem] font-medium break-words">
                        {m.family.billingName}
                        <span className="text-stone font-body font-normal text-[0.8125rem]">
                          {' '}· visiting {recipientLabel}
                        </span>
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
    </div>
  );
}

export function CompanionMatchStatusPill({
  status,
  companionResponded,
}: {
  status: MatchStatus;
  companionResponded: boolean;
}) {
  // Companion-facing copy. 'Proposed without response' becomes
  // 'Awaiting your reply'; 'Proposed + companion accepted' becomes
  // 'Awaiting family reply'.
  let label: string;
  let tone: string;
  if (status === 'proposed' && !companionResponded) {
    label = 'Awaiting your reply';
    tone = 'bg-terracotta/15 text-terracotta';
  } else if (status === 'proposed' && companionResponded) {
    label = 'Awaiting family';
    tone = 'bg-moss/10 text-moss';
  } else if (status === 'accepted') {
    label = 'Accepted';
    tone = 'bg-moss/15 text-moss';
  } else if (status === 'declined') {
    label = 'Declined';
    tone = 'bg-stone/15 text-stone';
  } else if (status === 'withdrawn') {
    label = 'Withdrawn';
    tone = 'bg-stone/15 text-stone';
  } else {
    label = 'Ended';
    tone = 'bg-charcoal/15 text-charcoal';
  }
  return (
    <span
      className={`inline-flex items-center font-body text-[0.6875rem] font-medium uppercase tracking-[0.08em] px-2 py-0.5 rounded ${tone}`}
    >
      {label}
    </span>
  );
}
