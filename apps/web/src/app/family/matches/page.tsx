import Link from 'next/link';
import { Sparkles, ChevronRight } from 'lucide-react';
import { type MatchStatus, type Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireFamilyMember } from '@/lib/auth-helpers';
import { Paginator } from '@/components/ui/Paginator';
import { parsePagination, buildView } from '@/lib/pagination';

export const metadata = { title: 'Matches' };

const FILTERS: { value: 'open' | 'accepted' | 'declined' | 'all'; label: string }[] = [
  { value: 'open', label: 'Awaiting your response' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'declined', label: 'Past' },
  { value: 'all', label: 'All' },
];

export default async function FamilyMatchesPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const { family } = await requireFamilyMember('/family/matches');

  const raw = (searchParams.status as string) ?? 'open';
  const status = (FILTERS.find((f) => f.value === raw)?.value ?? 'open') as
    | 'open'
    | 'accepted'
    | 'declined'
    | 'all';

  let where: Prisma.MatchWhereInput;
  if (status === 'open') {
    where = { familyId: family.id, status: 'proposed', familyResponseAt: null };
  } else if (status === 'accepted') {
    where = { familyId: family.id, status: 'accepted' };
  } else if (status === 'declined') {
    where = {
      familyId: family.id,
      status: { in: ['declined', 'withdrawn', 'ended'] as MatchStatus[] },
    };
  } else {
    where = { familyId: family.id };
  }

  const pagination = parsePagination(searchParams, { pageSize: 20 });
  const [openCount, acceptedCount, pastCount, allCount, total, matches] = await Promise.all([
    prisma.match.count({
      where: { familyId: family.id, status: 'proposed', familyResponseAt: null },
    }),
    prisma.match.count({ where: { familyId: family.id, status: 'accepted' } }),
    prisma.match.count({
      where: {
        familyId: family.id,
        status: { in: ['declined', 'withdrawn', 'ended'] as MatchStatus[] },
      },
    }),
    prisma.match.count({ where: { familyId: family.id } }),
    prisma.match.count({ where }),
    prisma.match.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: pagination.skip,
      take: pagination.pageSize,
      include: {
        companion: { select: { firstName: true, borough: true } },
        recipient: { select: { firstName: true, preferredName: true } },
      },
    }),
  ]);
  const view = buildView(pagination, total);

  const counts: Record<string, number> = {
    open: openCount,
    accepted: acceptedCount,
    declined: pastCount,
    all: allCount,
  };

  return (
    <div>
      <header className="mb-6 flex items-center gap-3">
        <Sparkles size={22} strokeWidth={1.75} className="text-terracotta" aria-hidden="true" />
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
              href={f.value === 'open' ? '/family/matches' : `/family/matches?status=${f.value}`}
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
            {status === 'open' ? (
              <>
                No match to look at right now. When we have someone in mind, you will see them here and we will email you.
              </>
            ) : (
              <>Nothing to show in <strong>{status}</strong>.</>
            )}
          </div>
        ) : (
          <ul className="divide-y divide-moss/[0.08]">
            {matches.map((m) => {
              const recipientLabel = m.recipient
                ? m.recipient.preferredName || m.recipient.firstName
                : 'your household';
              return (
                <li key={m.id}>
                  <Link
                    href={`/family/matches/${m.id}`}
                    className="flex items-center gap-4 px-5 py-4 hover:bg-cream-deep/40 transition-colors group"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <FamilyMatchStatusPill
                          status={m.status}
                          familyResponded={Boolean(m.familyResponseAt)}
                        />
                        <time
                          dateTime={m.createdAt.toISOString()}
                          className="text-stone text-[0.75rem] font-mono"
                        >
                          {m.createdAt.toISOString().slice(0, 10)}
                        </time>
                      </div>
                      <div className="font-head text-moss text-[1.0625rem] font-medium break-words">
                        {m.companion.firstName}
                        <span className="text-stone font-body font-normal text-[0.8125rem]">
                          {' '}for {recipientLabel} · {m.companion.borough.replace(/_/g, ' ')}
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

      <Paginator
        basePath="/family/matches"
        searchParams={searchParams}
        view={view}
        label="match"
        labelPlural="matches"
      />
    </div>
  );
}

export function FamilyMatchStatusPill({
  status,
  familyResponded,
}: {
  status: MatchStatus;
  familyResponded: boolean;
}) {
  let label: string;
  let tone: string;
  if (status === 'proposed' && !familyResponded) {
    label = 'Awaiting your reply';
    tone = 'bg-terracotta/15 text-terracotta';
  } else if (status === 'proposed' && familyResponded) {
    label = 'Awaiting companion';
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
