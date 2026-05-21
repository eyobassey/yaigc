import { renderOgImage, OG_SIZE, OG_CONTENT_TYPE } from '@/lib/og';

export const alt = 'How it works — four steps to start.';
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image() {
  return renderOgImage({
    eyebrow: 'How it works',
    headline: 'Companionship, organised the way it should be.',
    accent: 'Four steps. Twenty minutes to start.',
  });
}
