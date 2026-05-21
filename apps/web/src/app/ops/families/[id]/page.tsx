import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft, Pencil } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { FamilyStatusPill } from '../page';

export const metadata = {
  title: 'Family',
};

export default async function OpsFamilyDetailPage({
  params,
}: {
  params: { id: string };
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
    },
  });
  if (!family) notFound();

  const history = await prisma.auditLogEntry.findMany({
    where: {
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
    },
    orderBy: { id: 'desc' },
    take: 40,
  });

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
            <h2 className="font-body text-[0.75rem] font-medium uppercase tracking-[0.1em] text-stone mb-4">
              Recipients ({family.recipients.length})
            </h2>
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
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section className="bg-paper border border-moss/[0.08] rounded-[12px] p-5 sm:p-6">
            <h2 className="font-body text-[0.75rem] font-medium uppercase tracking-[0.1em] text-stone mb-4">
              Members ({family.members.length})
            </h2>
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
