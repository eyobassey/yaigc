import Link from 'next/link';
import { Calendar, Heart, AlertTriangle } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { requireCompanion } from '@/lib/auth-helpers';
import { formatUkDateTime } from '@/lib/visit-schedule';

export const metadata = { title: 'Today' };

// C.1 minimal dashboard. C.2 fleshes out the visits surfaces; C.5
// fleshes out matches; for now the dashboard just shows the next
// upcoming visit pointer and an early-access banner.

export default async function CompanionHomePage() {
  const { companion } = await requireCompanion('/companion');

  const now = new Date();
  const [nextVisit, completedVisitsThisWeek, pendingMatches] = await Promise.all([
    prisma.visit.findFirst({
      where: {
        companionId: companion.id,
        state: { in: ['scheduled', 'confirmed', 'en_route', 'in_progress'] },
        scheduledStartAt: { gte: new Date(now.getTime() - 12 * 60 * 60 * 1000) },
      },
      orderBy: { scheduledStartAt: 'asc' },
      include: {
        recipient: { select: { firstName: true, preferredName: true } },
        family: { select: { billingName: true } },
      },
    }),
    prisma.visit.count({
      where: {
        companionId: companion.id,
        state: { in: ['completed', 'reported'] },
        scheduledStartAt: { gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) },
      },
    }),
    prisma.match.count({
      where: {
        candidateCompanionId: companion.id,
        status: 'proposed',
      },
    }),
  ]);

  return (
    <div>
      <header className="mb-10">
        <span className="font-body text-[0.75rem] font-medium uppercase tracking-[0.12em] text-stone mb-2 inline-block">
          Your patch
        </span>
        <h1 className="font-head font-normal text-moss text-[clamp(2rem,4vw,3rem)] leading-[1.1] tracking-[-0.02em]">
          {greeting()}, {companion.firstName}.
        </h1>
        <p className="font-head italic text-terracotta text-[clamp(1.125rem,1.75vw,1.375rem)] leading-[1.4] mt-3">
          {pendingMatches > 0
            ? `You have ${pendingMatches} match to look at.`
            : 'Glad to have you with us.'}
        </p>
      </header>

      <div className="mb-8 bg-amber-50 border-l-4 border-amber-400 px-5 py-4 rounded-r">
        <p className="font-body text-[0.7rem] font-medium uppercase tracking-[0.12em] text-amber-700 mb-1 flex items-center gap-2">
          <AlertTriangle size={14} strokeWidth={2} aria-hidden="true" />
          Early access
        </p>
        <p className="text-charcoal text-[0.9375rem] leading-[1.55]">
          We are rolling out the companion portal section by section. For
          anything you cannot do here yet - including state changes
          during a visit and submitting your note - ring us and we will
          do it for you. The portal-driven version of those will land in
          the next few days.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <section className="bg-paper border border-moss/[0.08] rounded-[12px] p-5">
          <div className="flex items-start justify-between mb-3">
            <Calendar size={20} strokeWidth={1.75} className="text-moss" aria-hidden="true" />
            <span className="font-body text-[0.65rem] font-medium uppercase tracking-[0.1em] text-stone">
              Next visit
            </span>
          </div>
          {nextVisit ? (
            <>
              <p className="font-head text-moss text-[1.125rem] font-medium leading-[1.3] mb-1">
                {formatUkDateTime(nextVisit.scheduledStartAt)}
              </p>
              <p className="text-charcoal text-[0.9375rem]">
                {nextVisit.recipient.preferredName || nextVisit.recipient.firstName}{' '}
                <span className="text-stone text-[0.8125rem]">
                  ({nextVisit.family.billingName})
                </span>
              </p>
              <Link
                href={`/companion/visits/${nextVisit.id}`}
                className="link text-[0.875rem] mt-3 inline-block"
              >
                See visit
              </Link>
            </>
          ) : (
            <p className="text-stone text-[0.9375rem]">
              No visit on the diary right now. We will email when the next one is booked.
            </p>
          )}
        </section>

        <section className="bg-paper border border-moss/[0.08] rounded-[12px] p-5">
          <div className="flex items-start justify-between mb-3">
            <Heart size={20} strokeWidth={1.75} className="text-terracotta" aria-hidden="true" />
            <span className="font-body text-[0.65rem] font-medium uppercase tracking-[0.1em] text-stone">
              At a glance
            </span>
          </div>
          <dl className="grid grid-cols-[max-content_1fr] gap-x-3 gap-y-1.5 text-[0.9375rem]">
            <dt className="text-stone">Status</dt>
            <dd className="text-charcoal capitalize">{companion.status}</dd>
            <dt className="text-stone">Borough</dt>
            <dd className="text-charcoal">{companion.borough.replace(/_/g, ' ')}</dd>
            <dt className="text-stone">Visits this week</dt>
            <dd className="text-charcoal">{completedVisitsThisWeek}</dd>
            <dt className="text-stone">Matches awaiting</dt>
            <dd className="text-charcoal">{pendingMatches}</dd>
          </dl>
        </section>
      </div>
    </div>
  );
}

function greeting() {
  const hour = new Date().getUTCHours();
  if (hour < 5 || hour > 21) return 'Working late';
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}
