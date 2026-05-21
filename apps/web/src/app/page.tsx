import { PageShell } from '@/components/marketing/PageShell';
import { Hero } from '@/components/marketing/Hero';
import { TrustStrip } from '@/components/marketing/TrustStrip';
import { Pillars } from '@/components/marketing/Pillars';
import { HowItWorks } from '@/components/marketing/HowItWorks';
import { FounderNote } from '@/components/marketing/FounderNote';
import { VisitGallery } from '@/components/marketing/VisitGallery';
import { PricingTeaser } from '@/components/marketing/PricingTeaser';
import { FAQ } from '@/components/marketing/FAQ';
import { FinalCTA } from '@/components/marketing/FinalCTA';

export default function HomePage() {
  return (
    <PageShell>
      <Hero />
      <TrustStrip />
      <Pillars />
      <HowItWorks />
      <FounderNote />
      <VisitGallery />
      <PricingTeaser />
      <FAQ />
      <FinalCTA />
    </PageShell>
  );
}
