import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { MatchStatusPill } from '../page';
import { TransitionPanel } from './TransitionPanel';
import { CoverCompanionPanel } from './CoverCompanionPanel';
import { Paginator } from '@/components/ui/Paginator';
import { parsePagination, buildView } from '@/lib/pagination';

export const metadata = { title: 'Match' };

export default async function OpsMatchDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const match = await prisma.match.findUnique({
    where: { id: params.id },
    include: {
      family: { select: { id: true, billingName: true, status: true } },
      recipient: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          preferredName: true,
        },
      },
      companion: {
        select: {
          id: true,
          applicationId: true,
          firstName: true,
          lastName: true,
          borough: true,
          bio: true,
          hourlyRate: true,
        },
      },
      coverCompanion: {
        select: {
          id: true,
          applicationId: true,
          firstName: true,
          lastName: true,
          borough: true,
        },
      },
      twoVisitReviewBy: { select: { firstName: true, lastName: true, email: true } },
      proposedBy: { select: { id: true, email: true, firstName: true, lastName: true } },
      subscription: { select: { id: true } },
      endedBy: { select: { id: true, email: true, firstName: true, lastName: true } },
    },
  });
  if (!match) notFound();

  // Cover-eligible companions: every bookable companion except the
  // primary on this match. Operator picks from this list to assign or
  // change the cover. Small list at Phase-1 scale; no pagination.
  const canEditCover = match.status === 'proposed' || match.status === 'accepted';
  const coverEligibleCompanions = canEditCover
    ? await prisma.companion.findMany({
        where: {
          deletedAt: null,
          status: { in: ['onboarding', 'active'] },
          id: { not: match.companion.id },
        },
        orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
        select: { id: true, firstName: true, lastName: true, borough: true },
      })
    : [];

  const historyWhere = { targetType: 'Match', targetId: match.id };
  const historyState = parsePagination(searchParams, {
    pageSize: 20,
    pageParam: 'hp',
  });
  const [historyTotal, history] = await Promise.all([
    prisma.auditLogEntry.count({ where: historyWhere }),
    prisma.auditLogEntry.findMany({
      where: historyWhere,
      orderBy: { id: 'desc' },
      skip: historyState.skip,
      take: historyState.pageSize,
    }),
  ]);
  const historyView = buildView(historyState, historyTotal);

  const proposerName =
    `${match.proposedBy.firstName ?? ''} ${match.proposedBy.lastName ?? ''}`.trim() ||
    match.proposedBy.email;

  return (
    <div>
      <Link
        href="/ops/matches"
        className="inline-flex items-center gap-1 text-stone hover:text-moss text-sm mb-4 transition-colors"
      >
        <ChevronLeft size={14} strokeWidth={1.75} aria-hidden="true" />
        All matches
      </Link>

      <header className="mb-6">
        <div className="flex items-center gap-2 flex-wrap mb-2">
          <MatchStatusPill status={match.status} />
          <time
            dateTime={match.createdAt.toISOString()}
            className="text-stone text-[0.8125rem] font-mono"
          >
            proposed {match.createdAt.toISOString().replace('T', ' ').slice(0, 19)}
          </time>
          <span className="text-stone text-[0.8125rem]">by {proposerName}</span>
        </div>
        <h1 className="font-head font-normal text-moss text-[clamp(1.75rem,3vw,2.25rem)] leading-[1.1]">
          {match.family.billingName}
          <span className="text-stone font-body font-normal mx-2 text-[1.25rem]">·</span>
          {match.companion.firstName} {match.companion.lastName}
        </h1>
      </header>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="flex flex-col gap-6">
          <section className="bg-paper border border-moss/[0.08] rounded-[12px] p-5 sm:p-6">
            <h2 className="font-body text-[0.75rem] font-medium uppercase tracking-[0.1em] text-stone mb-3">
              Why this match
            </h2>
            <p className="text-charcoal leading-[1.65] whitespace-pre-wrap break-words">
              {match.rationale}
            </p>
          </section>

          <section className="bg-paper border border-moss/[0.08] rounded-[12px] p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
              <h2 className="font-body text-[0.75rem] font-medium uppercase tracking-[0.1em] text-stone">
                Family
              </h2>
              <Link
                href={`/ops/families/${match.family.id}`}
                className="text-moss text-[0.8125rem] hover:text-terracotta inline-flex items-center gap-1"
              >
                Open family
                <ChevronRight size={14} strokeWidth={1.75} aria-hidden="true" />
              </Link>
            </div>
            <div className="font-head text-moss text-[1.0625rem] font-medium">{match.family.billingName}</div>
            <div className="text-stone text-[0.875rem] mt-1">Status: {match.family.status}</div>
            {match.recipient ? (
              <div className="mt-3 pt-3 border-t border-moss/10">
                <div className="font-body text-[0.7rem] font-medium uppercase tracking-[0.08em] text-stone mb-1">
                  Proposed for
                </div>
                <div className="text-charcoal">
                  {match.recipient.firstName} {match.recipient.lastName}
                  {match.recipient.preferredName ? (
                    <span className="text-stone ml-2">(known as {match.recipient.preferredName})</span>
                  ) : null}
                </div>
              </div>
            ) : null}
          </section>

          <section className="bg-paper border border-moss/[0.08] rounded-[12px] p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
              <h2 className="font-body text-[0.75rem] font-medium uppercase tracking-[0.1em] text-stone">
                Companion
              </h2>
              <Link
                href={`/ops/companions/${match.companion.applicationId}`}
                className="text-moss text-[0.8125rem] hover:text-terracotta inline-flex items-center gap-1"
              >
                Open application
                <ChevronRight size={14} strokeWidth={1.75} aria-hidden="true" />
              </Link>
            </div>
            <div className="font-head text-moss text-[1.0625rem] font-medium">
              {match.companion.firstName} {match.companion.lastName}
            </div>
            <div className="text-stone text-[0.875rem] mt-1">
              {match.companion.borough.replace('_', ' ')} · £{Number(match.companion.hourlyRate).toFixed(2)}/hr
            </div>
            {match.companion.bio ? (
              <p className="text-charcoal text-[0.9375rem] leading-[1.55] mt-3 whitespace-pre-wrap">
                {match.companion.bio}
              </p>
            ) : null}
          </section>

          {match.declineReason ? (
            <section className="bg-terracotta/10 border-l-4 border-terracotta px-5 py-4 rounded-r">
              <h2 className="font-body text-[0.7rem] font-medium uppercase tracking-[0.1em] text-terracotta mb-2">
                Decline reason
              </h2>
              <p className="text-charcoal leading-[1.55] whitespace-pre-wrap break-words">
                {match.declineReason}
              </p>
            </section>
          ) : null}

          {match.twoVisitReviewScheduledFor && !match.twoVisitReviewCompletedAt ? (
            <section className="bg-moss/5 border border-moss/20 rounded-[12px] p-5 sm:p-6">
              <h2 className="font-body text-[0.75rem] font-medium uppercase tracking-[0.1em] text-moss mb-2">
                Two-visit review due
              </h2>
              <p className="text-charcoal text-[0.9375rem] mb-3 leading-[1.55]">
                Window opened{' '}
                {match.twoVisitReviewScheduledFor.toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'short',
                  timeZone: 'Europe/London',
                })}
                . Read both reports, make the calls, write the note.
              </p>
              <Link
                href={`/ops/matches/${match.id}/two-visit-review`}
                className="inline-flex items-center justify-center px-4 py-2 rounded-md bg-moss text-cream text-[0.875rem] font-medium hover:bg-moss-dark transition-colors"
              >
                Open review
              </Link>
            </section>
          ) : null}

          {match.twoVisitReviewCompletedAt && match.twoVisitReviewOutcome ? (
            <section
              className={`border-l-4 px-5 py-4 rounded-r ${
                match.twoVisitReviewOutcome === 'reset'
                  ? 'bg-terracotta/10 border-terracotta'
                  : 'bg-moss/5 border-moss/40'
              }`}
            >
              <h2
                className={`font-body text-[0.7rem] font-medium uppercase tracking-[0.1em] mb-2 ${
                  match.twoVisitReviewOutcome === 'reset' ? 'text-terracotta' : 'text-moss'
                }`}
              >
                Two-visit review · {match.twoVisitReviewOutcome}
                {match.twoVisitReviewOutcome === 'reset' && match.status === 'accepted'
                  ? ' · rematch needed'
                  : ''}
              </h2>
              <p className="text-charcoal text-[0.9375rem] leading-[1.55] whitespace-pre-wrap break-words mb-3">
                {match.twoVisitReviewNotes}
              </p>

              <div className="bg-cream/60 border border-moss/[0.08] rounded-md px-4 py-3 mb-3">
                <div className="font-body text-[0.65rem] font-medium uppercase tracking-[0.08em] text-stone mb-2">
                  Which channels reached {match.recipient?.preferredName || match.recipient?.firstName || 'the recipient'}?
                </div>
                <ul className="flex flex-col gap-2 text-[0.875rem]">
                  <li className="flex items-start gap-2">
                    <span className="font-body text-[0.65rem] uppercase tracking-[0.06em] text-moss bg-moss/10 rounded px-1.5 py-0.5 mt-0.5">
                      Companion reports
                    </span>
                    <span className="text-stone text-[0.8125rem]">
                      Always on (visit-by-visit post-visit reports).
                    </span>
                  </li>
                  {match.twoVisitReviewCompanionCallNotes ? (
                    <li className="flex items-start gap-2">
                      <span className="font-body text-[0.65rem] uppercase tracking-[0.06em] text-moss bg-moss/10 rounded px-1.5 py-0.5 mt-0.5">
                        Companion debrief
                      </span>
                      <span className="text-charcoal whitespace-pre-wrap break-words">
                        {match.twoVisitReviewCompanionCallNotes}
                      </span>
                    </li>
                  ) : null}
                  {match.twoVisitReviewFamilyCallNotes ? (
                    <li className="flex items-start gap-2">
                      <span className="font-body text-[0.65rem] uppercase tracking-[0.06em] text-moss bg-moss/10 rounded px-1.5 py-0.5 mt-0.5">
                        Family debrief
                      </span>
                      <span className="text-charcoal whitespace-pre-wrap break-words">
                        {match.twoVisitReviewFamilyCallNotes}
                      </span>
                    </li>
                  ) : null}
                  {match.twoVisitReviewRecipientCallNotes || match.twoVisitReviewRecipientCalledAt ? (
                    <li className="flex items-start gap-2">
                      <span className="font-body text-[0.65rem] uppercase tracking-[0.06em] text-terracotta bg-terracotta/10 rounded px-1.5 py-0.5 mt-0.5">
                        Direct call
                      </span>
                      <span className="text-charcoal whitespace-pre-wrap break-words">
                        {match.twoVisitReviewRecipientCalledAt ? (
                          <span className="text-stone text-[0.75rem] block mb-1">
                            Called{' '}
                            {match.twoVisitReviewRecipientCalledAt
                              .toISOString()
                              .replace('T', ' ')
                              .slice(0, 16)}
                          </span>
                        ) : null}
                        {match.twoVisitReviewRecipientCallNotes ?? '(no notes captured)'}
                      </span>
                    </li>
                  ) : (
                    <li className="flex items-start gap-2">
                      <span className="font-body text-[0.65rem] uppercase tracking-[0.06em] text-stone bg-stone/10 rounded px-1.5 py-0.5 mt-0.5">
                        Direct call
                      </span>
                      <span className="text-stone text-[0.8125rem] italic">
                        No direct call this round.
                      </span>
                    </li>
                  )}
                </ul>
              </div>

              <p className="text-stone text-[0.75rem]">
                Logged{' '}
                {match.twoVisitReviewCompletedAt.toISOString().replace('T', ' ').slice(0, 19)}
                {match.twoVisitReviewBy ? (
                  <>
                    {' '}by{' '}
                    {`${match.twoVisitReviewBy.firstName ?? ''} ${match.twoVisitReviewBy.lastName ?? ''}`.trim() ||
                      match.twoVisitReviewBy.email}
                  </>
                ) : null}
                .
              </p>
            </section>
          ) : null}

          {match.status === 'ended' && match.endReason ? (
            <section className="bg-charcoal/5 border-l-4 border-charcoal/30 px-5 py-4 rounded-r">
              <h2 className="font-body text-[0.7rem] font-medium uppercase tracking-[0.1em] text-charcoal mb-2">
                Match ended
              </h2>
              <dl className="grid grid-cols-[max-content_1fr] gap-x-3 gap-y-1 text-[0.875rem]">
                <dt className="text-stone">Reason</dt>
                <dd className="text-charcoal">{match.endReason.replace(/_/g, ' ')}</dd>
                {match.endedAt ? (
                  <>
                    <dt className="text-stone">When</dt>
                    <dd className="text-charcoal font-mono text-[0.8125rem]">
                      {match.endedAt.toISOString().replace('T', ' ').slice(0, 19)}
                    </dd>
                  </>
                ) : null}
                {match.endNote ? (
                  <>
                    <dt className="text-stone">Internal note</dt>
                    <dd className="text-charcoal whitespace-pre-wrap break-words">{match.endNote}</dd>
                  </>
                ) : null}
              </dl>
            </section>
          ) : null}
        </div>

        <aside className="flex flex-col gap-6">
          {match.status === 'accepted' ? (
            <>
              {match.subscription ? (
                <section className="bg-moss/5 border border-moss/15 rounded-[12px] p-5 sm:p-6">
                  <h2 className="font-body text-[0.75rem] font-medium uppercase tracking-[0.1em] text-moss mb-2">
                    Subscription created
                  </h2>
                  <Link
                    href={`/ops/subscriptions/${match.subscription.id}`}
                    className="link text-[0.875rem] inline-flex items-center gap-1"
                  >
                    Open subscription
                    <ChevronRight size={14} strokeWidth={1.75} aria-hidden="true" />
                  </Link>
                </section>
              ) : (
                <section className="bg-paper border border-moss/[0.08] rounded-[12px] p-5 sm:p-6">
                  <h2 className="font-body text-[0.75rem] font-medium uppercase tracking-[0.1em] text-stone mb-2">
                    Next step
                  </h2>
                  <p className="text-charcoal text-[0.875rem] mb-3">
                    Both sides accepted. Create the recurring subscription.
                  </p>
                  <Link
                    href={`/ops/families/${match.family.id}/subscriptions/new?match=${match.id}`}
                    className="inline-flex items-center justify-center px-4 py-2 rounded-md bg-moss text-cream text-[0.875rem] font-medium hover:bg-moss-dark transition-colors"
                  >
                    Create subscription
                  </Link>
                </section>
              )}

              <section className="bg-paper border border-moss/[0.08] rounded-[12px] p-5 sm:p-6">
                <h2 className="font-body text-[0.75rem] font-medium uppercase tracking-[0.1em] text-stone mb-2">
                  End this match
                </h2>
                <p className="text-charcoal text-[0.875rem] mb-3">
                  Use this when the confirmed pairing has to be separated. Emails go to both sides; any active subscription is cancelled with it.
                </p>
                <Link
                  href={`/ops/matches/${match.id}/end`}
                  className="inline-flex items-center justify-center px-4 py-2 rounded-md border border-terracotta/40 text-terracotta text-[0.8125rem] font-medium hover:bg-terracotta hover:text-cream transition-colors"
                >
                  End this match
                </Link>
              </section>
            </>
          ) : null}

          <TransitionPanel matchId={match.id} currentStatus={match.status} />

          {canEditCover ? (
            <CoverCompanionPanel
              matchId={match.id}
              cover={match.coverCompanion}
              eligible={coverEligibleCompanions.map((c) => ({
                value: c.id,
                label: `${c.firstName} ${c.lastName} (${c.borough.replace(/_/g, ' ')})`,
              }))}
            />
          ) : match.coverCompanion ? (
            <section className="bg-paper border border-moss/[0.08] rounded-[12px] p-5 sm:p-6">
              <h2 className="font-body text-[0.75rem] font-medium uppercase tracking-[0.1em] text-stone mb-2">
                Cover companion
              </h2>
              <Link
                href={`/ops/companions/${match.coverCompanion.applicationId}`}
                className="font-head text-moss text-[1.0625rem] font-medium hover:text-terracotta inline-flex items-center gap-1"
              >
                {match.coverCompanion.firstName} {match.coverCompanion.lastName}
                <ChevronRight size={14} strokeWidth={1.75} aria-hidden="true" />
              </Link>
              <div className="text-stone text-[0.8125rem] mt-1">
                {match.coverCompanion.borough.replace(/_/g, ' ')}
              </div>
            </section>
          ) : null}

          <section className="bg-paper border border-moss/[0.08] rounded-[12px] p-5 sm:p-6">
            <h2 className="font-body text-[0.75rem] font-medium uppercase tracking-[0.1em] text-stone mb-3">
              Responses
            </h2>
            <dl className="grid grid-cols-[max-content_1fr] gap-x-3 gap-y-2 text-[0.875rem]">
              <dt className="text-stone">Family</dt>
              <dd className="text-charcoal">
                {match.familyResponseAt
                  ? match.familyResponseAt.toISOString().replace('T', ' ').slice(0, 19)
                  : 'pending'}
              </dd>
              <dt className="text-stone">Companion</dt>
              <dd className="text-charcoal">
                {match.companionResponseAt
                  ? match.companionResponseAt.toISOString().replace('T', ' ').slice(0, 19)
                  : 'pending'}
              </dd>
            </dl>
          </section>

          <section className="bg-paper border border-moss/[0.08] rounded-[12px] p-5 sm:p-6">
            <h2 className="font-body text-[0.75rem] font-medium uppercase tracking-[0.1em] text-stone mb-3">
              History
            </h2>
            {history.length === 0 ? (
              <p className="text-stone text-sm">No history yet.</p>
            ) : (
              <ul className="flex flex-col gap-2 text-[0.8125rem]">
                {history.map((e) => (
                  <li key={e.id.toString()} className="flex flex-col gap-0.5">
                    <time
                      dateTime={e.occurredAt.toISOString()}
                      className="text-stone font-mono text-[0.75rem]"
                    >
                      {e.occurredAt.toISOString().replace('T', ' ').slice(0, 19)}
                    </time>
                    <span className="text-charcoal">
                      <span className="font-body text-[0.6875rem] uppercase tracking-[0.06em] text-moss bg-moss/10 rounded px-1.5 py-0.5 mr-1">
                        {e.actionType}
                      </span>
                      {summarise(e.metadata, e.beforeState, e.afterState)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <Paginator
              basePath={`/ops/matches/${match.id}`}
              searchParams={searchParams}
              view={historyView}
              pageParam="hp"
              label="entry"
              labelPlural="entries"
            />
          </section>
        </aside>
      </div>
    </div>
  );
}

function summarise(
  metadata: unknown,
  before: unknown,
  after: unknown,
): string {
  if (metadata && typeof metadata === 'object') {
    const m = metadata as Record<string, unknown>;
    if (m.event === 'match_proposed') return 'Match proposed';
    if (m.event === 'match_status_change' && before && after) {
      const b = before as Record<string, unknown>;
      const a = after as Record<string, unknown>;
      const note = typeof m.note === 'string' ? `. Note: ${m.note}` : '';
      return `Status: ${b.status} → ${a.status}${note}`;
    }
    if (m.event === 'match_ended') {
      const reason = typeof m.endReason === 'string' ? m.endReason : 'unknown';
      const cascade = m.cascadedSubscriptionId ? ' (subscription cancelled)' : '';
      const note = typeof m.note === 'string' ? `. Note: ${m.note}` : '';
      return `Ended - ${reason}${cascade}${note}`;
    }
    if (m.event === 'match_confirmation_email_sent') {
      return `Confirmation email sent to ${m.audience} (${m.to})`;
    }
    if (m.event === 'match_ended_email_sent') {
      return `Ended-email sent to ${m.audience} (${m.to})`;
    }
    if (m.event === 'match_cover_companion_change') {
      const kind = typeof m.changeKind === 'string' ? m.changeKind : 'change';
      return `Cover companion ${kind}`;
    }
    if (m.event === 'two_visit_review_completed') {
      const decision = typeof m.outcome === 'string' ? m.outcome : 'recorded';
      return `Two-visit review · ${decision}`;
    }
    if (typeof m.event === 'string') return String(m.event);
  }
  return 'Match updated';
}
