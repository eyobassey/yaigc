/**
 * @igc/design-tokens
 *
 * Source of truth for the You Are In Good Company visual system.
 * Consumed by:
 *   - apps/web/tailwind.config.mjs (drives utility classes)
 *   - components that need to compute styles at runtime
 *   - the /styleguide route (renders every token for QA)
 *
 * If you reach for a hex code in a component, add the token here first
 * and import it instead. The ESLint rule on apps/web blocks raw hex in TSX.
 *
 * Reference: docs/brand/ (when populated) and the original CSS variables in
 * /home/username/Youareingoodcompany/index_draft.html.
 */

export const colors = {
  // Primary brand
  moss: '#3C5A3A',
  'moss-dark': '#2D4429',

  // Backgrounds
  cream: '#FAF8F3',
  'cream-deep': '#F2EFE4',
  paper: '#FFFEFB',

  // Body and accents
  charcoal: '#2D2D2D',
  terracotta: '#C97B5F',
  'terracotta-light': '#E5B59E',
  sage: '#A3B8A3',
  stone: '#8B8680',

  // Functional
  success: '#5E8E5A',
  warning: '#D4A547',
  alert: '#B84A39',
};

/**
 * Font stacks. The primary family is a CSS variable set by next/font in the
 * root layout (apps/web/src/app/layout.tsx). The fallbacks kick in if the
 * variable is unset (e.g., during build-time SSR before the variable lands).
 */
export const typography = {
  head: ['var(--font-head)', 'Georgia', 'Times New Roman', 'serif'],
  body: ['var(--font-body)', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
  mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
};

export const radii = {
  sm: '4px',
  md: '8px',
  lg: '24px',
  full: '9999px',
};

/**
 * Spacing scale extension. Tailwind's default scale (0, 0.5, 1, ... 96) stays
 * available; these additions cover responsive container/section rhythm used
 * in the marketing site.
 */
export const spacing = {
  gutter: 'clamp(1.25rem, 4vw, 2.5rem)',
  'section-y': 'clamp(4rem, 10vw, 8rem)',
  measure: '65ch',
};

export default {
  colors,
  typography,
  radii,
  spacing,
};
