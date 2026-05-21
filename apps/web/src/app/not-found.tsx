import { brand } from '@igc/content';
import { Button } from '@/components/ui/Button';

/**
 * Brand-aligned 404. Several footer / nav links point at routes that have
 * not been built yet (Sprint 1 work: /how-it-works, /pricing, /safeguarding,
 * /about, /companions/join, /privacy, /terms, /accessibility). Until those
 * exist, this page catches the visitor and points them back home.
 */

export const metadata = {
  title: 'Not found',
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
          <Button href="/">Back to home</Button>
          <Button href={`tel:${brand.supportPhone.replace(/\s/g, '')}`} variant="outline">
            Or call us on {brand.supportPhone}
          </Button>
        </div>
        <p className="mt-16 font-head italic text-terracotta text-lg">
          {brand.closingLine}
        </p>
      </div>
    </main>
  );
}
