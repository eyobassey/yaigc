import type { Metadata } from 'next';
import { signIn } from '@/lib/auth';
import { PageShell } from '@/components/marketing/PageShell';
import { SignInForm } from './SignInForm';

export const metadata: Metadata = {
  title: 'Sign in',
  description: 'Sign in to your account with a password or a one-time link.',
  robots: { index: false, follow: false },
};

export default function SignInPage({
  searchParams,
}: {
  searchParams: { error?: string; callbackUrl?: string };
}) {
  const { error, callbackUrl } = searchParams;

  // Magic-link sign-in is a server action; we pass it to the client
  // form so the form can hand off to it when the user picks "send a
  // one-time link" instead of password.
  async function sendMagicLink(formData: FormData) {
    'use server';
    await signIn('nodemailer', formData);
  }

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

          {error ? (
            <div className="mt-6 bg-terracotta/10 border-l-4 border-terracotta px-4 py-3 rounded-r text-[0.95rem] text-charcoal">
              We could not sign you in. Please try again, or email{' '}
              <a href="mailto:hello@youareingoodcompany.co.uk" className="link">
                hello@youareingoodcompany.co.uk
              </a>{' '}
              if the problem keeps happening.
            </div>
          ) : null}

          <SignInForm
            callbackUrl={callbackUrl ?? '/me'}
            sendMagicLink={sendMagicLink}
          />
        </div>
      </section>
    </PageShell>
  );
}
