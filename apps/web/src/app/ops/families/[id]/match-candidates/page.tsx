import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft, ChevronRight, MapPin, Sparkles, Heart } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { companionPhotoSrc } from '@/lib/companion-photo-src';
import { rankCandidates, type CandidateRow } from '@/lib/match-candidates';

export const metadata = { title: 'Find a companion' };

// SDD Addendum §6.1 / Stage U.1. Ranked candidate list for a family.
// Hard-filtered (DBS clear, capacity not maxed, travel ≤ 60min) and
// composite-scored on interest overlap, availability flexibility,
// travel time, and current load. The operator clicks through to the
// propose flow with the candidate pre-selected as the primary.

export default async function MatchCandidatesPage({
  params,
}: {
  params: { id: string };
}) {
  const family = await prisma.family.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      billingName: true,
      billingPostcode: true,
      status: true,
      recipients: {
        select: {
          id: true,
          firstName: true,
          preferredName: true,
          interests: true,
          addressPostcode: true,
        },
        take: 1,
      },
    },
  });
  if (!family) notFound();

  const recipient = family.recipients[0] ?? null;
  const recipientPostcode =
    recipient?.addressPostcode ?? family.billingPostcode ?? null;
  const recipientLabel = recipient
    ? recipient.preferredName || recipient.firstName
    : null;

  const candidates = await rankCandidates({
    recipientPostcode,
    recipientInterests: recipient?.interests ?? null,
  });

  return (
    <div>
      <Link
        href={`/ops/families/${family.id}`}
        className="inline-flex items-center gap-1 text-stone hover:text-moss text-sm mb-4 transition-colors"
      >
        <ChevronLeft size={14} strokeWidth={1.75} aria-hidden="true" />
        Back to family
      </Link>

      <header className="mb-8">
        <span className="font-body text-[0.75rem] font-medium uppercase tracking-[0.12em] text-stone mb-2 inline-block">
          Find a companion
        </span>
        <h1 className="font-head font-normal text-moss text-[clamp(1.75rem,3vw,2.25rem)] leading-[1.1] break-words">
          {family.billingName}
          {recipientLabel ? (
            <>
              <span className="text-stone font-body font-normal mx-2 text-[1.25rem]">·</span>
              {recipientLabel}
            </>
          ) : null}
        </h1>
        <p className="text-stone text-[0.9375rem] leading-[1.55] mt-3 max-w-[60ch]">
          Bookable companions sorted by interest overlap, availability,
          travel time, and current load. DBS expiry and capacity hard-filter
          out. Pick a primary; you can name the cover on the next page.
        </p>
        {recipient && !recipientPostcode ? (
          <div className="mt-4 bg-terracotta/10 border-l-4 border-terracotta px-4 py-3 rounded-r text-charcoal text-[0.875rem]">
            No postcode on file for {recipientLabel} or the family. Travel
            estimates are skipped; the ranking will be less precise.
          </div>
        ) : null}
        {!recipient ? (
          <div className="mt-4 bg-terracotta/10 border-l-4 border-terracotta px-4 py-3 rounded-r text-charcoal text-[0.875rem]">
            This family has no recipients yet.{' '}
            <Link
              href={`/ops/families/${family.id}/recipients/new`}
              className="link"
            >
              Add a recipient
            </Link>{' '}
            before ranking candidates.
          </div>
        ) : null}
      </header>

      {candidates.length === 0 ? (
        <p className="text-stone text-[0.9375rem] italic">
          No bookable companions match the hard filters right now.
        </p>
      ) : (
        <ul className="flex flex-col gap-4">
          {candidates.map((row) => (
            <CandidateCard
              key={row.companion.id}
              row={row}
              familyId={family.id}
              recipientId={recipient?.id ?? null}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function CandidateCard({
  row,
  familyId,
  recipientId,
}: {
  row: CandidateRow;
  familyId: string;
  recipientId: string | null;
}) {
  const { companion, openMatchCount, travel, signals, score, scoreParts } = row;
  const photo = companionPhotoSrc({
    id: companion.id,
    photoFilename: companion.photoFilename,
    photoUrl: companion.photoUrl,
  });
  const proposeHref = `/ops/families/${familyId}/matches/new?primary=${companion.id}${
    recipientId ? `&recipientId=${recipientId}` : ''
  }`;
  const detailHref = `/ops/companions/${companion.applicationId}`;

  return (
    <li className="bg-paper border border-moss/[0.08] rounded-[12px] p-5 sm:p-6">
      <div className="flex flex-col sm:flex-row gap-5">
        <div className="flex-shrink-0">
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photo}
              alt=""
              width="80"
              height="80"
              className="w-20 h-20 rounded-full object-cover border border-moss/15"
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-moss/10 flex items-center justify-center">
              <Heart size={28} strokeWidth={1.5} className="text-moss/40" aria-hidden="true" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <Link
              href={detailHref}
              className="font-head text-moss text-[1.0625rem] font-medium hover:text-terracotta"
            >
              {companion.firstName} {companion.lastName}
            </Link>
            <span
              className="inline-flex items-center font-body text-[0.6875rem] font-medium uppercase tracking-[0.08em] px-2 py-0.5 rounded bg-moss/10 text-moss"
              title={`Composite score ${score.toFixed(1)}`}
            >
              score {score.toFixed(1)}
            </span>
          </div>
          <div className="text-stone text-[0.8125rem] mb-2">
            <span className="inline-flex items-center gap-1">
              <MapPin size={12} strokeWidth={1.75} aria-hidden="true" />
              {companion.borough.replace(/_/g, ' ')}
            </span>
            <span className="mx-2">·</span>£{Number(companion.hourlyRate).toFixed(2)}/hr
            <span className="mx-2">·</span>
            {openMatchCount} of {companion.maxConcurrentMatches} matches
            {travel ? (
              <>
                <span className="mx-2">·</span>~{travel.drivingMinutes} min drive ({travel.distanceMiles} mi)
              </>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-1.5 mb-3">
            {signals.interestOverlap > 0 ? (
              <span className="inline-flex items-center font-body text-[0.6875rem] rounded-full px-2 py-0.5 bg-moss/10 text-moss">
                <Sparkles size={11} strokeWidth={1.75} aria-hidden="true" className="mr-1" />
                {signals.interestOverlap} shared interest{signals.interestOverlap === 1 ? '' : 's'}
                {signals.sharedInterests.length > 0 ? `: ${signals.sharedInterests.join(', ')}` : ''}
              </span>
            ) : null}
            <span className="inline-flex items-center font-body text-[0.6875rem] rounded-full px-2 py-0.5 bg-stone/10 text-stone">
              availability: {signals.availabilitySummary}
            </span>
            {scoreParts.travel > 0 ? (
              <span className="inline-flex items-center font-body text-[0.6875rem] rounded-full px-2 py-0.5 bg-stone/10 text-stone">
                travel penalty -{scoreParts.travel.toFixed(1)}
              </span>
            ) : null}
            {scoreParts.capacity > 0 ? (
              <span className="inline-flex items-center font-body text-[0.6875rem] rounded-full px-2 py-0.5 bg-stone/10 text-stone">
                load penalty -{scoreParts.capacity.toFixed(1)}
              </span>
            ) : null}
          </div>
          {companion.bio ? (
            <p className="text-charcoal text-[0.875rem] leading-[1.55] mb-3 line-clamp-3">
              {companion.bio}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-3">
            <Link
              href={proposeHref}
              className="inline-flex items-center justify-center px-4 py-2 rounded-md bg-moss text-cream text-[0.875rem] font-medium hover:bg-moss-dark transition-colors"
            >
              Propose with this primary
            </Link>
            <Link
              href={detailHref}
              className="inline-flex items-center gap-1 text-moss text-[0.875rem] hover:text-terracotta"
            >
              Open companion
              <ChevronRight size={14} strokeWidth={1.75} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>
    </li>
  );
}
