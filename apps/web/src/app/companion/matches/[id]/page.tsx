import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Bus, Car, ChevronLeft, Footprints, MapPin } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { requireCompanion } from '@/lib/auth-helpers';
import { estimateTravel } from '@/lib/postcode-distance';
import {
  buildResponseLabel,
  inferDecliner,
} from '@/lib/match-response-label';
import { CompanionMatchStatusPill } from '../page';
import { RespondPanel } from './RespondPanel';

export const metadata = { title: 'Match' };

export default async function CompanionMatchDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const { companion } = await requireCompanion(`/companion/matches/${params.id}`);

  const match = await prisma.match.findUnique({
    where: { id: params.id },
    include: {
      family: {
        select: { billingName: true, billingCity: true, billingPostcode: true },
      },
      recipient: {
        select: {
          firstName: true,
          preferredName: true,
          dateOfBirth: true,
          addressCity: true,
          addressPostcode: true,
          interests: true,
          mobility: true,
          dietary: true,
        },
      },
    },
  });

  // Defensive: this match must be assigned to the signed-in companion.
  if (!match || match.candidateCompanionId !== companion.id) notFound();

  // Pre-accept travel estimate. We use the postcode the companion put
  // on their application (own row, off the linked CompanionApplication)
  // and the recipient's postcode, falling back to the family's billing
  // postcode if the recipient address isn't on file yet. Pre-accept we
  // intentionally show a coarse band only - no postcode is rendered.
  const application = await prisma.companionApplication.findUnique({
    where: { id: companion.applicationId },
    select: { postcode: true },
  });
  const recipientPostcode =
    match.recipient?.addressPostcode ?? match.family.billingPostcode ?? null;
  const travel = await estimateTravel(
    application?.postcode,
    recipientPostcode,
  );

  const responded = Boolean(match.companionResponseAt);
  const canRespond = match.status === 'proposed' && !responded;
  const decliner = inferDecliner(
    match.status,
    match.familyResponseAt,
    match.companionResponseAt,
  );
  const familyLabel = buildResponseLabel(
    'family',
    match.status,
    match.familyResponseAt,
    decliner,
  );
  const companionLabel = buildResponseLabel(
    'companion',
    match.status,
    match.companionResponseAt,
    decliner,
  );
  const toneClass = (t: typeof familyLabel.tone) =>
    t === 'accepted'
      ? 'text-moss'
      : t === 'declined'
      ? 'text-terracotta'
      : 'text-charcoal';
  const recipientLabel = match.recipient
    ? match.recipient.preferredName || match.recipient.firstName
    : null;
  const age = match.recipient?.dateOfBirth
    ? ageFromDob(match.recipient.dateOfBirth)
    : null;
  const area =
    match.recipient?.addressCity ?? match.family.billingCity ?? null;

  return (
    <div>
      <Link
        href="/companion/matches"
        className="inline-flex items-center gap-1 text-stone hover:text-moss text-sm mb-4 transition-colors"
      >
        <ChevronLeft size={14} strokeWidth={1.75} aria-hidden="true" />
        All matches
      </Link>

      <header className="mb-6">
        <div className="flex items-center gap-2 flex-wrap mb-2">
          <CompanionMatchStatusPill status={match.status} companionResponded={responded} />
          <time
            dateTime={match.createdAt.toISOString()}
            className="text-stone text-[0.8125rem] font-mono"
          >
            proposed {match.createdAt.toISOString().slice(0, 10)}
          </time>
        </div>
        <h1 className="font-head font-normal text-moss text-[clamp(1.75rem,3vw,2.25rem)] leading-[1.1] break-words">
          {match.family.billingName}
        </h1>
        {recipientLabel ? (
          <p className="text-charcoal text-[1rem] mt-1">
            Visiting {recipientLabel}
            {age != null ? <span className="text-stone"> · age {age}</span> : null}
            {area ? (
              <span className="text-stone inline-flex items-center gap-1 ml-2">
                <MapPin size={14} strokeWidth={1.5} aria-hidden="true" />
                {area}
              </span>
            ) : null}
          </p>
        ) : null}
      </header>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr] max-w-[1100px]">
        <div className="flex flex-col gap-6">
          <section className="bg-paper border border-moss/[0.08] rounded-[12px] p-5 sm:p-6">
            <h2 className="font-body text-[0.75rem] font-medium uppercase tracking-[0.1em] text-stone mb-3">
              Why we thought of you
            </h2>
            <p className="text-charcoal leading-[1.65] whitespace-pre-wrap break-words">
              {match.rationale}
            </p>
          </section>

          {match.recipient ? (
            <section className="bg-paper border border-moss/[0.08] rounded-[12px] p-5 sm:p-6">
              <h2 className="font-body text-[0.75rem] font-medium uppercase tracking-[0.1em] text-stone mb-3">
                A little about {recipientLabel}
              </h2>
              <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-2 text-[0.9375rem]">
                {match.recipient.interests ? (
                  <>
                    <dt className="text-stone">Interests</dt>
                    <dd className="text-charcoal whitespace-pre-wrap break-words">
                      {match.recipient.interests}
                    </dd>
                  </>
                ) : null}
                {match.recipient.mobility ? (
                  <>
                    <dt className="text-stone">Mobility</dt>
                    <dd className="text-charcoal whitespace-pre-wrap break-words">
                      {match.recipient.mobility}
                    </dd>
                  </>
                ) : null}
                {match.recipient.dietary ? (
                  <>
                    <dt className="text-stone">Dietary</dt>
                    <dd className="text-charcoal whitespace-pre-wrap break-words">
                      {match.recipient.dietary}
                    </dd>
                  </>
                ) : null}
              </dl>
              <p className="text-stone text-[0.8125rem] mt-3 leading-[1.55]">
                Full address, phone, and detailed notes come through once
                the match is set up - we keep contact details inside the
                team until both sides have agreed.
              </p>
            </section>
          ) : null}

          {travel ? (
            <section className="bg-paper border border-moss/[0.08] rounded-[12px] p-5 sm:p-6">
              <h2 className="font-body text-[0.75rem] font-medium uppercase tracking-[0.1em] text-stone mb-1">
                Travel from your postcode
              </h2>
              <p className="text-stone text-[0.8125rem] mb-3">
                Approximate - about {travel.distanceMiles} miles by road. We
                share the full address once the match is set up.
              </p>
              <ul className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[0.875rem]">
                <li className="flex items-center gap-2 bg-cream rounded-md px-3 py-2">
                  <Car size={16} strokeWidth={1.75} className="text-moss" aria-hidden="true" />
                  <span className="text-charcoal">
                    <span className="font-medium">~{travel.drivingMinutes} min</span> by car
                  </span>
                </li>
                <li className="flex items-center gap-2 bg-cream rounded-md px-3 py-2">
                  <Bus size={16} strokeWidth={1.75} className="text-moss" aria-hidden="true" />
                  <span className="text-charcoal">
                    <span className="font-medium">~{travel.transitMinutes} min</span> by public transport
                  </span>
                </li>
                {travel.walkableMinutes ? (
                  <li className="flex items-center gap-2 bg-cream rounded-md px-3 py-2">
                    <Footprints size={16} strokeWidth={1.75} className="text-moss" aria-hidden="true" />
                    <span className="text-charcoal">
                      <span className="font-medium">~{travel.walkableMinutes} min</span> on foot
                    </span>
                  </li>
                ) : null}
              </ul>
            </section>
          ) : null}

          {match.status === 'declined' && match.declineReason ? (
            <section className="bg-stone/10 border-l-4 border-stone px-5 py-4 rounded-r">
              <h2 className="font-body text-[0.7rem] font-medium uppercase tracking-[0.1em] text-stone mb-2">
                Declined - your reason
              </h2>
              <p className="text-charcoal leading-[1.55] whitespace-pre-wrap break-words">
                {match.declineReason}
              </p>
            </section>
          ) : null}
        </div>

        <aside className="flex flex-col gap-6">
          {canRespond ? (
            <RespondPanel matchId={match.id} />
          ) : (
            <section className="bg-paper border border-moss/[0.08] rounded-[12px] p-5 sm:p-6">
              <h2 className="font-body text-[0.75rem] font-medium uppercase tracking-[0.1em] text-stone mb-2">
                Your response
              </h2>
              <p className="text-stone text-[0.875rem]">
                {match.companionResponseAt
                  ? `Recorded ${match.companionResponseAt.toISOString().slice(0, 10)}.`
                  : 'No response captured.'}
                {match.status === 'proposed' && responded
                  ? ' We are waiting on the family.'
                  : ''}
              </p>
            </section>
          )}

          <section className="bg-paper border border-moss/[0.08] rounded-[12px] p-5 sm:p-6">
            <h2 className="font-body text-[0.75rem] font-medium uppercase tracking-[0.1em] text-stone mb-3">
              Where this match is
            </h2>
            <dl className="grid grid-cols-[max-content_1fr] gap-x-3 gap-y-2 text-[0.875rem]">
              <dt className="text-stone">Family</dt>
              <dd className={toneClass(familyLabel.tone)}>{familyLabel.text}</dd>
              <dt className="text-stone">You</dt>
              <dd className={toneClass(companionLabel.tone)}>
                {companionLabel.text}
              </dd>
            </dl>
          </section>
        </aside>
      </div>
    </div>
  );
}

function ageFromDob(dob: Date): number | null {
  const now = new Date();
  let age = now.getUTCFullYear() - dob.getUTCFullYear();
  const md = now.getUTCMonth() - dob.getUTCMonth();
  if (md < 0 || (md === 0 && now.getUTCDate() < dob.getUTCDate())) age -= 1;
  if (age < 0 || age > 130) return null;
  return age;
}
