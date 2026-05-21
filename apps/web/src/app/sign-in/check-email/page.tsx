import type { Metadata } from 'next';
import Link from 'next/link';
import { PageShell } from '@/components/marketing/PageShell';

export const metadata: Metadata = {
  title: 'Check your email',
  description: 'A sign-in link is on its way.',
  robots: { index: false, follow: false },
};

export default function CheckEmailPage() {
  return (
    <PageShell>
      <section className="bg-cream min-h-[calc(100vh-200px)] flex items-center py-[clamp(4rem,10vw,8rem)]">
        <div className="max-w-[560px] mx-auto px-[clamp(1.25rem,4vw,2.5rem)] text-center">
          <span className="font-body text-[0.8125rem] font-medium uppercase tracking-[0.18em] text-stone mb-6 inline-block">
            Almost there
          </span>
          <h1 className="font-head font-normal text-moss text-[clamp(2rem,5vw,3rem)] leading-[1.1] tracking-[-0.025em]">
            Check your email.
          </h1>
          <p className="font-head italic text-terracotta text-[clamp(1.25rem,2vw,1.5rem)] leading-[1.4] mt-6">
            We have sent you a sign-in link.
          </p>
          <p className="text-charcoal text-lg leading-[1.65] mt-8 max-w-[44ch] mx-auto">
            Click the link in the email to sign in. The link works only once
            and expires in 24 hours. You can close this tab if you like.
          </p>
          <p className="mt-10 text-sm text-stone leading-[1.55]">
            Not in your inbox? Check your spam folder. If it is still missing,{' '}
            <Link href="/sign-in" className="link">
              try again
            </Link>
            .
          </p>
        </div>
      </section>
    </PageShell>
  );
}
