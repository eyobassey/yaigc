import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft, ChevronRight, Calendar, Plus } from 'lucide-react';
import type { SubscriptionStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { summariseSubscription, DAY_LABELS, FREQUENCY_LABELS } from '@/lib/subscription-format';
import { formatUkDateTime } from '@/lib/visit-schedule';
import { generateNextVisit } from '@/lib/visit';
import { VisitStatePill } from '../../visits/page';
import { TransitionPanel } from './TransitionPanel';

export const metadata = { title: 'Subscription' };

export default async function OpsSubscriptionDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const sub = await prisma.subscription.findUnique({
    where: { id: params.id },
    include: {
      family: { select: { id: true, billingName: true, status: true } },
      recipient: {
        select: { id: true, firstName: true, lastName: true, preferredName: true },
      },
      companion: {
        select: {
          id: true,
          applicationId: true,
          firstName: true,
          lastName: true,
          borough: true,
        },
      },
      originatingMatch: { select: { id: true } },
      visits: {
        orderBy: { scheduledStartAt: 'desc' },
        take: 20,
      },
    },
  });
  if (!sub) notFound();

  const history = await prisma.auditLogEntry.findMany({
    where: { targetType: 'Subscription', targetId: sub.id },
    orderBy: { id: 'desc' },
    take: 20,
  });

  return (
    <div>
      <Link
        href={`/ops/families/${sub.family.id}`}
        className="inline-flex items-center gap-1 text-stone hover:text-moss text-sm mb-4 transition-colors"
      >
        <ChevronLeft size={14} strokeWidth={1.75} aria-hidden="true" />
        Back to family
      </Link>

      <header className="mb-6">
        <div className="flex items-center gap-2 flex-wrap mb-2">
          <SubscriptionStatusPill status={sub.status} />
          <time
            dateTime={sub.startedAt.toISOString()}
            className="text-stone text-[0.8125rem] font-mono"
          >
            started {sub.startedAt.toISOString().slice(0, 10)}
          </time>
          {sub.endedAt ? (
            <time
              dateTime={sub.endedAt.toISOString()}
              className="text-stone text-[0.8125rem] font-mono"
            >
              ended {sub.endedAt.toISOString().slice(0, 10)}
            </time>
          ) : null}
        </div>
        <h1 className="font-head font-normal text-moss text-[clamp(1.75rem,3vw,2.25rem)] leading-[1.1]">
          {sub.family.billingName}
          <span className="text-stone font-body font-normal mx-2 text-[1.25rem]">·</span>
          {sub.companion.firstName} {sub.companion.lastName}
        </h1>
        <p className="text-charcoal text-[0.9375rem] mt-2">
          {summariseSubscription(sub)}
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="flex flex-col gap-6">
          <section className="bg-paper border border-moss/[0.08] rounded-[12px] p-5 sm:p-6">
            <h2 className="font-body text-[0.75rem] font-medium uppercase tracking-[0.1em] text-stone mb-3 inline-flex items-center gap-2">
              <Calendar size={14} strokeWidth={1.75} className="text-moss" aria-hidden="true" />
              Schedule
            </h2>
            <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-2 text-[0.9375rem]">
              <dt className="text-stone">Frequency</dt>
              <dd className="text-charcoal">{FREQUENCY_LABELS[sub.frequency] ?? sub.frequency}</dd>
              <dt className="text-stone">Day</dt>
              <dd className="text-charcoal">{DAY_LABELS[sub.dayOfWeek] ?? sub.dayOfWeek}</dd>
              <dt className="text-stone">Time</dt>
              <dd className="text-charcoal">{sub.startTime}</dd>
              <dt className="text-stone">Duration</dt>
              <dd className="text-charcoal">{sub.durationMinutes} minutes</dd>
              <dt className="text-stone">Rate</dt>
              <dd className="text-charcoal">£{Number(sub.hourlyRate).toFixed(2)} / hour</dd>
              {sub.pauseStartAt ? (
                <>
                  <dt className="text-stone">Paused since</dt>
                  <dd className="text-charcoal">{sub.pauseStartAt.toISOString().slice(0, 10)}</dd>
                </>
              ) : null}
              {sub.pauseEndAt ? (
                <>
                  <dt className="text-stone">Resumes</dt>
                  <dd className="text-charcoal">{sub.pauseEndAt.toISOString().slice(0, 10)}</dd>
                </>
              ) : null}
            </dl>
          </section>

          <section className="bg-paper border border-moss/[0.08] rounded-[12px] p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
              <h2 className="font-body text-[0.75rem] font-medium uppercase tracking-[0.1em] text-stone">
                Family
              </h2>
              <Link
                href={`/ops/families/${sub.family.id}`}
                className="text-moss text-[0.8125rem] hover:text-terracotta inline-flex items-center gap-1"
              >
                Open family
                <ChevronRight size={14} strokeWidth={1.75} aria-hidden="true" />
              </Link>
            </div>
            <div className="font-head text-moss text-[1.0625rem] font-medium">{sub.family.billingName}</div>
            <div className="mt-3 pt-3 border-t border-moss/10">
              <div className="font-body text-[0.7rem] font-medium uppercase tracking-[0.08em] text-stone mb-1">
                Recipient
              </div>
              <div className="text-charcoal">
                {sub.recipient.firstName} {sub.recipient.lastName}
                {sub.recipient.preferredName ? (
                  <span className="text-stone ml-2">(known as {sub.recipient.preferredName})</span>
                ) : null}
              </div>
            </div>
          </section>

          <section className="bg-paper border border-moss/[0.08] rounded-[12px] p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
              <h2 className="font-body text-[0.75rem] font-medium uppercase tracking-[0.1em] text-stone">
                Companion
              </h2>
              <Link
                href={`/ops/companions/${sub.companion.applicationId}`}
                className="text-moss text-[0.8125rem] hover:text-terracotta inline-flex items-center gap-1"
              >
                Open companion
                <ChevronRight size={14} strokeWidth={1.75} aria-hidden="true" />
              </Link>
            </div>
            <div className="font-head text-moss text-[1.0625rem] font-medium">
              {sub.companion.firstName} {sub.companion.lastName}
            </div>
            <div className="text-stone text-[0.875rem] mt-1">
              {sub.companion.borough.replace('_', ' ')}
            </div>
          </section>

          {sub.notes ? (
            <section className="bg-paper border border-moss/[0.08] rounded-[12px] p-5 sm:p-6">
              <h2 className="font-body text-[0.75rem] font-medium uppercase tracking-[0.1em] text-stone mb-3">
                Notes
              </h2>
              <p className="text-charcoal leading-[1.55] whitespace-pre-wrap">{sub.notes}</p>
            </section>
          ) : null}

          <section className="bg-paper border border-moss/[0.08] rounded-[12px] p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
              <h2 className="font-body text-[0.75rem] font-medium uppercase tracking-[0.1em] text-stone inline-flex items-center gap-2">
                <Calendar size={14} strokeWidth={1.75} className="text-moss" aria-hidden="true" />
                Visits ({sub.visits.length})
              </h2>
              {sub.status === 'active' ? (
                <form action={generateNextVisit}>
                  <input type="hidden" name="subscriptionId" value={sub.id} />
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-moss/20 text-moss text-[0.75rem] font-medium hover:bg-moss hover:text-cream transition-colors whitespace-nowrap"
                  >
                    <Plus size={12} strokeWidth={2} aria-hidden="true" />
                    Generate next visit
                  </button>
                </form>
              ) : null}
            </div>
            {sub.visits.length === 0 ? (
              <p className="text-stone text-sm">No visits yet.</p>
            ) : (
              <ul className="divide-y divide-moss/[0.06]">
                {sub.visits.map((v) => (
                  <li key={v.id}>
                    <Link
                      href={`/ops/visits/${v.id}`}
                      className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0 hover:opacity-80 transition-opacity"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <VisitStatePill state={v.state} />
                        </div>
                        <div className="text-charcoal text-[0.9375rem] font-mono">
                          {formatUkDateTime(v.scheduledStartAt)}
                        </div>
                        <div className="text-stone text-[0.8125rem]">
                          {v.scheduledDurationMinutes} min
                        </div>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {sub.cancellationReason ? (
            <section className="bg-terracotta/10 border-l-4 border-terracotta px-5 py-4 rounded-r">
              <h2 className="font-body text-[0.7rem] font-medium uppercase tracking-[0.1em] text-terracotta mb-2">
                Cancellation reason
              </h2>
              <p className="text-charcoal leading-[1.55] whitespace-pre-wrap break-words">
                {sub.cancellationReason}
              </p>
            </section>
          ) : null}
        </div>

        <aside className="flex flex-col gap-6">
          <TransitionPanel subscriptionId={sub.id} currentStatus={sub.status} />

          <section className="bg-paper border border-moss/[0.08] rounded-[12px] p-5 sm:p-6">
            <h2 className="font-body text-[0.75rem] font-medium uppercase tracking-[0.1em] text-stone mb-3">
              Origin
            </h2>
            {sub.originatingMatch ? (
              <Link
                href={`/ops/matches/${sub.originatingMatch.id}`}
                className="link text-[0.875rem]"
              >
                From accepted match
              </Link>
            ) : (
              <p className="text-stone text-[0.875rem]">Created directly without an originating match.</p>
            )}
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

export function SubscriptionStatusPill({ status }: { status: SubscriptionStatus }) {
  const map: Record<SubscriptionStatus, string> = {
    active: 'bg-moss/15 text-moss',
    paused: 'bg-terracotta/15 text-terracotta',
    canceled: 'bg-charcoal/10 text-charcoal',
  };
  return (
    <span
      className={`inline-flex items-center font-body text-[0.6875rem] font-medium uppercase tracking-[0.08em] px-2 py-0.5 rounded ${map[status]}`}
    >
      {status}
    </span>
  );
}

function summarise(metadata: unknown, before: unknown, after: unknown): string {
  if (metadata && typeof metadata === 'object') {
    const m = metadata as Record<string, unknown>;
    if (m.event === 'subscription_created') return 'Subscription created';
    if (m.event === 'subscription_status_change' && before && after) {
      const b = before as Record<string, unknown>;
      const a = after as Record<string, unknown>;
      const note = typeof m.note === 'string' ? `. Note: ${m.note}` : '';
      const planned = typeof m.pauseEndAt === 'string' ? `. Planned resume: ${m.pauseEndAt}` : '';
      return `Status: ${b.status} → ${a.status}${planned}${note}`;
    }
    if (typeof m.event === 'string') return String(m.event);
  }
  return 'Subscription updated';
}
