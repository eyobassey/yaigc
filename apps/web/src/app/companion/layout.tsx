import type { ReactNode } from 'react';
import Link from 'next/link';
import {
  Home,
  Calendar,
  Sparkles,
  User,
  Settings,
  LogOut,
  FileText,
  MessageSquare,
} from 'lucide-react';
import { brand } from '@igc/content';
import { signOut } from '@/lib/auth';
import { requireCompanion } from '@/lib/auth-helpers';

// Companion portal layout. Distinct visual chrome from family + ops:
// terracotta accents (the companion sub-brand colour) on the top bar
// rather than moss, smaller side-nav. Same trust boundary as the
// apex marketing site - shared auth cookie.

export const metadata = {
  title: {
    template: '%s · ' + brand.companionSubBrand + ' · ' + brand.fullName,
    default: brand.companionSubBrand + ' · ' + brand.fullName,
  },
  robots: { index: false, follow: false },
};

const NAV_ITEMS = [
  { href: '/companion', label: 'Today', icon: Home },
  { href: '/companion/visits', label: 'Visits', icon: Calendar },
  { href: '/companion/matches', label: 'Matches', icon: Sparkles },
  { href: '/companion/profile', label: 'Profile', icon: User },
  { href: '/companion/documents', label: 'Documents', icon: FileText },
  { href: '/companion/messages', label: 'Messages', icon: MessageSquare },
  { href: '/companion/account', label: 'Account', icon: Settings },
];

const STATUS_LABEL: Record<string, string> = {
  onboarding: 'Onboarding',
  active: 'Active',
  suspended: 'Suspended',
  archived: 'Archived',
};

export default async function CompanionLayout({ children }: { children: ReactNode }) {
  const { user, companion } = await requireCompanion('/companion');

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      <header className="bg-terracotta text-cream border-b border-terracotta-dark/40">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
          <Link
            href="/companion"
            className="font-head text-cream text-base sm:text-lg tracking-tight hover:text-cream/80 transition-colors truncate"
          >
            {brand.companionSubBrand}
          </Link>
          <div className="flex items-center gap-3 sm:gap-4">
            <span className="hidden sm:inline text-cream/80 text-sm truncate max-w-[12rem]">
              {companion.firstName}
            </span>
            <span
              className="font-body text-[0.7rem] uppercase tracking-[0.08em] bg-cream/15 text-cream px-2 py-0.5 rounded whitespace-nowrap"
              title={companion.status}
            >
              {STATUS_LABEL[companion.status] ?? companion.status}
            </span>
            <form
              action={async () => {
                'use server';
                await signOut({ redirectTo: '/' });
              }}
            >
              <button
                type="submit"
                className="inline-flex items-center gap-2 text-cream/80 hover:text-cream text-sm transition-colors"
                aria-label="Sign out"
              >
                <LogOut size={16} strokeWidth={1.75} aria-hidden="true" />
                <span className="hidden sm:inline">Sign out</span>
              </button>
            </form>
          </div>
        </div>
      </header>

      <div className="flex-1 flex flex-col md:flex-row max-w-[1200px] mx-auto w-full">
        <aside className="md:w-56 border-b md:border-b-0 md:border-r border-moss/10 bg-paper py-3 md:py-6 px-3 flex-shrink-0">
          <nav aria-label="Companion portal">
            <ul className="flex md:flex-col gap-0.5 overflow-x-auto md:overflow-visible -mx-1 px-1">
              {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
                <li key={href} className="flex-shrink-0">
                  <Link
                    href={href}
                    className="flex items-center gap-3 px-3 py-2 rounded-md text-charcoal text-sm hover:bg-moss/5 hover:text-moss transition-colors whitespace-nowrap"
                  >
                    <Icon size={16} strokeWidth={1.75} aria-hidden="true" />
                    <span>{label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <p className="hidden md:block mt-8 pt-4 border-t border-moss/10 text-stone text-[0.7rem] font-mono break-all px-3">
            {user.email}
          </p>
        </aside>

        <main className="flex-1 min-w-0 p-4 sm:p-6 md:p-10">{children}</main>
      </div>

      <footer className="border-t border-moss/10 bg-cream-deep py-6 mt-8">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 flex items-center justify-between gap-4 flex-wrap">
          <p className="font-head italic text-terracotta text-base">
            {brand.closingLine}
          </p>
          <p className="text-stone text-[0.8125rem]">
            Operator support:{' '}
            <a href={`tel:${brand.supportPhone.replace(/\s/g, '')}`} className="link">
              {brand.supportPhone}
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
