import type { Metadata } from 'next';
import Link from 'next/link';
import { Check, X } from 'lucide-react';
import { pricing } from '@igc/content';
import { PageShell } from '@/components/marketing/PageShell';
import { FinalCTA } from '@/components/marketing/FinalCTA';

export const metadata: Metadata = {
  title: 'Pricing',
  description: pricing.hero.body,
};

export default function PricingPage() {
  return (
    <PageShell>
      <PricingHero />
      <Tiers />
      <AttendanceAllowance />
      <WhatIsNotIncluded />
      <FinalCTA />
    </PageShell>
  );
}

function PricingHero() {
  return (
    <section className="bg-cream pt-[clamp(3rem,8vw,6rem)] pb-[clamp(2rem,5vw,4rem)]">
      <div className="max-w-[1240px] mx-auto px-[clamp(1.25rem,4vw,2.5rem)]">
        <div className="max-w-[760px]">
          <span className="font-body text-[0.8125rem] font-medium uppercase tracking-[0.18em] text-stone mb-6 inline-block">
            {pricing.hero.eyebrow}
          </span>
          <h1 className="font-head font-normal text-moss text-[clamp(2.5rem,6vw,4.5rem)] leading-[1.05] tracking-[-0.025em]">
            {pricing.hero.headline}
          </h1>
          <p className="text-[clamp(1.125rem,1.7vw,1.3125rem)] leading-[1.6] text-charcoal max-w-[44ch] mt-8">
            {pricing.hero.body}
          </p>
        </div>
      </div>
    </section>
  );
}

function Tiers() {
  return (
    <section className="bg-cream pb-[clamp(4rem,8vw,6rem)]">
      <div className="max-w-[1240px] mx-auto px-[clamp(1.25rem,4vw,2.5rem)]">
        <div className="grid gap-6 min-[900px]:grid-cols-3 min-[900px]:gap-8">
          {pricing.tiers.map((tier) => {
            const featured = 'mostPopular' in tier && tier.mostPopular === true;
            return (
              <article
                key={tier.name}
                className={`relative flex flex-col rounded-[24px] p-[clamp(1.75rem,3vw,2.5rem)] ${
                  featured
                    ? 'bg-moss text-cream shadow-[0_24px_60px_rgba(60,90,58,0.15)]'
                    : 'bg-paper text-charcoal border border-moss/[0.08]'
                }`}
              >
                {featured ? (
                  <span className="absolute -top-3 left-[clamp(1.75rem,3vw,2.5rem)] inline-flex items-center bg-terracotta text-cream text-[0.75rem] font-medium uppercase tracking-[0.12em] px-3 py-1 rounded-full">
                    Most families choose this
                  </span>
                ) : null}
                <h2
                  className={`font-head text-[1.5rem] font-medium leading-[1.2] ${
                    featured ? 'text-cream' : 'text-moss'
                  }`}
                >
                  {tier.name}
                </h2>
                <div className="flex items-baseline gap-2 mt-4">
                  <span
                    className={`font-head text-[clamp(2.5rem,5vw,3.5rem)] font-normal leading-none tracking-[-0.03em] ${
                      featured ? 'text-cream' : 'text-moss'
                    }`}
                  >
                    {tier.price}
                  </span>
                  <span
                    className={`font-body text-base font-medium ${
                      featured ? 'text-cream/85' : 'text-stone'
                    }`}
                  >
                    {tier.unit}
                  </span>
                </div>
                <p
                  className={`mt-4 leading-[1.55] ${
                    featured ? 'text-cream/85' : 'text-charcoal'
                  }`}
                >
                  {tier.description}
                </p>
                <ul className="mt-6 flex flex-col gap-3">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3 leading-[1.5]">
                      <Check
                        size={18}
                        strokeWidth={2}
                        aria-hidden="true"
                        className={`mt-0.5 flex-shrink-0 ${
                          featured ? 'text-terracotta-light' : 'text-moss'
                        }`}
                      />
                      <span className={featured ? 'text-cream/90' : 'text-charcoal'}>
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>
                <Link
                  href="/contact"
                  className={`mt-8 inline-flex items-center justify-center px-6 py-3 rounded-full text-[0.95rem] font-medium transition-colors ${
                    featured
                      ? 'bg-cream text-moss hover:bg-cream-deep'
                      : 'bg-moss text-cream hover:bg-moss-dark'
                  }`}
                >
                  {tier.cta}
                </Link>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function AttendanceAllowance() {
  return (
    <section className="bg-cream-deep py-[clamp(3rem,6vw,5rem)]">
      <div className="max-w-[760px] mx-auto px-[clamp(1.25rem,4vw,2.5rem)] text-center">
        <span className="font-body text-[0.8125rem] font-medium uppercase tracking-[0.18em] text-stone mb-4 inline-block">
          {pricing.attendanceAllowanceNote.title}
        </span>
        <p className="font-head italic text-terracotta text-[clamp(1.375rem,2.5vw,1.75rem)] leading-[1.4] mt-2">
          {pricing.attendanceAllowanceNote.body}
        </p>
      </div>
    </section>
  );
}

function WhatIsNotIncluded() {
  return (
    <section className="bg-cream py-[clamp(4rem,8vw,6rem)]">
      <div className="max-w-[880px] mx-auto px-[clamp(1.25rem,4vw,2.5rem)]">
        <span className="font-body text-[0.8125rem] font-medium uppercase tracking-[0.18em] text-stone mb-6 inline-block">
          Honest limits
        </span>
        <h2 className="font-head font-normal text-moss text-[clamp(1.75rem,4vw,2.75rem)] leading-[1.1] tracking-[-0.02em]">
          {pricing.whatIsNotIncluded.title}
        </h2>
        <ul className="mt-8 grid gap-3 min-[700px]:grid-cols-2 min-[700px]:gap-x-12">
          {pricing.whatIsNotIncluded.items.map((item) => (
            <li key={item} className="flex items-start gap-3 text-charcoal leading-[1.55]">
              <X size={18} strokeWidth={2} aria-hidden="true" className="mt-0.5 text-terracotta flex-shrink-0" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
        <p className="mt-8 font-head italic text-terracotta text-lg leading-[1.5] max-w-[58ch]">
          {pricing.whatIsNotIncluded.footnote}
        </p>
      </div>
    </section>
  );
}
