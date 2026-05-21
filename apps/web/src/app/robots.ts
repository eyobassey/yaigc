import type { MetadataRoute } from 'next';
import { brand } from '@igc/content';

export default function robots(): MetadataRoute.Robots {
  const base = `https://${brand.domain}`;
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/privacy', '/terms', '/accessibility', '/styleguide'],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
