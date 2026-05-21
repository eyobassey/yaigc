import type { Metadata } from 'next';
import { signIn } from '@/lib/auth';
import { PageShell } from '@/components/marketing/PageShell';
import { Button } from '@/components/ui/Button';

export const metadata: Metadata = {
  title: 'Sign in',
  description: 'Sign in to your account with a one-time link sent to your email.',
  robots: { index: false, follow: false },
};

export default function SignInPage({
  searchParams,
}: {
  searchParams: { error?: string; callbackUrl?: string };
}) {
  const { error, callbackUrl } = searchParams;

  return (
    <PageShell>
      <section className="bg-cream min-h-[calc(100vh-200px)] flex items-center py-[clamp(4rem,10vw,8rem)]">
        <div className="max-w-[480px] mx-auto px-[clamp(1.25rem,4vw,2.5rem)] w-full">
          <span className="font-body text-[0.8125rem] font-medium uppercase tracking-[0.18em] text-stone mb-6 inline-block">
            Sign in
          </span>
          <h1 className="font-head font-normal text-moss text-[clamp(2rem,5vw,3rem)] leading-[1.1] tracking-[-0.025em]">
            Welcome back.
          </h1>
          <p className="text-charcoal text-lg leading-[1.6] mt-6">
            Enter your email and we will send you a one-time link to sign in.
            No password to remember.
          </p>

          {error ? (
            <div className="mt-6 bg-terracotta/10 border-l-4 border-terracotta px-4 py-3 rounded-r text-[0.95rem] text-charcoal">
              We could not sign you in. Please try again, or email{' '}
              <a href="mailto:hello@youareingoodcompany.co.uk" className="link">
                hello@youareingoodcompany.co.uk
              </a>{' '}
              if the problem keeps happening.
            </div>
          ) : null}

          <form
            action={async (formData) => {
              'use server';
              await signIn('nodemailer', formData);
            }}
            className="mt-10 flex flex-col gap-4"
          >
            <label className="flex flex-col gap-2">
              <span className="font-body text-sm font-medium text-stone uppercase tracking-[0.08em]">
                Email
              </span>
              <input
                type="email"
                name="email"
                required
                autoComplete="email"
                placeholder="you@example.com"
                className="bg-paper border border-moss/15 rounded-lg px-4 py-3 text-charcoal text-base placeholder:text-stone/60 focus:border-moss focus:outline-none focus:ring-2 focus:ring-moss/20"
              />
            </label>

            {/* Auth.js v5 reads `redirectTo` from formData. Older Next.js
                conventions used `callbackUrl` so we accept that via the URL
                search param and forward it under the new name. */}
            {callbackUrl ? (
              <input type="hidden" name="redirectTo" value={callbackUrl} />
            ) : null}

            <Button type="submit" className="!px-6 !py-3.5">
              Email me a sign-in link
            </Button>
          </form>

          <p className="mt-8 text-sm text-stone leading-[1.55]">
            New to us? You will be signed up automatically with this email. The
            link is valid for 24 hours.
          </p>
        </div>
      </section>
    </PageShell>
  );
}
