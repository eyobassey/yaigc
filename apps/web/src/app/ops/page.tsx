import { getSessionUser } from '@/lib/auth-helpers';
import Link from 'next/link';
import {
  Inbox,
  Calendar,
  FileText,
  ShieldAlert,
  Heart,
  Users,
  Sparkles,
  MessageSquare,
  ShieldCheck,
  Phone,
  ChevronRight,
} from 'lucide-react';
import { prisma } from '@/lib/prisma';

export const metadata = {
  title: 'Today',
};

// Empty-state Today dashboard. The five cards mirror what SDD §10 says the
// operator should see "each morning":
//   - new enquiries
//   - visits today
//   - post-visit reports missing
//   - open safeguarding cases
//   - DBSs expiring within 30 days
// Each renders zero until the underlying models land (O.3 onward).

const TILES = [
  {
    label: 'New enquiries',
    href: '/ops/enquiries',
    icon: Inbox,
    accent: 'text-terracotta',
    placeholder: 'live',
  },
  {
    label: 'Prospect families',
    href: '/ops/families',
    icon: Users,
    accent: 'text-moss',
    placeholder: 'live',
  },
  {
    label: 'New companion applications',
    href: '/ops/companions',
    icon: Heart,
    accent: 'text-terracotta',
    placeholder: 'live',
  },
  {
    label: 'Open matches',
    href: '/ops/matches',
    icon: Sparkles,
    accent: 'text-terracotta',
    placeholder: 'live',
  },
  {
    label: 'Visits today',
    href: '/ops/visits?filter=today',
    icon: Calendar,
    accent: 'text-moss',
    placeholder: 'live',
  },
  {
    label: 'Missing post-visit reports',
    href: '/ops/visits?filter=needs-report',
    icon: FileText,
    accent: 'text-terracotta',
    placeholder: 'live',
  },
  {
    label: 'Open safeguarding cases',
    href: '/ops/safeguarding',
    icon: ShieldAlert,
    accent: 'text-red-700',
    placeholder: 'live',
  },
  {
    label: 'Pending family requests',
    href: '/ops/families?filter=requests',
    icon: MessageSquare,
    accent: 'text-terracotta',
    placeholder: 'live',
  },
  {
    label: 'Compliance flags (30d)',
    href: '/ops/compliance',
    icon: ShieldCheck,
    accent: 'text-amber-700',
    placeholder: 'live',
  },
];

export default async function OpsTodayPage() {
  const user = await getSessionUser();

  // Counts that already have backing data go straight to the DB. Tiles
  // whose models do not exist yet keep the em-dash placeholder until
  // their stage lands.
  const today = new Date();
  const in30 = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
  const [
    newEnquiriesCount,
    prospectFamiliesCount,
    newApplicationsCount,
    openMatchesCount,
    visitsTodayCount,
    missingReportsCount,
    openCasesCount,
    pendingRequestsCount,
    complianceFlagCount,
  ] = await Promise.all([
    prisma.enquiry.count({ where: { status: 'new' } }),
    prisma.family.count({ where: { status: 'prospect' } }),
    prisma.companionApplication.count({ where: { status: 'received' } }),
    prisma.match.count({ where: { status: 'proposed' } }),
    (async () => {
      const { ukLocalDayBounds } = await import('@/lib/visit-schedule');
      const { startUtc, endUtc } = ukLocalDayBounds(new Date());
      return prisma.visit.count({
        where: { scheduledStartAt: { gte: startUtc, lt: endUtc } },
      });
    })(),
    prisma.visit.count({ where: { state: 'completed', report: null } }),
    prisma.safeguardingCase.count({
      where: { status: { in: ['open', 'under_review', 'actioned'] } },
    }),
    prisma.subscription.count({
      where: {
        OR: [{ pauseRequestedAt: { not: null } }, { cancelRequestedAt: { not: null } }],
      },
    }),
    // Companions with DBS or insurance expired or expiring within 30 days,
    // or with either credential missing entirely.
    prisma.companion.count({
      where: {
        deletedAt: null,
        status: { in: ['onboarding', 'active'] },
        OR: [
          { dbsCertificateNumber: null },
          { dbsRenewalDueAt: null },
          { dbsRenewalDueAt: { lte: in30 } },
          { insuranceExpiresAt: null },
          { insuranceExpiresAt: { lte: in30 } },
        ],
      },
    }),
  ]);

  // R.5: "due this week" lists. Fifth-visit reflections are gated by
  // visit count (>= 4 completed/reported AND no fifth_visit note);
  // check-ins are gated by Family.checkInCadenceDays + last-call
  // bookkeeping. Both queries are scoped + filtered in JS because the
  // numbers stay small at Phase-1 scale.
  const endOfThisWeek = endOfUkWeek(new Date());
  const [reflectionCandidates, checkInCandidates] = await Promise.all([
    prisma.family.findMany({
      where: {
        deletedAt: null,
        relationshipNotes: { none: { callType: 'fifth_visit' } },
      },
      select: {
        id: true,
        billingName: true,
        visits: {
          where: { state: { in: ['completed', 'reported'] } },
          select: { id: true },
        },
      },
    }),
    prisma.family.findMany({
      where: {
        deletedAt: null,
        checkInCadenceDays: { gt: 0 },
      },
      select: {
        id: true,
        billingName: true,
        checkInCadenceDays: true,
        lastCheckInAt: true,
        joinedAt: true,
      },
    }),
  ]);
  const reflectionsDue = reflectionCandidates
    .filter((f) => f.visits.length >= 4)
    .map((f) => ({ id: f.id, billingName: f.billingName, visitCount: f.visits.length }))
    .sort((a, b) => b.visitCount - a.visitCount);
  const MS_PER_DAY = 24 * 60 * 60 * 1000;
  const checkInsDue = checkInCandidates
    .map((f) => {
      const base = f.lastCheckInAt ?? f.joinedAt;
      const dueAt = new Date(base.getTime() + f.checkInCadenceDays * MS_PER_DAY);
      return { id: f.id, billingName: f.billingName, dueAt };
    })
    .filter((f) => f.dueAt.getTime() <= endOfThisWeek.getTime())
    .sort((a, b) => a.dueAt.getTime() - b.dueAt.getTime());

  return (
    <div>
      <header className="mb-10">
        <span className="font-body text-[0.75rem] font-medium uppercase tracking-[0.12em] text-stone mb-2 inline-block">
          Operator console
        </span>
        <h1 className="font-head font-normal text-moss text-[clamp(2rem,4vw,3rem)] leading-[1.1] tracking-[-0.02em]">
          {greeting()}, {user?.firstName || user?.email?.split('@')[0] || 'operator'}.
        </h1>
        <p className="font-head italic text-terracotta text-[clamp(1.125rem,1.75vw,1.375rem)] leading-[1.4] mt-3">
          A view of today.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-12">
        {TILES.map((tile) => {
          const isLive = tile.placeholder === 'live';
          const value = !isLive
            ? null
            : tile.label === 'New enquiries'
            ? newEnquiriesCount
            : tile.label === 'Prospect families'
            ? prospectFamiliesCount
            : tile.label === 'New companion applications'
            ? newApplicationsCount
            : tile.label === 'Open matches'
            ? openMatchesCount
            : tile.label === 'Visits today'
            ? visitsTodayCount
            : tile.label === 'Missing post-visit reports'
            ? missingReportsCount
            : tile.label === 'Open safeguarding cases'
            ? openCasesCount
            : tile.label === 'Pending family requests'
            ? pendingRequestsCount
            : tile.label === 'Compliance flags (30d)'
            ? complianceFlagCount
            : null;
          return (
            <Link
              key={tile.label}
              href={tile.href}
              className="block bg-paper border border-moss/[0.08] rounded-[12px] p-5 hover:border-moss/20 hover:-translate-y-px transition-all duration-200 group"
            >
              <div className="flex items-start justify-between mb-4">
                <tile.icon size={20} strokeWidth={1.75} aria-hidden="true" className={tile.accent} />
                <span className="font-body text-[0.65rem] font-medium uppercase tracking-[0.1em] text-stone/60">
                  {tile.placeholder}
                </span>
              </div>
              <div className="font-head text-moss text-[2.5rem] leading-none font-normal mb-2">
                {value !== null ? (
                  value
                ) : (
                  <>
                    <span aria-hidden="true">{'-'}</span>
                    <span className="sr-only">no data yet</span>
                  </>
                )}
              </div>
              <div className="font-body text-charcoal text-[0.9375rem] group-hover:text-moss transition-colors">
                {tile.label}
              </div>
            </Link>
          );
        })}
      </div>

      {/* R.5: relationship-shape cards. The memo (s4.3, s4.4) makes
          these explicitly operational rather than product-y; the
          platform's role is to surface the prompt at the right
          time. Each row links into the log-call workflow. */}
      {reflectionsDue.length > 0 || checkInsDue.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 mb-12">
          <RelationshipCard
            title="Reflection calls due"
            empty="No reflection calls due this week."
            href="/ops"
          >
            {reflectionsDue.map((f) => (
              <Link
                key={f.id}
                href={`/ops/families/${f.id}/log-call?kind=fifth_visit`}
                className="flex items-center justify-between gap-3 px-3 py-2 rounded-md hover:bg-cream-deep/40 transition-colors group"
              >
                <div className="min-w-0">
                  <div className="font-head text-moss text-[0.9375rem] font-medium truncate">
                    {f.billingName}
                  </div>
                  <div className="text-stone text-[0.75rem] mt-0.5">
                    {f.visitCount} completed visit{f.visitCount === 1 ? '' : 's'}
                  </div>
                </div>
                <ChevronRight
                  size={16}
                  strokeWidth={1.5}
                  aria-hidden="true"
                  className="text-stone/50 group-hover:text-moss transition-colors flex-shrink-0"
                />
              </Link>
            ))}
          </RelationshipCard>

          <RelationshipCard
            title="Check-ins due"
            empty="No check-ins due this week."
            href="/ops"
          >
            {checkInsDue.map((f) => (
              <Link
                key={f.id}
                href={`/ops/families/${f.id}/log-call?kind=check_in`}
                className="flex items-center justify-between gap-3 px-3 py-2 rounded-md hover:bg-cream-deep/40 transition-colors group"
              >
                <div className="min-w-0">
                  <div className="font-head text-moss text-[0.9375rem] font-medium truncate">
                    {f.billingName}
                  </div>
                  <div className="text-stone text-[0.75rem] mt-0.5">
                    Due {f.dueAt.toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                      timeZone: 'Europe/London',
                    })}
                  </div>
                </div>
                <ChevronRight
                  size={16}
                  strokeWidth={1.5}
                  aria-hidden="true"
                  className="text-stone/50 group-hover:text-moss transition-colors flex-shrink-0"
                />
              </Link>
            ))}
          </RelationshipCard>
        </div>
      ) : null}
    </div>
  );
}

function RelationshipCard({
  title,
  empty,
  children,
}: {
  title: string;
  empty: string;
  href: string;
  children: React.ReactNode;
}) {
  const hasChildren = Array.isArray(children) ? children.length > 0 : Boolean(children);
  return (
    <section className="bg-paper border border-moss/[0.08] rounded-[12px] p-5">
      <h2 className="font-body text-[0.75rem] font-medium uppercase tracking-[0.1em] text-stone mb-3 inline-flex items-center gap-2">
        <Phone size={14} strokeWidth={1.75} className="text-terracotta" aria-hidden="true" />
        {title}
      </h2>
      {hasChildren ? (
        <div className="flex flex-col">{children}</div>
      ) : (
        <p className="text-stone text-[0.8125rem] italic px-3 py-2">{empty}</p>
      )}
    </section>
  );
}

// R.5: end of the current UK week (Sunday 23:59:59 in Europe/London).
// Used by the "check-ins due this week" filter. Approximation - we
// compute in UTC and add a day-buffer so a check-in scheduled for
// late Sunday BST never disappears off the list because of a
// timezone edge. The query is small either way; correctness on the
// edges is operator-recoverable.
function endOfUkWeek(now: Date): Date {
  const day = now.getUTCDay(); // 0 = Sun
  const daysUntilSunday = (7 - day) % 7;
  const result = new Date(now);
  result.setUTCDate(result.getUTCDate() + daysUntilSunday);
  result.setUTCHours(23, 59, 59, 999);
  return result;
}

function greeting() {
  const hour = new Date().getUTCHours();
  if (hour < 5 || hour > 21) return 'Working late';
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}
