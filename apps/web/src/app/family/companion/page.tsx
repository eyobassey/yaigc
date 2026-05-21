import { Heart } from 'lucide-react';
import { requireFamilyMember } from '@/lib/auth-helpers';

export const metadata = { title: 'Your companion' };

export default async function FamilyCompanionPlaceholder() {
  await requireFamilyMember('/family/companion');
  return (
    <div className="max-w-[640px]">
      <header className="mb-6 flex items-center gap-3">
        <Heart size={22} strokeWidth={1.75} className="text-terracotta" aria-hidden="true" />
        <h1 className="font-head font-normal text-moss text-[clamp(1.75rem,3vw,2.25rem)] leading-[1.1]">
          Your companion
        </h1>
      </header>
      <p className="text-charcoal text-[0.9375rem] leading-[1.55]">
        Coming online shortly. You will see a short profile of the companion
        matched with your household - first name, a photo, and a few words
        about them.
      </p>
    </div>
  );
}
