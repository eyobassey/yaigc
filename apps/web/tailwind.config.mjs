import { colors, typography, radii, spacing } from '@igc/design-tokens';

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{ts,tsx,mdx}'],
  theme: {
    extend: {
      colors,
      fontFamily: {
        head: typography.head,
        body: typography.body,
        mono: typography.mono,
      },
      borderRadius: radii,
      spacing,
    },
  },
  plugins: [],
};
