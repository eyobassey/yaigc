import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft, Pencil } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { requireOperator } from '@/lib/auth-helpers';
import { companionPhotoSrc } from '@/lib/companion-photo-src';
import { EditCompanionForm } from './EditCompanionForm';

export const metadata = { title: 'Edit companion' };

export default async function OpsCompanionEditPage({
  params,
}: {
  params: { id: string };
}) {
  await requireOperator(`/ops/companions/${params.id}/edit`);

  const application = await prisma.companionApplication.findUnique({
    where: { id: params.id },
    include: { companion: true },
  });
  if (!application || !application.companion) notFound();

  const companion = application.companion;
  const photoSrc = companionPhotoSrc({
    id: companion.id,
    photoFilename: companion.photoFilename,
    photoUrl: companion.photoUrl,
  });

  const availability =
    companion.availability && typeof companion.availability === 'object'
      ? (companion.availability as Record<string, unknown>)
      : null;

  return (
    <div className="max-w-[820px]">
      <Link
        href={`/ops/companions/${application.id}`}
        className="inline-flex items-center gap-1 text-stone hover:text-moss text-sm mb-4 transition-colors"
      >
        <ChevronLeft size={14} strokeWidth={1.75} aria-hidden="true" />
        Back to application
      </Link>

      <header className="mb-6 flex items-center gap-3">
        <Pencil size={22} strokeWidth={1.75} className="text-moss" aria-hidden="true" />
        <h1 className="font-head font-normal text-moss text-[clamp(1.75rem,3vw,2.25rem)] leading-[1.1]">
          Edit {companion.firstName} {companion.lastName}
        </h1>
      </header>
      <p className="text-charcoal text-[0.9375rem] leading-[1.55] max-w-[60ch] mb-6">
        Editing the linked Companion record. Updates are audited. The
        companion sees their bio / interests / availability / photo
        changes on their next portal load.
      </p>

      <EditCompanionForm
        companionId={companion.id}
        applicationId={application.id}
        initial={{
          firstName: companion.firstName,
          lastName: companion.lastName,
          borough: companion.borough,
          engagementType: companion.engagementType,
          status: companion.status,
          hourlyRate: Number(companion.hourlyRate).toFixed(2),
          maxConcurrentMatches: companion.maxConcurrentMatches,
          bio: companion.bio ?? '',
          interests: companion.interests ?? '',
          availability,
          driverLicenceNumber: companion.driverLicenceNumber ?? '',
          driverLicenceExpiresAt: companion.driverLicenceExpiresAt
            ? companion.driverLicenceExpiresAt.toISOString().slice(0, 10)
            : '',
          addressLine1: companion.addressLine1 ?? '',
          addressLine2: companion.addressLine2 ?? '',
          addressCity: companion.addressCity ?? '',
          addressPostcode: companion.addressPostcode ?? '',
          maxTravelMiles:
            companion.maxTravelMiles != null
              ? String(companion.maxTravelMiles)
              : '',
        }}
        currentPhotoSrc={photoSrc}
      />
    </div>
  );
}
