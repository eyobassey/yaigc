import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft, Heart, MapPin } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { requireFamilyMember } from '@/lib/auth-helpers';
import {
  buildResponseLabel,
  inferDecliner,
} from '@/lib/match-response-label';
import { FamilyMatchStatusPill } from '../page';
import { RespondPanel } from './RespondPanel';

export const metadata = { title: 'Match' };

export default async function FamilyMatchDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const { family, member } = await requireFamilyMember(`/family/matches/${params.id}`);

  const match = await prisma.match.findUnique({
    where: { id: params.id },
    include: {
      companion: {
        select: { firstName: true, bio: true, photoUrl: true, borough: true },
      },
      recipient: { select: { firstName: true, preferredName: true } },
    },
  });

  // Defensive: match must belong to this family.
  if (!match || match.familyId !== family.id) notFound();

  const responded = Boolean(match.familyResponseAt);
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
  const isPayer = member.role === 'payer';
  const canRespond = match.status === 'proposed' && !responded && isPayer;
  const recipientLabel = match.recipient
    ? match.recipient.preferredName || match.recipient.firstName
    : null;

  return (
    <div>
      <Link
        href="/family/matches"
        className="inline-flex items-center gap-1 text-stone hover:text-moss text-sm mb-4 transition-colors"
      >
        <ChevronLeft size={14} strokeWidth={1.75} aria-hidden="true" />
        All matches
      </Link>

      <header className="mb-6">
        <div className="flex items-center gap-2 flex-wrap mb-2">
          <FamilyMatchStatusPill status={match.status} familyResponded={responded} />
          <time
            dateTime={match.createdAt.toISOString()}
            className="text-stone text-[0.8125rem] font-mono"
          >
            proposed {match.createdAt.toISOString().slice(0, 10)}
          </time>
        </div>
        <h1 className="font-head font-normal text-moss text-[clamp(1.75rem,3vw,2.25rem)] leading-[1.1] break-words">
          {match.companion.firstName} for {recipientLabel ?? 'your household'}
        </h1>
      </header>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr] max-w-[1100px]">
        <div className="flex flex-col gap-6">
          <section className="bg-paper border border-moss/[0.08] rounded-[12px] p-5 sm:p-6 flex flex-col sm:flex-row gap-5">
            <div className="flex-shrink-0">
              {match.companion.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={match.companion.photoUrl}
                  alt={`Photo of ${match.companion.firstName}`}
                  width="140"
                  height="140"
                  className="w-[140px] h-[140px] rounded-full object-cover border border-moss/15"
                />
              ) : (
                <div className="w-[140px] h-[140px] rounded-full bg-moss/10 flex items-center justify-center">
                  <Heart size={36} strokeWidth={1.5} className="text-moss/40" aria-hidden="true" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-head text-moss text-[clamp(1.5rem,3vw,1.875rem)] font-medium leading-[1.15] mb-2">
                {match.companion.firstName}
              </h2>
              <p className="inline-flex items-center gap-1.5 text-stone text-[0.875rem] mb-3">
                <MapPin size={14} strokeWidth={1.75} aria-hidden="true" />
                {match.companion.borough.replace(/_/g, ' ')}
              </p>
              {match.companion.bio ? (
                <p className="text-charcoal leading-[1.6] whitespace-pre-wrap break-words">
                  {match.companion.bio}
                </p>
              ) : (
                <p className="text-stone text-[0.9375rem] italic">
                  {match.companion.firstName} has not added a bio yet.
                </p>
              )}
            </div>
          </section>

          <section className="bg-paper border border-moss/[0.08] rounded-[12px] p-5 sm:p-6">
            <h2 className="font-body text-[0.75rem] font-medium uppercase tracking-[0.1em] text-stone mb-3">
              Why we think {match.companion.firstName} is a good fit
            </h2>
            <p className="text-charcoal leading-[1.65] whitespace-pre-wrap break-words">
              {match.rationale}
            </p>
          </section>

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
            <RespondPanel matchId={match.id} companionFirstName={match.companion.firstName} />
          ) : (
            <section className="bg-paper border border-moss/[0.08] rounded-[12px] p-5 sm:p-6">
              <h2 className="font-body text-[0.75rem] font-medium uppercase tracking-[0.1em] text-stone mb-2">
                Your response
              </h2>
              <p className="text-stone text-[0.875rem]">
                {match.familyResponseAt
                  ? `Recorded ${match.familyResponseAt.toISOString().slice(0, 10)}.`
                  : isPayer
                  ? 'No response yet.'
                  : 'Only the payer can accept or decline.'}
                {match.status === 'proposed' && responded
                  ? ' We are waiting on the companion.'
                  : ''}
              </p>
            </section>
          )}

          <section className="bg-paper border border-moss/[0.08] rounded-[12px] p-5 sm:p-6">
            <h2 className="font-body text-[0.75rem] font-medium uppercase tracking-[0.1em] text-stone mb-3">
              Where this match is
            </h2>
            <dl className="grid grid-cols-[max-content_1fr] gap-x-3 gap-y-2 text-[0.875rem]">
              <dt className="text-stone">You</dt>
              <dd className={toneClass(familyLabel.tone)}>{familyLabel.text}</dd>
              <dt className="text-stone">{match.companion.firstName}</dt>
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
