import { Fraunces, Inter } from 'next/font/google';

/**
 * Self-hosted brand fonts.
 *
 * next/font/google downloads the font files at build time and serves them
 * from the same origin at runtime. No external font requests from the
 * browser. Equivalent to next/font/local for the user but with zero font
 * file management on our side.
 *
 * The CSS variables exposed below are referenced by
 * packages/design-tokens/src/index.mjs and by apps/web/tailwind.config.mjs.
 */

export const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-head',
  display: 'swap',
  axes: ['opsz'],
});

export const inter = Inter({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
  weight: ['400', '500', '600'],
});
