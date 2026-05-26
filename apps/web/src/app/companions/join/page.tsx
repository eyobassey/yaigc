import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Check, X } from 'lucide-react';
import { brand, joinCompanionClub } from '@igc/content';
import { PageShell } from '@/components/marketing/PageShell';
import { Button } from '@/components/ui/Button';

export const metadata: Metadata = {
  title: `Join ${brand.companionSubBrand}`,
  description: joinCompanionClub.hero.body,
};

export default function CompanionsJoinPage() {
  return (
    <PageShell>
      <JoinHero />
      <WhatItIs />
      <WhatWeLookFor />
      <NotForYou />
      <Process />
      <ApplyCTA />
    </PageShell>
  );
}

function JoinHero() {
  return (
    <section className="bg-cream pt-[clamp(3rem,8vw,6rem)] pb-[clamp(3rem,8vw,5rem)]">
      <div className="max-w-[1240px] mx-auto px-[clamp(1.25rem,4vw,2.5rem)]">
        <div className="max-w-[820px]">
          <span className="font-body text-[0.8125rem] font-medium uppercase tracking-[0.18em] text-stone mb-6 inline-block">
            {joinCompanionClub.hero.eyebrow}
          </span>
          <h1 className="font-head font-normal text-moss text-[clamp(2.5rem,6vw,4.5rem)] leading-[1.05] tracking-[-0.025em]">
            {joinCompanionClub.hero.headline}
          </h1>
          <p className="text-[clamp(1.125rem,1.7vw,1.3125rem)] leading-[1.6] text-charcoal max-w-[48ch] mt-8">
            {joinCompanionClub.hero.body}
          </p>
          <div className="flex flex-wrap gap-4 mt-10">
            <Button href="/companions/join/apply">
              {joinCompanionClub.hero.primaryCta}
            </Button>
            <Link
              href="#what-it-is"
              className="inline-flex items-center justify-center px-4 py-[1.125rem] text-moss text-base font-medium hover:text-terracotta transition-colors"
            >
              {joinCompanionClub.hero.secondaryCta}
              <ArrowRight size={18} strokeWidth={1.75} aria-hidden="true" className="ml-2" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function WhatItIs() {
  return (
    <section id="what-it-is" className="bg-cream pb-[clamp(4rem,8vw,6rem)]">
      <div className="max-w-[1240px] mx-auto px-[clamp(1.25rem,4vw,2.5rem)]">
        <h2 className="font-head font-normal text-moss text-[clamp(1.75rem,4vw,2.75rem)] leading-[1.1] tracking-[-0.02em] max-w-[18ch] mb-12">
          {joinCompanionClub.whatItIs.title}
        </h2>
        <div id="how-we-pay" className="grid gap-6 min-[800px]:grid-cols-2 min-[800px]:gap-8">
          {joinCompanionClub.whatItIs.points.map((point) => (
            <article
              key={point.title}
              className="bg-paper border border-moss/[0.08] rounded-[20px] p-[clamp(1.75rem,3vw,2.25rem)]"
            >
              <h3 className="font-head text-moss text-[1.375rem] font-medium leading-[1.25] mb-4">
                {point.title}
              </h3>
              <p className="text-charcoal leading-[1.6]">{point.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function WhatWeLookFor() {
  return (
    <section id="what-we-look-for" className="bg-cream-deep py-[clamp(4rem,8vw,6rem)]">
      <div className="max-w-[880px] mx-auto px-[clamp(1.25rem,4vw,2.5rem)]">
        <span className="font-body text-[0.8125rem] font-medium uppercase tracking-[0.18em] text-stone mb-4 inline-block">
          The fit
        </span>
        <h2 className="font-head font-normal text-moss text-[clamp(1.75rem,4vw,2.75rem)] leading-[1.1] tracking-[-0.02em]">
          {joinCompanionClub.whatWeLookFor.title}
        </h2>
        <p className="text-charcoal text-[1.0625rem] leading-[1.65] mt-6 max-w-[58ch]">
          {joinCompanionClub.whatWeLookFor.intro}
        </p>
        <ul className="mt-8 grid gap-3 min-[700px]:grid-cols-2 min-[700px]:gap-x-12">
          {joinCompanionClub.whatWeLookFor.list.map((item) => (
            <li key={item} className="flex items-start gap-3 text-charcoal leading-[1.55]">
              <Check size={18} strokeWidth={2} aria-hidden="true" className="mt-0.5 text-moss flex-shrink-0" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function NotForYou() {
  return (
    <section className="bg-cream py-[clamp(4rem,8vw,6rem)]">
      <div className="max-w-[880px] mx-auto px-[clamp(1.25rem,4vw,2.5rem)]">
        <span className="font-body text-[0.8125rem] font-medium uppercase tracking-[0.18em] text-stone mb-4 inline-block">
          Honest about who we are not
        </span>
        <h2 className="font-head font-normal text-moss text-[clamp(1.75rem,4vw,2.75rem)] leading-[1.1] tracking-[-0.02em]">
          {joinCompanionClub.notForYou.title}
        </h2>
        <ul className="mt-8 flex flex-col gap-3">
          {joinCompanionClub.notForYou.list.map((item) => (
            <li key={item} className="flex items-start gap-3 text-charcoal leading-[1.55]">
              <X size={18} strokeWidth={2} aria-hidden="true" className="mt-0.5 text-terracotta flex-shrink-0" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function Process() {
  return (
    <section className="bg-moss text-cream py-[clamp(4rem,10vw,8rem)]">
      <div className="max-w-[880px] mx-auto px-[clamp(1.25rem,4vw,2.5rem)]">
        <span className="font-body text-[0.8125rem] font-medium uppercase tracking-[0.18em] text-terracotta-light mb-6 inline-block">
          The path in
        </span>
        <h2 className="font-head font-normal text-cream text-[clamp(2rem,5vw,3rem)] leading-[1.1] tracking-[-0.02em]">
          {joinCompanionClub.process.title}
        </h2>
        <ol className="mt-12 flex flex-col gap-8">
          {joinCompanionClub.process.steps.map((step, index) => (
            <li key={step} className="grid grid-cols-[auto_1fr] gap-6 items-start">
              <div className="font-head italic text-terracotta-light text-[clamp(2rem,3vw,2.75rem)] leading-none font-normal min-w-[2.5rem]">
                {String(index + 1).padStart(2, '0')}
              </div>
              <p className="text-cream/90 text-[clamp(1rem,1.5vw,1.125rem)] leading-[1.6] pt-2">
                {step}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function ApplyCTA() {
  return (
    <section className="bg-cream py-[clamp(4rem,10vw,8rem)] text-center">
      <div className="max-w-[660px] mx-auto px-[clamp(1.25rem,4vw,2.5rem)]">
        <h2 className="font-head font-normal text-moss text-[clamp(2rem,5vw,3.5rem)] leading-[1.1] tracking-[-0.02em] mb-6">
          Ready to apply?
          <br />
          <em className="italic text-terracotta">Three minutes.</em>
        </h2>
        <p className="text-charcoal text-lg leading-[1.6] max-w-[44ch] mx-auto mb-10">
          Tell us a little about you and we will pick up the phone within a few days.
        </p>
        <Button href="/companions/join/apply">
          {joinCompanionClub.hero.primaryCta}
        </Button>
      </div>
    </section>
  );
}
