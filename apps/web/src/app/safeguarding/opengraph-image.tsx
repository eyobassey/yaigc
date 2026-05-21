import { renderOgImage, OG_SIZE, OG_CONTENT_TYPE } from '@/lib/og';

export const alt = 'Safeguarding — vetted, trained, insured companions.';
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image() {
  return renderOgImage({
    eyebrow: 'Safeguarding',
    headline: 'Vetted. Trained. Insured.',
    accent: 'The promise underneath the visits.',
  });
}
