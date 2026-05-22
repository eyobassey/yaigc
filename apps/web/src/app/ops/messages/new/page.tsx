import Link from 'next/link';
import { ChevronLeft, MessageSquare } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { requireOperator } from '@/lib/auth-helpers';
import { NewThreadForm } from './NewThreadForm';

export const metadata = { title: 'Start a thread' };

export default async function OpsNewThreadPage({
  searchParams,
}: {
  searchParams: { userId?: string };
}) {
  await requireOperator('/ops/messages/new');

  // Load eligible parties: any active family_payer or companion user.
  // Sorted by last name then first name; for v1 we don't paginate,
  // because the dropdown only carries the platform's current cohort.
  const eligible = await prisma.user.findMany({
    where: {
      deletedAt: null,
      role: { in: ['family_payer', 'companion'] },
    },
    orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }, { email: 'asc' }],
    select: { id: true, firstName: true, lastName: true, email: true, role: true },
  });

  return (
    <div className="max-w-[680px]">
      <Link
        href="/ops/messages"
        className="inline-flex items-center gap-1 text-stone hover:text-moss text-sm mb-4 transition-colors"
      >
        <ChevronLeft size={14} strokeWidth={1.75} aria-hidden="true" />
        All threads
      </Link>

      <header className="mb-6 flex items-center gap-3">
        <MessageSquare size={22} strokeWidth={1.75} className="text-moss" aria-hidden="true" />
        <h1 className="font-head font-normal text-moss text-[clamp(1.75rem,3vw,2.25rem)] leading-[1.1]">
          Start a thread
        </h1>
      </header>
      <p className="text-charcoal text-[0.9375rem] leading-[1.55] max-w-[60ch] mb-6">
        Pick a family payer or a companion. Both of you will be in the
        thread; the conversation lives on the platform.
      </p>

      <NewThreadForm
        initialPartyUserId={searchParams.userId ?? null}
        eligible={eligible.map((u) => ({
          id: u.id,
          label:
            ([u.firstName, u.lastName].filter(Boolean).join(' ') || u.email) +
            (u.role === 'companion' ? ' (Companion)' : ' (Family payer)'),
        }))}
      />
    </div>
  );
}
