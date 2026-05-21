import { Calendar } from 'lucide-react';
import { requireFamilyMember } from '@/lib/auth-helpers';

export const metadata = { title: 'Visits' };

// F.3 builds this out. F.1 placeholder so the nav link does not 404.

export default async function FamilyVisitsPlaceholder() {
  await requireFamilyMember('/family/visits');
  return (
    <div className="max-w-[640px]">
      <header className="mb-6 flex items-center gap-3">
        <Calendar size={22} strokeWidth={1.75} className="text-moss" aria-hidden="true" />
        <h1 className="font-head font-normal text-moss text-[clamp(1.75rem,3vw,2.25rem)] leading-[1.1]">
          Visits
        </h1>
      </header>
      <p className="text-charcoal text-[0.9375rem] leading-[1.55]">
        Coming online shortly. You will see upcoming visits, past visits, and
        the short note your companion sends after each one - including any
        photos they took with consent.
      </p>
    </div>
  );
}
