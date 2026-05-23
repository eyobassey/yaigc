import { brand } from '@igc/content';
import { faqTeaser } from '@/content/landing-extras';
import { PageShell } from '@/components/marketing/PageShell';
import { Hero } from '@/components/marketing/Hero';
import { TrustStrip } from '@/components/marketing/TrustStrip';
import { Pillars } from '@/components/marketing/Pillars';
import { HowItWorks } from '@/components/marketing/HowItWorks';
import { FounderNote } from '@/components/marketing/FounderNote';
import { PhilosophyLine } from '@/components/marketing/PhilosophyLine';
import { VisitGallery } from '@/components/marketing/VisitGallery';
import { PricingTeaser } from '@/components/marketing/PricingTeaser';
import { FAQ } from '@/components/marketing/FAQ';
import { FinalCTA } from '@/components/marketing/FinalCTA';

// FAQPage schema for the home page FAQ section. Google sometimes shows
// the questions as rich snippets directly in search results.
const faqPageJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  '@id': `https://${brand.domain}/#faq`,
  mainEntity: faqTeaser.items.map((item) => ({
    '@type': 'Question',
    name: item.question,
    acceptedAnswer: {
      '@type': 'Answer',
      text: item.answer,
    },
  })),
};

export default function HomePage() {
  return (
    <PageShell>
      <Hero />
      <TrustStrip />
      <Pillars />
      <HowItWorks />
      <FounderNote />
      <PhilosophyLine />
      <VisitGallery />
      <PricingTeaser />
      <FAQ />
      <FinalCTA />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqPageJsonLd) }}
      />
    </PageShell>
  );
}
