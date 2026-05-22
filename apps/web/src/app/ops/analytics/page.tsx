import { BarChart3, Sparkles, Calendar, ShieldAlert, Heart, Users } from 'lucide-react';
import type { VisitState, SafeguardingSeverity } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireOperator } from '@/lib/auth-helpers';
import { tierFromVisits } from '@/lib/badges';
import { LineChart, Funnel, StackedBar, MetricCard } from './_charts';

export const metadata = { title: 'Analytics' };

const DAY_MS = 24 * 60 * 60 * 1000;

function weeksBackBounds(weeks: number): { weekStart: Date; weekEnd: Date }[] {
  const now = new Date();
  // Anchor the "current" week at midnight UTC of today, then walk back.
  const today = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  const list: { weekStart: Date; weekEnd: Date }[] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const weekStart = new Date(today.getTime() - i * 7 * DAY_MS);
    const weekEnd = new Date(weekStart.getTime() + 7 * DAY_MS);
    list.push({ weekStart, weekEnd });
  }
  return list;
}

function shortWeekLabel(d: Date): string {
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function pct(value: number): string {
  if (!Number.isFinite(value)) return '-';
  return `${value.toFixed(0)}%`;
}

function hoursLabel(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return '-';
  const hours = ms / (60 * 60 * 1000);
  if (hours < 24) return `${hours.toFixed(1)} h`;
  return `${(hours / 24).toFixed(1)} d`;
}

function median(arr: number[]): number {
  if (arr.length === 0) return NaN;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1]! + sorted[mid]!) / 2
    : sorted[mid]!;
}

const STATE_GROUPS: Record<string, VisitState[]> = {
  completed: ['completed', 'reported'],
  cancelled: ['cancelled_by_family', 'cancelled_by_companion', 'cancelled_by_operator'],
  no_show: ['no_show_companion', 'no_show_recipient'],
};

const SEVERITY_TONES: Record<SafeguardingSeverity, string> = {
  low: '#9BAA8C',     // sage
  medium: '#C97B5F',  // terracotta
  high: '#A14A30',    // deeper terracotta
  critical: '#7C2A18', // wine
};

const NINETY_DAYS_AGO = (): Date => new Date(Date.now() - 90 * DAY_MS);
const THIRTY_DAYS_AGO = (): Date => new Date(Date.now() - 30 * DAY_MS);

export default async function OpsAnalyticsPage() {
  await requireOperator('/ops/analytics');

  const since90 = NINETY_DAYS_AGO();
  const since30 = THIRTY_DAYS_AGO();
  const weeks12 = weeksBackBounds(12);

  // --- Run every query in parallel. Each block is small. ---
  const [
    enquiriesIn90,
    familiesIn90,
    matchesIn90,
    subsIn90,
    weeklyVisits,
    recentVisitStates,
    reportLagSet,
    familyResponses,
    companionResponses,
    acceptedMatchesIn90,
    weeklyCases,
    openCasesBySeverity,
    closedCasesIn90,
    activeCompanions,
    companionStatusCounts,
  ] = await Promise.all([
    prisma.enquiry.count({ where: { createdAt: { gte: since90 } } }),
    prisma.family.count({ where: { createdAt: { gte: since90 } } }),
    prisma.match.count({ where: { createdAt: { gte: since90 } } }),
    prisma.subscription.count({ where: { createdAt: { gte: since90 } } }),

    Promise.all(
      weeks12.map(async ({ weekStart, weekEnd }) => {
        const c = await prisma.visit.count({
          where: { scheduledStartAt: { gte: weekStart, lt: weekEnd } },
        });
        return { label: shortWeekLabel(weekStart), value: c, weekStart };
      }),
    ),

    Promise.all(
      (Object.keys(STATE_GROUPS) as Array<keyof typeof STATE_GROUPS>).map(
        async (group) => {
          const c = await prisma.visit.count({
            where: {
              scheduledStartAt: { gte: since30 },
              state: { in: STATE_GROUPS[group] },
            },
          });
          return { group, count: c };
        },
      ),
    ),

    prisma.postVisitReport.findMany({
      where: { createdAt: { gte: since30 } },
      select: {
        createdAt: true,
        visit: {
          select: {
            scheduledStartAt: true,
            scheduledDurationMinutes: true,
            actualEndAt: true,
          },
        },
      },
    }),

    prisma.match.groupBy({
      by: ['status'],
      where: {
        familyResponseAt: { not: null, gte: since90 },
      },
      _count: { _all: true },
    }),
    prisma.match.groupBy({
      by: ['status'],
      where: {
        companionResponseAt: { not: null, gte: since90 },
      },
      _count: { _all: true },
    }),

    prisma.match.findMany({
      where: {
        status: 'accepted',
        createdAt: { gte: since90 },
        familyResponseAt: { not: null },
        companionResponseAt: { not: null },
      },
      select: {
        createdAt: true,
        familyResponseAt: true,
        companionResponseAt: true,
      },
    }),

    Promise.all(
      weeks12.map(async ({ weekStart, weekEnd }) => {
        const c = await prisma.safeguardingCase.count({
          where: { openedAt: { gte: weekStart, lt: weekEnd } },
        });
        return { label: shortWeekLabel(weekStart), value: c };
      }),
    ),

    prisma.safeguardingCase.groupBy({
      by: ['severity'],
      where: { status: { in: ['open', 'under_review', 'actioned'] } },
      _count: { _all: true },
    }),

    prisma.safeguardingCase.findMany({
      where: { status: 'closed', closedAt: { not: null, gte: since90 } },
      select: { openedAt: true, closedAt: true },
    }),

    prisma.companion.findMany({
      where: { deletedAt: null, status: { in: ['onboarding', 'active'] } },
      select: {
        id: true,
        status: true,
        _count: {
          select: {
            visits: { where: { state: { in: ['completed', 'reported'] } } },
          },
        },
      },
    }),

    prisma.companion.groupBy({
      by: ['status'],
      where: { deletedAt: null },
      _count: { _all: true },
    }),
  ]);

  // --- Acquisition funnel ---
  const funnelStages = [
    { label: 'Enquiries', count: enquiriesIn90 },
    { label: 'Families', count: familiesIn90 },
    { label: 'Matches proposed', count: matchesIn90 },
    { label: 'Subscriptions', count: subsIn90 },
  ];

  // --- Visit health ---
  const visitsPerWeek = weeklyVisits.map((w) => ({ label: w.label, value: w.value }));
  const visitTotal30 = recentVisitStates.reduce((s, x) => s + x.count, 0);
  const stateSegments = [
    {
      label: 'Completed',
      count: recentVisitStates.find((x) => x.group === 'completed')?.count ?? 0,
      color: '#3C5A3A',
    },
    {
      label: 'Cancelled',
      count: recentVisitStates.find((x) => x.group === 'cancelled')?.count ?? 0,
      color: '#C97B5F',
    },
    {
      label: 'No-show',
      count: recentVisitStates.find((x) => x.group === 'no_show')?.count ?? 0,
      color: '#A14A30',
    },
  ];
  const lagsMs = reportLagSet
    .map((r) => {
      const endTs =
        r.visit.actualEndAt?.getTime() ??
        r.visit.scheduledStartAt.getTime() +
          r.visit.scheduledDurationMinutes * 60 * 1000;
      return r.createdAt.getTime() - endTs;
    })
    .filter((v) => v >= 0);
  const lagMedian = median(lagsMs);

  // --- Match quality ---
  const familyAccepted = familyResponses
    .filter((g) => g.status === 'accepted')
    .reduce((s, g) => s + g._count._all, 0);
  const familyResponded = familyResponses.reduce((s, g) => s + g._count._all, 0);
  const familyAcceptRate = familyResponded === 0 ? NaN : (familyAccepted / familyResponded) * 100;
  const companionAccepted = companionResponses
    .filter((g) => g.status === 'accepted')
    .reduce((s, g) => s + g._count._all, 0);
  const companionResponded = companionResponses.reduce((s, g) => s + g._count._all, 0);
  const companionAcceptRate =
    companionResponded === 0 ? NaN : (companionAccepted / companionResponded) * 100;
  const acceptDurations = acceptedMatchesIn90.map((m) => {
    const lastResp = Math.max(
      m.familyResponseAt!.getTime(),
      m.companionResponseAt!.getTime(),
    );
    return lastResp - m.createdAt.getTime();
  });
  const acceptMedian = median(acceptDurations);

  // --- Safeguarding trend ---
  const casesPerWeek = weeklyCases;
  const severityTotal = openCasesBySeverity.reduce((s, x) => s + x._count._all, 0);
  const severitySegments = (['critical', 'high', 'medium', 'low'] as SafeguardingSeverity[]).map(
    (sev) => ({
      label: sev.charAt(0).toUpperCase() + sev.slice(1),
      count: openCasesBySeverity.find((x) => x.severity === sev)?._count._all ?? 0,
      color: SEVERITY_TONES[sev],
    }),
  );
  const closeDurations = closedCasesIn90
    .filter((c) => c.closedAt)
    .map((c) => c.closedAt!.getTime() - c.openedAt.getTime());
  const closeMedian = median(closeDurations);

  // --- Companion roster ---
  type Tier = 'gold' | 'silver' | 'bronze' | 'none';
  const tierCounts: Record<Tier, number> = { gold: 0, silver: 0, bronze: 0, none: 0 };
  for (const c of activeCompanions) {
    const t = tierFromVisits(c._count.visits).tier ?? 'none';
    tierCounts[t as Tier] += 1;
  }
  const tierSegments = [
    { label: 'Gold (100+)', count: tierCounts.gold, color: '#bf8b2d' },
    { label: 'Silver (25+)', count: tierCounts.silver, color: '#8B8680' },
    { label: 'Bronze (5+)', count: tierCounts.bronze, color: '#C97B5F' },
    { label: 'Under 5', count: tierCounts.none, color: '#D8D2C2' },
  ];
  const statusTotal = companionStatusCounts.reduce((s, x) => s + x._count._all, 0);
  const statusSegments = [
    {
      label: 'Active',
      count: companionStatusCounts.find((x) => x.status === 'active')?._count._all ?? 0,
      color: '#3C5A3A',
    },
    {
      label: 'Onboarding',
      count: companionStatusCounts.find((x) => x.status === 'onboarding')?._count._all ?? 0,
      color: '#9BAA8C',
    },
    {
      label: 'Suspended',
      count: companionStatusCounts.find((x) => x.status === 'suspended')?._count._all ?? 0,
      color: '#C97B5F',
    },
    {
      label: 'Archived',
      count: companionStatusCounts.find((x) => x.status === 'archived')?._count._all ?? 0,
      color: '#8B8680',
    },
  ];

  return (
    <div>
      <header className="mb-6 flex items-center gap-3">
        <BarChart3 size={22} strokeWidth={1.75} className="text-moss" aria-hidden="true" />
        <h1 className="font-head font-normal text-moss text-[clamp(1.75rem,3vw,2.25rem)] leading-[1.1]">
          Analytics
        </h1>
      </header>
      <p className="text-charcoal text-[0.9375rem] leading-[1.55] max-w-[70ch] mb-8">
        Trends over time. The Today dashboard is the tactical view; this is
        the strategic one. Revenue + churn land once Stripe is wired.
      </p>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Acquisition funnel */}
        <section className="bg-paper border border-moss/[0.08] rounded-[12px] p-5 sm:p-6">
          <h2 className="font-body text-[0.75rem] font-medium uppercase tracking-[0.1em] text-stone mb-3 flex items-center gap-2">
            <Sparkles size={14} strokeWidth={1.75} className="text-moss" aria-hidden="true" />
            Acquisition (last 90 days)
          </h2>
          <Funnel stages={funnelStages} />
          <p className="text-stone text-[0.8125rem] mt-3">
            Each step shows count + conversion from the previous. Enquiries
            are counted at point of submission, subscriptions at the first
            active visit.
          </p>
        </section>

        {/* Visit health */}
        <section className="bg-paper border border-moss/[0.08] rounded-[12px] p-5 sm:p-6">
          <h2 className="font-body text-[0.75rem] font-medium uppercase tracking-[0.1em] text-stone mb-3 flex items-center gap-2">
            <Calendar size={14} strokeWidth={1.75} className="text-moss" aria-hidden="true" />
            Visit health
          </h2>
          <div className="text-stone text-[0.8125rem] mb-2">
            Scheduled visits per week (last 12 weeks)
          </div>
          <LineChart points={visitsPerWeek} />
          <div className="text-stone text-[0.8125rem] mt-4 mb-2">
            Outcomes (last 30 days, {visitTotal30} visits)
          </div>
          <StackedBar segments={stateSegments} />
          <div className="grid grid-cols-2 gap-3 mt-4">
            <MetricCard
              label="Median report lag"
              value={hoursLabel(lagMedian)}
              hint="From visit end to report submission"
            />
            <MetricCard
              label="Reports last 30d"
              value={reportLagSet.length}
            />
          </div>
        </section>

        {/* Match quality */}
        <section className="bg-paper border border-moss/[0.08] rounded-[12px] p-5 sm:p-6">
          <h2 className="font-body text-[0.75rem] font-medium uppercase tracking-[0.1em] text-stone mb-3 flex items-center gap-2">
            <Sparkles size={14} strokeWidth={1.75} className="text-terracotta" aria-hidden="true" />
            Match quality (last 90 days)
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <MetricCard
              label="Family accept rate"
              value={pct(familyAcceptRate)}
              hint={`${familyAccepted} of ${familyResponded} responses`}
            />
            <MetricCard
              label="Companion accept rate"
              value={pct(companionAcceptRate)}
              hint={`${companionAccepted} of ${companionResponded} responses`}
            />
            <MetricCard
              label="Median time to accept"
              value={hoursLabel(acceptMedian)}
              hint={`${acceptedMatchesIn90.length} accepted`}
            />
            <MetricCard
              label="Match → Subscription"
              value={pct(matchesIn90 === 0 ? NaN : (subsIn90 / matchesIn90) * 100)}
              hint="Subscriptions created in window"
            />
          </div>
        </section>

        {/* Safeguarding */}
        <section className="bg-paper border border-moss/[0.08] rounded-[12px] p-5 sm:p-6">
          <h2 className="font-body text-[0.75rem] font-medium uppercase tracking-[0.1em] text-stone mb-3 flex items-center gap-2">
            <ShieldAlert size={14} strokeWidth={1.75} className="text-red-700" aria-hidden="true" />
            Safeguarding
          </h2>
          <div className="text-stone text-[0.8125rem] mb-2">
            Cases opened per week (last 12 weeks)
          </div>
          <LineChart points={casesPerWeek} color="#A14A30" />
          <div className="text-stone text-[0.8125rem] mt-4 mb-2">
            Open cases by severity ({severityTotal} open)
          </div>
          <StackedBar segments={severitySegments} />
          <div className="grid grid-cols-2 gap-3 mt-4">
            <MetricCard
              label="Median time to close"
              value={hoursLabel(closeMedian)}
              hint={`${closedCasesIn90.length} closed in window`}
            />
            <MetricCard
              label="Open right now"
              value={severityTotal}
            />
          </div>
        </section>

        {/* Companion roster */}
        <section className="bg-paper border border-moss/[0.08] rounded-[12px] p-5 sm:p-6 lg:col-span-2">
          <h2 className="font-body text-[0.75rem] font-medium uppercase tracking-[0.1em] text-stone mb-3 flex items-center gap-2">
            <Heart size={14} strokeWidth={1.75} className="text-terracotta" aria-hidden="true" />
            Companion roster
          </h2>
          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <div className="text-stone text-[0.8125rem] mb-2">
                Tier (active + onboarding companions, {activeCompanions.length})
              </div>
              <StackedBar segments={tierSegments} />
            </div>
            <div>
              <div className="text-stone text-[0.8125rem] mb-2">
                Status (all companions, {statusTotal})
              </div>
              <StackedBar segments={statusSegments} />
            </div>
          </div>
          <p className="text-stone text-[0.8125rem] mt-4">
            Tier is computed live from completed visits. See{' '}
            <a href="/ops/compliance" className="link">
              /ops/compliance
            </a>{' '}
            for DBS / insurance / licence expiry tracking.
          </p>
        </section>
      </div>
    </div>
  );
}
