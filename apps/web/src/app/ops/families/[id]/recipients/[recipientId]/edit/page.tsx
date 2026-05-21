import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { RecipientEditForm } from './RecipientEditForm';

export const metadata = { title: 'Edit recipient' };

export default async function EditRecipientPage({
  params,
}: {
  params: { id: string; recipientId: string };
}) {
  const recipient = await prisma.recipient.findUnique({
    where: { id: params.recipientId },
  });
  if (!recipient || recipient.familyId !== params.id) notFound();

  return (
    <div className="max-w-[760px]">
      <Link
        href={`/ops/families/${params.id}`}
        className="inline-flex items-center gap-1 text-stone hover:text-moss text-sm mb-4 transition-colors"
      >
        <ChevronLeft size={14} strokeWidth={1.75} aria-hidden="true" />
        Back to family
      </Link>
      <header className="mb-8">
        <span className="font-body text-[0.75rem] font-medium uppercase tracking-[0.12em] text-stone mb-2 inline-block">
          Edit recipient
        </span>
        <h1 className="font-head font-normal text-moss text-[clamp(1.75rem,3vw,2.25rem)] leading-[1.1] break-words">
          {recipient.firstName} {recipient.lastName}
        </h1>
      </header>

      <RecipientEditForm
        familyId={params.id}
        recipient={{
          id: recipient.id,
          firstName: recipient.firstName,
          lastName: recipient.lastName,
          preferredName: recipient.preferredName,
          dateOfBirth: recipient.dateOfBirth,
          phone: recipient.phone,
          pronouns: recipient.pronouns,
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
          addressCountry: recipient.addressCountry,
          consentToVisits: recipient.consentToVisits,
          consentToPhotos: recipient.consentToPhotos,
          consentToReportSharing: recipient.consentToReportSharing,
        }}
      />
    </div>
  );
}
