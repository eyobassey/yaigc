import type { ReactNode } from 'react';
import Link from 'next/link';
import { Home, Calendar, Heart, Coins, User, LogOut, Sparkles } from 'lucide-react';
import { brand } from '@igc/content';
import { signOut } from '@/lib/auth';
import { requireFamilyMember } from '@/lib/auth-helpers';

// The family portal layout. Same trust boundary as the marketing site
// (apex domain, shared auth cookie) but its own nav and visual chrome
// once you cross into /family/*. The marketing nav is intentionally
// not rendered here - signed-in payers want their portal, not the
// public marketing surface.

export const metadata = {
  title: {
    template: '%s · Your account · ' + brand.fullName,
    default: 'Your account · ' + brand.fullName,
  },
  robots: { index: false, follow: false },
};

const NAV_ITEMS = [
  { href: '/family', label: 'Today', icon: Home },
  { href: '/family/matches', label: 'Matches', icon: Sparkles },
  { href: '/family/visits', label: 'Visits', icon: Calendar },
  { href: '/family/recipient', label: 'Household', icon: Heart },
  { href: '/family/companion', label: 'Companion', icon: Heart },
  { href: '/family/subscription', label: 'Subscription', icon: Coins },
  { href: '/family/account', label: 'Account', icon: User },
];

export default async function FamilyLayout({ children }: { children: ReactNode }) {
  const { user, family } = await requireFamilyMember('/family');

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      <header className="bg-moss text-cream border-b border-moss-dark/40">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
          <Link
            href="/family"
            className="font-head text-cream text-base sm:text-lg tracking-tight hover:text-terracotta-light transition-colors truncate"
          >
            {brand.fullName}
          </Link>
          <div className="flex items-center gap-3 sm:gap-4">
            <span className="hidden sm:inline text-cream/70 text-sm truncate max-w-[14rem]">
              {family.billingName}
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
          <nav aria-label="Family portal">
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
            Questions? <a href={`tel:${brand.supportPhone.replace(/\s/g, '')}`} className="link">{brand.supportPhone}</a>
          </p>
        </div>
      </footer>
    </div>
  );
}
