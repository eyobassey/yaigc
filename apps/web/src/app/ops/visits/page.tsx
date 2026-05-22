import Link from 'next/link';
import { Calendar, ChevronRight } from 'lucide-react';
import { type Prisma, type VisitState } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { formatUkDateTime, VISIT_STATE_LABEL, ukLocalDayBounds } from '@/lib/visit-schedule';
import { Paginator } from '@/components/ui/Paginator';
import { parsePagination, buildView } from '@/lib/pagination';

export const metadata = { title: 'Visits' };

const FILTERS: { value: string; label: string }[] = [
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'today', label: 'Today' },
  { value: 'needs-report', label: 'Needs report' },
  { value: 'past', label: 'Past' },
  { value: 'cancelled', label: 'Cancelled / no show' },
  { value: 'all', label: 'All' },
];

const TERMINAL_STATES: VisitState[] = [
  'completed',
  'reported',
  'cancelled_by_family',
  'cancelled_by_companion',
  'cancelled_by_operator',
  'no_show_companion',
  'no_show_recipient',
];

const CANCELLED_STATES: VisitState[] = [
  'cancelled_by_family',
  'cancelled_by_companion',
  'cancelled_by_operator',
  'no_show_companion',
  'no_show_recipient',
];

export default async function OpsVisitsPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const rawFilter = (searchParams.filter as string) ?? 'upcoming';
  const filter = FILTERS.some((f) => f.value === rawFilter) ? rawFilter : 'upcoming';

  const now = new Date();
  const { startUtc: startOfToday, endUtc: endOfToday } = ukLocalDayBounds(now);

  let where: Prisma.VisitWhereInput = {};
  let orderDirection: 'asc' | 'desc' = 'asc';

  if (filter === 'upcoming') {
    where = { scheduledStartAt: { gte: now }, state: { notIn: CANCELLED_STATES } };
    orderDirection = 'asc';
  } else if (filter === 'today') {
    where = { scheduledStartAt: { gte: startOfToday, lt: endOfToday } };
    orderDirection = 'asc';
  } else if (filter === 'needs-report') {
    where = { state: 'completed', report: null };
    orderDirection = 'desc';
  } else if (filter === 'past') {
    where = { scheduledStartAt: { lt: now }, state: { in: TERMINAL_STATES.filter((s) => !CANCELLED_STATES.includes(s)) } };
    orderDirection = 'desc';
  } else if (filter === 'cancelled') {
    where = { state: { in: CANCELLED_STATES } };
    orderDirection = 'desc';
  }

  const state = parsePagination(searchParams, { pageSize: 25 });
  const [counts, total, visits] = await Promise.all([
    Promise.all([
      prisma.visit.count({ where: { scheduledStartAt: { gte: now }, state: { notIn: CANCELLED_STATES } } }),
      prisma.visit.count({ where: { scheduledStartAt: { gte: startOfToday, lt: endOfToday } } }),
      prisma.visit.count({ where: { state: 'completed', report: null } }),
      prisma.visit.count({ where: { scheduledStartAt: { lt: now }, state: { in: TERMINAL_STATES.filter((s) => !CANCELLED_STATES.includes(s)) } } }),
      prisma.visit.count({ where: { state: { in: CANCELLED_STATES } } }),
      prisma.visit.count(),
    ]),
    prisma.visit.count({ where }),
    prisma.visit.findMany({
      where,
      orderBy: { scheduledStartAt: orderDirection },
      skip: state.skip,
      take: state.pageSize,
      include: {
        family: { select: { id: true, billingName: true } },
        companion: { select: { firstName: true, lastName: true } },
        recipient: { select: { firstName: true, preferredName: true } },
      },
    }),
  ]);
  const view = buildView(state, total);

  const [upcomingCount, todayCount, needsReportCount, pastCount, cancelledCount, allCount] = counts;
  const countByFilter: Record<string, number> = {
    upcoming: upcomingCount,
    today: todayCount,
    'needs-report': needsReportCount,
    past: pastCount,
    cancelled: cancelledCount,
    all: allCount,
  };

  return (
    <div>
      <header className="mb-6 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <Calendar size={22} strokeWidth={1.75} className="text-moss" aria-hidden="true" />
          <h1 className="font-head font-normal text-moss text-[clamp(1.75rem,3vw,2.25rem)] leading-[1.1]">
            Visits
          </h1>
        </div>
        <Link
          href="/ops/visits/calendar"
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border border-moss/20 text-moss text-sm hover:bg-moss/5 transition-colors"
        >
          <Calendar size={14} strokeWidth={1.75} aria-hidden="true" />
          Week view
        </Link>
      </header>

      <nav aria-label="Visit filter" className="mb-6 flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const active = f.value === filter;
          return (
            <Link
              key={f.value}
              href={f.value === 'upcoming' ? '/ops/visits' : `/ops/visits?filter=${f.value}`}
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm border transition-colors ${
                active
                  ? 'bg-moss text-cream border-moss'
                  : 'bg-paper border-moss/15 text-charcoal hover:border-moss/30'
              }`}
              aria-current={active ? 'page' : undefined}
            >
              <span>{f.label}</span>
              <span
                className={`text-[0.7rem] font-medium tracking-[0.04em] ${
                  active ? 'text-cream/70' : 'text-stone'
                }`}
              >
                {countByFilter[f.value] ?? 0}
              </span>
            </Link>
          );
        })}
      </nav>

      <div className="bg-paper border border-moss/[0.08] rounded-[12px] overflow-hidden">
        {visits.length === 0 ? (
          <div className="px-6 py-12 text-center text-stone">
            No visits in <strong>{filter}</strong>.
          </div>
        ) : (
          <ul className="divide-y divide-moss/[0.08]">
            {visits.map((v) => (
              <li key={v.id}>
                <Link
                  href={`/ops/visits/${v.id}`}
                  className="flex items-center gap-4 px-5 py-4 hover:bg-cream-deep/40 transition-colors group"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <VisitStatePill state={v.state} />
                      <time
                        dateTime={v.scheduledStartAt.toISOString()}
                        className="text-stone text-[0.8125rem] font-mono"
                      >
                        {formatUkDateTime(v.scheduledStartAt)}
                      </time>
                    </div>
                    <div className="font-head text-moss text-[1.0625rem] font-medium break-words">
                      {v.companion.firstName} {v.companion.lastName}
                      <span className="text-stone font-body font-normal mx-2">·</span>
                      {v.recipient.preferredName || v.recipient.firstName}
                    </div>
                    <div className="text-stone text-[0.875rem] mt-0.5">
                      {v.family.billingName} · {v.scheduledDurationMinutes} min
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

      <Paginator
        basePath="/ops/visits"
        searchParams={searchParams}
        view={view}
        label="visit"
      />
    </div>
  );
}

export function VisitStatePill({ state }: { state: VisitState }) {
  const tone: Record<VisitState, string> = {
    scheduled: 'bg-moss/10 text-moss',
    confirmed: 'bg-moss/15 text-moss',
    en_route: 'bg-terracotta/15 text-terracotta',
    in_progress: 'bg-terracotta/15 text-terracotta',
    completed: 'bg-charcoal/10 text-charcoal',
    reported: 'bg-charcoal/10 text-charcoal',
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
      {VISIT_STATE_LABEL[state] ?? state}
    </span>
  );
}
