import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft, AlertTriangle } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { requireFamilyPayer } from '@/lib/auth-helpers';
import { EditForm } from './EditForm';

export const metadata = { title: 'Edit household member' };

export default async function FamilyRecipientEditPage({
  params,
}: {
  params: { id: string };
}) {
  const { family } = await requireFamilyPayer(`/family/recipient/${params.id}/edit`);

  const recipient = await prisma.recipient.findFirst({
    where: { id: params.id, familyId: family.id, deletedAt: null },
  });
  if (!recipient) notFound();

  // Address-edit gate: any non-canceled subscription locks the address.
  const activeSubscription = await prisma.subscription.findFirst({
    where: { familyId: family.id, status: { in: ['active', 'paused'] } },
    select: { id: true },
  });
  const addressLocked = Boolean(activeSubscription);

  return (
    <div className="max-w-[760px]">
      <Link
        href="/family/recipient"
        className="inline-flex items-center gap-1 text-stone hover:text-moss text-sm mb-4 transition-colors"
      >
        <ChevronLeft size={14} strokeWidth={1.75} aria-hidden="true" />
        Back to household
      </Link>
      <header className="mb-8">
        <span className="font-body text-[0.75rem] font-medium uppercase tracking-[0.12em] text-stone mb-2 inline-block">
          Edit
        </span>
        <h1 className="font-head font-normal text-moss text-[clamp(1.75rem,3vw,2.25rem)] leading-[1.1] break-words">
          {recipient.firstName} {recipient.lastName}
        </h1>
      </header>

      {addressLocked ? (
        <div className="mb-6 bg-amber-50 border-l-4 border-amber-400 px-5 py-4 rounded-r">
          <p className="font-body text-[0.7rem] font-medium uppercase tracking-[0.12em] text-amber-700 mb-1 flex items-center gap-2">
            <AlertTriangle size={14} strokeWidth={2} aria-hidden="true" />
            Address change goes through us
          </p>
          <p className="text-charcoal text-[0.9375rem] leading-[1.55]">
            You have an active subscription, so a companion is on their way at the scheduled times. Address changes happen via a quick phone call so we can update the booking and let them know. Everything else here is yours to change directly.
          </p>
        </div>
      ) : null}

      <EditForm
        recipient={{
          id: recipient.id,
          firstName: recipient.firstName,
          lastName: recipient.lastName,
          preferredName: recipient.preferredName,
          pronouns: recipient.pronouns,
          phone: recipient.phone,
          dateOfBirth: recipient.dateOfBirth
            ? recipient.dateOfBirth.toISOString().slice(0, 10)
            : null,
          interests: recipient.interests,
          thingsToKnow: recipient.thingsToKnow,
          mobility: recipient.mobility,
          healthNotes: recipient.healthNotes,
          dietary: recipient.dietary,
          religiousObservance: recipient.religiousObservance,
          addressLine1: recipient.addressLine1,
          addressLine2: recipient.addressLine2,
          addressCity: recipient.addressCity,
          addressPostcode: recipient.addressPostcode,
          consentToVisits: recipient.consentToVisits,
          consentToPhotos: recipient.consentToPhotos,
          consentToReportSharing: recipient.consentToReportSharing,
        }}
        addressLocked={addressLocked}
      />
    </div>
  );
}
