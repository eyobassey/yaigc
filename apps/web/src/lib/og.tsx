import { promises as fs } from 'node:fs';
import path from 'node:path';
import { ImageResponse } from 'next/og';
import { brand } from '@igc/content';

export const OG_SIZE = { width: 1200, height: 630 } as const;
export const OG_CONTENT_TYPE = 'image/png';

let fontCache: Promise<{ regular: Buffer; italic: Buffer }> | null = null;

function loadFonts() {
  if (!fontCache) {
    const fontDir = path.join(process.cwd(), 'public/fonts');
    fontCache = Promise.all([
      fs.readFile(path.join(fontDir, 'Fraunces-Regular.ttf')),
      fs.readFile(path.join(fontDir, 'Fraunces-Italic.ttf')),
    ]).then(([regular, italic]) => ({ regular, italic }));
  }
  return fontCache;
}

export interface OgImageProps {
  eyebrow?: string;
  headline: string;
  accent: string;
  footnote?: string;
}

export async function renderOgImage({
  eyebrow,
  headline,
  accent,
  footnote,
}: OgImageProps) {
  const { regular, italic } = await loadFonts();

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '80px',
          background:
            'radial-gradient(circle at 80% 20%, rgba(201, 123, 95, 0.18), transparent 55%), linear-gradient(135deg, #FAF8F3 0%, #F2EFE4 100%)',
          fontFamily: 'Fraunces',
          color: '#2D2D2D',
        }}
      >
        <div
          style={{
            fontSize: '20px',
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: '#8B8680',
          }}
        >
          {eyebrow ?? brand.domain}
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '24px',
            maxWidth: '1040px',
          }}
        >
          <div
            style={{
              fontSize: '80px',
              fontWeight: 400,
              lineHeight: 1.05,
              letterSpacing: '-0.025em',
              color: '#3C5A3A',
            }}
          >
            {headline}
          </div>
          <div
            style={{
              fontSize: '56px',
              fontStyle: 'italic',
              lineHeight: 1.15,
              color: '#C97B5F',
            }}
          >
            {accent}
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            width: '100%',
            gap: '40px',
          }}
        >
          <div
            style={{
              fontSize: '22px',
              color: '#3C5A3A',
              fontWeight: 500,
            }}
          >
            {brand.fullName}
          </div>
          <div
            style={{
              fontSize: '18px',
              color: '#8B8680',
              fontStyle: 'italic',
              textAlign: 'right',
            }}
          >
            {footnote ?? brand.tagline}
          </div>
        </div>
      </div>
    ),
    {
      ...OG_SIZE,
      fonts: [
        { name: 'Fraunces', data: regular, style: 'normal', weight: 400 },
        { name: 'Fraunces', data: italic, style: 'italic', weight: 400 },
      ],
    },
  );
}
