import Link from 'next/link';
import { brand, home } from '@igc/content';

export function FinalCTA() {
  return (
    <section id="contact" className="bg-cream py-[clamp(4rem,10vw,8rem)] text-center">
      <div className="max-w-[660px] mx-auto px-[clamp(1.25rem,4vw,2.5rem)]">
        <span className="font-body text-[0.8125rem] font-medium uppercase tracking-[0.18em] text-stone mb-6 inline-block">
          Ready to start?
        </span>
        <h2 className="font-head font-normal text-moss text-[clamp(2rem,5vw,3.5rem)] leading-[1.1] tracking-[-0.02em] mb-6">
          A twenty minute call.
          <br />
          <em className="italic text-terracotta">No commitment.</em>
        </h2>
        <p className="text-charcoal text-lg leading-[1.6] max-w-[44ch] mx-auto mb-10">
          {home.finalCta.body}
        </p>
        <div className="flex flex-wrap gap-4 justify-center">
          <Link
            href="/#contact"
            className="inline-flex items-center justify-center px-9 py-[1.125rem] rounded-full bg-moss text-cream text-base font-medium hover:bg-moss-dark transition-all duration-200 hover:shadow-lg hover:-translate-y-px"
          >
            {home.finalCta.primary}
          </Link>
          <a
            href={`tel:${brand.supportPhone.replace(/\s/g, '')}`}
            className="inline-flex items-center justify-center px-9 py-[1.125rem] rounded-full border border-moss text-moss text-base font-medium hover:bg-moss hover:text-cream transition-colors"
          >
            Or call us on {brand.supportPhone}
          </a>
        </div>
      </div>
    </section>
  );
}
