/**
 * Landing-page-specific copy not yet promoted to packages/content/src/en-GB.ts.
 *
 * The canonical content package is @igc/content. This file holds extras that
 * are specific to the home landing page and are not (yet) needed by other
 * surfaces. They live here because the home page composition references them.
 *
 * This file IS in the brand-voice-guard scope (apps/web/src/content/**).
 * Forbidden words and em dashes will fail CI just like en-GB.ts.
 *
 * TODO (post-launch): promote these into the home section of en-GB.ts and
 * delete this file. Tracked in docs/decisions.md.
 */

import { brand } from '@igc/content';

export const trustStrip = [
  'Enhanced DBS for every companion',
  'Public Liability and PI insured',
  'Named safeguarding lead',
  'South Manchester, Trafford, Stockport, Salford',
] as const;

export const founderNote = {
  eyebrow: 'A note from us',
  body: [
    'We started this company because we watched our own families navigate the gap between regulated home-care and nothing at all.',
    'Charities have waitlists. Home-care agencies want to sell clinical hours. Neither of those was what our mums and dads needed.',
    'So we built what was missing.',
  ],
  attribution: 'Bassey and the team, Manchester',
} as const;

export const visitGallery = {
  eyebrow: 'What a visit looks like',
  title: 'Not a clipboard. Not a uniform. Just company.',
  cards: [
    {
      icon: '♥', // heart suit
      title: 'A cup of tea',
      body: 'The kettle goes on. The biscuit tin comes out. Real conversation, in the same kitchen, every week.',
    },
    {
      icon: '◆', // diamond
      title: 'A walk to the shops',
      body: 'A short walk in fresh air. Choosing fruit at the corner shop. A bench in the park if it is warm.',
    },
    {
      icon: '♣', // club
      title: 'An outing',
      body: 'The garden centre on a quiet morning. The cinema on a Wednesday afternoon. The local museum.',
    },
    {
      icon: '♠', // spade
      title: 'A note for the family',
      body: 'A short, honest note within hours. Where you went, what you did, how your mum or dad seemed.',
    },
  ],
} as const;

export const pricingTeaser = {
  eyebrow: 'Honest pricing',
  title: 'One hourly rate. No hidden fees.',
  lead: 'Pause or cancel any time, in one click. No long contracts. No retention conversations. No guilt.',
  // Pricing page itself doesn't exist until Sprint 1; for now point at the
  // contact section so the CTA still moves the visitor forward.
  cta: 'Talk through pricing',
  ctaHref: '/#contact',
  amount: {
    currency: '£', // pound sign
    figure: '32',
    unit: '/hour',
  },
  note: 'Two-hour minimum visit. Same companion every week. First introduction visit on us.',
  attendanceAllowance: {
    heading: 'Does your mum or dad receive Attendance Allowance?',
    body: 'It is exactly the kind of thing it is meant to pay for. We will talk you through it.',
  },
} as const;

export const faqTeaser = {
  eyebrow: 'Questions families ask',
  title: 'The questions that come up most.',
  items: [
    {
      question: 'Will it always be the same companion?',
      answer:
        'Yes. That is the point. If your companion is unwell or on holiday, we propose a familiar back-up from the same area and tell you in advance. No revolving cast of strangers.',
    },
    {
      question: 'What if my mum or dad does not like their companion?',
      answer:
        'We propose someone else. It happens. Chemistry is real. You will not be charged for a regular visit until the match feels right.',
    },
    {
      question: 'Do you provide personal care?',
      answer:
        'No. We are not a care agency. If your mum or dad needs help with washing, dressing, toileting, or medication, we will recommend a regulated home-care agency we trust. We are companions, not carers.',
    },
    {
      question: 'How do you check the companions?',
      answer:
        'Application, phone screen, in-person interview, two references, Enhanced DBS, three training modules on safeguarding, dignity, and lone-working. Around three weeks end to end. We do not shortcut it.',
    },
    {
      question: 'Can I cancel any time?',
      answer:
        'Yes. Pause or cancel in one click in your account. No phone call. No retention conversation. No guilt. No penalty.',
    },
  ],
} as const;

export const siteFooter = {
  tagline: brand.tagline,
  columns: [
    {
      title: 'Visit',
      links: [
        { label: 'How it works', href: '/how-it-works' },
        { label: 'Pricing', href: '/pricing' },
        { label: 'Questions', href: '/#faq' },
        { label: 'About', href: '/about' },
      ],
    },
    {
      title: 'For companions',
      links: [
        { label: 'Join The Companion Club', href: '/companions/join' },
        { label: 'What we look for', href: '/companions/join#what-we-look-for' },
        { label: 'How we pay', href: '/companions/join#how-we-pay' },
      ],
    },
    {
      title: 'Trust and safety',
      links: [
        { label: 'Safeguarding', href: '/safeguarding' },
        { label: 'Accessibility', href: '/accessibility' },
        { label: 'Privacy', href: '/privacy' },
        { label: 'Terms', href: '/terms' },
      ],
    },
  ],
  legal: `${brand.legalEntity}. Registered in England and Wales.`,
  contact: `${brand.supportEmail}  ·  ${brand.supportPhone}`,
} as const;
