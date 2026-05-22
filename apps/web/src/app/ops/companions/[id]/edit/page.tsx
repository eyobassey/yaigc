import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft, MessageSquare, Pencil } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { requireOperator } from '@/lib/auth-helpers';
import { setCompanionDirectMessaging } from '@/lib/companion';
import { companionPhotoSrc } from '@/lib/companion-photo-src';
import { EditCompanionForm } from './EditCompanionForm';

export const metadata = { title: 'Edit companion' };

export default async function OpsCompanionEditPage({
  params,
}: {
  params: { id: string };
}) {
  const actor = await requireOperator(`/ops/companions/${params.id}/edit`);

  const application = await prisma.companionApplication.findUnique({
    where: { id: params.id },
    include: {
      companion: { include: { badges: { select: { slug: true } } } },
    },
  });
  if (!application || !application.companion) notFound();

  const companion = application.companion;
  const currentBadgeSlugs = companion.badges.map((b) => b.slug);
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
          badgeSlugs: currentBadgeSlugs,
        }}
        currentPhotoSrc={photoSrc}
      />

      {actor.role === 'operator_admin' ? (
        <DirectMessagingCard
          companionId={companion.id}
          enabled={companion.directMessagingEnabled}
        />
      ) : null}
    </div>
  );
}

// M.2.2 - operator_admin only. Surfaces the per-companion gate for
// direct family <-> companion messaging. The toggle is destructive in
// one direction (turning it on widens who can reach this companion),
// so the wording and button copy stay deliberately explicit.
function DirectMessagingCard({
  companionId,
  enabled,
}: {
  companionId: string;
  enabled: boolean;
}) {
  return (
    <section className="mt-10 bg-paper border border-moss/[0.08] rounded-[12px] p-6">
      <header className="flex items-center gap-3 mb-3">
        <MessageSquare
          size={20}
          strokeWidth={1.75}
          className="text-moss"
          aria-hidden="true"
        />
        <h2 className="font-head font-normal text-moss text-[1.25rem]">
          Direct messaging
        </h2>
        <span
          className={
            'ml-auto inline-flex items-center gap-1.5 text-[0.75rem] font-medium px-2 py-0.5 rounded-full ' +
            (enabled
              ? 'bg-moss/10 text-moss'
              : 'bg-stone/10 text-stone')
          }
        >
          <span
            className={
              'inline-block w-1.5 h-1.5 rounded-full ' +
              (enabled ? 'bg-moss' : 'bg-stone')
            }
            aria-hidden="true"
          />
          {enabled ? 'Enabled' : 'Disabled'}
        </span>
      </header>
      <p className="text-charcoal text-[0.9375rem] leading-[1.55] mb-2">
        When enabled, this companion can exchange messages directly with
        any family they have an accepted match with. The office can still
        read every message; both sides see a banner saying so.
      </p>
      <p className="text-stone text-[0.875rem] leading-[1.55] mb-5">
        When disabled, the only messaging channel is the operator-mediated
        thread under <span className="font-medium">Messages</span>.
      </p>
      <form action={setCompanionDirectMessaging}>
        <input type="hidden" name="companionId" value={companionId} />
        <input type="hidden" name="enabled" value={enabled ? 'false' : 'true'} />
        <button
          type="submit"
          className={
            'inline-flex items-center gap-2 px-3.5 py-2 rounded-md text-sm font-medium transition-colors ' +
            (enabled
              ? 'bg-paper border border-stone/30 text-charcoal hover:bg-stone/5'
              : 'bg-moss text-cream hover:bg-moss-deep')
          }
        >
          {enabled ? 'Disable direct messaging' : 'Enable direct messaging'}
        </button>
      </form>
    </section>
  );
}
