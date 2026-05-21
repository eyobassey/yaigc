import Link from 'next/link';
import { brand } from '@igc/content';

/**
 * Brand-aligned 404. Several footer / nav links point at routes that have
 * not been built yet (Sprint 1 work: /how-it-works, /pricing, /safeguarding,
 * /about, /companions/join, /privacy, /terms, /accessibility). Until those
 * exist, this page catches the visitor and points them back home.
 */

export const metadata = {
  title: 'Not found  ·  You Are In Good Company',
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-20 bg-cream">
      <div className="max-w-xl text-center">
        <p className="font-body text-xs uppercase tracking-[0.18em] text-stone mb-6">
          404
        </p>
        <h1 className="font-head font-normal text-moss text-[clamp(2.5rem,6vw,4rem)] leading-[1.05] tracking-[-0.02em]">
          We could not find that page.
        </h1>
        <p className="font-head italic text-terracotta text-2xl mt-4">
          Some of our pages are still being written.
        </p>
        <p className="mt-8 text-charcoal leading-relaxed">
          If you came here from a link on our site, the page you are after
          is being built. In the meantime, the home page has everything you
          need to start a conversation with us.
        </p>
        <div className="mt-10 flex flex-wrap gap-4 justify-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center px-9 py-[1.125rem] rounded-full bg-moss text-cream text-base font-medium hover:bg-moss-dark transition-all duration-200 hover:shadow-lg hover:-translate-y-px"
          >
            Back to home
          </Link>
          <a
            href={`tel:${brand.supportPhone.replace(/\s/g, '')}`}
            className="inline-flex items-center justify-center px-9 py-[1.125rem] rounded-full border border-moss text-moss text-base font-medium hover:bg-moss hover:text-cream transition-colors"
          >
            Or call us on {brand.supportPhone}
          </a>
        </div>
        <p className="mt-16 font-head italic text-terracotta text-lg">
          {brand.closingLine}
        </p>
      </div>
    </main>
  );
}
