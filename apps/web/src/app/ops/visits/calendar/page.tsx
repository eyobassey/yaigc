import Link from 'next/link';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { requireOperator } from '@/lib/auth-helpers';
import { ukLocalDayBounds, formatUkTime } from '@/lib/visit-schedule';
import { VisitStatePill } from '../page';

export const metadata = { title: 'Visit calendar' };

// Week-at-a-glance calendar for scheduling. The flat /ops/visits list
// makes it hard to spot clashes and gaps; this view shows 7 days side
// by side with visits bucketed under each one. Navigation jumps a
// whole week at a time; the URL carries an anchor date so links are
// shareable and the current view is bookmarkable.

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function parseAnchor(raw: string | undefined): Date {
  if (raw && /^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const parts = raw.split('-').map(Number);
    const y = parts[0] ?? 0;
    const m = parts[1] ?? 1;
    const d = parts[2] ?? 1;
    const v = new Date(Date.UTC(y, m - 1, d));
    if (!Number.isNaN(v.getTime())) return v;
  }
  return new Date();
}

function ukMondayOfWeekUTC(anchor: Date): Date {
  // Use UK-local day boundaries so the "Monday" we pick respects BST.
  // We find the UK-local weekday of the anchor and step back.
  const dayName = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London',
    weekday: 'short',
  }).format(anchor);
  const idx = DAY_NAMES.indexOf(dayName);
  const back = idx >= 0 ? idx : 0; // Sun -> 6 already handled because Sun isn't in DAY_NAMES; treat as back=6
  const safeBack = dayName === 'Sun' ? 6 : back;
  const stepped = new Date(anchor.getTime() - safeBack * 24 * 60 * 60 * 1000);
  return ukLocalDayBounds(stepped).startUtc;
}

function addDays(d: Date, n: number): Date {
  return new Date(d.getTime() + n * 24 * 60 * 60 * 1000);
}

function ymd(d: Date): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(d);
  const o: Record<string, string> = {};
  for (const p of parts) o[p.type] = p.value;
  return `${o.year}-${o.month}-${o.day}`;
}

function formatHeader(d: Date): string {
  return d.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'Europe/London',
  });
}

export default async function OpsVisitCalendarPage({
  searchParams,
}: {
  searchParams: { week?: string };
}) {
  await requireOperator('/ops/visits/calendar');

  const anchor = parseAnchor(searchParams.week);
  const monday = ukMondayOfWeekUTC(anchor);
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(monday, i);
    const { startUtc, endUtc } = ukLocalDayBounds(d);
    return { startUtc, endUtc, label: formatHeader(startUtc), key: ymd(startUtc) };
  });

  const weekStart = days[0]!.startUtc;
  const weekEnd = days[6]!.endUtc;

  const visits = await prisma.visit.findMany({
    where: {
      scheduledStartAt: { gte: weekStart, lt: weekEnd },
    },
    orderBy: { scheduledStartAt: 'asc' },
    select: {
      id: true,
      scheduledStartAt: true,
      scheduledDurationMinutes: true,
      state: true,
      companion: { select: { firstName: true, lastName: true } },
      recipient: { select: { firstName: true, preferredName: true } },
      family: { select: { billingName: true } },
    },
  });

  // Bucket visits by their UK-local day.
  const byDay = new Map<string, typeof visits>();
  for (const v of visits) {
    const key = ymd(v.scheduledStartAt);
    const arr = byDay.get(key) ?? [];
    arr.push(v);
    byDay.set(key, arr);
  }

  const prev = ymd(addDays(monday, -7));
  const next = ymd(addDays(monday, 7));
  const todayYmd = ymd(new Date());

  return (
    <div className="max-w-[1400px]">
      <header className="mb-6 flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <CalendarIcon size={22} strokeWidth={1.75} className="text-moss" aria-hidden="true" />
          <h1 className="font-head font-normal text-moss text-[clamp(1.5rem,3vw,2rem)] leading-[1.1]">
            Visit calendar
          </h1>
        </div>
        <nav className="flex items-center gap-1" aria-label="Week navigation">
          <Link
            href={`/ops/visits/calendar?week=${prev}`}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-moss/15 text-charcoal text-sm hover:bg-moss/5 transition-colors"
            aria-label="Previous week"
          >
            <ChevronLeft size={14} strokeWidth={1.75} aria-hidden="true" />
            Prev
          </Link>
          <Link
            href={`/ops/visits/calendar?week=${todayYmd}`}
            className="px-3 py-1.5 rounded-md border border-moss/15 text-charcoal text-sm hover:bg-moss/5 transition-colors"
          >
            This week
          </Link>
          <Link
            href={`/ops/visits/calendar?week=${next}`}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-moss/15 text-charcoal text-sm hover:bg-moss/5 transition-colors"
            aria-label="Next week"
          >
            Next
            <ChevronRight size={14} strokeWidth={1.75} aria-hidden="true" />
          </Link>
          <Link
            href="/ops/visits"
            className="ml-2 text-stone hover:text-moss text-sm transition-colors"
          >
            Back to list
          </Link>
        </nav>
      </header>

      <p className="text-stone text-[0.875rem] mb-4">
        Week of <span className="font-mono text-charcoal">{ymd(weekStart)}</span>
        {' · '}
        {visits.length} {visits.length === 1 ? 'visit' : 'visits'}
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-7 gap-3 bg-paper border border-moss/[0.08] rounded-[12px] p-3">
        {days.map((day) => {
          const list = byDay.get(day.key) ?? [];
          const isToday = day.key === todayYmd;
          return (
            <section
              key={day.key}
              className={`flex flex-col gap-2 min-h-[120px] p-2 rounded-md ${
                isToday ? 'bg-moss/5 border border-moss/15' : 'bg-cream-deep/40'
              }`}
            >
              <header className="flex items-baseline justify-between gap-2">
                <h2 className="font-body text-[0.8125rem] font-medium text-charcoal">
                  {day.label}
                </h2>
                {list.length > 0 ? (
                  <span className="text-stone text-[0.7rem] font-mono">
                    {list.length}
                  </span>
                ) : null}
              </header>
              {list.length === 0 ? (
                <p className="text-stone/50 text-[0.75rem] italic">-</p>
              ) : (
                <ul className="flex flex-col gap-1.5">
                  {list.map((v) => {
                    const recip = v.recipient
                      ? v.recipient.preferredName || v.recipient.firstName
                      : 'household';
                    return (
                      <li key={v.id}>
                        <Link
                          href={`/ops/visits/${v.id}`}
                          className="block bg-paper border border-moss/[0.08] rounded-md px-2 py-1.5 hover:border-moss/25 hover:shadow-sm transition-all"
                        >
                          <div className="flex items-center justify-between gap-1 mb-0.5">
                            <span className="text-charcoal text-[0.75rem] font-mono">
                              {formatUkTime(v.scheduledStartAt)}
                            </span>
                            <VisitStatePill state={v.state} />
                          </div>
                          <div className="text-charcoal text-[0.8125rem] truncate">
                            {v.companion.firstName} - {recip}
                          </div>
                          <div className="text-stone text-[0.7rem] truncate">
                            {v.family.billingName}
                          </div>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
