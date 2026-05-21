'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Menu, X } from 'lucide-react';

// Mobile nav for the operator console. Mirrors the desktop sidebar
// items but lives behind a burger button visible only below the `md`
// breakpoint, where the desktop sidebar is hidden. Items are passed in
// from the server-component layout so the source of truth for the nav
// stays in one place.

export interface OpsNavItem {
  href: string;
  label: string;
}

export function OpsMobileNav({ items }: { items: OpsNavItem[] }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close the drawer whenever the active route changes (after clicking
  // a link). usePathname re-runs on navigation.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Lock body scroll while the drawer is open.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  // Close on Escape.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="md:hidden inline-flex items-center justify-center w-9 h-9 rounded text-cream/90 hover:bg-cream/10 transition-colors"
        aria-label={open ? 'Close navigation' : 'Open navigation'}
        aria-expanded={open}
        aria-controls="ops-mobile-drawer"
      >
        {open ? (
          <X size={20} strokeWidth={2} aria-hidden="true" />
        ) : (
          <Menu size={20} strokeWidth={2} aria-hidden="true" />
        )}
      </button>

      {/* Backdrop + drawer. Both live in a portal-free overlay so they
          stack above the rest of the operator content without z-index war. */}
      <div
        className={`md:hidden fixed inset-0 z-[200] ${open ? '' : 'pointer-events-none'}`}
        aria-hidden={!open}
      >
        <div
          onClick={() => setOpen(false)}
          className={`absolute inset-0 bg-charcoal/40 transition-opacity duration-200 ${
            open ? 'opacity-100' : 'opacity-0'
          }`}
        />
        <aside
          id="ops-mobile-drawer"
          className={`absolute left-0 top-0 bottom-0 w-[78vw] max-w-[320px] bg-cream shadow-2xl transition-transform duration-200 ease-out flex flex-col ${
            open ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="px-5 py-4 border-b border-moss/10 flex items-center justify-between">
            <span className="font-head text-moss text-lg tracking-tight">Operator Console</span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="inline-flex items-center justify-center w-9 h-9 rounded text-moss hover:bg-moss/5 transition-colors"
              aria-label="Close navigation"
            >
              <X size={18} strokeWidth={2} aria-hidden="true" />
            </button>
          </div>

          <nav aria-label="Operator console" className="flex-1 overflow-y-auto px-3 py-4">
            <ul className="flex flex-col gap-0.5">
              {items.map((item) => {
                const active =
                  pathname === item.href ||
                  (item.href !== '/ops' && pathname.startsWith(item.href));
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={`block px-3 py-2.5 rounded-md text-sm transition-colors ${
                        active
                          ? 'bg-moss text-cream'
                          : 'text-charcoal hover:bg-moss/5 hover:text-moss'
                      }`}
                    >
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </aside>
      </div>
    </>
  );
}
