import Link from 'next/link';
import { Calendar, ChevronRight } from 'lucide-react';
import { type Prisma, type VisitState } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireFamilyMember } from '@/lib/auth-helpers';
import { formatUkDateTime, VISIT_STATE_LABEL } from '@/lib/visit-schedule';

export const metadata = { title: 'Visits' };

const FILTERS: { value: string; label: string }[] = [
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'past', label: 'Past' },
  { value: 'all', label: 'All' },
];

const UPCOMING_STATES: VisitState[] = ['scheduled', 'confirmed', 'en_route', 'in_progress'];
const PAST_STATES: VisitState[] = [
  'completed',
  'reported',
  'cancelled_by_family',
  'cancelled_by_companion',
  'cancelled_by_operator',
  'no_show_companion',
  'no_show_recipient',
];

export default async function FamilyVisitsPage({
  searchParams,
}: {
  searchParams: { filter?: string };
}) {
  const { family } = await requireFamilyMember('/family/visits');

  const raw = searchParams.filter ?? 'upcoming';
  const filter = FILTERS.some((f) => f.value === raw) ? raw : 'upcoming';

  const now = new Date();
  let where: Prisma.VisitWhereInput;
  let order: 'asc' | 'desc';
  if (filter === 'upcoming') {
    where = {
      familyId: family.id,
      state: { in: UPCOMING_STATES },
      scheduledStartAt: { gte: new Date(now.getTime() - 12 * 60 * 60 * 1000) },
    };
    order = 'asc';
  } else if (filter === 'past') {
    where = {
      familyId: family.id,
      state: { in: PAST_STATES },
    };
    order = 'desc';
  } else {
    where = { familyId: family.id };
    order = 'desc';
  }

  const [upcomingCount, pastCount, allCount, visits] = await Promise.all([
    prisma.visit.count({
      where: {
        familyId: family.id,
        state: { in: UPCOMING_STATES },
        scheduledStartAt: { gte: new Date(now.getTime() - 12 * 60 * 60 * 1000) },
      },
    }),
    prisma.visit.count({
      where: { familyId: family.id, state: { in: PAST_STATES } },
    }),
    prisma.visit.count({ where: { familyId: family.id } }),
    prisma.visit.findMany({
      where,
      orderBy: { scheduledStartAt: order },
      take: 100,
      include: {
        companion: { select: { firstName: true } },
        recipient: { select: { firstName: true, preferredName: true } },
      },
    }),
  ]);

  const counts: Record<string, number> = {
    upcoming: upcomingCount,
    past: pastCount,
    all: allCount,
  };

  return (
    <div>
      <header className="mb-6 flex items-center gap-3">
        <Calendar size={22} strokeWidth={1.75} className="text-moss" aria-hidden="true" />
        <h1 className="font-head font-normal text-moss text-[clamp(1.75rem,3vw,2.25rem)] leading-[1.1]">
          Visits
        </h1>
      </header>

      <nav aria-label="Filter" className="mb-6 flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const active = f.value === filter;
          return (
            <Link
              key={f.value}
              href={f.value === 'upcoming' ? '/family/visits' : `/family/visits?filter=${f.value}`}
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm border transition-colors ${
                active
                  ? 'bg-moss text-cream border-moss'
                  : 'bg-paper border-moss/15 text-charcoal hover:border-moss/30'
              }`}
              aria-current={active ? 'page' : undefined}
            >
              <span>{f.label}</span>
              <span className={`text-[0.7rem] font-medium ${active ? 'text-cream/70' : 'text-stone'}`}>
                {counts[f.value] ?? 0}
              </span>
            </Link>
          );
        })}
      </nav>

      <div className="bg-paper border border-moss/[0.08] rounded-[12px] overflow-hidden">
        {visits.length === 0 ? (
          <div className="px-6 py-12 text-center text-stone">
            No visits to show in <strong>{filter}</strong>.
          </div>
        ) : (
          <ul className="divide-y divide-moss/[0.08]">
            {visits.map((v) => (
              <li key={v.id}>
                <Link
                  href={`/family/visits/${v.id}`}
                  className="flex items-center gap-4 px-5 py-4 hover:bg-cream-deep/40 transition-colors group"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <FamilyVisitStatePill state={v.state} />
                      <time
                        dateTime={v.scheduledStartAt.toISOString()}
                        className="text-stone text-[0.8125rem] font-mono"
                      >
                        {formatUkDateTime(v.scheduledStartAt)}
                      </time>
                    </div>
                    <div className="font-head text-moss text-[1.0625rem] font-medium break-words">
                      {v.companion.firstName}{' '}
                      <span className="text-stone font-body font-normal text-[0.8125rem]">
                        with {v.recipient.preferredName || v.recipient.firstName}
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
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export function FamilyVisitStatePill({ state }: { state: VisitState }) {
  // Family-friendly state labels - softer than the operator pills.
  const label: Record<VisitState, string> = {
    scheduled: 'Scheduled',
    confirmed: 'Confirmed',
    en_route: 'On the way',
    in_progress: 'Happening now',
    completed: 'Visit done',
    reported: 'Visit done · note ready',
    cancelled_by_family: 'You cancelled',
    cancelled_by_companion: 'Companion cancelled',
    cancelled_by_operator: 'We cancelled',
    no_show_companion: VISIT_STATE_LABEL.no_show_companion!,
    no_show_recipient: VISIT_STATE_LABEL.no_show_recipient!,
  };
  const tone: Record<VisitState, string> = {
    scheduled: 'bg-moss/10 text-moss',
    confirmed: 'bg-moss/15 text-moss',
    en_route: 'bg-terracotta/15 text-terracotta',
    in_progress: 'bg-terracotta/15 text-terracotta',
    completed: 'bg-charcoal/10 text-charcoal',
    reported: 'bg-moss/15 text-moss',
    cancelled_by_family: 'bg-stone/15 text-stone',
    cancelled_by_companion: 'bg-stone/15 text-stone',
    cancelled_by_operator: 'bg-stone/15 text-stone',
    no_show_companion: 'bg-stone/15 text-stone',
    no_show_recipient: 'bg-stone/15 text-stone',
  };
  return (
    <span
      className={`inline-flex items-center font-body text-[0.6875rem] font-medium uppercase tracking-[0.08em] px-2 py-0.5 rounded ${tone[state]}`}
    >
      {label[state]}
    </span>
  );
}
