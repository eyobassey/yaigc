import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { formatUkDateTime, formatUkTime } from '@/lib/visit-schedule';
import { VisitStatePill } from '../page';
import { TransitionPanel } from './TransitionPanel';

export const metadata = { title: 'Visit' };

export default async function OpsVisitDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const visit = await prisma.visit.findUnique({
    where: { id: params.id },
    include: {
      family: { select: { id: true, billingName: true } },
      recipient: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          preferredName: true,
          addressLine1: true,
          addressLine2: true,
          addressCity: true,
          addressPostcode: true,
          phone: true,
          thingsToKnow: true,
        },
      },
      companion: {
        select: {
          id: true,
          applicationId: true,
          firstName: true,
          lastName: true,
        },
      },
      subscription: { select: { id: true } },
    },
  });
  if (!visit) notFound();

  const history = await prisma.auditLogEntry.findMany({
    where: { targetType: 'Visit', targetId: visit.id },
    orderBy: { id: 'desc' },
    take: 20,
  });

  const scheduledEnd = new Date(
    visit.scheduledStartAt.getTime() + visit.scheduledDurationMinutes * 60 * 1000,
  );
  const addressParts = [
    visit.recipient.addressLine1,
    visit.recipient.addressLine2,
    visit.recipient.addressCity,
    visit.recipient.addressPostcode,
  ].filter(Boolean) as string[];

  return (
    <div>
      <Link
        href="/ops/visits"
        className="inline-flex items-center gap-1 text-stone hover:text-moss text-sm mb-4 transition-colors"
      >
        <ChevronLeft size={14} strokeWidth={1.75} aria-hidden="true" />
        All visits
      </Link>

      <header className="mb-6">
        <div className="flex items-center gap-2 flex-wrap mb-2">
          <VisitStatePill state={visit.state} />
          <time
            dateTime={visit.scheduledStartAt.toISOString()}
            className="text-stone text-[0.8125rem] font-mono"
          >
            {formatUkDateTime(visit.scheduledStartAt)}
          </time>
        </div>
        <h1 className="font-head font-normal text-moss text-[clamp(1.75rem,3vw,2.25rem)] leading-[1.1]">
          {visit.companion.firstName} {visit.companion.lastName}
          <span className="text-stone font-body font-normal mx-2 text-[1.25rem]">·</span>
          {visit.recipient.preferredName || visit.recipient.firstName}
        </h1>
      </header>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="flex flex-col gap-6">
          <section className="bg-paper border border-moss/[0.08] rounded-[12px] p-5 sm:p-6">
            <h2 className="font-body text-[0.75rem] font-medium uppercase tracking-[0.1em] text-stone mb-3 inline-flex items-center gap-2">
              <Calendar size={14} strokeWidth={1.75} className="text-moss" aria-hidden="true" />
              Schedule
            </h2>
            <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-2 text-[0.9375rem]">
              <dt className="text-stone">Scheduled start</dt>
              <dd className="text-charcoal">{formatUkDateTime(visit.scheduledStartAt)}</dd>
              <dt className="text-stone">Scheduled end</dt>
              <dd className="text-charcoal">{formatUkTime(scheduledEnd)} UK time</dd>
              <dt className="text-stone">Duration</dt>
              <dd className="text-charcoal">{visit.scheduledDurationMinutes} minutes</dd>
              {visit.actualStartAt ? (
                <>
                  <dt className="text-stone">Actual start</dt>
                  <dd className="text-charcoal">{formatUkDateTime(visit.actualStartAt)}</dd>
                </>
              ) : null}
              {visit.actualEndAt ? (
                <>
                  <dt className="text-stone">Actual end</dt>
                  <dd className="text-charcoal">{formatUkDateTime(visit.actualEndAt)}</dd>
                </>
              ) : null}
            </dl>
          </section>

          <section className="bg-paper border border-moss/[0.08] rounded-[12px] p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
              <h2 className="font-body text-[0.75rem] font-medium uppercase tracking-[0.1em] text-stone">
                Recipient
              </h2>
              <Link
                href={`/ops/families/${visit.family.id}`}
                className="text-moss text-[0.8125rem] hover:text-terracotta inline-flex items-center gap-1"
              >
                Open family
                <ChevronRight size={14} strokeWidth={1.75} aria-hidden="true" />
              </Link>
            </div>
            <div className="font-head text-moss text-[1.0625rem] font-medium">
              {visit.recipient.firstName} {visit.recipient.lastName}
              {visit.recipient.preferredName ? (
                <span className="text-stone font-body font-normal text-[0.9375rem] ml-2">
                  (known as {visit.recipient.preferredName})
                </span>
              ) : null}
            </div>
            {addressParts.length ? (
              <address className="not-italic text-charcoal text-[0.9375rem] mt-2 leading-[1.55]">
                {addressParts.map((line, i) => (
                  <div key={i}>{line}</div>
                ))}
              </address>
            ) : null}
            {visit.recipient.phone ? (
              <p className="text-[0.875rem] mt-2">
                <a href={`tel:${visit.recipient.phone.replace(/\s/g, '')}`} className="link">
                  {visit.recipient.phone}
                </a>
              </p>
            ) : null}
            {visit.recipient.thingsToKnow ? (
              <div className="mt-4 pt-3 border-t border-moss/10">
                <div className="font-body text-[0.7rem] font-medium uppercase tracking-[0.08em] text-stone mb-1">
                  Things to know
                </div>
                <p className="text-charcoal text-[0.875rem] leading-[1.55] whitespace-pre-wrap">
                  {visit.recipient.thingsToKnow}
                </p>
              </div>
            ) : null}
          </section>

          <section className="bg-paper border border-moss/[0.08] rounded-[12px] p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
              <h2 className="font-body text-[0.75rem] font-medium uppercase tracking-[0.1em] text-stone">
                Companion
              </h2>
              <Link
                href={`/ops/companions/${visit.companion.applicationId}`}
                className="text-moss text-[0.8125rem] hover:text-terracotta inline-flex items-center gap-1"
              >
                Open companion
                <ChevronRight size={14} strokeWidth={1.75} aria-hidden="true" />
              </Link>
            </div>
            <div className="font-head text-moss text-[1.0625rem] font-medium">
              {visit.companion.firstName} {visit.companion.lastName}
            </div>
          </section>

          {visit.agreedActivity ? (
            <section className="bg-paper border border-moss/[0.08] rounded-[12px] p-5 sm:p-6">
              <h2 className="font-body text-[0.75rem] font-medium uppercase tracking-[0.1em] text-stone mb-3">
                What is planned
              </h2>
              <p className="text-charcoal leading-[1.55] whitespace-pre-wrap">
                {visit.agreedActivity}
              </p>
            </section>
          ) : null}

          {visit.cancellationReason ? (
            <section className="bg-terracotta/10 border-l-4 border-terracotta px-5 py-4 rounded-r">
              <h2 className="font-body text-[0.7rem] font-medium uppercase tracking-[0.1em] text-terracotta mb-2">
                {visit.cancellationActor ? `Cancelled (${visit.cancellationActor})` : 'Cancellation note'}
              </h2>
              <p className="text-charcoal leading-[1.55] whitespace-pre-wrap break-words">
                {visit.cancellationReason}
              </p>
            </section>
          ) : null}
        </div>

        <aside className="flex flex-col gap-6">
          <TransitionPanel visitId={visit.id} currentState={visit.state} />

          <section className="bg-paper border border-moss/[0.08] rounded-[12px] p-5 sm:p-6">
            <h2 className="font-body text-[0.75rem] font-medium uppercase tracking-[0.1em] text-stone mb-3">
              Origin
            </h2>
            <Link
              href={`/ops/subscriptions/${visit.subscription.id}`}
              className="link text-[0.875rem]"
            >
              From subscription
            </Link>
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

function summarise(metadata: unknown, before: unknown, after: unknown): string {
  if (metadata && typeof metadata === 'object') {
    const m = metadata as Record<string, unknown>;
    if (m.event === 'visit_generated') return 'Visit generated';
    if (m.event === 'visit_state_change' && before && after) {
      const b = before as Record<string, unknown>;
      const a = after as Record<string, unknown>;
      const note = typeof m.note === 'string' ? `. Note: ${m.note}` : '';
      return `State: ${b.state} → ${a.state}${note}`;
    }
    if (m.event === 'visit_booked_email_sent') {
      return `Booked-email sent to ${m.audience} (${m.to})`;
    }
    if (m.event === 'visit_cancelled_email_sent') {
      return `Cancelled-email sent to ${m.audience} (${m.to})`;
    }
    if (typeof m.event === 'string') return String(m.event);
  }
  return 'Visit updated';
}
