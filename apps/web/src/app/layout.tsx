import type { Metadata, Viewport } from 'next';
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

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#3C5A3A' }, // moss
    { media: '(prefers-color-scheme: dark)', color: '#3C5A3A' },
  ],
  colorScheme: 'light',
};

// Schema.org LocalBusiness markup. Helps Google understand we are a real,
// local business serving four named boroughs in Greater Manchester. Rendered
// once site-wide via the root layout so every page benefits.
const localBusinessJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'LocalBusiness',
  '@id': `${SITE_URL}/#organization`,
  name: brand.fullName,
  legalName: brand.legalEntity,
  alternateName: brand.shortName,
  url: SITE_URL,
  logo: `${SITE_URL}/logo/wordmark-full-moss-on-cream.svg`,
  image: `${SITE_URL}/opengraph-image`,
  description: 'Companionship visits for older adults across South Manchester, Trafford, Stockport, and Salford. Vetted, trained, insured companions. The same companion every visit.',
  telephone: brand.supportPhone,
  email: brand.supportEmail,
  priceRange: '££',
  areaServed: [
    { '@type': 'City', name: 'South Manchester' },
    { '@type': 'City', name: 'Trafford' },
    { '@type': 'City', name: 'Stockport' },
    { '@type': 'City', name: 'Salford' },
  ],
  address: {
    '@type': 'PostalAddress',
    addressRegion: 'Greater Manchester',
    addressCountry: 'GB',
  },
  openingHoursSpecification: [
    {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      opens: '09:00',
      closes: '18:00',
    },
    {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: 'Saturday',
      opens: '10:00',
      closes: '14:00',
    },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB" className={`${fraunces.variable} ${inter.variable}`}>
      <body className="font-body bg-cream text-charcoal antialiased">
        {children}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessJsonLd) }}
        />
      </body>
    </html>
  );
}
