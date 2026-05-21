import { renderOgImage, OG_SIZE, OG_CONTENT_TYPE } from '@/lib/og';

export const alt = 'Join The Companion Club — spend an afternoon with someone wonderful. Get paid for it.';
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image() {
  return renderOgImage({
    eyebrow: 'The Companion Club',
    headline: 'Spend an afternoon with someone wonderful.',
    accent: 'Get paid for it.',
    footnote: 'A fair hourly rate, paid weekly.',
  });
}
