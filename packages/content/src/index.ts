/**
 * @igc/content - public API
 *
 * Re-exports all named sections plus the default `content` object.
 *
 * Usage:
 *   import content from '@igc/content';
 *   <h1>{content.home.hero.headline}</h1>
 *
 *   // or, named imports:
 *   import { brand, home } from '@igc/content';
 *   <p>{brand.tagline}</p>
 */

export {
  brand,
  nav,
  home,
  howItWorks,
  pricing,
  safeguarding,
  faq,
  joinCompanionClub,
  contact,
  emails,
  sms,
  postVisitReport,
  portalCommon,
  operatorConsole,
  footer,
} from './en-GB';

export type { Template, EmailTemplate, SmsTemplate, Content } from './en-GB';

export { default } from './en-GB';
