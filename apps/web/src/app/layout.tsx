import type { Metadata } from 'next';
import { fraunces, inter } from '@/lib/fonts';
import './globals.css';

export const metadata: Metadata = {
  title: 'You Are In Good Company',
  description: 'Companionship visits for the people who matter most.',
  metadataBase: new URL('https://youareingoodcompany.co.uk'),
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB" className={`${fraunces.variable} ${inter.variable}`}>
      <body className="font-body bg-cream text-charcoal antialiased">{children}</body>
    </html>
  );
}
