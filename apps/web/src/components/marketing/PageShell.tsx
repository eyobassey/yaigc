import type { ReactNode } from 'react';
import { brand } from '@igc/content';
import { Nav } from '@/components/marketing/Nav';
import { SiteFooter } from '@/components/marketing/SiteFooter';

export function PageShell({ children }: { children: ReactNode }) {
  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[999] focus:bg-moss focus:text-cream focus:px-5 focus:py-3 focus:rounded font-medium"
      >
        Skip to content
      </a>
      <Nav />
      <main id="main">{children}</main>
      <SiteFooter />
      <span className="sr-only">{brand.closingLine}</span>
    </>
  );
}
