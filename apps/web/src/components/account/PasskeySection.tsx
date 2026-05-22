'use client';

import { useState, useEffect } from 'react';
import {
  Fingerprint,
  Trash2,
  Smartphone,
  Key as KeyIcon,
} from 'lucide-react';
import {
  startRegistration,
  browserSupportsWebAuthn,
} from '@simplewebauthn/browser';
import { removePasskey } from '@/lib/passkey-actions';

interface Passkey {
  id: string;
  nickname: string | null;
  credentialDeviceType: string;
  credentialBackedUp: boolean;
  createdAt: string;
  lastUsedAt: string | null;
}

interface Props {
  passkeys: Passkey[];
}

type State = 'idle' | 'naming' | 'registering' | 'success' | 'error';

export function PasskeySection({ passkeys }: Props) {
  const [supported, setSupported] = useState<boolean | null>(null);
  const [state, setState] = useState<State>('idle');
  const [nickname, setNickname] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSupported(browserSupportsWebAuthn());
  }, []);

  async function handleRegister() {
    setError(null);
    setState('registering');
    try {
      const optsRes = await fetch('/api/auth/webauthn/registration/options', {
        method: 'POST',
      });
      if (!optsRes.ok) throw new Error('Could not start registration.');
      const options = await optsRes.json();

      const attestation = await startRegistration({ optionsJSON: options });

      const verifyRes = await fetch('/api/auth/webauthn/registration/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ response: attestation, nickname: nickname.trim() || null }),
      });
      const verifyBody = await verifyRes.json().catch(() => ({}));
      if (!verifyRes.ok || !verifyBody.ok) {
        throw new Error(verifyBody.error || 'Could not save the passkey.');
      }
      setState('success');
      setNickname('');
      // Reload so the new passkey appears in the list. revalidatePath
      // on the server should already mark the page stale, but a full
      // refresh is the cleanest UX here.
      window.location.reload();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Could not register the passkey.';
      // User cancelling the platform sheet shows up as a DOMException
      // with name AbortError or NotAllowedError; treat those quietly.
      if (
        err instanceof DOMException &&
        ['AbortError', 'NotAllowedError'].includes(err.name)
      ) {
        setState('idle');
        return;
      }
      setError(message);
      setState('error');
    }
  }

  return (
    <section className="bg-paper border border-moss/[0.08] rounded-[12px] p-5 sm:p-6 mb-6">
      <h2 className="font-body text-[0.7rem] font-medium uppercase tracking-[0.1em] text-stone mb-3 flex items-center gap-2">
        <Fingerprint size={12} strokeWidth={1.75} aria-hidden="true" />
        Passkeys
      </h2>
      <p className="text-charcoal text-[0.9375rem] leading-[1.55] mb-4">
        Skip the password entirely. Use Face ID, Touch ID, Windows Hello,
        Android biometrics, or a hardware key. You can register one
        passkey per device.
      </p>

      {supported === false ? (
        <p className="bg-amber-50/60 border-l-4 border-amber-300 px-4 py-3 rounded-r text-[0.9375rem] text-charcoal mb-4">
          This browser does not support passkeys. Try a modern browser
          like Chrome, Edge, Firefox, or Safari.
        </p>
      ) : null}

      {error ? (
        <p className="bg-terracotta/10 border-l-4 border-terracotta px-4 py-3 rounded-r text-[0.9375rem] text-charcoal mb-4">
          {error}
        </p>
      ) : null}

      {passkeys.length > 0 ? (
        <ul className="flex flex-col gap-2 mb-4">
          {passkeys.map((p) => (
            <li
              key={p.id}
              className="flex items-center gap-3 bg-cream rounded-md px-3 py-2.5 border border-moss/10"
            >
              {p.credentialBackedUp ? (
                <Smartphone
                  size={18}
                  strokeWidth={1.5}
                  className="text-moss flex-shrink-0"
                  aria-hidden="true"
                />
              ) : (
                <KeyIcon
                  size={18}
                  strokeWidth={1.5}
                  className="text-moss flex-shrink-0"
                  aria-hidden="true"
                />
              )}
              <div className="flex-1 min-w-0">
                <div className="text-charcoal text-[0.9375rem] font-medium truncate">
                  {p.nickname || 'Unnamed passkey'}
                </div>
                <div className="text-stone text-[0.75rem] mt-0.5">
                  Added{' '}
                  {new Date(p.createdAt).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                  {p.lastUsedAt ? (
                    <>
                      {' · last used '}
                      {new Date(p.lastUsedAt).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </>
                  ) : null}
                </div>
              </div>
              <form action={removePasskey} className="flex-shrink-0">
                <input type="hidden" name="id" value={p.id} />
                <button
                  type="submit"
                  aria-label={`Remove ${p.nickname || 'passkey'}`}
                  className="text-stone hover:text-terracotta transition-colors p-1"
                  title="Remove this passkey"
                >
                  <Trash2 size={16} strokeWidth={1.75} aria-hidden="true" />
                </button>
              </form>
            </li>
          ))}
        </ul>
      ) : null}

      {supported === false ? null : state === 'naming' ? (
        <div className="flex flex-col gap-2 max-w-[420px]">
          <label className="text-charcoal text-[0.9375rem]">
            Name this passkey
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="e.g. iPhone, MacBook, YubiKey"
              maxLength={60}
              autoFocus
              className="mt-1 w-full bg-cream border border-moss/15 rounded-md px-3 py-2 text-charcoal focus:outline-none focus:ring-2 focus:ring-moss/25 focus:border-moss/40"
            />
          </label>
          <div className="flex items-center gap-2 mt-1">
            <button
              type="button"
              onClick={handleRegister}
              className="inline-flex items-center justify-center font-body text-[0.875rem] text-paper bg-moss hover:bg-moss-deep rounded-full px-5 py-2 transition-colors"
            >
              Continue
            </button>
            <button
              type="button"
              onClick={() => {
                setState('idle');
                setNickname('');
              }}
              className="text-stone hover:text-moss text-[0.875rem]"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setState('naming')}
          disabled={state === 'registering'}
          className="inline-flex items-center gap-2 font-body text-[0.875rem] text-paper bg-moss hover:bg-moss-deep disabled:opacity-60 rounded-full px-5 py-2 transition-colors"
        >
          <Fingerprint size={14} strokeWidth={1.75} aria-hidden="true" />
          {state === 'registering' ? 'Waiting for your device…' : 'Add a passkey'}
        </button>
      )}
    </section>
  );
}
