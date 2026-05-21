import type { ReactNode } from 'react';
import Link from 'next/link';
import { Home, Inbox, Users, Heart, Calendar, ShieldAlert, Coins, FileSearch, LogOut } from 'lucide-react';
import { brand } from '@igc/content';
import { signOut } from '@/lib/auth';
import { requireOperator } from '@/lib/auth-helpers';

// The operator console is deliberately a different visual shell from the
// marketing site (per SDD §6.4 spirit, even though we are on a subdomain
// rather than a separate domain). Denser nav, utilitarian layout, role
// badge prominent so the operator always knows which role they hold and
// therefore which actions are gated.

export const metadata = {
  title: {
    template: '%s · Operator Console',
    default: 'Operator Console',
  },
  robots: { index: false, follow: false },
};

const NAV_ITEMS = [
  { href: '/ops', label: 'Today', icon: Home },
  { href: '/ops/enquiries', label: 'Enquiries', icon: Inbox, status: 'planned' as const },
  { href: '/ops/families', label: 'Families', icon: Users, status: 'planned' as const },
  { href: '/ops/companions', label: 'Companions', icon: Heart, status: 'planned' as const },
  { href: '/ops/visits', label: 'Visits', icon: Calendar, status: 'planned' as const },
  { href: '/ops/safeguarding', label: 'Safeguarding', icon: ShieldAlert, status: 'planned' as const },
  { href: '/ops/payments', label: 'Payments', icon: Coins, status: 'planned' as const },
  { href: '/ops/audit', label: 'Audit', icon: FileSearch, status: 'planned' as const },
];

export default async function OpsLayout({ children }: { children: ReactNode }) {
  const user = await requireOperator('/ops');

  return (
    <div className="min-h-screen bg-cream-deep flex flex-col">
      {/* Top bar */}
      <header className="bg-moss text-cream border-b border-moss-dark/40">
        <div className="max-w-[1440px] mx-auto px-6 h-14 flex items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <Link href="/ops" className="font-head text-cream text-lg tracking-tight hover:text-terracotta-light transition-colors">
              Operator Console
            </Link>
            <span className="text-cream/40">·</span>
            <span className="font-body text-cream/70 text-sm hidden sm:inline">{brand.fullName}</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 text-sm">
              <span className="text-cream/60">{user.email}</span>
              <span
                className="font-body text-[0.7rem] uppercase tracking-[0.08em] bg-terracotta/20 text-terracotta-light px-2 py-0.5 rounded"
                title={user.role}
              >
                {user.role.replace('operator_', '')}
              </span>
            </div>
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

      {/* Main shell: sidebar + content */}
      <div className="flex-1 flex max-w-[1440px] mx-auto w-full">
        <aside className="hidden md:block w-56 border-r border-moss/10 bg-cream py-6 px-3">
          <nav aria-label="Operator console">
            <ul className="flex flex-col gap-0.5">
              {NAV_ITEMS.map(({ href, label, icon: Icon, status }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="flex items-center gap-3 px-3 py-2 rounded-md text-charcoal text-sm hover:bg-moss/5 hover:text-moss transition-colors"
                  >
                    <Icon size={16} strokeWidth={1.75} aria-hidden="true" />
                    <span className="flex-1">{label}</span>
                    {status === 'planned' ? (
                      <span
                        aria-label="planned, not yet built"
                        className="font-body text-[0.625rem] uppercase tracking-[0.08em] text-stone/60"
                      >
                        soon
                      </span>
                    ) : null}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        <main className="flex-1 p-6 md:p-10">{children}</main>
      </div>
    </div>
  );
}
