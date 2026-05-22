import Link from 'next/link';
import { ChevronLeft, Pencil } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { requireCompanion } from '@/lib/auth-helpers';
import { companionPhotoSrc } from '@/lib/companion-photo-src';
import { ProfileEditForm } from './ProfileEditForm';

export const metadata = { title: 'Edit profile' };

export default async function EditCompanionProfilePage() {
  const { companion } = await requireCompanion('/companion/profile/edit');

  const photoSrc = companionPhotoSrc(companion);

  // Pull the licence columns separately - requireCompanion's narrower
  // context doesn't include them.
  const extras = await prisma.companion.findUnique({
    where: { id: companion.id },
    select: {
      driverLicenceNumber: true,
      driverLicenceExpiresAt: true,
    },
  });

  // Best-effort hand-off of the JSON availability column. The form is
  // a client component that wants a plain JSON value, not a Prisma type.
  const availability =
    companion.availability && typeof companion.availability === 'object'
      ? (companion.availability as Record<string, unknown>)
      : null;

  return (
    <div className="max-w-[820px]">
      <Link
        href="/companion/profile"
        className="inline-flex items-center gap-1 text-stone hover:text-moss text-sm mb-4 transition-colors"
      >
        <ChevronLeft size={14} strokeWidth={1.75} aria-hidden="true" />
        Back to profile
      </Link>

      <header className="mb-6 flex items-center gap-3">
        <Pencil size={22} strokeWidth={1.75} className="text-moss" aria-hidden="true" />
        <h1 className="font-head font-normal text-moss text-[clamp(1.75rem,3vw,2.25rem)] leading-[1.1]">
          Edit your profile
        </h1>
      </header>
      <p className="text-charcoal text-[0.9375rem] leading-[1.55] max-w-[60ch] mb-6">
        Update what families see when we propose you to them. Your name,
        borough, and any other admin details stay with us; ring the office
        if those need to change.
      </p>

      <ProfileEditForm
        initialBio={companion.bio ?? ''}
        initialInterests={companion.interests ?? ''}
        initialAvailability={availability}
        initialDriverLicenceNumber={extras?.driverLicenceNumber ?? ''}
        initialDriverLicenceExpiresAt={
          extras?.driverLicenceExpiresAt
            ? extras.driverLicenceExpiresAt.toISOString().slice(0, 10)
            : ''
        }
        currentPhotoSrc={photoSrc}
      />
    </div>
  );
}
