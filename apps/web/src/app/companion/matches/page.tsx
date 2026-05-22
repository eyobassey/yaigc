import { Sparkles } from 'lucide-react';
import { requireCompanion } from '@/lib/auth-helpers';

export const metadata = { title: 'Matches' };

export default async function CompanionMatchesPlaceholder() {
  await requireCompanion('/companion/matches');
  return (
    <div className="max-w-[640px]">
      <header className="mb-6 flex items-center gap-3">
        <Sparkles size={22} strokeWidth={1.75} className="text-moss" aria-hidden="true" />
        <h1 className="font-head font-normal text-moss text-[clamp(1.75rem,3vw,2.25rem)] leading-[1.1]">
          Matches
        </h1>
      </header>
      <p className="text-charcoal text-[0.9375rem] leading-[1.55]">
        Coming online shortly. We will surface any household we are
        proposing for you, with what we know about them, so you can
        accept or decline directly.
      </p>
    </div>
  );
}
