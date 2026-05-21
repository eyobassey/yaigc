import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Check } from 'lucide-react';
import { home } from '@igc/content';

export function Hero() {
  return (
    <section className="relative overflow-hidden pt-[clamp(3rem,10vw,7rem)] pb-[clamp(4rem,12vw,9rem)]">
      {/* Decorative radial glows */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-[20%] -right-[10%] w-[600px] h-[600px] rounded-full z-0"
        style={{
          background:
            'radial-gradient(circle at center, rgba(201, 123, 95, 0.08), transparent 70%)',
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-[20%] -left-[10%] w-[500px] h-[500px] rounded-full z-0"
        style={{
          background:
            'radial-gradient(circle at center, rgba(163, 184, 163, 0.15), transparent 60%)',
        }}
      />

      <div className="relative z-10 max-w-[1240px] mx-auto px-[clamp(1.25rem,4vw,2.5rem)] grid gap-[clamp(3rem,6vw,5rem)] items-center min-[1000px]:grid-cols-[1.05fr_1fr]">
        {/* Left: headline + body + CTAs */}
        <div>
          <span className="font-body text-[0.8125rem] font-medium uppercase tracking-[0.18em] text-stone mb-6 inline-block">
            {home.hero.eyebrow}
          </span>

          <h1 className="font-head font-normal text-moss text-[clamp(2.5rem,7vw,5.5rem)] leading-[1.05] tracking-[-0.025em]">
            You can&apos;t always be there.
            <br />
            You can be sure they&apos;re
            <br />
            <em className="italic text-terracotta not-italic">
              <span className="italic">in good company.</span>
            </em>
          </h1>

          <p className="text-[clamp(1.125rem,1.7vw,1.3125rem)] leading-[1.6] text-charcoal max-w-[42ch] mt-8">
            {home.hero.body}
          </p>

          <div className="flex flex-wrap gap-4 mt-10">
            <Link
              href="/contact"
              className="inline-flex items-center justify-center px-9 py-[1.125rem] rounded-full bg-moss text-cream text-base font-medium hover:bg-moss-dark transition-all duration-200 hover:shadow-lg hover:-translate-y-px"
            >
              {home.hero.primaryCta}
            </Link>
            <Link
              href="/how-it-works"
              className="inline-flex items-center justify-center px-4 py-[1.125rem] text-moss text-base font-medium hover:text-terracotta transition-colors"
            >
              {home.hero.secondaryCta}
              <ArrowRight size={18} strokeWidth={1.75} aria-hidden="true" className="ml-2" />
            </Link>
          </div>

          <p className="mt-8 text-sm text-stone flex items-center gap-2.5">
            <Check size={16} strokeWidth={2} aria-hidden="true" className="text-moss flex-shrink-0" />
            {home.hero.reassurance}
          </p>
        </div>

        {/* Right: portrait card + quote */}
        <HeroPortrait />
      </div>
    </section>
  );
}

function HeroPortrait() {
  return (
    <div className="relative">
      <div className="bg-paper rounded-[24px] p-6 shadow-[0_1px_2px_rgba(0,0,0,0.03),0_20px_60px_rgba(60,90,58,0.08)] -rotate-1 hover:rotate-0 transition-transform duration-500 max-w-[420px] mx-auto">
        <div className="aspect-square rounded-[8px] relative overflow-hidden bg-sage/20">
          <Image
            src="/photos/margaret-and-sarah.jpeg"
            alt="Two women laughing together over mugs of tea on a sofa."
            width={392}
            height={396}
            priority
            sizes="(min-width: 1000px) 420px, (min-width: 640px) 60vw, 90vw"
            className="w-full h-full object-cover"
          />
        </div>

        <div className="flex justify-between items-center mt-4 pt-4 border-t border-moss/10">
          <span className="font-head text-lg text-moss font-medium">Margaret &amp; Sarah</span>
          <span className="text-xs text-stone tracking-wider uppercase">Every Wednesday, 2pm</span>
        </div>
      </div>

      <div
        className="relative min-[1000px]:absolute min-[1000px]:-bottom-10 min-[1000px]:-left-6 mt-[-1rem] min-[1000px]:mt-0 bg-terracotta text-cream px-6 py-5 rounded-[8px] max-w-[280px] min-[1000px]:rotate-2 shadow-[0_12px_32px_rgba(201,123,95,0.25)]"
      >
        <p className="font-head italic text-[1.0625rem] leading-[1.4]">
          &ldquo;I read Sarah&apos;s note about my mum on the train home. It is the highlight of my
          Wednesday.&rdquo;
        </p>
        <p className="font-body not-italic text-xs tracking-wider uppercase mt-2 opacity-90">
          Helen, Margaret&apos;s daughter
        </p>
      </div>
    </div>
  );
}
