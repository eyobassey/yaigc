import type { Metadata } from 'next';
import { brand } from '@igc/content';
import { PageShell } from '@/components/marketing/PageShell';
import { Button } from '@/components/ui/Button';

export const metadata: Metadata = {
  title: 'Message received',
  description: 'Thank you for getting in touch. We will be in touch within a working day.',
  robots: { index: false, follow: true },
};

export default function ContactThanksPage() {
  return (
    <PageShell>
      <section className="bg-cream min-h-[calc(100vh-200px)] flex items-center py-[clamp(4rem,10vw,8rem)]">
        <div className="max-w-[640px] mx-auto px-[clamp(1.25rem,4vw,2.5rem)] text-center">
          <span className="font-body text-[0.8125rem] font-medium uppercase tracking-[0.18em] text-stone mb-6 inline-block">
            Message received
          </span>
          <h1 className="font-head font-normal text-moss text-[clamp(2rem,5vw,3rem)] leading-[1.1] tracking-[-0.025em]">
            Thank you.
          </h1>
          <p className="font-head italic text-terracotta text-[clamp(1.25rem,2vw,1.5rem)] leading-[1.4] mt-6 max-w-[44ch] mx-auto">
            We will be in touch within a working day.
          </p>
          <p className="text-charcoal text-lg leading-[1.65] mt-8 max-w-[48ch] mx-auto">
            One of our team will call you. The first call is twenty minutes.
            We will listen more than we talk and tell you honestly whether
            we are the right fit.
          </p>
          <div className="mt-10 flex flex-wrap gap-4 justify-center">
            <Button href="/">Back to home</Button>
            <Button href={`tel:${brand.supportPhone.replace(/\s/g, '')}`} variant="outline">
              Or call us on {brand.supportPhone}
            </Button>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
