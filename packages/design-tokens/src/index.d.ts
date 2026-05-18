/**
 * Type declarations for @igc/design-tokens.
 * The actual values live in src/index.mjs.
 */

export interface Colors {
  moss: string;
  'moss-dark': string;
  cream: string;
  'cream-deep': string;
  paper: string;
  charcoal: string;
  terracotta: string;
  'terracotta-light': string;
  sage: string;
  stone: string;
  success: string;
  warning: string;
  alert: string;
}

export interface Typography {
  head: string[];
  body: string[];
  mono: string[];
}

export interface Radii {
  sm: string;
  md: string;
  lg: string;
  full: string;
}

export interface Spacing {
  gutter: string;
  'section-y': string;
  measure: string;
}

export const colors: Colors;
export const typography: Typography;
export const radii: Radii;
export const spacing: Spacing;

declare const tokens: {
  colors: Colors;
  typography: Typography;
  radii: Radii;
  spacing: Spacing;
};

export default tokens;
