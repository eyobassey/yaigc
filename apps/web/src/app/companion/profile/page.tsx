import Link from 'next/link';
import { Heart, MapPin, Pencil } from 'lucide-react';
import { requireCompanion } from '@/lib/auth-helpers';
import { companionPhotoSrc } from '@/lib/companion-photo-src';
import { renderAvailabilityLines } from '@/lib/availability';

export const metadata = { title: 'Profile' };

// Read-only view of what families see when matched with this
// companion. Editable bits ("Your story", interests, availability,
// photo) live behind the Edit button. Operator-managed bits (name,
// borough, rate, DBS) sit lower in the page with a small note.

export default async function CompanionProfilePage() {
  const { companion } = await requireCompanion('/companion/profile');

  const photoSrc = companionPhotoSrc(companion);
  const availabilityLines = renderAvailabilityLines(companion.availability);

  return (
    <div className="max-w-[820px]">
      <header className="mb-6 flex items-start justify-between gap-3 flex-wrap">
        <div>
          <p className="font-body text-[0.7rem] font-medium uppercase tracking-[0.1em] text-stone mb-1">
            Your profile
          </p>
          <h1 className="font-head font-normal text-moss text-[clamp(1.75rem,3vw,2.25rem)] leading-[1.1]">
            What families see
          </h1>
        </div>
        <Link
          href="/companion/profile/edit"
          className="inline-flex items-center gap-2 font-body text-[0.875rem] text-moss border border-moss/30 rounded-full px-4 py-2 hover:bg-moss/5 transition-colors"
        >
          <Pencil size={14} strokeWidth={1.75} aria-hidden="true" />
          Edit your profile
        </Link>
      </header>

      <article className="bg-paper border border-moss/[0.08] rounded-[12px] p-5 sm:p-6 flex flex-col sm:flex-row gap-5 mb-6">
        <div className="flex-shrink-0">
          {photoSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photoSrc}
              alt={`Your photo`}
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
            {companion.firstName}
          </h2>
          <p className="inline-flex items-center gap-1.5 text-stone text-[0.875rem] mb-3">
            <MapPin size={14} strokeWidth={1.75} aria-hidden="true" />
            {companion.borough.replace(/_/g, ' ')}
          </p>
          {companion.bio ? (
            <p className="text-charcoal leading-[1.6] whitespace-pre-wrap break-words">
              {companion.bio}
            </p>
          ) : (
            <p className="text-stone text-[0.9375rem] italic">
              No bio yet. Add a few lines so the families we propose you to
              get a feel for who you are.
            </p>
          )}
        </div>
      </article>

      <section className="bg-paper border border-moss/[0.08] rounded-[12px] p-5 sm:p-6 mb-6">
        <h2 className="font-body text-[0.7rem] font-medium uppercase tracking-[0.1em] text-stone mb-2">
          Your interests
        </h2>
        {companion.interests ? (
          <p className="text-charcoal leading-[1.6] whitespace-pre-wrap break-words">
            {companion.interests}
          </p>
        ) : (
          <p className="text-stone text-[0.9375rem] italic">
            None yet. Add what you enjoy bringing to a visit - gardening,
            crosswords, a long chat over tea.
          </p>
        )}
      </section>

      <section className="bg-paper border border-moss/[0.08] rounded-[12px] p-5 sm:p-6 mb-6">
        <h2 className="font-body text-[0.7rem] font-medium uppercase tracking-[0.1em] text-stone mb-3">
          When you can visit
        </h2>
        {availabilityLines.length === 0 ? (
          <p className="text-stone text-[0.9375rem] italic">
            No availability set yet.
          </p>
        ) : (
          <ul className="text-charcoal text-[0.9375rem] leading-[1.6] space-y-1">
            {availabilityLines.map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ul>
        )}
      </section>

      <section className="bg-cream-deep/40 border border-moss/[0.08] rounded-[12px] p-5">
        <h2 className="font-body text-[0.7rem] font-medium uppercase tracking-[0.1em] text-stone mb-2">
          Managed by the office
        </h2>
        <p className="text-stone text-[0.875rem] mb-3">
          These details are kept up to date by us. If anything here needs
          to change, give us a call.
        </p>
        <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-2 text-[0.875rem]">
          <dt className="text-stone">Name</dt>
          <dd className="text-charcoal">
            {companion.firstName} {companion.lastName}
          </dd>
          <dt className="text-stone">Borough</dt>
          <dd className="text-charcoal">{companion.borough.replace(/_/g, ' ')}</dd>
          <dt className="text-stone">Status</dt>
          <dd className="text-charcoal capitalize">
            {companion.status.replace(/_/g, ' ')}
          </dd>
        </dl>
      </section>
    </div>
  );
}
