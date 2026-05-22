import Link from 'next/link';
import { Calendar, ChevronRight } from 'lucide-react';
import { type Prisma, type VisitState } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireCompanion } from '@/lib/auth-helpers';
import { formatUkDateTime, ukLocalDayBounds } from '@/lib/visit-schedule';
import { CompanionVisitStatePill } from './_pill';
import { Paginator } from '@/components/ui/Paginator';
import { parsePagination, buildView } from '@/lib/pagination';

export const metadata = { title: 'Visits' };

const FILTERS: { value: string; label: string }[] = [
  { value: 'today', label: 'Today' },
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

export default async function CompanionVisitsPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const { companion } = await requireCompanion('/companion/visits');

  const rawFilter = (searchParams.filter as string) ?? 'upcoming';
  const filter = FILTERS.some((f) => f.value === rawFilter) ? rawFilter : 'upcoming';

  const now = new Date();
  const { startUtc: todayStart, endUtc: todayEnd } = ukLocalDayBounds(now);
  const upcomingGrace = new Date(now.getTime() - 12 * 60 * 60 * 1000);

  let where: Prisma.VisitWhereInput = { companionId: companion.id };
  let order: 'asc' | 'desc' = 'asc';
  if (filter === 'today') {
    where = { ...where, scheduledStartAt: { gte: todayStart, lt: todayEnd } };
    order = 'asc';
  } else if (filter === 'upcoming') {
    where = {
      ...where,
      state: { in: UPCOMING_STATES },
      scheduledStartAt: { gte: upcomingGrace },
    };
    order = 'asc';
  } else if (filter === 'past') {
    where = { ...where, state: { in: PAST_STATES } };
    order = 'desc';
  } else {
    order = 'desc';
  }

  const pagination = parsePagination(searchParams, { pageSize: 20 });
  const [todayCount, upcomingCount, pastCount, allCount, total, visits] = await Promise.all([
    prisma.visit.count({
      where: {
        companionId: companion.id,
        scheduledStartAt: { gte: todayStart, lt: todayEnd },
      },
    }),
    prisma.visit.count({
      where: {
        companionId: companion.id,
        state: { in: UPCOMING_STATES },
        scheduledStartAt: { gte: upcomingGrace },
      },
    }),
    prisma.visit.count({
      where: { companionId: companion.id, state: { in: PAST_STATES } },
    }),
    prisma.visit.count({ where: { companionId: companion.id } }),
    prisma.visit.count({ where }),
    prisma.visit.findMany({
      where,
      orderBy: { scheduledStartAt: order },
      skip: pagination.skip,
      take: pagination.pageSize,
      include: {
        recipient: { select: { firstName: true, preferredName: true, addressCity: true } },
        family: { select: { billingName: true } },
      },
    }),
  ]);
  const view = buildView(pagination, total);

  const counts: Record<string, number> = {
    today: todayCount,
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
              href={
                f.value === 'upcoming'
                  ? '/companion/visits'
                  : `/companion/visits?filter=${f.value}`
              }
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
        {visits.length === 0 ? (
          <div className="px-6 py-12 text-center text-stone">
            No visits to show in <strong>{filter}</strong>.
          </div>
        ) : (
          <ul className="divide-y divide-moss/[0.08]">
            {visits.map((v) => {
              const name = v.recipient.preferredName || v.recipient.firstName;
              return (
                <li key={v.id}>
                  <Link
                    href={`/companion/visits/${v.id}`}
                    className="flex items-center gap-4 px-5 py-4 hover:bg-cream-deep/40 transition-colors group"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <CompanionVisitStatePill state={v.state} />
                        <time
                          dateTime={v.scheduledStartAt.toISOString()}
                          className="text-stone text-[0.8125rem] font-mono"
                        >
                          {formatUkDateTime(v.scheduledStartAt)}
                        </time>
                      </div>
                      <div className="font-head text-moss text-[1.0625rem] font-medium break-words">
                        {name}{' '}
                        <span className="text-stone font-body font-normal text-[0.8125rem]">
                          ({v.family.billingName})
                        </span>
                      </div>
                      {v.recipient.addressCity ? (
                        <div className="text-stone text-[0.8125rem] mt-0.5">
                          {v.recipient.addressCity}
                        </div>
                      ) : null}
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
        basePath="/companion/visits"
        searchParams={searchParams}
        view={view}
        label="visit"
      />
    </div>
  );
}
