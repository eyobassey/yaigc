import type { Metadata } from 'next';
import { brand, howItWorks } from '@igc/content';
import { PageShell } from '@/components/marketing/PageShell';
import { FinalCTA } from '@/components/marketing/FinalCTA';

export const metadata: Metadata = {
  title: `How it works  ·  ${brand.fullName}`,
  description: howItWorks.hero.body,
};

export default function HowItWorksPage() {
  return (
    <PageShell>
      <PageHero
        eyebrow={howItWorks.hero.eyebrow}
        headline={howItWorks.hero.headline}
        body={howItWorks.hero.body}
      />
      <Steps />
      <WhatIf />
      <FinalCTA />
    </PageShell>
  );
}

function PageHero({
  eyebrow,
  headline,
  body,
}: {
  eyebrow: string;
  headline: string;
  body: string;
}) {
  return (
    <section className="bg-cream pt-[clamp(3rem,8vw,6rem)] pb-[clamp(3rem,8vw,5rem)]">
      <div className="max-w-[1240px] mx-auto px-[clamp(1.25rem,4vw,2.5rem)]">
        <div className="max-w-[760px]">
          <span className="font-body text-[0.8125rem] font-medium uppercase tracking-[0.18em] text-stone mb-6 inline-block">
            {eyebrow}
          </span>
          <h1 className="font-head font-normal text-moss text-[clamp(2.5rem,6vw,4.5rem)] leading-[1.05] tracking-[-0.025em]">
            {headline}
          </h1>
          <p className="text-[clamp(1.125rem,1.7vw,1.3125rem)] leading-[1.6] text-charcoal max-w-[44ch] mt-8">
            {body}
          </p>
        </div>
      </div>
    </section>
  );
}

function Steps() {
  return (
    <section className="bg-cream pb-[clamp(4rem,10vw,8rem)]">
      <div className="max-w-[1240px] mx-auto px-[clamp(1.25rem,4vw,2.5rem)]">
        <ol className="flex flex-col gap-[clamp(2.5rem,5vw,4rem)]">
          {howItWorks.steps.map((step) => (
            <li
              key={step.number}
              className="grid gap-8 min-[800px]:grid-cols-[auto_1fr] min-[800px]:gap-16 bg-paper border border-moss/[0.08] rounded-[24px] p-[clamp(2rem,4vw,3.5rem)]"
            >
              <div className="min-[800px]:max-w-[18rem]">
                <div className="font-head italic text-[clamp(3.5rem,6vw,5rem)] font-normal leading-[0.9] text-terracotta mb-4">
                  {step.number}
                </div>
                <h2 className="font-head text-moss text-[clamp(1.5rem,2.5vw,1.875rem)] font-medium leading-[1.2] max-w-[16ch]">
                  {step.title}
                </h2>
                <p className="font-head italic text-terracotta text-lg mt-3 leading-[1.4] max-w-[26ch]">
                  {step.lead}
                </p>
              </div>
              <div className="flex flex-col gap-5 text-charcoal leading-[1.65] max-w-[60ch]">
                {step.body.map((para, i) => (
                  <p key={i}>{para}</p>
                ))}
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function WhatIf() {
  return (
    <section className="bg-cream-deep py-[clamp(4rem,10vw,8rem)]">
      <div className="max-w-[880px] mx-auto px-[clamp(1.25rem,4vw,2.5rem)]">
        <div className="max-w-[720px] mb-[clamp(2.5rem,5vw,4rem)]">
          <span className="font-body text-[0.8125rem] font-medium uppercase tracking-[0.18em] text-stone mb-6 inline-block">
            What happens if
          </span>
          <h2 className="font-head font-normal text-moss text-[clamp(2rem,5vw,3.5rem)] leading-[1.1] tracking-[-0.02em]">
            {howItWorks.whatHappensIf.title}
          </h2>
        </div>

        <div className="mt-8">
          {howItWorks.whatHappensIf.items.map((item, index) => (
            <details
              key={item.question}
              className={`group border-t border-moss/15 py-7 ${
                index === howItWorks.whatHappensIf.items.length - 1 ? 'border-b' : ''
              }`}
            >
              <summary className="list-none cursor-pointer flex justify-between items-center gap-6 font-head font-medium text-moss text-[clamp(1.125rem,2vw,1.375rem)] leading-[1.3] [&::-webkit-details-marker]:hidden">
                <span>{item.question}</span>
                <span
                  aria-hidden="true"
                  className="flex-shrink-0 inline-flex items-center justify-center w-6 h-6 text-moss text-xl group-open:rotate-45 transition-transform duration-300"
                >
                  +
                </span>
              </summary>
              <div className="mt-4 text-charcoal leading-[1.65] max-w-[60ch]">{item.answer}</div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
