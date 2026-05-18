import Link from 'next/link';
import { pricingTeaser } from '@/content/landing-extras';

export function PricingTeaser() {
  return (
    <section id="pricing" className="bg-cream py-[clamp(4rem,10vw,8rem)]">
      <div className="max-w-[1240px] mx-auto px-[clamp(1.25rem,4vw,2.5rem)] grid gap-[clamp(2rem,5vw,4rem)] items-center min-[900px]:grid-cols-2">
        <div>
          <span className="font-body text-[0.8125rem] font-medium uppercase tracking-[0.18em] text-stone mb-6 inline-block">
            {pricingTeaser.eyebrow}
          </span>
          <h2 className="font-head font-normal text-moss text-[clamp(2rem,5vw,3.5rem)] leading-[1.1] tracking-[-0.02em]">
            One hourly rate.
            <br />
            No hidden fees.
          </h2>
          <p className="text-[clamp(1.125rem,2vw,1.375rem)] leading-[1.55] text-charcoal max-w-[38ch] mt-6">
            {pricingTeaser.lead}
          </p>
          <Link
            href={pricingTeaser.ctaHref}
            className="inline-flex items-center justify-center px-9 py-[1.125rem] rounded-full bg-moss text-cream text-base font-medium hover:bg-moss-dark transition-all duration-200 hover:shadow-lg hover:-translate-y-px mt-8"
          >
            {pricingTeaser.cta}
          </Link>
        </div>

        <div className="bg-paper p-[clamp(2rem,4vw,3rem)] rounded-[24px] border border-moss/[0.08] text-center">
          <div className="flex items-baseline justify-center gap-2 font-head mb-2">
            <span className="text-2xl text-terracotta font-medium">{pricingTeaser.amount.currency}</span>
            <span className="text-[clamp(4rem,9vw,6rem)] text-moss font-normal leading-none tracking-[-0.03em]">
              {pricingTeaser.amount.figure}
            </span>
            <span className="font-body text-base text-stone font-medium">{pricingTeaser.amount.unit}</span>
          </div>
          <p className="text-sm text-stone mt-4 max-w-[32ch] mx-auto leading-[1.55]">
            {pricingTeaser.note}
          </p>
          <div className="mt-8 pt-8 border-t border-dashed border-moss/20 text-[0.9375rem] text-charcoal max-w-[36ch] mx-auto">
            <strong className="text-moss font-semibold">{pricingTeaser.attendanceAllowance.heading}</strong>
            <br />
            {pricingTeaser.attendanceAllowance.body}
          </div>
        </div>
      </div>
    </section>
  );
}
