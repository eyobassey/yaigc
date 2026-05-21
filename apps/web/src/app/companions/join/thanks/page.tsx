import type { Metadata } from 'next';
import Link from 'next/link';
import { brand } from '@igc/content';
import { PageShell } from '@/components/marketing/PageShell';

export const metadata: Metadata = {
  title: 'Application received',
  description: 'We will be in touch within a working day.',
  robots: { index: false, follow: true },
};

export default function CompanionApplicationThanksPage() {
  return (
    <PageShell>
      <section className="bg-cream min-h-[calc(100vh-200px)] flex items-center py-[clamp(4rem,10vw,8rem)]">
        <div className="max-w-[640px] mx-auto px-[clamp(1.25rem,4vw,2.5rem)] text-center">
          <span className="font-body text-[0.8125rem] font-medium uppercase tracking-[0.18em] text-stone mb-6 inline-block">
            Application received
          </span>
          <h1 className="font-head font-normal text-moss text-[clamp(2rem,5vw,3rem)] leading-[1.1] tracking-[-0.025em]">
            Thank you.
          </h1>
          <p className="font-head italic text-terracotta text-[clamp(1.25rem,2vw,1.5rem)] leading-[1.4] mt-6 max-w-[44ch] mx-auto">
            We will be in touch within a working day.
          </p>
          <p className="text-charcoal text-lg leading-[1.65] mt-8 max-w-[48ch] mx-auto">
            We have sent a copy of what you told us to your email. If you do
            not see it, please check your spam folder. We respond to every
            application, even the ones we say no to.
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
        </div>
      </section>
    </PageShell>
  );
}
