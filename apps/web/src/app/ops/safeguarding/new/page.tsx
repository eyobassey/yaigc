import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { OpenForm } from './OpenForm';

export const metadata = { title: 'Open a case' };

export default async function NewSafeguardingCasePage() {
  // List active recipients across all families so the operator can pick
  // a subject. Soft-deleted recipients hidden.
  const recipients = await prisma.recipient.findMany({
    where: { deletedAt: null },
    orderBy: [{ family: { billingName: 'asc' } }, { firstName: 'asc' }],
    select: {
      id: true,
      firstName: true,
      lastName: true,
      preferredName: true,
      family: { select: { billingName: true } },
    },
  });

  return (
    <div className="max-w-[720px]">
      <Link
        href="/ops/safeguarding"
        className="inline-flex items-center gap-1 text-stone hover:text-moss text-sm mb-4 transition-colors"
      >
        <ChevronLeft size={14} strokeWidth={1.75} aria-hidden="true" />
        Back to safeguarding
      </Link>
      <header className="mb-8">
        <span className="font-body text-[0.75rem] font-medium uppercase tracking-[0.12em] text-stone mb-2 inline-block">
          Safeguarding
        </span>
        <h1 className="font-head font-normal text-moss text-[clamp(1.75rem,3vw,2.25rem)] leading-[1.1]">
          Open a case
        </h1>
        <p className="text-stone text-[0.9375rem] leading-[1.55] mt-2">
          For concerns that did not come from a post-visit report or an ended match. Auto-opened cases land here too - this page is just the manual route.
        </p>
      </header>

      <OpenForm
        recipients={recipients.map((r) => ({
          id: r.id,
          label: `${r.firstName} ${r.lastName}${r.preferredName ? ` (known as ${r.preferredName})` : ''} - ${r.family.billingName}`,
        }))}
      />
    </div>
  );
}
