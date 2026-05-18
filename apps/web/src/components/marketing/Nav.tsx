'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { brand, nav } from '@igc/content';

export function Nav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <nav
      className={`sticky top-0 z-50 backdrop-blur-md backdrop-saturate-150 bg-cream/90 transition-colors duration-300 ${
        scrolled ? 'border-b border-moss/10' : 'border-b border-transparent'
      }`}
      aria-label="Primary"
    >
      <div className="max-w-[1240px] mx-auto px-[clamp(1.25rem,4vw,2.5rem)] flex items-center justify-between gap-8 py-5">
        <Link
          href="/"
          className="font-head text-xl sm:text-2xl font-medium text-moss tracking-tight leading-none flex items-baseline gap-1 whitespace-nowrap"
        >
          <span
            aria-hidden="true"
            className="inline-block w-2 h-2 rounded-full bg-terracotta mr-1.5 -translate-y-0.5"
          />
          <span>{brand.fullName}</span>
        </Link>

        <ul className="hidden min-[900px]:flex gap-8 text-[0.95rem] font-medium">
          <li>
            <Link href="/how-it-works" className="text-charcoal hover:text-moss transition-colors">
              {nav.primary.howItWorks}
            </Link>
          </li>
          <li>
            <Link href="/pricing" className="text-charcoal hover:text-moss transition-colors">
              {nav.primary.pricing}
            </Link>
          </li>
          <li>
            <Link href="/safeguarding" className="text-charcoal hover:text-moss transition-colors">
              {nav.secondary.safeguarding}
            </Link>
          </li>
          <li>
            <Link href="/faq" className="text-charcoal hover:text-moss transition-colors">
              {nav.secondary.faq}
            </Link>
          </li>
        </ul>

        <div className="flex items-center gap-4">
          <a
            href={`tel:${brand.supportPhone.replace(/\s/g, '')}`}
            className="hidden min-[700px]:flex items-center gap-2 text-[0.95rem] text-charcoal font-medium hover:text-moss transition-colors"
          >
            <span
              aria-hidden="true"
              className="inline-block w-1.5 h-1.5 rounded-full bg-sage animate-pulse"
            />
            <span>{brand.supportPhone}</span>
          </a>
          <Link
            href="/contact"
            className="inline-flex items-center justify-center px-4 py-2.5 sm:px-6 sm:py-3 rounded-full bg-moss text-cream text-sm sm:text-[0.95rem] font-medium hover:bg-moss-dark transition-all duration-200 hover:shadow-lg hover:-translate-y-px"
          >
            {nav.cta.primary}
          </Link>
        </div>
      </div>
    </nav>
  );
}
