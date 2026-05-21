import Link from 'next/link';
import { brand } from '@igc/content';
import { siteFooter } from '@/content/landing-extras';

export function SiteFooter() {
  return (
    <footer className="bg-moss text-cream pt-[clamp(3rem,6vw,5rem)] pb-10">
      <div className="max-w-[1240px] mx-auto px-[clamp(1.25rem,4vw,2.5rem)]">
        <div className="grid gap-12 mb-16 min-[760px]:grid-cols-[1.5fr_1fr_1fr_1fr]">
          <div>
            {/* Stacked cream-on-moss wordmark for the moss-green footer */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo/wordmark-cream-on-moss.svg"
              alt={brand.fullName}
              className="h-20 w-auto mb-6"
            />
            <p className="font-head italic text-[1.0625rem] leading-[1.5] max-w-[28ch] opacity-85">
              {siteFooter.tagline}
            </p>
          </div>

          {siteFooter.columns.map((col) => (
            <div key={col.title}>
              <h4 className="text-[0.8125rem] font-medium tracking-[0.12em] uppercase text-terracotta-light mb-6">
                {col.title}
              </h4>
              <ul className="flex flex-col gap-3.5">
                {col.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-cream/85 text-[0.95rem] hover:text-terracotta-light hover:opacity-100 transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="pt-10 border-t border-cream/15 flex flex-col gap-6 min-[700px]:flex-row min-[700px]:justify-between min-[700px]:items-center">
          <div className="font-head italic text-[1.25rem] text-terracotta-light tracking-tight">
            {brand.closingLine}
          </div>
          <div className="text-[0.8125rem] text-cream/65 leading-[1.5]">
            {siteFooter.legal}
            <br />
            {siteFooter.contact}
          </div>
        </div>
      </div>
    </footer>
  );
}
