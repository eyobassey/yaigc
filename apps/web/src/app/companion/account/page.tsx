import { Settings } from 'lucide-react';
import { requireCompanion } from '@/lib/auth-helpers';

export const metadata = { title: 'Account' };

export default async function CompanionAccountPlaceholder() {
  const { user, companion } = await requireCompanion('/companion/account');
  return (
    <div className="max-w-[640px]">
      <header className="mb-6 flex items-center gap-3">
        <Settings size={22} strokeWidth={1.75} className="text-moss" aria-hidden="true" />
        <h1 className="font-head font-normal text-moss text-[clamp(1.75rem,3vw,2.25rem)] leading-[1.1]">
          Account
        </h1>
      </header>
      <p className="text-charcoal text-[0.9375rem] leading-[1.55] mb-6">
        Editing comes online in a follow-up. Here is what we have on file.
      </p>
      <dl className="bg-paper border border-moss/[0.08] rounded-[12px] p-5 grid grid-cols-[max-content_1fr] gap-x-4 gap-y-2 text-[0.9375rem]">
        <dt className="text-stone">Name</dt>
        <dd className="text-charcoal">{companion.firstName} {companion.lastName}</dd>
        <dt className="text-stone">Email</dt>
        <dd className="text-charcoal break-all">{user.email}</dd>
        <dt className="text-stone">Status</dt>
        <dd className="text-charcoal capitalize">{companion.status}</dd>
        <dt className="text-stone">Borough</dt>
        <dd className="text-charcoal">{companion.borough.replace(/_/g, ' ')}</dd>
      </dl>
    </div>
  );
}
