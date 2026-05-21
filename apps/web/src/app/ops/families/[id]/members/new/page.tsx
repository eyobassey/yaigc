import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { AddMemberForm } from './AddMemberForm';

export const metadata = { title: 'Add family member' };

export default async function AddFamilyMemberPage({
  params,
}: {
  params: { id: string };
}) {
  const family = await prisma.family.findUnique({
    where: { id: params.id },
    select: { id: true, billingName: true },
  });
  if (!family) notFound();

  return (
    <div className="max-w-[640px]">
      <Link
        href={`/ops/families/${family.id}`}
        className="inline-flex items-center gap-1 text-stone hover:text-moss text-sm mb-4 transition-colors"
      >
        <ChevronLeft size={14} strokeWidth={1.75} aria-hidden="true" />
        Back to family
      </Link>
      <header className="mb-8">
        <span className="font-body text-[0.75rem] font-medium uppercase tracking-[0.12em] text-stone mb-2 inline-block">
          Add family member
        </span>
        <h1 className="font-head font-normal text-moss text-[clamp(1.75rem,3vw,2.25rem)] leading-[1.1] break-words">
          {family.billingName}
        </h1>
        <p className="text-stone text-[0.9375rem] leading-[1.55] mt-2">
          Add a second account holder. Useful when another adult child or
          partner needs visibility on visits and reports.
        </p>
      </header>

      <AddMemberForm familyId={family.id} />
    </div>
  );
}
