import { User } from 'lucide-react';
import { requireFamilyMember } from '@/lib/auth-helpers';

export const metadata = { title: 'Account' };

export default async function FamilyAccountPlaceholder() {
  const { user, family } = await requireFamilyMember('/family/account');
  return (
    <div className="max-w-[640px]">
      <header className="mb-6 flex items-center gap-3">
        <User size={22} strokeWidth={1.75} className="text-moss" aria-hidden="true" />
        <h1 className="font-head font-normal text-moss text-[clamp(1.75rem,3vw,2.25rem)] leading-[1.1]">
          Account
        </h1>
      </header>
      <p className="text-charcoal text-[0.9375rem] leading-[1.55] mb-6">
        Full account editing comes in a follow-up update. For now, here is
        what we have on file.
      </p>
      <dl className="bg-paper border border-moss/[0.08] rounded-[12px] p-5 grid grid-cols-[max-content_1fr] gap-x-4 gap-y-2 text-[0.9375rem]">
        <dt className="text-stone">Account</dt>
        <dd className="text-charcoal break-words">{family.billingName}</dd>
        <dt className="text-stone">Email</dt>
        <dd className="text-charcoal break-all">{user.email}</dd>
        {user.firstName || user.lastName ? (
          <>
            <dt className="text-stone">Name</dt>
            <dd className="text-charcoal">{`${user.firstName ?? ''} ${user.lastName ?? ''}`.trim()}</dd>
          </>
        ) : null}
      </dl>
    </div>
  );
}
