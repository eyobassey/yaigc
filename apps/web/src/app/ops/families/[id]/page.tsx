import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft, Pencil, Plus, Sparkles, Calendar, Heart, Clock } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { setFamilyCheckInCadence } from '@/lib/relationship';
import { FamilyStatusPill } from '../page';
import { MatchStatusPill } from '../../matches/page';
import { SubscriptionStatusPill } from '../../subscriptions/[id]/page';
import { summariseSubscription } from '@/lib/subscription-format';
import { Paginator } from '@/components/ui/Paginator';
import { parsePagination, buildView } from '@/lib/pagination';

export const metadata = {
  title: 'Family',
};

export default async function OpsFamilyDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const family = await prisma.family.findUnique({
    where: { id: params.id },
    include: {
      members: {
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              role: true,
            },
          },
        },
      },
      recipients: true,
      matches: {
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
          companion: { select: { firstName: true, lastName: true, borough: true } },
          recipient: { select: { firstName: true, lastName: true } },
        },
      },
      subscriptions: {
        orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
        include: {
          companion: { select: { firstName: true, lastName: true } },
          recipient: { select: { firstName: true, lastName: true } },
        },
      },
      // R.4: revisions of the two prose fields + the operator notes
      // timeline. textRevisions is intentionally not capped here -
      // the page renders them inside a collapsed <details>, and
      // change-over-time is the whole point of keeping them.
      textRevisions: {
        orderBy: { createdAt: 'desc' },
        include: {
          author: { select: { firstName: true, lastName: true, email: true } },
        },
      },
      relationshipNotes: {
        orderBy: { createdAt: 'desc' },
        include: {
          operator: { select: { firstName: true, lastName: true } },
        },
      },
    },
  });
  if (!family) notFound();

  // Group text revisions by what they describe so each card can
  // render its own history without re-iterating the whole list.
  const aboutRevisionsByRecipient = new Map<
    string,
    typeof family.textRevisions
  >();
  const hopesRevisions: typeof family.textRevisions = [];
  for (const rev of family.textRevisions) {
    if (rev.field === 'aboutTheRecipient' && rev.recipientId) {
      const list = aboutRevisionsByRecipient.get(rev.recipientId) ?? [];
      list.push(rev);
      aboutRevisionsByRecipient.set(rev.recipientId, list);
    } else if (rev.field === 'whatWeAreHopingFor') {
      hopesRevisions.push(rev);
    }
  }

  const historyWhere = {
    OR: [
      { targetType: 'Family', targetId: family.id },
      ...family.recipients.map((r) => ({
        targetType: 'Recipient' as const,
        targetId: r.id,
      })),
      ...family.members.map((m) => ({
        targetType: 'FamilyMember' as const,
        targetId: m.id,
      })),
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

  const originatingEnquiry = await prisma.enquiry.findFirst({
    where: { convertedToFamilyId: family.id },
    select: { id: true, name: true, source: true, createdAt: true },
  });

  return (
    <div>
      <Link
        href="/ops/families"
        className="inline-flex items-center gap-1 text-stone hover:text-moss text-sm mb-4 transition-colors"
      >
        <ChevronLeft size={14} strokeWidth={1.75} aria-hidden="true" />
        All families
      </Link>

      <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <FamilyStatusPill status={family.status} />
            <time
              dateTime={family.joinedAt.toISOString()}
              className="text-stone text-[0.8125rem] font-mono"
            >
              joined {family.joinedAt.toISOString().slice(0, 10)}
            </time>
            {originatingEnquiry ? (
              <Link
                href={`/ops/enquiries/${originatingEnquiry.id}`}
                className="link text-[0.8125rem]"
              >
                from enquiry
              </Link>
            ) : null}
          </div>
          <h1 className="font-head font-normal text-moss text-[clamp(1.75rem,3vw,2.25rem)] leading-[1.1] break-words">
            {family.billingName}
          </h1>
        </div>
        <Link
          href={`/ops/families/${family.id}/edit`}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-moss/20 text-moss text-[0.8125rem] font-medium hover:bg-moss hover:text-cream transition-colors whitespace-nowrap"
        >
          <Pencil size={14} strokeWidth={1.75} aria-hidden="true" />
          Edit family
        </Link>
      </header>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="flex flex-col gap-6">
          <section className="bg-paper border border-moss/[0.08] rounded-[12px] p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
              <h2 className="font-body text-[0.75rem] font-medium uppercase tracking-[0.1em] text-stone">
                Recipients ({family.recipients.length})
              </h2>
              <Link
                href={`/ops/families/${family.id}/recipients/new`}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-moss/20 text-moss text-[0.75rem] font-medium hover:bg-moss hover:text-cream transition-colors whitespace-nowrap"
              >
                <Plus size={12} strokeWidth={2} aria-hidden="true" />
                Add recipient
              </Link>
            </div>
            {family.recipients.length === 0 ? (
              <p className="text-stone text-sm">No recipients yet.</p>
            ) : (
              <ul className="flex flex-col gap-4 divide-y divide-moss/[0.06]">
                {family.recipients.map((r) => {
                  const addressParts = [
                    r.addressLine1,
                    r.addressLine2,
                    r.addressCity,
                    r.addressPostcode,
                  ].filter(Boolean);
                  const age = ageFromDob(r.dateOfBirth);
                  return (
                    <li key={r.id} className="pt-4 first:pt-0">
                      <div className="flex items-start justify-between gap-3 flex-wrap mb-1">
                        <div className="font-head text-moss text-[1.125rem] font-medium break-words">
                          {r.firstName} {r.lastName}
                          {r.preferredName ? (
                            <span className="text-stone text-[0.9375rem] font-body font-normal ml-2">
                              (known as {r.preferredName})
                            </span>
                          ) : null}
                        </div>
                        <Link
                          href={`/ops/families/${family.id}/recipients/${r.id}/edit`}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-moss/20 text-moss text-[0.75rem] font-medium hover:bg-moss hover:text-cream transition-colors whitespace-nowrap"
                        >
                          <Pencil size={12} strokeWidth={1.75} aria-hidden="true" />
                          Edit
                        </Link>
                      </div>

                      {/* Consent badges */}
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        <ConsentBadge label="Visits" granted={r.consentToVisits} />
                        <ConsentBadge label="Photos" granted={r.consentToPhotos} />
                        <ConsentBadge label="Report sharing" granted={r.consentToReportSharing} />
                      </div>

                      <dl className="mt-3 grid grid-cols-1 sm:grid-cols-[max-content_1fr] gap-x-4 gap-y-1 text-[0.9375rem]">
                        {addressParts.length > 0 ? (
                          <>
                            <dt className="text-stone">Address</dt>
                            <dd className="text-charcoal">
                              {addressParts.join(', ')}
                              {r.addressCountry && r.addressCountry !== 'GB'
                                ? `, ${r.addressCountry}`
                                : ''}
                            </dd>
                          </>
                        ) : null}
                        {r.phone ? (
                          <>
                            <dt className="text-stone">Phone</dt>
                            <dd className="text-charcoal">
                              <a href={`tel:${r.phone.replace(/\s/g, '')}`} className="link">
                                {r.phone}
                              </a>
                            </dd>
                          </>
                        ) : null}
                        {r.dateOfBirth ? (
                          <>
                            <dt className="text-stone">Date of birth</dt>
                            <dd className="text-charcoal">
                              {r.dateOfBirth.toISOString().slice(0, 10)}
                              {age != null ? (
                                <span className="text-stone ml-2">
                                  (age {age})
                                </span>
                              ) : null}
                            </dd>
                          </>
                        ) : null}
                        {r.interests ? (
                          <>
                            <dt className="text-stone">Interests</dt>
                            <dd className="text-charcoal">{r.interests}</dd>
                          </>
                        ) : null}
                        {r.thingsToKnow ? (
                          <>
                            <dt className="text-stone">Things to know</dt>
                            <dd className="text-charcoal whitespace-pre-wrap">
                              {r.thingsToKnow}
                            </dd>
                          </>
                        ) : null}
                      </dl>

                      {/* R.4: family-payer prose - "What matters about
                          [name]" - plus a collapsed revision history so
                          the operator can read month-1 vs month-12. */}
                      <AboutRecipientBlock
                        body={r.aboutTheRecipient}
                        firstName={r.preferredName || r.firstName}
                        revisions={aboutRevisionsByRecipient.get(r.id) ?? []}
                      />
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section className="bg-paper border border-moss/[0.08] rounded-[12px] p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
              <h2 className="font-body text-[0.75rem] font-medium uppercase tracking-[0.1em] text-stone inline-flex items-center gap-2">
                <Calendar size={14} strokeWidth={1.75} className="text-moss" aria-hidden="true" />
                Subscriptions ({family.subscriptions.length})
              </h2>
              {family.recipients.length > 0 ? (
                <Link
                  href={`/ops/families/${family.id}/subscriptions/new`}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-moss/20 text-moss text-[0.75rem] font-medium hover:bg-moss hover:text-cream transition-colors whitespace-nowrap"
                >
                  <Plus size={12} strokeWidth={2} aria-hidden="true" />
                  Create subscription
                </Link>
              ) : null}
            </div>
            {family.subscriptions.length === 0 ? (
              <p className="text-stone text-sm">No subscriptions yet.</p>
            ) : (
              <ul className="divide-y divide-moss/[0.06]">
                {family.subscriptions.map((s) => (
                  <li key={s.id}>
                    <Link
                      href={`/ops/subscriptions/${s.id}`}
                      className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0 hover:opacity-80 transition-opacity"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <SubscriptionStatusPill status={s.status} />
                        </div>
                        <div className="font-head text-moss text-[0.9375rem] font-medium break-words">
                          {s.companion.firstName} {s.companion.lastName}
                          <span className="text-stone font-body font-normal text-[0.8125rem]">
                            {' '}for {s.recipient.firstName}
                          </span>
                        </div>
                        <div className="text-stone text-[0.8125rem] mt-0.5">
                          {summariseSubscription(s)}
                        </div>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="bg-paper border border-moss/[0.08] rounded-[12px] p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
              <h2 className="font-body text-[0.75rem] font-medium uppercase tracking-[0.1em] text-stone inline-flex items-center gap-2">
                <Sparkles size={14} strokeWidth={1.75} className="text-moss" aria-hidden="true" />
                Matches ({family.matches.length})
              </h2>
              {family.recipients.length > 0 ? (
                <Link
                  href={`/ops/families/${family.id}/matches/new`}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-moss/20 text-moss text-[0.75rem] font-medium hover:bg-moss hover:text-cream transition-colors whitespace-nowrap"
                >
                  <Plus size={12} strokeWidth={2} aria-hidden="true" />
                  Propose a match
                </Link>
              ) : null}
            </div>
            {family.matches.length === 0 ? (
              <p className="text-stone text-sm">No matches proposed yet.</p>
            ) : (
              <ul className="divide-y divide-moss/[0.06]">
                {family.matches.map((m) => (
                  <li key={m.id}>
                    <Link
                      href={`/ops/matches/${m.id}`}
                      className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0 hover:opacity-80 transition-opacity"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <MatchStatusPill status={m.status} />
                          <time
                            dateTime={m.createdAt.toISOString()}
                            className="text-stone text-[0.7rem] font-mono"
                          >
                            {m.createdAt.toISOString().slice(0, 10)}
                          </time>
                        </div>
                        <div className="font-head text-moss text-[0.9375rem] font-medium break-words">
                          {m.companion.firstName} {m.companion.lastName}
                          {m.recipient ? (
                            <span className="text-stone font-body font-normal text-[0.8125rem]">
                              {' '}for {m.recipient.firstName}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="bg-paper border border-moss/[0.08] rounded-[12px] p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
              <h2 className="font-body text-[0.75rem] font-medium uppercase tracking-[0.1em] text-stone">
                Members ({family.members.length})
              </h2>
              <Link
                href={`/ops/families/${family.id}/members/new`}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-moss/20 text-moss text-[0.75rem] font-medium hover:bg-moss hover:text-cream transition-colors whitespace-nowrap"
              >
                <Plus size={12} strokeWidth={2} aria-hidden="true" />
                Add member
              </Link>
            </div>
            {family.members.length === 0 ? (
              <p className="text-stone text-sm">No members yet.</p>
            ) : (
              <ul className="flex flex-col gap-4 divide-y divide-moss/[0.06]">
                {family.members.map((m) => {
                  const name =
                    `${m.user.firstName ?? ''} ${m.user.lastName ?? ''}`.trim() ||
                    m.user.email;
                  return (
                    <li key={m.id} className="pt-4 first:pt-0">
                      <div className="flex items-start justify-between gap-3 flex-wrap mb-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-head text-moss text-[1.0625rem] font-medium">
                            {name}
                          </span>
                          <RolePill role={m.role} />
                          {m.isPrimaryContact ? (
                            <span className="font-body text-[0.65rem] uppercase tracking-[0.06em] text-moss bg-moss/10 rounded px-1.5 py-0.5">
                              Primary contact
                            </span>
                          ) : null}
                        </div>
                        <Link
                          href={`/ops/families/${family.id}/members/${m.id}/edit`}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-moss/20 text-moss text-[0.75rem] font-medium hover:bg-moss hover:text-cream transition-colors whitespace-nowrap"
                        >
                          <Pencil size={12} strokeWidth={1.75} aria-hidden="true" />
                          Edit
                        </Link>
                      </div>
                      <div className="text-stone text-[0.875rem] break-all">
                        <a href={`mailto:${m.user.email}`} className="link">
                          {m.user.email}
                        </a>
                      </div>
                      {m.relationshipToRecipient ? (
                        <div className="text-stone text-[0.875rem] mt-1">
                          Relationship to recipient: {m.relationshipToRecipient}
                        </div>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>

        <aside className="flex flex-col gap-6">
          {/* R.4: hopes prose - operator-facing, NEVER shown to the
              companion directly (memo s5.4). Read during the
              fifth-visit reflection call and the periodic check-in. */}
          <HopesBlock
            body={family.whatWeAreHopingFor}
            revisions={hopesRevisions}
          />

          {/* R.4: cadence control + relationship notes timeline. The
              workflow to log a new note is on the Today dashboard
              (R.5); this page reads them back. */}
          <CadenceCard
            familyId={family.id}
            cadenceDays={family.checkInCadenceDays}
            lastCheckInAt={family.lastCheckInAt}
            lastReflectionAt={family.lastReflectionAt}
          />
          <ReflectionNotesBlock notes={family.relationshipNotes} />

          {/* Billing address */}
          {(family.billingAddressLine1 ||
            family.billingCity ||
            family.billingPostcode) ? (
            <section className="bg-paper border border-moss/[0.08] rounded-[12px] p-5 sm:p-6">
              <h2 className="font-body text-[0.75rem] font-medium uppercase tracking-[0.1em] text-stone mb-3">
                Billing address
              </h2>
              <address className="text-charcoal not-italic leading-[1.55] text-[0.9375rem]">
                {[
                  family.billingAddressLine1,
                  family.billingAddressLine2,
                  family.billingCity,
                  family.billingPostcode,
                  family.billingCountry !== 'GB' ? family.billingCountry : null,
                ]
                  .filter(Boolean)
                  .map((line, i) => (
                    <div key={i}>{line}</div>
                  ))}
              </address>
            </section>
          ) : null}

          {family.intakeNotes ? (
            <section className="bg-paper border border-moss/[0.08] rounded-[12px] p-5 sm:p-6">
              <h2 className="font-body text-[0.75rem] font-medium uppercase tracking-[0.1em] text-stone mb-3">
                Intake notes
              </h2>
              <p className="text-charcoal leading-[1.55] whitespace-pre-wrap text-[0.9375rem]">
                {family.intakeNotes}
              </p>
            </section>
          ) : null}

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
                      {summarise(e.targetType, e.metadata)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <Paginator
              basePath={`/ops/families/${family.id}`}
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

function RolePill({ role }: { role: string }) {
  return (
    <span className="font-body text-[0.65rem] uppercase tracking-[0.06em] text-charcoal bg-cream-deep rounded px-1.5 py-0.5">
      {role}
    </span>
  );
}

function summarise(targetType: string, metadata: unknown): string {
  if (metadata && typeof metadata === 'object') {
    const m = metadata as Record<string, unknown>;
    if (m.event === 'family_created') return 'Family created';
    if (m.event === 'recipient_created') return 'Recipient added';
    if (m.event === 'family_member_created') return 'Family member added';
    if (m.event === 'enquiry_converted') return `Converted from enquiry`;
    if (m.event === 'welcome_email_sent') {
      return `Welcome email sent to ${m.to ?? 'payer'}`;
    }
    if (m.event === 'family_updated' && Array.isArray(m.changedFields)) {
      return `Family updated: ${(m.changedFields as string[]).join(', ')}`;
    }
    if (m.event === 'recipient_updated' && Array.isArray(m.changedFields)) {
      return `Recipient updated: ${(m.changedFields as string[]).join(', ')}`;
    }
    if (m.event === 'family_member_updated' && Array.isArray(m.changedFields)) {
      return `Member updated: ${(m.changedFields as string[]).join(', ')}`;
    }
    if (m.event === 'family_member_added') {
      return `Member added${m.email ? ` (${m.email})` : ''}`;
    }
    if (m.event === 'recipient_added') return 'Recipient added';
    if (m.event === 'subscription_created') return 'Subscription created';
    if (m.event === 'consent_change' && Array.isArray(m.changedFields)) {
      const fields = (m.changedFields as string[])
        .map((f) => f.replace(/^consentTo/, ''))
        .join(', ');
      const evidence = typeof m.evidence === 'string' ? ` (${m.evidence})` : '';
      return `Consent: ${fields}${evidence}`;
    }
    if (typeof m.event === 'string') return String(m.event);
  }
  return `${targetType} updated`;
}

function ageFromDob(dob: Date | null): number | null {
  if (!dob) return null;
  const now = new Date();
  let age = now.getUTCFullYear() - dob.getUTCFullYear();
  const monthDelta = now.getUTCMonth() - dob.getUTCMonth();
  const dayBeforeBirthday =
    monthDelta < 0 ||
    (monthDelta === 0 && now.getUTCDate() < dob.getUTCDate());
  if (dayBeforeBirthday) age -= 1;
  // Defensive: nonsense DoB (future date) should not display a negative age.
  if (age < 0 || age > 130) return null;
  return age;
}

function ConsentBadge({ label, granted }: { label: string; granted: boolean }) {
  const cls = granted
    ? 'bg-moss/10 text-moss border-moss/15'
    : 'bg-stone/10 text-stone border-stone/15';
  return (
    <span
      className={`inline-flex items-center gap-1 font-body text-[0.65rem] uppercase tracking-[0.06em] border rounded px-1.5 py-0.5 ${cls}`}
    >
      <span aria-hidden="true">{granted ? '✓' : '✗'}</span>
      {label}
    </span>
  );
}

// ----------------------------------------------------------------------------
// R.4: family-shape blocks.
//
// All four read-only on this page except for the cadence dropdown.
// The workflow to log a new RelationshipNote (fifth_visit / check_in)
// lives on the Today dashboard in R.5.
// ----------------------------------------------------------------------------

type TextRevision = {
  id: string;
  body: string;
  createdAt: Date;
  author: { firstName: string | null; lastName: string | null; email: string } | null;
};

function formatRevisionDate(d: Date): string {
  return d.toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/London',
  });
}

function authorLabel(a: TextRevision['author']): string {
  if (!a) return 'unknown';
  const name = [a.firstName, a.lastName].filter(Boolean).join(' ');
  return name || a.email;
}

function RevisionHistory({ revisions, label }: { revisions: TextRevision[]; label: string }) {
  if (revisions.length <= 1) return null;
  return (
    <details className="mt-3 text-[0.8125rem]">
      <summary className="cursor-pointer text-stone hover:text-moss inline-flex items-center gap-1 select-none">
        <Clock size={12} strokeWidth={1.75} aria-hidden="true" />
        {label} ({revisions.length})
      </summary>
      <ol className="mt-3 flex flex-col gap-3 border-l-2 border-moss/10 pl-3">
        {revisions.map((rev) => (
          <li key={rev.id}>
            <div className="text-stone text-[0.7rem] font-mono mb-0.5">
              {formatRevisionDate(rev.createdAt)} · {authorLabel(rev.author)}
            </div>
            {rev.body ? (
              <p className="text-charcoal whitespace-pre-wrap break-words leading-[1.55]">
                {rev.body}
              </p>
            ) : (
              <p className="text-stone italic">(cleared)</p>
            )}
          </li>
        ))}
      </ol>
    </details>
  );
}

function AboutRecipientBlock({
  body,
  firstName,
  revisions,
}: {
  body: string | null;
  firstName: string;
  revisions: TextRevision[];
}) {
  if (!body && revisions.length === 0) return null;
  return (
    <div className="mt-4 pt-4 border-t border-moss/10">
      <h3 className="font-body text-[0.7rem] font-medium uppercase tracking-[0.08em] text-terracotta mb-2">
        What matters about {firstName}
      </h3>
      {body ? (
        <p className="text-charcoal text-[0.9375rem] leading-[1.6] whitespace-pre-wrap break-words">
          {body}
        </p>
      ) : (
        <p className="text-stone italic text-[0.8125rem]">(currently cleared)</p>
      )}
      <RevisionHistory revisions={revisions} label="Revision history" />
    </div>
  );
}

function HopesBlock({
  body,
  revisions,
}: {
  body: string | null;
  revisions: TextRevision[];
}) {
  if (!body && revisions.length === 0) return null;
  return (
    <section className="bg-paper border border-moss/[0.08] rounded-[12px] p-5 sm:p-6">
      <h2 className="font-body text-[0.75rem] font-medium uppercase tracking-[0.1em] text-stone mb-1 inline-flex items-center gap-2">
        <Heart size={14} strokeWidth={1.75} className="text-terracotta" aria-hidden="true" />
        What we are hoping for
      </h2>
      <p className="text-stone text-[0.75rem] italic mb-3">
        Family-payer's own words. Operator-only. Not shown to the companion.
      </p>
      {body ? (
        <p className="text-charcoal text-[0.9375rem] leading-[1.6] whitespace-pre-wrap break-words">
          {body}
        </p>
      ) : (
        <p className="text-stone italic text-[0.8125rem]">(currently cleared)</p>
      )}
      <RevisionHistory revisions={revisions} label="Revision history" />
    </section>
  );
}

const CADENCE_OPTIONS: { value: number; label: string }[] = [
  { value: 30, label: 'Monthly' },
  { value: 90, label: 'Quarterly (default)' },
  { value: 180, label: 'Every six months' },
  { value: 365, label: 'Annually' },
  { value: 0, label: 'Off — no scheduled check-ins' },
];

function CadenceCard({
  familyId,
  cadenceDays,
  lastCheckInAt,
  lastReflectionAt,
}: {
  familyId: string;
  cadenceDays: number;
  lastCheckInAt: Date | null;
  lastReflectionAt: Date | null;
}) {
  // Show the next-check-in date if a cadence is configured.
  const nextDue =
    cadenceDays > 0 && lastCheckInAt
      ? new Date(lastCheckInAt.getTime() + cadenceDays * 24 * 60 * 60 * 1000)
      : null;
  return (
    <section className="bg-paper border border-moss/[0.08] rounded-[12px] p-5 sm:p-6">
      <h2 className="font-body text-[0.75rem] font-medium uppercase tracking-[0.1em] text-stone mb-3">
        Check-in cadence
      </h2>
      <form action={setFamilyCheckInCadence} className="flex flex-col gap-2">
        <input type="hidden" name="familyId" value={familyId} />
        <label htmlFor={`cadence-${familyId}`} className="sr-only">
          Check-in cadence
        </label>
        <select
          id={`cadence-${familyId}`}
          name="cadenceDays"
          defaultValue={cadenceDays}
          className="bg-paper border border-moss/15 rounded-md px-3 py-2 text-charcoal text-[0.9375rem] focus:outline-none focus:ring-2 focus:ring-moss/25 focus:border-moss/40"
        >
          {CADENCE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="self-start inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-moss text-cream text-[0.8125rem] font-medium hover:bg-moss-deep transition-colors"
        >
          Save cadence
        </button>
      </form>
      <dl className="mt-4 grid grid-cols-[max-content_1fr] gap-x-3 gap-y-1 text-[0.8125rem]">
        <dt className="text-stone">Last fifth-visit call</dt>
        <dd className="text-charcoal">
          {lastReflectionAt ? formatRevisionDate(lastReflectionAt) : '—'}
        </dd>
        <dt className="text-stone">Last check-in</dt>
        <dd className="text-charcoal">
          {lastCheckInAt ? formatRevisionDate(lastCheckInAt) : '—'}
        </dd>
        {nextDue ? (
          <>
            <dt className="text-stone">Next due</dt>
            <dd className="text-charcoal">{formatRevisionDate(nextDue)}</dd>
          </>
        ) : null}
      </dl>
    </section>
  );
}

type RelationshipNoteRow = {
  id: string;
  callType: string;
  body: string;
  createdAt: Date;
  operator: { firstName: string | null; lastName: string | null } | null;
};

function ReflectionNotesBlock({ notes }: { notes: RelationshipNoteRow[] }) {
  return (
    <section className="bg-paper border border-moss/[0.08] rounded-[12px] p-5 sm:p-6">
      <h2 className="font-body text-[0.75rem] font-medium uppercase tracking-[0.1em] text-stone mb-3">
        Reflection notes
      </h2>
      {notes.length === 0 ? (
        <p className="text-stone text-[0.8125rem] italic">
          No notes yet. Reflection calls show up on the Today dashboard when due.
        </p>
      ) : (
        <ol className="flex flex-col gap-4 divide-y divide-moss/[0.06]">
          {notes.map((n) => {
            const name =
              [n.operator?.firstName, n.operator?.lastName].filter(Boolean).join(' ') ||
              'operator';
            const kindLabel =
              n.callType === 'fifth_visit'
                ? 'Fifth-visit call'
                : n.callType === 'check_in'
                ? 'Check-in'
                : 'Note';
            return (
              <li key={n.id} className="pt-4 first:pt-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="inline-flex items-center font-body text-[0.65rem] uppercase tracking-[0.06em] bg-moss/10 text-moss rounded px-1.5 py-0.5">
                    {kindLabel}
                  </span>
                  <time
                    dateTime={n.createdAt.toISOString()}
                    className="text-stone text-[0.7rem] font-mono"
                  >
                    {formatRevisionDate(n.createdAt)}
                  </time>
                  <span className="text-stone text-[0.7rem]">· {name}</span>
                </div>
                <p className="text-charcoal text-[0.9375rem] leading-[1.55] whitespace-pre-wrap break-words">
                  {n.body}
                </p>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
