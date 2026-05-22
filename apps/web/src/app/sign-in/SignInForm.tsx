'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { useState } from 'react';
import Link from 'next/link';
import { Eye, EyeOff } from 'lucide-react';
import {
  signInWithPassword,
  type SignInState,
} from '@/lib/auth-password';
import { Button } from '@/components/ui/Button';

const initial: SignInState = { ok: false };

interface Props {
  callbackUrl: string;
  sendMagicLink: (formData: FormData) => Promise<void>;
}

export function SignInForm({ callbackUrl, sendMagicLink }: Props) {
  const [mode, setMode] = useState<'password' | 'magic'>('password');
  const [showPassword, setShowPassword] = useState(false);
  const [state, action] = useFormState(signInWithPassword, initial);

  if (mode === 'magic') {
    return (
      <div className="mt-10">
        <p className="text-charcoal text-lg leading-[1.6]">
          Enter your email and we will send you a one-time link to sign in.
          Useful if you have forgotten your password.
        </p>
        <form action={sendMagicLink} className="mt-6 flex flex-col gap-4">
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
              defaultValue={state.values?.email}
              className="bg-paper border border-moss/15 rounded-lg px-4 py-3 text-charcoal text-base placeholder:text-stone/60 focus:border-moss focus:outline-none focus:ring-2 focus:ring-moss/20"
            />
          </label>
          <input type="hidden" name="redirectTo" value={callbackUrl} />
          <MagicLinkButton />
          <button
            type="button"
            onClick={() => setMode('password')}
            className="text-stone hover:text-moss text-[0.875rem] mt-2"
          >
            ← Back to password sign-in
          </button>
        </form>
        <p className="mt-6 text-sm text-stone leading-[1.55]">
          New to us? You will be signed up automatically with this email.
          The link is valid for 24 hours.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-10">
      <p className="text-charcoal text-lg leading-[1.6] mb-6">
        Sign in with your email and password.
      </p>
      <form action={action} noValidate className="flex flex-col gap-4">
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
            defaultValue={state.values?.email}
            className="bg-paper border border-moss/15 rounded-lg px-4 py-3 text-charcoal text-base placeholder:text-stone/60 focus:border-moss focus:outline-none focus:ring-2 focus:ring-moss/20"
          />
        </label>
        <label className="flex flex-col gap-2">
          <span className="font-body text-sm font-medium text-stone uppercase tracking-[0.08em]">
            Password
          </span>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              name="password"
              required
              autoComplete="current-password"
              className="w-full bg-paper border border-moss/15 rounded-lg px-4 py-3 pr-12 text-charcoal text-base focus:border-moss focus:outline-none focus:ring-2 focus:ring-moss/20"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="absolute inset-y-0 right-3 flex items-center text-stone hover:text-moss"
            >
              {showPassword ? <EyeOff size={18} strokeWidth={1.75} /> : <Eye size={18} strokeWidth={1.75} />}
            </button>
          </div>
        </label>

        <input type="hidden" name="redirectTo" value={callbackUrl} />

        {state.error ? (
          <p className="bg-terracotta/10 border-l-4 border-terracotta px-4 py-3 rounded-r text-[0.9375rem] text-charcoal">
            {state.error}
          </p>
        ) : null}

        <PasswordButton />

        <div className="flex items-center justify-between text-[0.875rem] mt-2">
          <button
            type="button"
            onClick={() => setMode('magic')}
            className="text-moss hover:text-moss-deep underline"
          >
            Email me a one-time link instead
          </button>
          <Link
            href="/sign-in/forgot-password"
            className="text-stone hover:text-moss"
          >
            Forgot password?
          </Link>
        </div>
      </form>

      <p className="mt-8 text-sm text-stone leading-[1.55]">
        Not signed up yet? Use the{' '}
        <button
          type="button"
          onClick={() => setMode('magic')}
          className="text-moss hover:text-moss-deep underline"
        >
          one-time-link option
        </button>{' '}
        to create your account. You can set a password once you're in.
      </p>
    </div>
  );
}

function PasswordButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="!px-6 !py-3.5">
      {pending ? 'Signing in…' : 'Sign in'}
    </Button>
  );
}

function MagicLinkButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="!px-6 !py-3.5">
      {pending ? 'Sending…' : 'Email me a sign-in link'}
    </Button>
  );
}
