import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { MemberEditForm } from './MemberEditForm';

export const metadata = { title: 'Edit family member' };

export default async function EditFamilyMemberPage({
  params,
}: {
  params: { id: string; memberId: string };
}) {
  const member = await prisma.familyMember.findUnique({
    where: { id: params.memberId },
    include: { user: true },
  });
  if (!member || member.familyId !== params.id) notFound();

  const displayName =
    `${member.user.firstName ?? ''} ${member.user.lastName ?? ''}`.trim() ||
    member.user.email;

  return (
    <div className="max-w-[600px]">
      <Link
        href={`/ops/families/${params.id}`}
        className="inline-flex items-center gap-1 text-stone hover:text-moss text-sm mb-4 transition-colors"
      >
        <ChevronLeft size={14} strokeWidth={1.75} aria-hidden="true" />
        Back to family
      </Link>
      <header className="mb-8">
        <span className="font-body text-[0.75rem] font-medium uppercase tracking-[0.12em] text-stone mb-2 inline-block">
          Edit family member
        </span>
        <h1 className="font-head font-normal text-moss text-[clamp(1.75rem,3vw,2.25rem)] leading-[1.1] break-words">
          {displayName}
        </h1>
      </header>

      <MemberEditForm
        member={{
          id: member.id,
          relationshipToRecipient: member.relationshipToRecipient,
          isPrimaryContact: member.isPrimaryContact,
        }}
        familyId={params.id}
      />
    </div>
  );
}
