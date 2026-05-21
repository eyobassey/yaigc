import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { MatchStatusPill } from '../page';
import { TransitionPanel } from './TransitionPanel';

export const metadata = { title: 'Match' };

export default async function OpsMatchDetailPage({
  params,
}: {
  params: { id: string };
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
      proposedBy: { select: { id: true, email: true, firstName: true, lastName: true } },
    },
  });
  if (!match) notFound();

  const history = await prisma.auditLogEntry.findMany({
    where: { targetType: 'Match', targetId: match.id },
    orderBy: { id: 'desc' },
    take: 20,
  });

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
        </div>

        <aside className="flex flex-col gap-6">
          <TransitionPanel matchId={match.id} currentStatus={match.status} />

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
    if (typeof m.event === 'string') return String(m.event);
  }
  return 'Match updated';
}
