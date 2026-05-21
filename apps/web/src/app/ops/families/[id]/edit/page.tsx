import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { FamilyEditForm } from './FamilyEditForm';

export const metadata = { title: 'Edit family' };

export default async function EditFamilyPage({
  params,
}: {
  params: { id: string };
}) {
  const family = await prisma.family.findUnique({ where: { id: params.id } });
  if (!family) notFound();

  return (
    <div className="max-w-[680px]">
      <Link
        href={`/ops/families/${family.id}`}
        className="inline-flex items-center gap-1 text-stone hover:text-moss text-sm mb-4 transition-colors"
      >
        <ChevronLeft size={14} strokeWidth={1.75} aria-hidden="true" />
        Back to family
      </Link>
      <header className="mb-8">
        <span className="font-body text-[0.75rem] font-medium uppercase tracking-[0.12em] text-stone mb-2 inline-block">
          Edit family
        </span>
        <h1 className="font-head font-normal text-moss text-[clamp(1.75rem,3vw,2.25rem)] leading-[1.1]">
          {family.billingName}
        </h1>
      </header>

      <FamilyEditForm
        family={{
          id: family.id,
          billingName: family.billingName,
          intakeNotes: family.intakeNotes,
          billingAddressLine1: family.billingAddressLine1,
          billingAddressLine2: family.billingAddressLine2,
          billingCity: family.billingCity,
          billingPostcode: family.billingPostcode,
          billingCountry: family.billingCountry,
        }}
      />
    </div>
  );
}
