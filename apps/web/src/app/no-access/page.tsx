import type { Metadata } from 'next';
import { brand } from '@igc/content';
import { PageShell } from '@/components/marketing/PageShell';
import { Button } from '@/components/ui/Button';

export const metadata: Metadata = {
  title: 'Access denied',
  description: 'You do not have access to this area.',
  robots: { index: false, follow: false },
};

export default function NoAccessPage() {
  return (
    <PageShell>
      <section className="bg-cream min-h-[calc(100vh-200px)] flex items-center py-[clamp(4rem,10vw,8rem)]">
        <div className="max-w-[560px] mx-auto px-[clamp(1.25rem,4vw,2.5rem)] text-center">
          <span className="font-body text-[0.8125rem] font-medium uppercase tracking-[0.18em] text-stone mb-6 inline-block">
            Access denied
          </span>
          <h1 className="font-head font-normal text-moss text-[clamp(2rem,5vw,3rem)] leading-[1.1] tracking-[-0.025em]">
            You do not have access to this area.
          </h1>
          <p className="text-charcoal text-lg leading-[1.65] mt-8 max-w-[44ch] mx-auto">
            This part of the site is for our internal team. If you think you
            should be able to reach it, please get in touch.
          </p>
          <div className="mt-10 flex flex-wrap gap-4 justify-center">
            <Button href="/">Back to home</Button>
            <Button href={`mailto:${brand.supportEmail}`} variant="outline">
              Email us
            </Button>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
