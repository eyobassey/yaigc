import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { brand, joinCompanionClub } from '@igc/content';
import { PageShell } from '@/components/marketing/PageShell';
import { ApplyForm } from './ApplyForm';

export const metadata: Metadata = {
  title: `Apply to ${brand.companionSubBrand}`,
  description: joinCompanionClub.hero.body,
};

export default function CompanionApplyPage() {
  return (
    <PageShell>
      <section className="bg-cream pt-[clamp(3rem,8vw,6rem)] pb-[clamp(4rem,10vw,8rem)]">
        <div className="max-w-[760px] mx-auto px-[clamp(1.25rem,4vw,2.5rem)]">
          <Link
            href="/companions/join"
            className="inline-flex items-center gap-1 text-stone hover:text-moss text-sm mb-6 transition-colors"
          >
            <ChevronLeft size={14} strokeWidth={1.75} aria-hidden="true" />
            Back to {brand.companionSubBrand}
          </Link>
          <span className="font-body text-[0.8125rem] font-medium uppercase tracking-[0.18em] text-stone mb-6 inline-block">
            Apply
          </span>
          <h1 className="font-head font-normal text-moss text-[clamp(2rem,5vw,3.25rem)] leading-[1.05] tracking-[-0.025em]">
            Tell us about you.
          </h1>
          <p className="font-head italic text-terracotta text-[clamp(1.25rem,2vw,1.5rem)] leading-[1.4] mt-4">
            About eight minutes.
          </p>
          <p className="text-charcoal text-lg leading-[1.65] mt-6 max-w-[44ch]">
            We read every application. We respond to every one. Yes, no, or
            "we have questions" — usually within a working day.
          </p>

          <div className="mt-10">
            <ApplyForm />
          </div>
        </div>
      </section>
    </PageShell>
  );
}
