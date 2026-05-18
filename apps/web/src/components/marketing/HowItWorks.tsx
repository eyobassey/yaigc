import Link from 'next/link';
import { home } from '@igc/content';

export function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="relative overflow-hidden py-[clamp(4rem,10vw,8rem)] bg-moss text-cream"
    >
      {/* Decorative gradients */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(circle at 80% 20%, rgba(201, 123, 95, 0.12), transparent 50%), radial-gradient(circle at 10% 80%, rgba(250, 248, 243, 0.05), transparent 50%)',
        }}
      />

      <div className="relative z-10 max-w-[1240px] mx-auto px-[clamp(1.25rem,4vw,2.5rem)]">
        <div className="max-w-[720px] mb-[clamp(3rem,6vw,5rem)]">
          <span className="font-body text-[0.8125rem] font-medium uppercase tracking-[0.18em] text-terracotta-light mb-6 inline-block">
            How it works
          </span>
          <h2 className="font-head font-normal text-cream text-[clamp(2rem,5vw,3.5rem)] leading-[1.1] tracking-[-0.02em] max-w-[18ch]">
            Companionship,
            <br />
            organised <em className="italic text-terracotta-light">the way it should be.</em>
          </h2>
        </div>

        <div className="mt-[clamp(3rem,6vw,5rem)] grid gap-[clamp(2.5rem,5vw,4rem)] min-[800px]:grid-cols-3 min-[800px]:gap-12">
          {home.howItWorksSummary.steps.map((step) => (
            <article key={step.number} className="relative">
              <div className="font-head italic text-[clamp(3.5rem,6vw,5rem)] font-normal leading-[0.9] text-terracotta-light/85 mb-6">
                {step.number}
              </div>
              <h3 className="font-head text-cream text-2xl font-medium mb-4 max-w-[16ch]">
                {step.title}
              </h3>
              <p className="text-cream/85 leading-[1.6] max-w-[32ch]">{step.body}</p>
            </article>
          ))}
        </div>

        <div className="mt-[clamp(3rem,6vw,5rem)] flex flex-wrap gap-4 items-center">
          <Link
            href="/contact"
            className="inline-flex items-center justify-center px-9 py-[1.125rem] rounded-full border border-cream text-cream text-base font-medium hover:bg-cream hover:text-moss transition-colors"
          >
            Start with a call
          </Link>
          <span className="text-cream/70 text-[0.95rem]">Twenty minutes. No commitment.</span>
        </div>
      </div>
    </section>
  );
}
