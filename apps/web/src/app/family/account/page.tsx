import { User } from 'lucide-react';
import { requireFamilyMember } from '@/lib/auth-helpers';
import { AccountForm } from './AccountForm';

export const metadata = { title: 'Account' };

export default async function FamilyAccountPage() {
  const { user, member, family } = await requireFamilyMember('/family/account');

  // Payer can edit; viewers (Phase 2) get a read-only view.
  const isPayer = member.role === 'payer';

  return (
    <div className="max-w-[640px]">
      <header className="mb-6 flex items-center gap-3">
        <User size={22} strokeWidth={1.75} className="text-moss" aria-hidden="true" />
        <h1 className="font-head font-normal text-moss text-[clamp(1.75rem,3vw,2.25rem)] leading-[1.1]">
          Account
        </h1>
      </header>

      <dl className="bg-paper border border-moss/[0.08] rounded-[12px] p-5 sm:p-6 grid grid-cols-[max-content_1fr] gap-x-6 gap-y-3 text-[0.9375rem] mb-6">
        <dt className="text-stone">Household</dt>
        <dd className="text-charcoal break-words">{family.billingName}</dd>
        <dt className="text-stone">Email</dt>
        <dd className="text-charcoal break-all">{user.email}</dd>
        <dt className="text-stone">Role</dt>
        <dd className="text-charcoal capitalize">{member.role}</dd>
      </dl>

      {isPayer ? (
        <AccountForm
          firstName={user.firstName ?? ''}
          lastName={user.lastName ?? ''}
          relationshipToRecipient={member.relationshipToRecipient ?? ''}
        />
      ) : (
        <p className="text-stone text-[0.9375rem] leading-[1.55]">
          Editing on the household account is reserved for the payer. If
          you need to change your details, ask them to do it or reach us
          directly.
        </p>
      )}
    </div>
  );
}
