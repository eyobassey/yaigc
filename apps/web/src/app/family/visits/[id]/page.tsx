import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft, Calendar, Heart, FileText } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { requireFamilyMember } from '@/lib/auth-helpers';
import { companionPhotoSrc } from '@/lib/companion-photo-src';
import { formatUkDateTime, formatUkTime } from '@/lib/visit-schedule';
import { FamilyVisitStatePill } from '../page';

export const metadata = { title: 'Visit' };

const WELLBEING_LABEL: Record<string, string> = {
  cheerful: 'Cheerful and chatty',
  quiet: 'Quiet but settled',
  tired: 'Tired',
  unwell: 'Not feeling their best',
  distressed: 'Upset',
  other: 'Mixed - note below',
};

export default async function FamilyVisitDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const { family } = await requireFamilyMember(`/family/visits/${params.id}`);

  const visit = await prisma.visit.findUnique({
    where: { id: params.id },
    include: {
      companion: {
        select: { id: true, firstName: true, photoUrl: true, photoFilename: true },
      },
      recipient: {
        select: {
          firstName: true,
          preferredName: true,
          consentToReportSharing: true,
        },
      },
      report: {
        include: {
          photos: { orderBy: { uploadedAt: 'asc' } },
        },
      },
    },
  });

  // Defensive: even though the layout guard scoped us to the family,
  // explicitly verify this visit belongs to it before rendering. Stops
  // someone with a guessed visit id from peeking into another family.
  if (!visit || visit.familyId !== family.id) notFound();

  const scheduledEnd = new Date(
    visit.scheduledStartAt.getTime() + visit.scheduledDurationMinutes * 60 * 1000,
  );

  // Report is family-visible only when the recipient consented. Operators
  // still see it via /ops; safeguarding never gated by consent.
  const showReport =
    visit.state === 'reported' &&
    visit.report &&
    visit.recipient.consentToReportSharing;

  return (
    <div>
      <Link
        href="/family/visits"
        className="inline-flex items-center gap-1 text-stone hover:text-moss text-sm mb-4 transition-colors"
      >
        <ChevronLeft size={14} strokeWidth={1.75} aria-hidden="true" />
        All visits
      </Link>

      <header className="mb-6">
        <div className="flex items-center gap-2 flex-wrap mb-2">
          <FamilyVisitStatePill state={visit.state} />
          <time
            dateTime={visit.scheduledStartAt.toISOString()}
            className="text-stone text-[0.8125rem] font-mono"
          >
            {formatUkDateTime(visit.scheduledStartAt)}
          </time>
        </div>
        <h1 className="font-head font-normal text-moss text-[clamp(1.75rem,3vw,2.25rem)] leading-[1.1]">
          {visit.companion.firstName}
          <span className="text-stone font-body font-normal mx-2 text-[1.25rem]">·</span>
          {visit.recipient.preferredName || visit.recipient.firstName}
        </h1>
      </header>

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
          </dl>
        </section>

        <section className="bg-paper border border-moss/[0.08] rounded-[12px] p-5 sm:p-6 flex items-center gap-4">
          {companionPhotoSrc(visit.companion) ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={companionPhotoSrc(visit.companion)!}
              alt={`Photo of ${visit.companion.firstName}`}
              width="72"
              height="72"
              className="w-[72px] h-[72px] rounded-full object-cover border border-moss/15 flex-shrink-0"
            />
          ) : (
            <div className="w-[72px] h-[72px] rounded-full bg-moss/10 flex items-center justify-center flex-shrink-0">
              <Heart size={24} strokeWidth={1.5} className="text-moss/40" aria-hidden="true" />
            </div>
          )}
          <div>
            <div className="font-body text-[0.7rem] font-medium uppercase tracking-[0.08em] text-stone mb-0.5">
              Companion
            </div>
            <div className="font-head text-moss text-[1.125rem] font-medium">
              {visit.companion.firstName}
            </div>
          </div>
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

        {visit.cancellationReason ? (
          <section className="bg-terracotta/10 border-l-4 border-terracotta px-5 py-4 rounded-r">
            <h2 className="font-body text-[0.7rem] font-medium uppercase tracking-[0.1em] text-terracotta mb-2">
              Cancellation
            </h2>
            <p className="text-charcoal leading-[1.55] whitespace-pre-wrap break-words">
              {visit.cancellationReason}
            </p>
          </section>
        ) : null}

        {showReport && visit.report ? (
          <section className="bg-paper border border-moss/[0.08] rounded-[12px] p-5 sm:p-6">
            <h2 className="font-body text-[0.75rem] font-medium uppercase tracking-[0.1em] text-stone mb-3 inline-flex items-center gap-2">
              <FileText size={14} strokeWidth={1.75} className="text-moss" aria-hidden="true" />
              How it went
            </h2>
            <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-2 text-[0.9375rem] mb-4">
              <dt className="text-stone">Length</dt>
              <dd className="text-charcoal">{visit.report.actualDurationMinutes} minutes</dd>
              <dt className="text-stone">How they seemed</dt>
              <dd className="text-charcoal">
                {WELLBEING_LABEL[visit.report.howWereThey] ?? visit.report.howWereThey}
              </dd>
              {visit.report.howWereTheyNote ? (
                <>
                  <dt className="text-stone">A little more</dt>
                  <dd className="text-charcoal whitespace-pre-wrap">{visit.report.howWereTheyNote}</dd>
                </>
              ) : null}
            </dl>
            <div className="pt-4 border-t border-moss/10">
              <div className="font-body text-[0.7rem] font-medium uppercase tracking-[0.08em] text-stone mb-2">
                What happened
              </div>
              <p className="text-charcoal leading-[1.65] whitespace-pre-wrap break-words">
                {visit.report.whatHappened}
              </p>
            </div>

            {visit.report.photos.length > 0 ? (
              <div className="mt-5 pt-4 border-t border-moss/10">
                <div className="font-body text-[0.7rem] font-medium uppercase tracking-[0.08em] text-stone mb-2">
                  Photos ({visit.report.photos.length})
                </div>
                <div className="flex flex-wrap gap-2">
                  {visit.report.photos.map((photo) => (
                    <a
                      key={photo.id}
                      href={`/api/visit-photos/${photo.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block w-[180px] h-[180px] rounded-md overflow-hidden border border-moss/15 hover:border-moss/30 transition-colors"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`/api/visit-photos/${photo.id}`}
                        alt="Photo from the visit"
                        width="180"
                        height="180"
                        className="w-full h-full object-cover"
                      />
                    </a>
                  ))}
                </div>
              </div>
            ) : null}
          </section>
        ) : null}

        {visit.state === 'reported' && !showReport ? (
          <section className="bg-paper border border-moss/[0.08] rounded-[12px] p-5 sm:p-6">
            <h2 className="font-body text-[0.75rem] font-medium uppercase tracking-[0.1em] text-stone mb-2">
              Report on file
            </h2>
            <p className="text-charcoal text-[0.9375rem] leading-[1.55]">
              The visit happened and we have the companion's note. Your
              recipient asked us not to share the contents - you can
              change that on the Household page.
            </p>
          </section>
        ) : null}

        {visit.state === 'completed' && !visit.report ? (
          <section className="bg-paper border border-moss/[0.08] rounded-[12px] p-5 sm:p-6">
            <h2 className="font-body text-[0.75rem] font-medium uppercase tracking-[0.1em] text-stone mb-2">
              Note arriving shortly
            </h2>
            <p className="text-charcoal text-[0.9375rem] leading-[1.55]">
              The visit is done. The companion's short note follows within
              a few hours - we will email you when it is ready.
            </p>
          </section>
        ) : null}
      </div>
    </div>
  );
}
