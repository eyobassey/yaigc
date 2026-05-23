'use client';

import { useEffect, useState } from 'react';
import { Eye, X } from 'lucide-react';

// M.2.3 disclosure banner, made dismissible in M.3.5 (post-M.3 polish).
// Once a user has dismissed it on any direct thread, the dismissal
// sticks across every direct thread on the same browser via a single
// localStorage key. We rely on the privacy policy + the audit trail
// to cover the legal disclosure; the banner is a UX nudge for first
// contact, not the canonical record.
//
// SSR-safe: the component renders the banner by default on the server
// and the first client paint, then hides it in a useEffect if
// localStorage says it was dismissed. The brief flash on first load
// is acceptable - it's the desired behaviour for a user who never
// dismissed it on this device.

const STORAGE_KEY = 'igc.banner.direct-thread-oversight.dismissed';

export function DirectThreadOversightBanner({ children }: { children: React.ReactNode }) {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY) === '1') setHidden(true);
    } catch {
      // localStorage can throw in private-mode Safari; ignore and
      // keep the banner visible.
    }
  }, []);

  if (hidden) return null;

  function dismiss() {
    setHidden(true);
    try {
      localStorage.setItem(STORAGE_KEY, '1');
    } catch {
      /* swallow */
    }
  }

  return (
    <div className="mb-5 rounded-md border border-terracotta/30 bg-terracotta/[0.06] px-4 py-3 flex items-start gap-3">
      <Eye
        size={18}
        strokeWidth={1.75}
        aria-hidden="true"
        className="text-terracotta flex-shrink-0 mt-0.5"
      />
      <p className="text-charcoal text-[0.875rem] leading-[1.55] flex-1">{children}</p>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss this notice"
        className="text-stone/60 hover:text-charcoal transition-colors flex-shrink-0 mt-0.5"
      >
        <X size={16} strokeWidth={1.75} aria-hidden="true" />
      </button>
    </div>
  );
}
