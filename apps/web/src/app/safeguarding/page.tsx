import type { Metadata } from 'next';
import { safeguarding } from '@igc/content';
import { PageShell } from '@/components/marketing/PageShell';
import { FinalCTA } from '@/components/marketing/FinalCTA';

export const metadata: Metadata = {
  title: 'Safeguarding',
  description: safeguarding.hero.body,
};

export default function SafeguardingPage() {
  return (
    <PageShell>
      <SafeguardingHero />
      <Pillars />
      <RaiseAConcern />
      <FinalCTA />
    </PageShell>
  );
}

function SafeguardingHero() {
  return (
    <section className="bg-cream pt-[clamp(3rem,8vw,6rem)] pb-[clamp(3rem,8vw,5rem)]">
      <div className="max-w-[1240px] mx-auto px-[clamp(1.25rem,4vw,2.5rem)]">
        <div className="max-w-[760px]">
          <span className="font-body text-[0.8125rem] font-medium uppercase tracking-[0.18em] text-stone mb-6 inline-block">
            {safeguarding.hero.eyebrow}
          </span>
          <h1 className="font-head font-normal text-moss text-[clamp(2.5rem,6vw,4.5rem)] leading-[1.05] tracking-[-0.025em]">
            {safeguarding.hero.headline}
          </h1>
          <p className="text-[clamp(1.125rem,1.7vw,1.3125rem)] leading-[1.6] text-charcoal max-w-[44ch] mt-8">
            {safeguarding.hero.body}
          </p>
        </div>
      </div>
    </section>
  );
}

function Pillars() {
  return (
    <section className="bg-cream pb-[clamp(4rem,8vw,6rem)]">
      <div className="max-w-[1240px] mx-auto px-[clamp(1.25rem,4vw,2.5rem)]">
        <div className="grid gap-6 min-[700px]:grid-cols-2 min-[1000px]:grid-cols-3 min-[700px]:gap-8">
          {safeguarding.pillars.map((pillar) => (
            <article
              key={pillar.title}
              className="bg-paper border border-moss/[0.08] rounded-[20px] p-[clamp(1.75rem,2.5vw,2.25rem)]"
            >
              <h2 className="font-head text-moss text-[1.375rem] font-medium leading-[1.25] mb-4 max-w-[18ch]">
                {pillar.title}
              </h2>
              <p className="text-charcoal leading-[1.6]">{pillar.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function RaiseAConcern() {
  return (
    <section className="bg-moss text-cream py-[clamp(4rem,10vw,7rem)]">
      <div className="max-w-[760px] mx-auto px-[clamp(1.25rem,4vw,2.5rem)]">
        <span className="font-body text-[0.8125rem] font-medium uppercase tracking-[0.18em] text-terracotta-light mb-6 inline-block">
          If something is not right
        </span>
        <h2 className="font-head font-normal text-cream text-[clamp(2rem,5vw,3rem)] leading-[1.1] tracking-[-0.02em]">
          {safeguarding.raiseAConcern.title}
        </h2>
        <p className="text-cream/85 leading-[1.65] mt-6 max-w-[58ch]">
          {safeguarding.raiseAConcern.body}
        </p>
        <div className="mt-10 flex flex-wrap gap-4">
          <a
            href={`mailto:${safeguarding.raiseAConcern.contactEmail}`}
            className="inline-flex items-center justify-center px-6 py-3 rounded-full bg-cream text-moss text-[0.95rem] font-medium hover:bg-cream-deep transition-colors"
          >
            {safeguarding.raiseAConcern.contactLabel}
          </a>
          <a
            href={`tel:${safeguarding.raiseAConcern.phone.replace(/\s/g, '')}`}
            className="inline-flex items-center justify-center px-6 py-3 rounded-full border border-cream text-cream text-[0.95rem] font-medium hover:bg-cream hover:text-moss transition-colors"
          >
            {safeguarding.raiseAConcern.phoneLabel} {safeguarding.raiseAConcern.phone}
          </a>
        </div>
        <p className="mt-8 text-cream/65 text-sm">
          {safeguarding.raiseAConcern.contactEmail}
        </p>
      </div>
    </section>
  );
}
