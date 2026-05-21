'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { brand, nav } from '@igc/content';

const navLinks = [
  { label: 'How it works', href: '/how-it-works' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'Safeguarding', href: '/safeguarding' },
  { label: 'Questions', href: '/#faq' },
] as const;

export function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Lock body scroll while the mobile drawer is open
  useEffect(() => {
    if (!menuOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [menuOpen]);

  // Close drawer on Escape
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  return (
    <>
      <nav
        className={`sticky top-0 z-50 backdrop-blur-md backdrop-saturate-150 bg-cream/90 transition-colors duration-300 ${
          scrolled ? 'border-b border-moss/10' : 'border-b border-transparent'
        }`}
        aria-label="Primary"
      >
        <div className="max-w-[1240px] mx-auto px-[clamp(1.25rem,4vw,2.5rem)] flex items-center justify-between gap-4 py-5">
          <Link
            href="/"
            aria-label={`${brand.fullName}, home`}
            className="flex items-center min-w-0 flex-shrink"
          >
            {/* SVG wordmark — viewBox 369x62, scales by height, width auto. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo/wordmark-moss-on-cream.svg"
              alt={brand.fullName}
              className="h-7 sm:h-8 w-auto"
            />
          </Link>

          {/* Desktop nav links — >= 900px */}
          <ul className="hidden min-[900px]:flex gap-8 text-[0.95rem] font-medium">
            {navLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="text-charcoal hover:text-moss transition-colors"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
            <a
              href={`tel:${brand.supportPhone.replace(/\s/g, '')}`}
              className="hidden min-[700px]:flex items-center gap-2 text-[0.95rem] text-charcoal font-medium hover:text-moss transition-colors"
            >
              <span
                aria-hidden="true"
                className="inline-block w-1.5 h-1.5 rounded-full bg-sage animate-pulse"
              />
              <span>{brand.supportPhone}</span>
            </a>

            {/* CTA hidden on the smallest viewports — the drawer carries it. */}
            <Link
              href="/#contact"
              className="hidden sm:inline-flex items-center justify-center px-4 py-2.5 sm:px-6 sm:py-3 rounded-full bg-moss text-cream text-sm sm:text-[0.95rem] font-medium hover:bg-moss-dark transition-all duration-200 hover:shadow-lg hover:-translate-y-px whitespace-nowrap"
            >
              {nav.cta.primary}
            </Link>

            {/* Burger button — < 900px. flex-shrink-0 so layout pressure
                never pushes it off the right edge on narrow viewports. */}
            <button
              type="button"
              className="min-[900px]:hidden inline-flex items-center justify-center w-11 h-11 rounded-full text-moss bg-moss/5 hover:bg-moss/10 transition-colors flex-shrink-0"
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={menuOpen}
              aria-controls="mobile-drawer"
              onClick={() => setMenuOpen((v) => !v)}
            >
              <Burger open={menuOpen} />
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile drawer + overlay */}
      <div
        className={`min-[900px]:hidden fixed inset-0 z-[200] ${
          menuOpen ? '' : 'pointer-events-none'
        }`}
        aria-hidden={!menuOpen}
      >
        {/* Backdrop */}
        <div
          className={`absolute inset-0 bg-charcoal/40 transition-opacity duration-300 ${
            menuOpen ? 'opacity-100' : 'opacity-0'
          }`}
          onClick={() => setMenuOpen(false)}
        />

        {/* Drawer */}
        <aside
          id="mobile-drawer"
          className={`absolute right-0 top-0 bottom-0 w-[85vw] max-w-[400px] bg-cream shadow-2xl transition-transform duration-300 ease-out flex flex-col ${
            menuOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          <div className="flex items-center justify-between px-6 py-5 border-b border-moss/10">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo/wordmark-moss-on-cream.svg"
              alt={brand.fullName}
              className="h-7 w-auto"
            />
            <button
              type="button"
              className="inline-flex items-center justify-center w-10 h-10 rounded-full text-moss hover:bg-moss/5 transition-colors"
              aria-label="Close menu"
              onClick={() => setMenuOpen(false)}
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path d="M4 4l12 12M16 4L4 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          <ul className="flex-1 flex flex-col gap-1 px-6 py-6 font-head text-xl">
            {navLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="block py-3 text-moss hover:text-terracotta transition-colors border-b border-moss/10"
                  onClick={() => setMenuOpen(false)}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>

          <div className="px-6 py-6 border-t border-moss/10 flex flex-col gap-3">
            <a
              href={`tel:${brand.supportPhone.replace(/\s/g, '')}`}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full border border-moss text-moss text-[0.95rem] font-medium hover:bg-moss hover:text-cream transition-colors"
              onClick={() => setMenuOpen(false)}
            >
              <span
                aria-hidden="true"
                className="inline-block w-1.5 h-1.5 rounded-full bg-sage animate-pulse"
              />
              <span>{brand.supportPhone}</span>
            </a>
            <Link
              href="/#contact"
              className="inline-flex items-center justify-center px-6 py-3 rounded-full bg-moss text-cream text-[0.95rem] font-medium hover:bg-moss-dark transition-colors"
              onClick={() => setMenuOpen(false)}
            >
              {nav.cta.primary}
            </Link>
          </div>
        </aside>
      </div>
    </>
  );
}

function Burger({ open }: { open: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true" className="block">
      <line
        x1="3"
        x2="19"
        y1={open ? '11' : '7'}
        y2={open ? '11' : '7'}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        className="transition-all duration-300"
        transform={open ? 'rotate(45 11 11)' : ''}
      />
      <line
        x1="3"
        x2="19"
        y1="11"
        y2="11"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        className={`transition-opacity duration-200 ${open ? 'opacity-0' : 'opacity-100'}`}
      />
      <line
        x1="3"
        x2="19"
        y1={open ? '11' : '15'}
        y2={open ? '11' : '15'}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        className="transition-all duration-300"
        transform={open ? 'rotate(-45 11 11)' : ''}
      />
    </svg>
  );
}
