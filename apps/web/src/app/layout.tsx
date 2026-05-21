import type { Metadata } from 'next';
import { brand } from '@igc/content';
import { fraunces, inter } from '@/lib/fonts';
import './globals.css';

const SITE_URL = `https://${brand.domain}`;
const DESCRIPTION = brand.tagline;

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: brand.fullName,
    template: `%s  ·  ${brand.fullName}`,
  },
  description: DESCRIPTION,
  applicationName: brand.fullName,
  authors: [{ name: brand.legalEntity, url: SITE_URL }],
  openGraph: {
    type: 'website',
    locale: 'en_GB',
    url: SITE_URL,
    siteName: brand.fullName,
    title: brand.fullName,
    description: DESCRIPTION,
    // /opengraph-image.tsx is picked up automatically by Next.js
  },
  twitter: {
    card: 'summary_large_image',
    title: brand.fullName,
    description: DESCRIPTION,
  },
  formatDetection: {
    telephone: true,
    email: true,
    address: false,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB" className={`${fraunces.variable} ${inter.variable}`}>
      <body className="font-body bg-cream text-charcoal antialiased">{children}</body>
    </html>
  );
}
