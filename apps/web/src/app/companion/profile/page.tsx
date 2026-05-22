import { User } from 'lucide-react';
import { requireCompanion } from '@/lib/auth-helpers';

export const metadata = { title: 'Profile' };

export default async function CompanionProfilePlaceholder() {
  await requireCompanion('/companion/profile');
  return (
    <div className="max-w-[640px]">
      <header className="mb-6 flex items-center gap-3">
        <User size={22} strokeWidth={1.75} className="text-moss" aria-hidden="true" />
        <h1 className="font-head font-normal text-moss text-[clamp(1.75rem,3vw,2.25rem)] leading-[1.1]">
          Profile
        </h1>
      </header>
      <p className="text-charcoal text-[0.9375rem] leading-[1.55]">
        Coming online shortly. You will be able to edit your bio, swap
        your photo, update your availability, and keep your interests
        fresh.
      </p>
    </div>
  );
}
