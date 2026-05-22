import Link from 'next/link';
import { Calendar, Heart, AlertTriangle } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { requireFamilyMember } from '@/lib/auth-helpers';
import { formatUkDateTime } from '@/lib/visit-schedule';

export const metadata = { title: 'Today' };

// F.1 minimal dashboard. F.2 fleshes this out with the matched
// companion, the recipient summary, and the recent reports. For now
// just the upcoming visit pointer + an empty-state banner.

export default async function FamilyHomePage() {
  const { user, family } = await requireFamilyMember('/family');

  const [nextVisit, recipientCount, activeSub, openMatch] = await Promise.all([
    prisma.visit.findFirst({
      where: {
        familyId: family.id,
        state: { in: ['scheduled', 'confirmed'] },
        scheduledStartAt: { gte: new Date() },
      },
      orderBy: { scheduledStartAt: 'asc' },
      include: {
        companion: { select: { firstName: true } },
        recipient: { select: { firstName: true, preferredName: true } },
      },
    }),
    prisma.recipient.count({ where: { familyId: family.id, deletedAt: null } }),
    prisma.subscription.findFirst({
      where: { familyId: family.id, status: { in: ['active', 'paused'] } },
      select: { id: true, status: true },
    }),
    prisma.match.findFirst({
      where: { familyId: family.id, status: 'proposed', familyResponseAt: null },
      orderBy: { createdAt: 'desc' },
      select: { id: true, companion: { select: { firstName: true } } },
    }),
  ]);

  return (
    <div>
      <header className="mb-10">
        <span className="font-body text-[0.75rem] font-medium uppercase tracking-[0.12em] text-stone mb-2 inline-block">
          Your account
        </span>
        <h1 className="font-head font-normal text-moss text-[clamp(2rem,4vw,3rem)] leading-[1.1] tracking-[-0.02em]">
          {greeting()}, {user.firstName || family.billingName.split(' ')[0] || 'there'}.
        </h1>
        <p className="font-head italic text-terracotta text-[clamp(1.125rem,1.75vw,1.375rem)] leading-[1.4] mt-3">
          We are glad to have you in.
        </p>
      </header>

      {openMatch ? (
        <div className="mb-8 bg-moss/5 border-l-4 border-moss px-5 py-4 rounded-r">
          <p className="font-body text-[0.7rem] font-medium uppercase tracking-[0.12em] text-moss mb-1">
            A match awaiting your reply
          </p>
          <p className="text-charcoal text-[0.9375rem] leading-[1.55] mb-2">
            We have <strong>{openMatch.companion.firstName}</strong> in mind. Have a look and let us know.
          </p>
          <Link
            href={`/family/matches/${openMatch.id}`}
            className="inline-flex items-center justify-center px-4 py-2 rounded-md bg-moss text-cream text-[0.875rem] font-medium hover:bg-moss-dark transition-colors"
          >
            See the match
          </Link>
        </div>
      ) : (
        <div className="mb-8 bg-amber-50 border-l-4 border-amber-400 px-5 py-4 rounded-r">
          <p className="font-body text-[0.7rem] font-medium uppercase tracking-[0.12em] text-amber-700 mb-1 flex items-center gap-2">
            <AlertTriangle size={14} strokeWidth={2} aria-hidden="true" />
            Early access
          </p>
          <p className="text-charcoal text-[0.9375rem] leading-[1.55]">
            The visits, companion, subscription and account sections are
            coming online over the next few days. For anything urgent,
            email or call us and we will sort it.
          </p>
        </div>
      )}

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
                {nextVisit.companion.firstName} visiting{' '}
                {nextVisit.recipient.preferredName || nextVisit.recipient.firstName}
              </p>
              <Link
                href={`/family/visits/${nextVisit.id}`}
                className="link text-[0.875rem] mt-3 inline-block"
              >
                See visit
              </Link>
            </>
          ) : (
            <p className="text-stone text-[0.9375rem]">
              Nothing scheduled yet. We will email when the first visit
              is on the calendar.
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
            <dt className="text-stone">Account</dt>
            <dd className="text-charcoal break-words">{family.billingName}</dd>
            <dt className="text-stone">Recipients</dt>
            <dd className="text-charcoal">{recipientCount}</dd>
            <dt className="text-stone">Subscription</dt>
            <dd className="text-charcoal">{activeSub ? activeSub.status : 'not set up yet'}</dd>
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
