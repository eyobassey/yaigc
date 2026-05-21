import { Coins } from 'lucide-react';
import { requireFamilyMember } from '@/lib/auth-helpers';

export const metadata = { title: 'Subscription' };

export default async function FamilySubscriptionPlaceholder() {
  await requireFamilyMember('/family/subscription');
  return (
    <div className="max-w-[640px]">
      <header className="mb-6 flex items-center gap-3">
        <Coins size={22} strokeWidth={1.75} className="text-moss" aria-hidden="true" />
        <h1 className="font-head font-normal text-moss text-[clamp(1.75rem,3vw,2.25rem)] leading-[1.1]">
          Subscription
        </h1>
      </header>
      <p className="text-charcoal text-[0.9375rem] leading-[1.55]">
        Coming online shortly. You will see your recurring schedule, your
        rate, and one-tap requests to pause or cancel. We always pick those
        up with a phone call so nothing happens by accident.
      </p>
    </div>
  );
}
