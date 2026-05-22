import type { Metadata } from 'next';
import { signIn } from '@/lib/auth';
import { PageShell } from '@/components/marketing/PageShell';
import { Button } from '@/components/ui/Button';

export const metadata: Metadata = {
  title: 'Forgot password',
  description: 'Reset your password via a one-time email link.',
  robots: { index: false, follow: false },
};

// Forgot-password = "send a one-time sign-in link, after which you can
// set a new password from the account security section." No separate
// reset token table; we lean on the existing magic-link flow with a
// callback URL that lands the user where they need to be.

export default function ForgotPasswordPage() {
  return (
    <PageShell>
      <section className="bg-cream min-h-[calc(100vh-200px)] flex items-center py-[clamp(4rem,10vw,8rem)]">
        <div className="max-w-[480px] mx-auto px-[clamp(1.25rem,4vw,2.5rem)] w-full">
          <span className="font-body text-[0.8125rem] font-medium uppercase tracking-[0.18em] text-stone mb-6 inline-block">
            Forgot password
          </span>
          <h1 className="font-head font-normal text-moss text-[clamp(2rem,5vw,3rem)] leading-[1.1] tracking-[-0.025em]">
            We'll email you a link.
          </h1>
          <p className="text-charcoal text-lg leading-[1.6] mt-6">
            Enter your email below. We will send you a one-time link to sign
            in. Once you are signed in, head to your account security
            section to set a new password.
          </p>

          <form
            action={async (formData) => {
              'use server';
              // Land them on /me - their portal home - and they can find
              // the security section from there. Account pages already
              // surface "set / change password" prominently.
              formData.set('redirectTo', '/me');
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
            <Button type="submit" className="!px-6 !py-3.5">
              Email me a sign-in link
            </Button>
          </form>

          <p className="mt-8 text-sm text-stone leading-[1.55]">
            Remembered it?{' '}
            <a href="/sign-in" className="link">
              Back to sign-in
            </a>
            .
          </p>
        </div>
      </section>
    </PageShell>
  );
}
