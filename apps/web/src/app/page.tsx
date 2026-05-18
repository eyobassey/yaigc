import { brand } from '@igc/content';
import { Nav } from '@/components/marketing/Nav';
import { Hero } from '@/components/marketing/Hero';
import { TrustStrip } from '@/components/marketing/TrustStrip';
import { Pillars } from '@/components/marketing/Pillars';
import { HowItWorks } from '@/components/marketing/HowItWorks';
import { FounderNote } from '@/components/marketing/FounderNote';
import { VisitGallery } from '@/components/marketing/VisitGallery';
import { PricingTeaser } from '@/components/marketing/PricingTeaser';
import { FAQ } from '@/components/marketing/FAQ';
import { FinalCTA } from '@/components/marketing/FinalCTA';
import { SiteFooter } from '@/components/marketing/SiteFooter';

export default function HomePage() {
  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[999] focus:bg-moss focus:text-cream focus:px-5 focus:py-3 focus:rounded font-medium"
      >
        Skip to content
      </a>
      <Nav />
      <main id="main">
        <Hero />
        <TrustStrip />
        <Pillars />
        <HowItWorks />
        <FounderNote />
        <VisitGallery />
        <PricingTeaser />
        <FAQ />
        <FinalCTA />
      </main>
      <SiteFooter />
      <span className="sr-only">{brand.closingLine}</span>
    </>
  );
}
