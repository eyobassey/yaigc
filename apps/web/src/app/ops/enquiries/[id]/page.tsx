import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft, ChevronRight, ExternalLink, ArrowRight } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth-helpers';
import { StatusPill, SourcePill } from '../page';
import { StatusActions } from './StatusActions';

export const metadata = {
  title: 'Enquiry',
};

export default async function OpsEnquiryDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const enquiry = await prisma.enquiry.findUnique({
    where: { id: params.id },
  });
  if (!enquiry) notFound();

  const user = await getSessionUser();

  // Show this enquiry's audit history (creation + every status change).
  const history = await prisma.auditLogEntry.findMany({
    where: { targetType: 'Enquiry', targetId: enquiry.id },
    orderBy: { id: 'desc' },
    take: 20,
  });

  return (
    <div>
      <Link
        href="/ops/enquiries"
        className="inline-flex items-center gap-1 text-stone hover:text-moss text-sm mb-4 transition-colors"
      >
        <ChevronLeft size={14} strokeWidth={1.75} aria-hidden="true" />
        All enquiries
      </Link>

      <header className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <StatusPill status={enquiry.status} />
            <SourcePill source={enquiry.source} />
            <time
              dateTime={enquiry.createdAt.toISOString()}
              className="text-stone text-[0.8125rem] font-mono"
            >
              {enquiry.createdAt.toISOString().replace('T', ' ').slice(0, 19)}
            </time>
          </div>
          <h1 className="font-head font-normal text-moss text-[clamp(1.75rem,3vw,2.25rem)] leading-[1.1] break-words">
            {enquiry.name}
          </h1>
        </div>
        <div className="w-full lg:w-auto lg:max-w-sm">
          <StatusActions
            enquiryId={enquiry.id}
            currentStatus={enquiry.status}
            actorId={user?.id ?? ''}
            actorRole={user?.role ?? ''}
          />
        </div>
      </header>

      {/* Conversion banner: appears for triaged enquiries (call-to-action)
          and for converted enquiries (deep link to the resulting Family). */}
      {enquiry.status === 'triaged' ? (
        <div className="mb-6 bg-moss text-cream rounded-[12px] p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="font-body text-[0.7rem] uppercase tracking-[0.1em] text-terracotta-light mb-1">
              Ready when you are
            </div>
            <div className="font-head text-cream text-[1.125rem] font-medium leading-[1.3]">
              Convert this enquiry into a Family.
            </div>
            <div className="text-cream/75 text-[0.875rem] mt-1">
              Creates the Family, the payer, and a Recipient. Triggered after the intake call.
            </div>
          </div>
          <Link
            href={`/ops/enquiries/${enquiry.id}/convert`}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-cream text-moss text-[0.9375rem] font-medium hover:bg-cream-deep transition-colors whitespace-nowrap"
          >
            Convert
            <ArrowRight size={16} strokeWidth={1.75} aria-hidden="true" />
          </Link>
        </div>
      ) : null}

      {enquiry.status === 'converted' && enquiry.convertedToFamilyId ? (
        <div className="mb-6 bg-paper border border-moss/[0.08] rounded-[12px] p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="font-body text-[0.7rem] uppercase tracking-[0.1em] text-stone mb-1">
              Outcome
            </div>
            <div className="font-head text-moss text-[1.0625rem] font-medium">
              Converted into a Family.
            </div>
          </div>
          <Link
            href={`/ops/families/${enquiry.convertedToFamilyId}`}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-moss text-cream text-[0.9375rem] font-medium hover:bg-moss-dark transition-colors whitespace-nowrap"
          >
            Open Family
            <ChevronRight size={16} strokeWidth={1.75} aria-hidden="true" />
          </Link>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <section className="bg-paper border border-moss/[0.08] rounded-[12px] p-5 sm:p-6">
          <h2 className="font-body text-[0.75rem] font-medium uppercase tracking-[0.1em] text-stone mb-3">
            Message
          </h2>
          <p className="text-charcoal leading-[1.65] whitespace-pre-wrap break-words">
            {enquiry.message}
          </p>
        </section>

        <aside className="bg-paper border border-moss/[0.08] rounded-[12px] p-5 sm:p-6">
          <h2 className="font-body text-[0.75rem] font-medium uppercase tracking-[0.1em] text-stone mb-4">
            Contact
          </h2>
          <dl className="grid grid-cols-1 sm:grid-cols-[max-content_1fr] gap-x-4 gap-y-3 sm:gap-y-2 text-[0.9375rem]">
            <dt className="text-stone text-[0.75rem] uppercase tracking-[0.08em] sm:text-[0.9375rem] sm:normal-case sm:tracking-normal">
              Email
            </dt>
            <dd className="text-charcoal break-all">
              <a href={`mailto:${enquiry.email}`} className="link inline-flex items-center gap-1">
                {enquiry.email}
                <ExternalLink size={12} strokeWidth={1.75} aria-hidden="true" />
              </a>
            </dd>
            <dt className="text-stone text-[0.75rem] uppercase tracking-[0.08em] sm:text-[0.9375rem] sm:normal-case sm:tracking-normal">
              Phone
            </dt>
            <dd className="text-charcoal">
              {enquiry.phone ? (
                <a href={`tel:${enquiry.phone.replace(/\s/g, '')}`} className="link">
                  {enquiry.phone}
                </a>
              ) : (
                <em className="not-italic text-stone/60">-</em>
              )}
            </dd>
            <dt className="text-stone text-[0.75rem] uppercase tracking-[0.08em] sm:text-[0.9375rem] sm:normal-case sm:tracking-normal">
              Postcode
            </dt>
            <dd className="text-charcoal font-mono">
              {enquiry.postcode ?? <em className="not-italic text-stone/60">-</em>}
            </dd>
            <dt className="text-stone text-[0.75rem] uppercase tracking-[0.08em] sm:text-[0.9375rem] sm:normal-case sm:tracking-normal">
              Marketing
            </dt>
            <dd className="text-charcoal">
              {enquiry.consentMarketing ? 'opted in' : 'opted out'}
            </dd>
          </dl>
        </aside>
      </div>

      <section className="mt-8">
        <h2 className="font-body text-[0.75rem] font-medium uppercase tracking-[0.1em] text-stone mb-3">
          History
        </h2>
        <div className="bg-paper border border-moss/[0.08] rounded-[12px] overflow-hidden">
          {history.length === 0 ? (
            <div className="px-5 py-6 text-stone text-sm">No history yet.</div>
          ) : (
            <ul className="divide-y divide-moss/[0.08] text-[0.875rem]">
              {history.map((e) => (
                <li
                  key={e.id.toString()}
                  className="px-4 sm:px-5 py-3 flex flex-col gap-1.5 sm:grid sm:grid-cols-[max-content_max-content_1fr] sm:gap-x-4 sm:items-baseline"
                >
                  <div className="flex items-center gap-2 sm:contents">
                    <time
                      dateTime={e.occurredAt.toISOString()}
                      className="text-stone font-mono text-[0.75rem] sm:text-[0.8125rem]"
                    >
                      {e.occurredAt.toISOString().replace('T', ' ').slice(0, 19)}
                    </time>
                    <span className="font-body text-[0.6875rem] uppercase tracking-[0.06em] text-moss bg-moss/10 rounded px-1.5 py-0.5 inline-block">
                      {e.actionType}
                    </span>
                  </div>
                  <span className="text-charcoal text-[0.875rem] break-words">
                    {summariseEntry(e.metadata, e.beforeState, e.afterState)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}

function summariseEntry(
  metadata: unknown,
  before: unknown,
  after: unknown,
): string {
  if (metadata && typeof metadata === 'object') {
    const m = metadata as Record<string, unknown>;
    if (m.event === 'contact_form_submitted') return 'Submitted via /contact';
    if (m.event === 'confirmation_email_sent') {
      return `Confirmation email sent to ${m.to ?? 'submitter'}`;
    }
    if (m.event === 'status_change' && before && after) {
      const b = before as Record<string, unknown>;
      const a = after as Record<string, unknown>;
      const transition = `Status: ${b.status} → ${a.status}`;
      return m.note ? `${transition}. Note: ${m.note}` : transition;
    }
    if (m.event) return String(m.event);
  }
  return JSON.stringify({ before, after }).slice(0, 200);
}
