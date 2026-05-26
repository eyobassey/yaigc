import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { TwoVisitReviewForm } from './TwoVisitReviewForm';

export const metadata = { title: 'Two-visit review' };

// SDD Addendum §4. The structured review the operator conducts within
// 72h of the second visit being reported. Pulls the first two
// post-visit reports for the originating subscription so the operator
// can read both before the family + companion debrief calls.

export default async function TwoVisitReviewPage({
  params,
}: {
  params: { id: string };
}) {
  const match = await prisma.match.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      familyId: true,
      twoVisitReviewScheduledFor: true,
      twoVisitReviewCompletedAt: true,
      family: { select: { billingName: true } },
      companion: { select: { firstName: true, lastName: true } },
      recipient: { select: { firstName: true, preferredName: true } },
    },
  });
  if (!match) notFound();
  if (!match.twoVisitReviewScheduledFor) {
    // Either no second report yet, or the match doesn't have a
    // subscription. Send the operator back to the match detail with
    // no special state; the review entry point on the dashboard only
    // shows matches that pass this check.
    redirect(`/ops/matches/${match.id}`);
  }
  if (match.twoVisitReviewCompletedAt) {
    // Already done - the match detail page shows the recorded outcome.
    redirect(`/ops/matches/${match.id}`);
  }

  const reports = await prisma.postVisitReport.findMany({
    where: { visit: { subscription: { originatingMatchId: match.id } } },
    orderBy: { submittedAt: 'asc' },
    take: 2,
    include: {
      visit: {
        select: {
          id: true,
          scheduledStartAt: true,
          actualStartAt: true,
          actualEndAt: true,
          secondaryCompanion: {
            select: { firstName: true, lastName: true },
          },
        },
      },
    },
  });

  const recipientLabel =
    match.recipient?.preferredName || match.recipient?.firstName || 'recipient';

  return (
    <div className="max-w-[960px]">
      <Link
        href={`/ops/matches/${match.id}`}
        className="inline-flex items-center gap-1 text-stone hover:text-moss text-sm mb-4 transition-colors"
      >
        <ChevronLeft size={14} strokeWidth={1.75} aria-hidden="true" />
        Back to match
      </Link>

      <header className="mb-8">
        <span className="font-body text-[0.75rem] font-medium uppercase tracking-[0.12em] text-stone mb-2 inline-block">
          Two-visit review
        </span>
        <h1 className="font-head font-normal text-moss text-[clamp(1.75rem,3vw,2.25rem)] leading-[1.1] break-words">
          {match.family.billingName}
          <span className="text-stone font-body font-normal mx-2 text-[1.25rem]">·</span>
          {match.companion.firstName} {match.companion.lastName}
        </h1>
        <p className="text-stone text-[0.9375rem] leading-[1.55] mt-3 max-w-[60ch]">
          Read both reports, make the two calls (companion first, then family),
          pick a direction and write a short note. The note goes to both sides
          in appropriate language.
        </p>
        <p className="text-stone text-[0.875rem] leading-[1.55] mt-2">
          Window opens{' '}
          <span className="font-medium text-charcoal">
            {match.twoVisitReviewScheduledFor.toLocaleDateString('en-GB', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
              timeZone: 'Europe/London',
            })}
          </span>
          .
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_1fr] mb-8">
        {reports.length === 0 ? (
          <p className="text-stone italic">No reports filed yet.</p>
        ) : (
          reports.map((r, i) => (
            <section
              key={r.id}
              className="bg-paper border border-moss/[0.08] rounded-[12px] p-5 sm:p-6"
            >
              <h2 className="font-body text-[0.75rem] font-medium uppercase tracking-[0.1em] text-stone mb-3">
                Visit {i + 1} report
              </h2>
              <dl className="grid grid-cols-[max-content_1fr] gap-x-3 gap-y-1 text-[0.875rem] mb-3">
                <dt className="text-stone">Visit date</dt>
                <dd className="text-charcoal font-mono text-[0.8125rem]">
                  {r.visit.scheduledStartAt.toISOString().slice(0, 10)}
                </dd>
                <dt className="text-stone">Wellbeing</dt>
                <dd className="text-charcoal">{r.howWereThey}</dd>
                <dt className="text-stone">Duration</dt>
                <dd className="text-charcoal">{r.actualDurationMinutes} min</dd>
                {r.visit.secondaryCompanion ? (
                  <>
                    <dt className="text-stone">Cover present</dt>
                    <dd className="text-charcoal">
                      {r.visit.secondaryCompanion.firstName}{' '}
                      {r.visit.secondaryCompanion.lastName}
                    </dd>
                  </>
                ) : null}
              </dl>
              <div className="font-body text-[0.7rem] font-medium uppercase tracking-[0.08em] text-stone mb-1">
                What happened
              </div>
              <p className="text-charcoal text-[0.9375rem] leading-[1.55] whitespace-pre-wrap break-words mb-3">
                {r.whatHappened}
              </p>
              {r.howWereTheyNote ? (
                <>
                  <div className="font-body text-[0.7rem] font-medium uppercase tracking-[0.08em] text-stone mb-1">
                    Wellbeing note
                  </div>
                  <p className="text-charcoal text-[0.9375rem] leading-[1.55] whitespace-pre-wrap break-words mb-3">
                    {r.howWereTheyNote}
                  </p>
                </>
              ) : null}
              {r.thingsToFlag ? (
                <>
                  <div className="font-body text-[0.7rem] font-medium uppercase tracking-[0.08em] text-terracotta mb-1">
                    Things to flag (operator-only)
                  </div>
                  <p className="text-charcoal text-[0.9375rem] leading-[1.55] whitespace-pre-wrap break-words bg-terracotta/5 p-3 rounded-md">
                    {r.thingsToFlag}
                  </p>
                </>
              ) : null}
              <p className="text-stone text-[0.75rem] mt-3">
                Submitted {r.submittedAt.toISOString().replace('T', ' ').slice(0, 19)}
              </p>
            </section>
          ))
        )}
      </div>

      <TwoVisitReviewForm matchId={match.id} recipientLabel={recipientLabel} />
    </div>
  );
}
