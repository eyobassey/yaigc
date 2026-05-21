import { ImageResponse } from 'next/og';
import { brand } from '@igc/content';

export const alt = `${brand.fullName} — ${brand.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
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
          fontFamily: 'Georgia, serif',
          color: '#2D2D2D',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          <div
            style={{
              fontFamily: 'Inter, sans-serif',
              fontSize: '20px',
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: '#8B8680',
            }}
          >
            {brand.domain}
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '32px',
            maxWidth: '900px',
          }}
        >
          <div
            style={{
              fontSize: '88px',
              fontWeight: 400,
              lineHeight: 1.05,
              letterSpacing: '-0.025em',
              color: '#3C5A3A',
            }}
          >
            You can&apos;t always be there.
          </div>
          <div
            style={{
              fontSize: '64px',
              fontStyle: 'italic',
              lineHeight: 1.2,
              color: '#C97B5F',
            }}
          >
            You can be sure they&apos;re in good company.
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            fontFamily: 'Inter, sans-serif',
          }}
        >
          <div
            style={{
              fontSize: '24px',
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
              fontFamily: 'Georgia, serif',
            }}
          >
            {brand.tagline}
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
