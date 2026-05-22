import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { requireFamilyPayer } from '@/lib/auth-helpers';
import { InviteForm } from './InviteForm';

export const metadata = { title: 'Invite a family member' };

export default async function FamilyInvitePage() {
  await requireFamilyPayer('/family/account/invite');

  return (
    <div className="max-w-[640px]">
      <Link
        href="/family/account"
        className="inline-flex items-center gap-1 text-stone hover:text-moss text-sm mb-4 transition-colors"
      >
        <ChevronLeft size={14} strokeWidth={1.75} aria-hidden="true" />
        Back to account
      </Link>
      <header className="mb-6">
        <span className="font-body text-[0.75rem] font-medium uppercase tracking-[0.12em] text-stone mb-2 inline-block">
          Invite
        </span>
        <h1 className="font-head font-normal text-moss text-[clamp(1.75rem,3vw,2.25rem)] leading-[1.1]">
          Add another person
        </h1>
        <p className="text-stone text-[0.9375rem] leading-[1.55] mt-3 max-w-[60ch]">
          Add a partner, sibling, or grown-up child so they can see visit
          notes too. They sign in with their own email - no shared
          passwords. Only the payer (that is you) can change consents,
          address, or the recurring schedule.
        </p>
      </header>
      <InviteForm />
    </div>
  );
}
