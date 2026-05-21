import type { MetadataRoute } from 'next';
import { brand } from '@igc/content';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = `https://${brand.domain}`;
  const lastModified = new Date();

  return [
    { url: `${base}/`, lastModified, changeFrequency: 'weekly', priority: 1.0 },
    { url: `${base}/how-it-works`, lastModified, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${base}/pricing`, lastModified, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${base}/safeguarding`, lastModified, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${base}/companions/join`, lastModified, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${base}/about`, lastModified, changeFrequency: 'monthly', priority: 0.6 },
  ];
}
