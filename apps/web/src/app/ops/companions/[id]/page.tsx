import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft, ChevronRight, ArrowRight, CheckCircle2, FileText, ShieldCheck } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import {
  DAYS,
  PERIODS,
  type AvailabilitySlots,
  type PeriodKey,
  type DayKey,
} from '@/lib/availability';
import { ApplicationStatusPill } from '../page';
import { TransitionPanel } from './TransitionPanel';
import { TriageNotesForm } from './TriageNotesForm';
import { RightToWorkPanel } from './RightToWorkPanel';
import { DocumentList } from './DocumentList';
import { Paginator } from '@/components/ui/Paginator';
import { parsePagination, buildView } from '@/lib/pagination';
import { companionPhotoSrc } from '@/lib/companion-photo-src';
import { Heart, Pencil as PencilIcon } from 'lucide-react';
import {
  BADGE_BY_SLUG,
  tierFromVisits,
  tierToneClass,
  tenureLabel,
} from '@/lib/badges';

export const metadata = { title: 'Application' };

export default async function CompanionApplicationDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const application = await prisma.companionApplication.findUnique({
    where: { id: params.id },
    include: {
      companion: {
        select: {
          id: true,
          status: true,
          borough: true,
          hourlyRate: true,
          photoUrl: true,
          photoFilename: true,
          createdAt: true,
          badges: { select: { slug: true }, orderBy: { awardedAt: 'asc' } },
          _count: {
            select: {
              visits: { where: { state: { in: ['completed', 'reported'] } } },
            },
          },
        },
      },
      rightToWorkVerifiedBy: { select: { firstName: true, lastName: true, email: true } },
      documents: {
        where: { archivedAt: null },
        orderBy: { uploadedAt: 'desc' },
      },
    },
  });
  if (!application) notFound();

  const companionPhotoUrl = application.companion
    ? companionPhotoSrc({
        id: application.companion.id,
        photoFilename: application.companion.photoFilename,
        photoUrl: application.companion.photoUrl,
      })
    : null;

  const tier = application.companion
    ? tierFromVisits(application.companion._count.visits)
    : null;
  const tenure = application.companion
    ? tenureLabel(application.companion.createdAt)
    : null;
  const badgeLabels = application.companion
    ? application.companion.badges
        .map((b) => BADGE_BY_SLUG[b.slug])
        .filter((b): b is NonNullable<typeof b> => Boolean(b))
    : [];

  const historyWhere = {
    OR: [
      { targetType: 'CompanionApplication', targetId: application.id },
      ...(application.companion
        ? [{ targetType: 'Companion' as const, targetId: application.companion.id }]
        : []),
    ],
  };
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

  return (
    <div>
      <Link
        href="/ops/companions"
        className="inline-flex items-center gap-1 text-stone hover:text-moss text-sm mb-4 transition-colors"
      >
        <ChevronLeft size={14} strokeWidth={1.75} aria-hidden="true" />
        All applications
      </Link>

      <header className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <ApplicationStatusPill status={application.status} />
            <time
              dateTime={application.createdAt.toISOString()}
              className="text-stone text-[0.8125rem] font-mono"
            >
              {application.createdAt.toISOString().replace('T', ' ').slice(0, 19)}
            </time>
          </div>
          <h1 className="font-head font-normal text-moss text-[clamp(1.75rem,3vw,2.25rem)] leading-[1.1] break-words">
            {application.firstName} {application.lastName}
          </h1>
          <div className="text-stone text-[0.9375rem] mt-1 break-all">
            <a href={`mailto:${application.email}`} className="link">
              {application.email}
            </a>{' '}
            ·{' '}
            <a href={`tel:${application.phone.replace(/\s/g, '')}`} className="link">
              {application.phone}
            </a>{' '}
            · {application.postcode}
          </div>
        </div>
      </header>

      {searchParams.welcomed === '1' && application.companion ? (
        <div className="mb-6 bg-moss text-cream rounded-[12px] p-5 sm:p-6 flex items-start gap-3">
          <CheckCircle2 size={22} strokeWidth={1.75} className="flex-shrink-0" aria-hidden="true" />
          <div>
            <div className="font-head text-[1.0625rem] font-medium">Companion created.</div>
            <div className="text-cream/80 text-[0.9375rem] mt-1">
              Status is now <em className="not-italic font-medium">onboarding</em>. The companion record is ready for DBS, training, and a first match.
            </div>
          </div>
        </div>
      ) : null}

      {application.status === 'vetting' ? (
        <div className="mb-6 bg-moss text-cream rounded-[12px] p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="font-body text-[0.7rem] uppercase tracking-[0.1em] text-terracotta-light mb-1">
              Ready to bring on board
            </div>
            <div className="font-head text-cream text-[1.125rem] font-medium leading-[1.3]">
              Approve this application and create a Companion.
            </div>
          </div>
          <Link
            href={`/ops/companions/${application.id}/approve`}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-cream text-moss text-[0.9375rem] font-medium hover:bg-cream-deep transition-colors whitespace-nowrap"
          >
            Approve
            <ArrowRight size={16} strokeWidth={1.75} aria-hidden="true" />
          </Link>
        </div>
      ) : null}

      {application.companion ? (
        <div className="mb-6 bg-paper border border-moss/[0.08] rounded-[12px] p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <div className="flex-shrink-0">
              {companionPhotoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={companionPhotoUrl}
                  alt={`Photo of ${application.firstName}`}
                  width="64"
                  height="64"
                  className="w-[64px] h-[64px] rounded-full object-cover border border-moss/15"
                />
              ) : (
                <div className="w-[64px] h-[64px] rounded-full bg-moss/10 flex items-center justify-center">
                  <Heart size={24} strokeWidth={1.5} className="text-moss/40" aria-hidden="true" />
                </div>
              )}
            </div>
            <div className="min-w-0">
              <div className="font-body text-[0.7rem] uppercase tracking-[0.1em] text-stone mb-1">
                Linked companion
              </div>
              <div className="font-head text-moss text-[1.0625rem] font-medium flex items-center gap-2 flex-wrap">
                <span>
                  {application.firstName} {application.lastName}
                </span>
                {tier?.label ? (
                  <span
                    className={`inline-flex items-center font-body text-[0.7rem] font-medium uppercase tracking-[0.08em] px-2 py-0.5 rounded ${tierToneClass(tier.tier)}`}
                    title={`${tier.visits} completed visits`}
                  >
                    {tier.label} · {tier.visits}
                  </span>
                ) : tier ? (
                  <span className="inline-flex items-center font-body text-[0.7rem] uppercase tracking-[0.08em] text-stone">
                    {tier.visits} {tier.visits === 1 ? 'visit' : 'visits'}
                  </span>
                ) : null}
              </div>
              <div className="text-stone text-[0.875rem] mt-1">
                {application.companion.status} · {application.companion.borough.replace('_', ' ')} · £{Number(application.companion.hourlyRate).toFixed(2)}/hr
                {tenure ? ` · ${tenure}` : ''}
              </div>
              {badgeLabels.length > 0 ? (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {badgeLabels.map((b) => (
                    <span
                      key={b.slug}
                      className="inline-flex items-center font-body text-[0.7rem] text-charcoal bg-moss/10 rounded-full px-2 py-0.5"
                    >
                      {b.label}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
          <Link
            href={`/ops/companions/${application.id}/edit`}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-moss text-cream text-[0.875rem] hover:bg-moss-deep transition-colors whitespace-nowrap"
          >
            <PencilIcon size={14} strokeWidth={1.75} aria-hidden="true" />
            Edit companion
          </Link>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="flex flex-col gap-6">
          <section className="bg-paper border border-moss/[0.08] rounded-[12px] p-5 sm:p-6">
            <h2 className="font-body text-[0.75rem] font-medium uppercase tracking-[0.1em] text-stone mb-3">
              About them
            </h2>
            <p className="text-charcoal leading-[1.65] whitespace-pre-wrap break-words">
              {application.aboutYou}
            </p>
          </section>

          <section className="bg-paper border border-moss/[0.08] rounded-[12px] p-5 sm:p-6">
            <h2 className="font-body text-[0.75rem] font-medium uppercase tracking-[0.1em] text-stone mb-3">
              Why they want to do this
            </h2>
            <p className="text-charcoal leading-[1.65] whitespace-pre-wrap break-words">
              {application.whyJoinReason}
            </p>
          </section>

          <section className="bg-paper border border-moss/[0.08] rounded-[12px] p-5 sm:p-6">
            <h2 className="font-body text-[0.75rem] font-medium uppercase tracking-[0.1em] text-stone mb-3">
              When they are free
            </h2>
            <p className="text-charcoal leading-[1.65] whitespace-pre-wrap break-words mb-4">
              {application.availabilitySummary}
            </p>
            <AvailabilityGrid slots={application.availabilitySlots} />
          </section>

          <section className="bg-paper border border-moss/[0.08] rounded-[12px] p-5 sm:p-6">
            <h2 className="font-body text-[0.75rem] font-medium uppercase tracking-[0.1em] text-stone mb-3">
              Triage notes
            </h2>
            <TriageNotesForm
              applicationId={application.id}
              initialValue={application.triageNotes ?? ''}
            />
          </section>

          {application.declineReason ? (
            <section className="bg-terracotta/10 border-l-4 border-terracotta px-5 py-4 rounded-r">
              <h2 className="font-body text-[0.7rem] font-medium uppercase tracking-[0.1em] text-terracotta mb-2">
                Decline reason
              </h2>
              <p className="text-charcoal leading-[1.55] whitespace-pre-wrap break-words">
                {application.declineReason}
              </p>
            </section>
          ) : null}
        </div>

        <aside className="flex flex-col gap-6">
          <TransitionPanel
            applicationId={application.id}
            currentStatus={application.status}
          />

          <section className="bg-paper border border-moss/[0.08] rounded-[12px] p-5 sm:p-6">
            <h2 className="font-body text-[0.75rem] font-medium uppercase tracking-[0.1em] text-stone mb-3 inline-flex items-center gap-2">
              <ShieldCheck size={14} strokeWidth={1.75} className="text-moss" aria-hidden="true" />
              Right to work
            </h2>
            <RightToWorkPanel
              applicationId={application.id}
              attestation={application.rightToWork}
              type={application.rightToWorkType}
              shareCode={application.rightToWorkShareCode}
              expiresAt={application.rightToWorkExpiresAt}
              dateOfBirth={application.dateOfBirth}
              verifiedAt={application.rightToWorkVerifiedAt}
              verifiedBy={application.rightToWorkVerifiedBy}
              verificationNote={application.rightToWorkVerificationNote}
            />
          </section>

          <section className="bg-paper border border-moss/[0.08] rounded-[12px] p-5 sm:p-6">
            <h2 className="font-body text-[0.75rem] font-medium uppercase tracking-[0.1em] text-stone mb-3 inline-flex items-center gap-2">
              <FileText size={14} strokeWidth={1.75} className="text-moss" aria-hidden="true" />
              Documents ({application.documents.length})
            </h2>
            <DocumentList
              applicationId={application.id}
              documents={application.documents.map((d) => ({
                id: d.id,
                kind: d.kind,
                filename: d.filename,
                contentType: d.contentType,
                sizeBytes: d.sizeBytes,
                description: d.description,
                uploadedAt: d.uploadedAt.toISOString(),
              }))}
            />
          </section>

          <section className="bg-paper border border-moss/[0.08] rounded-[12px] p-5 sm:p-6">
            <h2 className="font-body text-[0.75rem] font-medium uppercase tracking-[0.1em] text-stone mb-3">
              Other compliance signals
            </h2>
            <dl className="grid grid-cols-[max-content_1fr] gap-x-3 gap-y-2 text-[0.875rem]">
              <dt className="text-stone">DBS consent</dt>
              <dd className="text-charcoal">
                {application.backgroundCheckConsent ? 'Given' : 'Withheld'}
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
              basePath={`/ops/companions/${application.id}`}
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

function AvailabilityGrid({ slots }: { slots: unknown }) {
  if (!slots || typeof slots !== 'object') return null;
  const s = slots as AvailabilitySlots;

  return (
    <div className="border border-moss/10 rounded-md overflow-hidden text-[0.8125rem]">
      <div className="grid grid-cols-[max-content_repeat(3,1fr)] items-center bg-cream-deep px-3 py-1.5 gap-x-3">
        <span aria-hidden="true" />
        {PERIODS.map((p) => (
          <div
            key={p.key}
            className="font-body text-[0.65rem] uppercase tracking-[0.06em] text-stone text-center"
          >
            {p.label.slice(0, 3)}
          </div>
        ))}
      </div>
      <ul className="divide-y divide-moss/[0.06] bg-cream">
        {DAYS.map((d) => {
          const picks = (s[d.key as DayKey] ?? []) as PeriodKey[];
          return (
            <li
              key={d.key}
              className="grid grid-cols-[max-content_repeat(3,1fr)] items-center px-3 py-1.5 gap-x-3"
            >
              <span className="font-body text-[0.75rem] text-stone uppercase tracking-[0.06em] w-8">
                {d.short}
              </span>
              {PERIODS.map((p) => {
                const on = picks.includes(p.key);
                return (
                  <span
                    key={p.key}
                    className="flex justify-center"
                    aria-label={`${d.label} ${p.label}: ${on ? 'yes' : 'no'}`}
                  >
                    <span
                      aria-hidden="true"
                      className={`inline-block w-4 h-4 rounded-sm border ${
                        on
                          ? 'bg-moss border-moss'
                          : 'bg-cream border-moss/15'
                      }`}
                    />
                  </span>
                );
              })}
            </li>
          );
        })}
      </ul>
      {typeof s.caveats === 'string' && s.caveats ? (
        <div className="px-3 py-2 bg-cream-deep border-t border-moss/10 text-stone text-[0.8125rem]">
          Note: {s.caveats}
        </div>
      ) : null}
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
    if (m.event === 'companion_application_submitted') return 'Submitted via /companions/join/apply';
    if (m.event === 'application_confirmation_email_sent') {
      return `Confirmation email sent to ${m.to ?? 'applicant'}`;
    }
    if (m.event === 'application_status_change' && before && after) {
      const b = before as Record<string, unknown>;
      const a = after as Record<string, unknown>;
      const note = typeof m.note === 'string' ? `. Note: ${m.note}` : '';
      return `Status: ${b.status} → ${a.status}${note}`;
    }
    if (m.event === 'triage_notes_updated') return 'Triage notes edited';
    if (m.event === 'companion_created') return 'Companion created from this application';
    if (typeof m.event === 'string') return String(m.event);
  }
  return 'Application updated';
}
