import { renderOgImage, OG_SIZE, OG_CONTENT_TYPE } from '@/lib/og';

export const alt = 'Pricing — one hourly rate, no hidden fees.';
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image() {
  return renderOgImage({
    eyebrow: 'Pricing',
    headline: 'Honest pricing.',
    accent: 'One hourly rate. £32 per hour.',
    footnote: 'Pause or cancel any time.',
  });
}
