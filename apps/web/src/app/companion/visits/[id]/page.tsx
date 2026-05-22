import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ChevronLeft,
  Calendar,
  Heart,
  Phone,
  MapPin,
  FileText,
  AlertCircle,
} from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { requireCompanion } from '@/lib/auth-helpers';
import { formatUkDateTime, formatUkTime } from '@/lib/visit-schedule';
import { CompanionVisitStatePill } from '../_pill';

export const metadata = { title: 'Visit' };

const WELLBEING_LABEL: Record<string, string> = {
  cheerful: 'Cheerful and chatty',
  quiet: 'Quiet but settled',
  tired: 'Tired',
  unwell: 'Not feeling their best',
  distressed: 'Upset',
  other: 'Mixed',
};

export default async function CompanionVisitDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const { companion } = await requireCompanion(`/companion/visits/${params.id}`);

  const visit = await prisma.visit.findUnique({
    where: { id: params.id },
    include: {
      family: { select: { billingName: true } },
      recipient: {
        select: {
          firstName: true,
          lastName: true,
          preferredName: true,
          pronouns: true,
          phone: true,
          dateOfBirth: true,
          addressLine1: true,
          addressLine2: true,
          addressCity: true,
          addressPostcode: true,
          interests: true,
          thingsToKnow: true,
          mobility: true,
          healthNotes: true,
          dietary: true,
          religiousObservance: true,
        },
      },
      report: true,
    },
  });

  // Defensive: a guessed visit id should not surface another companion's visit.
  if (!visit || visit.companionId !== companion.id) notFound();

  const scheduledEnd = new Date(
    visit.scheduledStartAt.getTime() + visit.scheduledDurationMinutes * 60 * 1000,
  );
  const addressParts = [
    visit.recipient.addressLine1,
    visit.recipient.addressLine2,
    visit.recipient.addressCity,
    visit.recipient.addressPostcode,
  ].filter(Boolean) as string[];
  const age = ageFromDob(visit.recipient.dateOfBirth);

  return (
    <div>
      <Link
        href="/companion/visits"
        className="inline-flex items-center gap-1 text-stone hover:text-moss text-sm mb-4 transition-colors"
      >
        <ChevronLeft size={14} strokeWidth={1.75} aria-hidden="true" />
        All visits
      </Link>

      <header className="mb-6">
        <div className="flex items-center gap-2 flex-wrap mb-2">
          <CompanionVisitStatePill state={visit.state} />
          <time
            dateTime={visit.scheduledStartAt.toISOString()}
            className="text-stone text-[0.8125rem] font-mono"
          >
            {formatUkDateTime(visit.scheduledStartAt)}
          </time>
        </div>
        <h1 className="font-head font-normal text-moss text-[clamp(1.75rem,3vw,2.25rem)] leading-[1.1]">
          {visit.recipient.preferredName || visit.recipient.firstName}
          <span className="text-stone font-body font-normal mx-2 text-[1rem]">
            · {visit.family.billingName}
          </span>
        </h1>
      </header>

      <div className="mb-6 bg-amber-50 border-l-4 border-amber-400 px-5 py-4 rounded-r">
        <p className="font-body text-[0.7rem] font-medium uppercase tracking-[0.12em] text-amber-700 mb-1">
          State changes coming soon
        </p>
        <p className="text-charcoal text-[0.9375rem] leading-[1.55]">
          For now, ring or message us during the visit and we will move
          the state through on your behalf. Submitting your own state
          changes from here lands in the next update.
        </p>
      </div>

      <div className="flex flex-col gap-6 max-w-[760px]">
        <section className="bg-paper border border-moss/[0.08] rounded-[12px] p-5 sm:p-6">
          <h2 className="font-body text-[0.75rem] font-medium uppercase tracking-[0.1em] text-stone mb-3 inline-flex items-center gap-2">
            <Calendar size={14} strokeWidth={1.75} className="text-moss" aria-hidden="true" />
            Schedule
          </h2>
          <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-2 text-[0.9375rem]">
            <dt className="text-stone">When</dt>
            <dd className="text-charcoal">{formatUkDateTime(visit.scheduledStartAt)}</dd>
            <dt className="text-stone">Until</dt>
            <dd className="text-charcoal">{formatUkTime(scheduledEnd)} UK time</dd>
            <dt className="text-stone">Length</dt>
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
          <h2 className="font-body text-[0.75rem] font-medium uppercase tracking-[0.1em] text-stone mb-3">
            Who you are visiting
          </h2>
          <div className="font-head text-moss text-[1.125rem] font-medium mb-1">
            {visit.recipient.firstName} {visit.recipient.lastName}
            {visit.recipient.preferredName ? (
              <span className="text-stone font-body font-normal text-[0.9375rem] ml-2">
                (known as {visit.recipient.preferredName})
              </span>
            ) : null}
          </div>
          <div className="text-stone text-[0.875rem] mb-3">
            {visit.recipient.pronouns ? <span>{visit.recipient.pronouns}</span> : null}
            {age != null ? (
              <span className={visit.recipient.pronouns ? 'ml-2' : ''}>· age {age}</span>
            ) : null}
          </div>

          {addressParts.length ? (
            <div className="mb-3">
              <div className="font-body text-[0.7rem] font-medium uppercase tracking-[0.08em] text-stone mb-1 inline-flex items-center gap-1.5">
                <MapPin size={12} strokeWidth={1.75} aria-hidden="true" />
                Address
              </div>
              <address className="not-italic text-charcoal leading-[1.55]">
                {addressParts.map((line, i) => (
                  <div key={i}>{line}</div>
                ))}
              </address>
            </div>
          ) : null}

          {visit.recipient.phone ? (
            <div className="mb-3">
              <div className="font-body text-[0.7rem] font-medium uppercase tracking-[0.08em] text-stone mb-1 inline-flex items-center gap-1.5">
                <Phone size={12} strokeWidth={1.75} aria-hidden="true" />
                Phone
              </div>
              <a
                href={`tel:${visit.recipient.phone.replace(/\s/g, '')}`}
                className="link"
              >
                {visit.recipient.phone}
              </a>
            </div>
          ) : null}

          {visit.recipient.interests ? (
            <ProfileField label="Interests" value={visit.recipient.interests} />
          ) : null}
          {visit.recipient.thingsToKnow ? (
            <ProfileField
              label="Things to know"
              value={visit.recipient.thingsToKnow}
              accent
            />
          ) : null}
          {visit.recipient.mobility ? (
            <ProfileField label="Mobility" value={visit.recipient.mobility} />
          ) : null}
          {visit.recipient.healthNotes ? (
            <ProfileField
              label="Health notes"
              value={visit.recipient.healthNotes}
              accent
            />
          ) : null}
          {visit.recipient.dietary ? (
            <ProfileField label="Dietary" value={visit.recipient.dietary} />
          ) : null}
          {visit.recipient.religiousObservance ? (
            <ProfileField
              label="Religious observance"
              value={visit.recipient.religiousObservance}
            />
          ) : null}
        </section>

        {visit.agreedActivity ? (
          <section className="bg-paper border border-moss/[0.08] rounded-[12px] p-5 sm:p-6">
            <h2 className="font-body text-[0.75rem] font-medium uppercase tracking-[0.1em] text-stone mb-3">
              What is planned
            </h2>
            <p className="text-charcoal leading-[1.6] whitespace-pre-wrap break-words">
              {visit.agreedActivity}
            </p>
          </section>
        ) : null}

        {visit.safetyFlags ? (
          <section className="bg-terracotta/10 border-l-4 border-terracotta px-5 py-4 rounded-r">
            <h2 className="font-body text-[0.7rem] font-medium uppercase tracking-[0.1em] text-terracotta mb-2 inline-flex items-center gap-1.5">
              <AlertCircle size={14} strokeWidth={1.75} aria-hidden="true" />
              Safety flags
            </h2>
            <p className="text-charcoal leading-[1.55] whitespace-pre-wrap break-words">
              {visit.safetyFlags}
            </p>
          </section>
        ) : null}

        {visit.cancellationReason ? (
          <section className="bg-stone/10 border-l-4 border-stone px-5 py-4 rounded-r">
            <h2 className="font-body text-[0.7rem] font-medium uppercase tracking-[0.1em] text-stone mb-2">
              Cancellation{visit.cancellationActor ? ` (${visit.cancellationActor})` : ''}
            </h2>
            <p className="text-charcoal leading-[1.55] whitespace-pre-wrap break-words">
              {visit.cancellationReason}
            </p>
          </section>
        ) : null}

        {visit.report ? (
          <section className="bg-paper border border-moss/[0.08] rounded-[12px] p-5 sm:p-6">
            <h2 className="font-body text-[0.75rem] font-medium uppercase tracking-[0.1em] text-stone mb-3 inline-flex items-center gap-2">
              <FileText size={14} strokeWidth={1.75} className="text-moss" aria-hidden="true" />
              Your report
            </h2>
            <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-2 text-[0.9375rem] mb-3">
              <dt className="text-stone">Submitted</dt>
              <dd className="text-charcoal">
                {visit.report.submittedAt.toISOString().replace('T', ' ').slice(0, 19)}
              </dd>
              <dt className="text-stone">Length</dt>
              <dd className="text-charcoal">{visit.report.actualDurationMinutes} min</dd>
              <dt className="text-stone">How they seemed</dt>
              <dd className="text-charcoal">
                {WELLBEING_LABEL[visit.report.howWereThey] ?? visit.report.howWereThey}
              </dd>
            </dl>
            <div className="pt-3 border-t border-moss/10">
              <div className="font-body text-[0.7rem] font-medium uppercase tracking-[0.08em] text-stone mb-1">
                What happened
              </div>
              <p className="text-charcoal leading-[1.6] whitespace-pre-wrap break-words">
                {visit.report.whatHappened}
              </p>
            </div>
            {visit.report.thingsToFlag ? (
              <div className="mt-4 pt-3 border-t border-moss/10">
                <div className="font-body text-[0.7rem] font-medium uppercase tracking-[0.08em] text-terracotta mb-1">
                  Things you flagged for us
                </div>
                <p className="text-charcoal leading-[1.55] whitespace-pre-wrap break-words">
                  {visit.report.thingsToFlag}
                </p>
              </div>
            ) : null}
          </section>
        ) : null}
      </div>
    </div>
  );
}

function ProfileField({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className={`mb-3 ${accent ? 'p-3 bg-terracotta/5 border border-terracotta/15 rounded' : ''}`}>
      <div className="font-body text-[0.7rem] font-medium uppercase tracking-[0.08em] text-stone mb-1">
        {label}
      </div>
      <p className="text-charcoal text-[0.9375rem] leading-[1.55] whitespace-pre-wrap break-words">
        {value}
      </p>
    </div>
  );
}

function ageFromDob(dob: Date | null): number | null {
  if (!dob) return null;
  const now = new Date();
  let age = now.getUTCFullYear() - dob.getUTCFullYear();
  const monthDelta = now.getUTCMonth() - dob.getUTCMonth();
  const before =
    monthDelta < 0 || (monthDelta === 0 && now.getUTCDate() < dob.getUTCDate());
  if (before) age -= 1;
  if (age < 0 || age > 130) return null;
  return age;
}
