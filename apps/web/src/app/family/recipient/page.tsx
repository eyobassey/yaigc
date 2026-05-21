import Link from 'next/link';
import { Heart, Pencil } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { requireFamilyMember } from '@/lib/auth-helpers';

export const metadata = { title: 'Recipient' };

export default async function FamilyRecipientPage() {
  const { family } = await requireFamilyMember('/family/recipient');

  const recipients = await prisma.recipient.findMany({
    where: { familyId: family.id, deletedAt: null },
    orderBy: { firstName: 'asc' },
  });

  if (recipients.length === 0) {
    return (
      <div className="max-w-[720px]">
        <header className="mb-6 flex items-center gap-3">
          <Heart size={22} strokeWidth={1.75} className="text-terracotta" aria-hidden="true" />
          <h1 className="font-head font-normal text-moss text-[clamp(1.75rem,3vw,2.25rem)] leading-[1.1]">
            Your household
          </h1>
        </header>
        <p className="text-charcoal text-[0.9375rem] leading-[1.55]">
          We have not set up the household yet. We will reach out shortly to
          gather the details we need.
        </p>
      </div>
    );
  }

  return (
    <div>
      <header className="mb-6 flex items-center gap-3">
        <Heart size={22} strokeWidth={1.75} className="text-terracotta" aria-hidden="true" />
        <h1 className="font-head font-normal text-moss text-[clamp(1.75rem,3vw,2.25rem)] leading-[1.1]">
          Your household
        </h1>
      </header>
      <p className="text-charcoal text-[0.9375rem] leading-[1.55] mb-6 max-w-[60ch]">
        Here is what we have on file. Click <strong>Edit</strong> on any
        card to update consents, interests, things to know, or anything
        else. Address changes go through a phone call when there is an
        active subscription.
      </p>

      <div className="flex flex-col gap-6">
        {recipients.map((r) => {
          const addressParts = [
            r.addressLine1,
            r.addressLine2,
            r.addressCity,
            r.addressPostcode,
          ].filter(Boolean) as string[];
          const age = ageFromDob(r.dateOfBirth);
          return (
            <article
              key={r.id}
              className="bg-paper border border-moss/[0.08] rounded-[12px] p-5 sm:p-6"
            >
              <header className="mb-4 flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <h2 className="font-head text-moss text-[clamp(1.25rem,2.5vw,1.5rem)] font-medium leading-[1.2] break-words">
                    {r.firstName} {r.lastName}
                  </h2>
                  {r.preferredName ? (
                    <p className="font-head italic text-terracotta text-[1rem] mt-1">
                      Known as {r.preferredName}
                    </p>
                  ) : null}
                </div>
                <Link
                  href={`/family/recipient/${r.id}/edit`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-moss/20 text-moss text-[0.8125rem] font-medium hover:bg-moss hover:text-cream transition-colors whitespace-nowrap"
                >
                  <Pencil size={14} strokeWidth={1.75} aria-hidden="true" />
                  Edit
                </Link>
              </header>

              {/* Consents — most-glanceable thing on the card */}
              <div className="flex flex-wrap gap-1.5 mb-4">
                <ConsentBadge label="Visits" granted={r.consentToVisits} />
                <ConsentBadge label="Photos" granted={r.consentToPhotos} />
                <ConsentBadge label="Report sharing" granted={r.consentToReportSharing} />
              </div>

              <dl className="grid grid-cols-1 sm:grid-cols-[max-content_1fr] gap-x-6 gap-y-3 text-[0.9375rem]">
                {addressParts.length > 0 ? (
                  <Row label="Address">
                    <address className="not-italic text-charcoal leading-[1.55]">
                      {addressParts.map((line, i) => (
                        <div key={i}>{line}</div>
                      ))}
                      {r.addressCountry && r.addressCountry !== 'GB' ? (
                        <div>{r.addressCountry}</div>
                      ) : null}
                    </address>
                  </Row>
                ) : null}
                {r.phone ? (
                  <Row label="Phone">
                    <a href={`tel:${r.phone.replace(/\s/g, '')}`} className="link">
                      {r.phone}
                    </a>
                  </Row>
                ) : null}
                {r.dateOfBirth ? (
                  <Row label="Date of birth">
                    {r.dateOfBirth.toISOString().slice(0, 10)}
                    {age != null ? <span className="text-stone ml-2">(age {age})</span> : null}
                  </Row>
                ) : null}
                {r.pronouns ? <Row label="Pronouns">{r.pronouns}</Row> : null}
                {r.interests ? (
                  <Row label="Interests">
                    <Multiline>{r.interests}</Multiline>
                  </Row>
                ) : null}
                {r.thingsToKnow ? (
                  <Row label="Things to know">
                    <Multiline>{r.thingsToKnow}</Multiline>
                  </Row>
                ) : null}
                {r.mobility ? (
                  <Row label="Mobility">
                    <Multiline>{r.mobility}</Multiline>
                  </Row>
                ) : null}
                {r.healthNotes ? (
                  <Row label="Health notes">
                    <Multiline>{r.healthNotes}</Multiline>
                  </Row>
                ) : null}
                {r.dietary ? (
                  <Row label="Dietary">
                    <Multiline>{r.dietary}</Multiline>
                  </Row>
                ) : null}
                {r.religiousObservance ? (
                  <Row label="Religious observance">
                    <Multiline>{r.religiousObservance}</Multiline>
                  </Row>
                ) : null}
              </dl>
            </article>
          );
        })}
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <>
      <dt className="font-body text-[0.75rem] font-medium uppercase tracking-[0.08em] text-stone">
        {label}
      </dt>
      <dd className="text-charcoal leading-[1.55]">{children}</dd>
    </>
  );
}

function Multiline({ children }: { children: string }) {
  return <p className="whitespace-pre-wrap break-words">{children}</p>;
}

function ConsentBadge({ label, granted }: { label: string; granted: boolean }) {
  const cls = granted
    ? 'bg-moss/10 text-moss border-moss/20'
    : 'bg-stone/10 text-stone border-stone/20';
  return (
    <span
      className={`inline-flex items-center gap-1 font-body text-[0.7rem] uppercase tracking-[0.06em] border rounded px-2 py-0.5 ${cls}`}
    >
      <span aria-hidden="true">{granted ? '✓' : '✗'}</span>
      {label}
    </span>
  );
}

function ageFromDob(dob: Date | null): number | null {
  if (!dob) return null;
  const now = new Date();
  let age = now.getUTCFullYear() - dob.getUTCFullYear();
  const monthDelta = now.getUTCMonth() - dob.getUTCMonth();
  const dayBeforeBirthday =
    monthDelta < 0 || (monthDelta === 0 && now.getUTCDate() < dob.getUTCDate());
  if (dayBeforeBirthday) age -= 1;
  if (age < 0 || age > 130) return null;
  return age;
}
