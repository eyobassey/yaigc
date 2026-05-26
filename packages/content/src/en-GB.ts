/**
 * ============================================================================
 *  You Are In Good Company - Content Strings (en-GB)
 * ============================================================================
 *
 *  Single source of truth for every word that appears in customer-facing
 *  surfaces. Marketing pages, transactional emails, SMS templates, portal UI,
 *  error messages, and empty states all read from here.
 *
 *  This file is checked by the brand voice guard in CI. The guard fails the
 *  build if any of the forbidden words or characters appear. See the rules
 *  immediately below.
 *
 *  Location: packages/content/src/en-GB.ts
 *  Author:   You Are In Good Company (founding team)
 *  Updated:  see git history
 *
 * ----------------------------------------------------------------------------
 *  BRAND VOICE RULES (enforced by scripts/lint-content.ts)
 * ----------------------------------------------------------------------------
 *
 *  Forbidden words (case-insensitive, with one nuance):
 *    - "care"          NEVER use to describe what we deliver.
 *                      We deliver companionship, not care.
 *                      Exceptions where "care" is allowed:
 *                        - Naming what we are NOT ("not a care agency",
 *                          "we do not provide personal care").
 *                        - Referring to regulated partner agencies we refer
 *                          families to ("a regulated home-care agency").
 *                      The CI guard allows these exact compound phrases:
 *                        "care agency", "personal care", "home-care",
 *                        "home care", "clinical care", "care role".
 *                      Any other use of "care" fails the build.
 *    - "elderly"       Use "older", "your mum", "your dad", "your gran",
 *                      "your grandad", or name the person. No exceptions.
 *    - "lonely" /      Name the solution, not the diagnosis. We talk about
 *      "loneliness"    "good company", not "loneliness". No exceptions.
 *    - "vulnerable"    Operator-internal term only. Never customer-facing.
 *    - "befriender" /  We have companions, not befrienders. No exceptions.
 *      "befriending"
 *    - "client" /      Never. We have families, recipients, and companions.
 *      "service user"
 *
 *  Forbidden characters:
 *    - Em dash (—)     Use commas, semicolons, colons, parentheses, or
 *                      hyphens (-) instead. The brand has a specific voice
 *                      and the em dash is not part of it.
 *
 *  Tone rules:
 *    - Second person. Speak to the buyer, not at them.
 *    - Short sentences. Concrete nouns. "A cup of tea" not "an engagement
 *      opportunity". "A walk to the garden centre" not "social activity".
 *    - Use "your mum, your dad, your gran, your grandad" rather than "older
 *      adults" or "the elderly".
 *    - Every public page closes with: "You are in good company."
 *    - Companions sign post-visit reports with first name + "with In Good
 *      Company" + "Until next time. You are in good company."
 *
 *  Approved short forms:
 *    - "You Are In Good Company" is the canonical brand name.
 *    - "In Good Company" is acceptable inside prose where the full name
 *      reads awkwardly ("the In Good Company team", "with In Good Company").
 *
 * ============================================================================
 */

// ============================================================================
//  Types
// ============================================================================

/**
 * A template string with one or more named placeholders, e.g.
 *   "Hi {firstName}, your visit on {date} is confirmed."
 *
 * The rendering code substitutes placeholders at runtime. Always provide
 * fallback values in case a placeholder is missing.
 */
export type Template = string;

export interface EmailTemplate {
  subject: Template;
  preheader: Template;
  greeting: Template;
  body: Template[];
  cta?: { label: string; href: string };
  signoff: Template;
}

export interface SmsTemplate {
  body: Template;
  maxLength: 160 | 320; // strict: 160 for cost, 320 for important notifications
}

// ============================================================================
//  1. Brand strings
// ============================================================================
//  The canonical brand strings. Used everywhere from the logo lockup to the
//  email signoff. Change these here and the change propagates everywhere.
// ============================================================================

export const brand = {
  fullName: 'You Are In Good Company',
  shortName: 'In Good Company',
  legalEntity: 'You Are In Good Company Services Ltd',
  domain: 'youareingoodcompany.co.uk',
  supportEmail: 'hello@youareingoodcompany.co.uk',
  supportPhone: '0161 000 0000', // placeholder, replace with real number
  safeguardingEmail: 'safeguarding@youareingoodcompany.co.uk',

  /** The primary tagline. Appears below the logo on most surfaces. */
  tagline: 'Companionship visits for the people who matter most.',

  /** A supporting line used where the tagline has already appeared. */
  supportingLine: 'Real company. Real people. Real visits.',

  /** The master headline. Hero section, opening of long-form copy. */
  masterHeadline: "You can't always be there. You can be sure they're in good company.",

  /** The closing line. Every public page ends with this. Footer, email
   *  signoffs, post-visit reports. It is the brand signature. */
  closingLine: 'You are in good company.',

  /** Supply-side sub-brand. The community companions belong to. */
  companionSubBrand: 'The Companion Club',
} as const;

// ============================================================================
//  2. Navigation and structural
// ============================================================================

export const nav = {
  primary: {
    home: 'Home',
    howItWorks: 'How it works',
    companions: 'Our companions',
    pricing: 'Pricing',
    about: 'About',
    contact: 'Contact',
  },
  secondary: {
    safeguarding: 'Safeguarding',
    faq: 'Questions',
    joinClub: 'Join The Companion Club',
    accessibility: 'Accessibility',
    privacy: 'Privacy',
    terms: 'Terms',
    cookies: 'Cookies',
  },
  portal: {
    family: {
      home: 'Home',
      visits: 'Visits',
      companions: 'Your companions',
      plan: 'Plan and payments',
      household: 'Household',
      messages: 'Messages',
      settings: 'Settings',
    },
    companion: {
      home: 'Today',
      calendar: 'Calendar',
      visits: 'Visits',
      profile: 'Profile',
      earnings: 'Earnings',
      training: 'Training',
      messages: 'Messages',
      account: 'Account',
    },
    operator: {
      dashboard: 'Today',
      families: 'Families',
      companions: 'Companions',
      visits: 'Visits',
      safeguarding: 'Safeguarding',
      payments: 'Payments',
      audit: 'Audit',
      content: 'Content',
    },
  },
  cta: {
    primary: 'Book a call',
    secondary: 'Call us',
    tertiary: 'See how it works',
  },
} as const;

// ============================================================================
//  3. Home page
// ============================================================================

export const home = {
  hero: {
    eyebrow: 'For families with a parent or grandparent who lives alone',
    headline: brand.masterHeadline,
    body:
      'A real visit from a real person, every week. ' +
      'Vetted. Trained. Insured. The same companion every time.',
    primaryCta: 'Book a call',
    secondaryCta: 'See how it works',
    reassurance: 'Free initial call. No pressure. No subscription until you are ready.',
  },

  trust: {
    title: 'Why families trust us',
    points: [
      {
        title: 'The same companion every visit',
        body:
          'We match your mum or dad with one person who comes back every week. ' +
          'Continuity matters. A familiar face matters.',
      },
      {
        title: 'Enhanced DBS. Trained. Insured.',
        body:
          'Every companion is checked, trained, and insured before their first visit. ' +
          'We do not cut corners on safeguarding. Ever.',
      },
      {
        title: 'A short note after every visit',
        body:
          'Within hours of every visit, you receive a warm note from your companion. ' +
          'How your mum or dad seemed. What they did together. ' +
          'You will read it on your way home from work.',
      },
    ],
  },

  howItWorksSummary: {
    title: 'How it works, in three steps',
    steps: [
      {
        number: '01',
        title: 'Tell us about your mum or dad',
        body:
          'A short conversation with one of our team. ' +
          'What they enjoy, where they live, what would feel right.',
      },
      {
        number: '02',
        title: 'Meet the companion we suggest',
        body:
          'We propose someone we think will be a good fit. ' +
          'You see their photo, their bio, and what makes them them.',
      },
      {
        number: '03',
        title: 'Book your first visit',
        body:
          'A cup of tea. A walk. A trip to the garden centre. ' +
          'You read about it the same day.',
      },
    ],
    cta: 'See the full process',
    ctaHref: '/how-it-works',
  },

  testimonial: {
    title: 'In their own words',
    quote:
      'I read Sarah\'s note about my mum on the train home from work. ' +
      'It is the highlight of my Wednesday. I know she is alright.',
    attribution: 'Helen, daughter, paying for visits to her mum Margaret',
  },

  finalCta: {
    title: 'Ready to start?',
    body:
      'A 20 minute call. No commitment. We will tell you honestly whether ' +
      'we are the right fit for your mum or dad.',
    primary: 'Book a call',
    secondary: 'Or call us on ' + brand.supportPhone,
  },

  closingLine: brand.closingLine,
} as const;

// ============================================================================
//  4. How it works page
// ============================================================================

export const howItWorks = {
  hero: {
    eyebrow: 'How it works',
    headline: 'Companionship, organised the way it should be.',
    body:
      'Most families come to us through worry. A bad weekend phone call. ' +
      'A Christmas visit that revealed how much time their mum or dad spends alone. ' +
      'A sibling who is not pulling their weight. ' +
      'We make the next step easy.',
  },

  steps: [
    {
      number: '01',
      title: 'Tell us about your mum or dad',
      lead: 'The first call is twenty minutes. We listen.',
      body: [
        'You book a call at a time that works for you. One of our team calls.',
        'We ask about your mum or dad: where they live, what they enjoy, ' +
          'how they are getting on. We ask what worries you. ' +
          'We ask what good company would look like in their week.',
        'It is a conversation, not a checklist. We listen more than we talk.',
      ],
    },
    {
      number: '02',
      title: 'We propose a companion',
      lead: 'Someone we think will be a good fit. One person. The same one every visit.',
      body: [
        'Within 48 hours we email you a profile. Photo, first name, ' +
          'three short paragraphs about who they are.',
        'They live near your mum or dad. They share an interest. ' +
          'They have been through our vetting and training.',
        'If you like the look of them, we set up a free introduction visit. ' +
          'If you do not, we propose someone else. No pressure.',
      ],
    },
    {
      number: '03',
      title: 'A first visit, on us',
      lead: 'A short introduction visit. No charge. To see if it feels right.',
      body: [
        'Your companion visits your mum or dad for an hour. ' +
          'A cup of tea. A chat. Nothing more.',
        'Afterwards, your companion sends you a short note about how it went.',
        'If it felt right for everyone, we set up a regular weekly visit. ' +
          'If it did not, we go back to step two.',
      ],
    },
    {
      number: '04',
      title: 'Every week, the same time, the same person',
      lead: 'Routine builds trust. Trust changes everything.',
      body: [
        'Most families settle into a weekly or fortnightly rhythm. ' +
          'Wednesday afternoons. Saturday mornings. Whatever fits.',
        'Your companion arrives. They do something together. ' +
          'A walk. A cup of tea. A bus to the garden centre. The cinema.',
        'After every visit, you receive a short note. ' +
          'What they did, how your mum or dad seemed.',
      ],
    },
  ],

  whatHappensIf: {
    title: 'What if...',
    items: [
      {
        question: 'What if my companion is unwell?',
        answer:
          'We let you know as early as we can and offer a familiar back-up companion ' +
          'from the same area. Continuity matters to us too. We do not send ' +
          'someone your mum or dad has never met without telling you.',
      },
      {
        question: 'What if my mum or dad does not like their companion?',
        answer:
          'We propose someone else. It happens. Chemistry is real. ' +
          'You will not be charged for a regular visit until the match feels right.',
      },
      {
        question: 'What if I want to cancel?',
        answer:
          'You pause or cancel in one click in your account. ' +
          'No phone call. No retention conversation. No guilt.',
      },
      {
        question: 'What if my mum or dad needs more than companionship?',
        answer:
          'We are companions, not carers. ' +
          'If your mum or dad needs help with medication, washing, or anything ' +
          'clinical, we will tell you honestly and recommend a regulated home-care ' +
          'agency we trust.',
      },
    ],
  },

  closingLine: brand.closingLine,
} as const;

// ============================================================================
//  5. Pricing page
// ============================================================================

export const pricing = {
  hero: {
    eyebrow: 'Pricing',
    headline: 'Honest pricing for honest visits.',
    body:
      'One hourly rate. No hidden fees. ' +
      'Pause or cancel any time. No long contracts.',
  },

  tiers: [
    {
      name: 'Weekly visits',
      price: '£32',
      unit: 'per hour',
      mostPopular: true,
      description:
        'The same companion every week. Most families choose this. ' +
        'Minimum two hours per visit.',
      features: [
        'The same companion every visit',
        'Two hour minimum visit',
        'Post-visit note within four hours',
        'Pause or cancel any time',
        'Free introduction visit',
      ],
      cta: 'Book a call',
    },
    {
      name: 'Fortnightly visits',
      price: '£32',
      unit: 'per hour',
      description:
        'The same companion, every other week. For families who want ' +
        'regularity without weekly. Minimum two hours per visit.',
      features: [
        'The same companion every visit',
        'Two hour minimum visit',
        'Post-visit note within four hours',
        'Pause or cancel any time',
        'Free introduction visit',
      ],
      cta: 'Book a call',
    },
    {
      name: 'Block of hours',
      price: '£35',
      unit: 'per hour',
      description:
        'Pre-purchase a pool of hours. Use them when you need them. ' +
        'For families with less regular needs.',
      features: [
        '20 hour minimum block',
        'Use within 12 months',
        'Same companion preference where possible',
        'Post-visit note within four hours',
      ],
      cta: 'Book a call',
    },
  ],

  attendanceAllowanceNote: {
    title: 'Did you know?',
    body:
      'If your mum or dad receives Attendance Allowance, the visits we provide ' +
      'are exactly the kind of thing it is meant to pay for. ' +
      'No assessment needed. We can talk you through it.',
  },

  whatIsNotIncluded: {
    title: 'What is not included',
    items: [
      'Personal care (washing, dressing, toileting)',
      'Medication management',
      'Cleaning, laundry, or housekeeping',
      'Medical or clinical support',
      'Overnight stays',
    ],
    footnote:
      'If your mum or dad needs any of these, we will recommend a ' +
      'regulated home-care agency we trust.',
  },

  closingLine: brand.closingLine,
} as const;

// ============================================================================
//  6. Safeguarding page
// ============================================================================

export const safeguarding = {
  hero: {
    eyebrow: 'Safeguarding',
    headline: 'The promise underneath the visits.',
    body:
      'Letting a stranger into your mum or dad\'s home is a big thing. ' +
      'We treat it that way.',
  },

  pillars: [
    {
      title: 'Enhanced DBS',
      body:
        'Every companion holds an Enhanced DBS certificate before they ' +
        'meet a recipient. We renew them on schedule and check them at ' +
        'every booking. No DBS, no visit. No exceptions.',
    },
    {
      title: 'Vetted and trained',
      body:
        'Every companion goes through application, phone screen, ' +
        'in-person interview, two references, and three training modules ' +
        'on safeguarding, dignity, and lone-working. ' +
        'It takes around three weeks. We do not shortcut it.',
    },
    {
      title: 'Insured from day one',
      body:
        'We hold Public Liability and Professional Indemnity insurance ' +
        'covering every visit. Certificates available on request.',
    },
    {
      title: 'A named safeguarding lead',
      body:
        'A trained safeguarding lead at In Good Company is responsible ' +
        'for any concern raised. ' +
        'You can reach them directly: ' + brand.safeguardingEmail + '.',
    },
    {
      title: 'A short note after every visit',
      body:
        'Every visit ends with a short note from your companion. ' +
        'Anything they noticed, anything to flag. ' +
        'You see it. We see it. Nothing is missed.',
    },
    {
      title: 'A cooling-off window before the first visit',
      body:
        'No first visit happens within 24 hours of booking. ' +
        'You have time to change your mind. So does your mum or dad.',
    },
  ],

  raiseAConcern: {
    title: 'Raise a concern',
    body:
      'If you are ever worried about anything you have seen, heard, ' +
      'or felt, please tell us. We will treat it seriously and we will ' +
      'tell you what we have done.',
    contactLabel: 'Email our safeguarding lead',
    contactEmail: brand.safeguardingEmail,
    phoneLabel: 'Or call us',
    phone: brand.supportPhone,
  },

  closingLine: brand.closingLine,
} as const;

// ============================================================================
//  7. FAQ
// ============================================================================
//  Keep this list lean. Real questions only. If a question is here that no
//  family has actually asked, take it out.
// ============================================================================

export const faq = {
  hero: {
    eyebrow: 'Questions',
    headline: 'Questions families ask.',
    body: 'If yours is not here, please ask us.',
  },

  groups: [
    {
      title: 'About the visits',
      items: [
        {
          question: 'What does a typical visit look like?',
          answer:
            'A cup of tea and a chat. A walk to the local park. ' +
            'A trip to the garden centre or the cinema. ' +
            'The visit is what your mum or dad enjoys. ' +
            'Your companion plans it with them.',
        },
        {
          question: 'How long is a visit?',
          answer:
            'Minimum two hours. Most families book two or three hours per visit. ' +
            'Longer for outings.',
        },
        {
          question: 'Where do the visits happen?',
          answer:
            'Most start at home, with a cup of tea. ' +
            'Many include a short walk or a trip somewhere local. ' +
            'Whatever feels right.',
        },
        {
          question: 'Will it always be the same companion?',
          answer:
            'Yes. That is the point. ' +
            'If your companion is unwell or on holiday, we propose a ' +
            'familiar back-up from the same area and tell you in advance.',
        },
      ],
    },
    {
      title: 'About the companions',
      items: [
        {
          question: 'Who becomes a companion?',
          answer:
            'Recently retired teachers, nurses returning part-time, ' +
            'people who looked after their own parents, ' +
            'people who have lived in the area for a long time and ' +
            'already know how to be alongside someone without ' +
            'rushing them. Aged 21 or over. ' +
            'Warmth and reliability matter more than experience.',
        },
        {
          question: 'How do you check them?',
          answer:
            'Enhanced DBS, two references, an in-person interview, ' +
            'three training modules, and a final sign-off interview. ' +
            'Around three weeks end to end.',
        },
        {
          question: 'How are companions paid?',
          answer:
            'A fair hourly rate, paid weekly. ' +
            'They are not on zero-hour scraps. We invest in them so they stay.',
        },
      ],
    },
    {
      title: 'About what we do not do',
      items: [
        {
          question: 'Do you provide personal care?',
          answer:
            'No. We are not a care agency. ' +
            'If your mum or dad needs help with washing, dressing, ' +
            'toileting, or medication, we will recommend a regulated ' +
            'home-care agency we trust.',
        },
        {
          question: 'Do you do cleaning or housework?',
          answer:
            'No. A companion may help tidy a teacup, but they are not there ' +
            'to clean. The visit is about your mum or dad, not the house.',
        },
        {
          question: 'Can a companion drive my parent to a hospital appointment?',
          answer:
            'In some cases yes, with prior agreement. ' +
            'Companions who drive are insured for this. ' +
            'Please tell us in advance so we can confirm.',
        },
      ],
    },
    {
      title: 'About payment and cancellation',
      items: [
        {
          question: 'How do I pay?',
          answer:
            'By card. We set up a weekly or fortnightly subscription ' +
            'after the introduction visit. ' +
            'You can pause or cancel any time, in one click.',
        },
        {
          question: 'Is there a contract?',
          answer:
            'No long contract. Visits are billed in advance for the week ahead. ' +
            'If you pause, you stop being billed.',
        },
        {
          question: 'Can my mum or dad pay instead of me?',
          answer:
            'Yes. Some families set the bill in the recipient\'s name. ' +
            'Some pay themselves on a card in the family\'s name. ' +
            'Tell us which works for you.',
        },
        {
          question: 'Will Attendance Allowance cover this?',
          answer:
            'Often, yes. Attendance Allowance is not means-tested and is ' +
            'not ring-fenced. Most recipients spend it on exactly this kind ' +
            'of help. We are happy to talk you through it.',
        },
      ],
    },
  ],

  closingLine: brand.closingLine,
} as const;

// ============================================================================
//  8. Join The Companion Club (companion recruitment landing)
// ============================================================================

export const joinCompanionClub = {
  hero: {
    eyebrow: 'The Companion Club',
    headline: 'Spend an afternoon with someone wonderful. Get paid for it.',
    body:
      'We are looking for warm, reliable, sensible people to become ' +
      'companions. If that sounds like you, we would love to hear from you.',
    primaryCta: 'Apply now',
    secondaryCta: 'See what a week looks like',
  },

  whatItIs: {
    title: 'What being a companion looks like',
    points: [
      {
        title: 'Real visits with real people',
        body:
          'Two to four families a week. The same families. ' +
          'You build a friendship. They come to count on you.',
      },
      {
        title: 'Paid weekly, fairly',
        body:
          'A clear hourly rate. Paid into your bank account every Friday. ' +
          'No zero-hour scraps. No surprises.',
      },
      {
        title: 'Flexible to fit your life',
        body:
          'You set your availability. Mornings only. Afternoons only. ' +
          'Whatever works around what else you have on.',
      },
      {
        title: 'Looked after',
        body:
          'Insurance, training, a named safeguarding lead, ' +
          'and a small team you can pick up the phone to. ' +
          'You are part of The Companion Club, not on your own.',
      },
    ],
  },

  whatWeLookFor: {
    title: 'What we look for',
    intro:
      'The right shape of life matters more than any one job title. ' +
      'We meet recently retired teachers, nurses returning part-time, ' +
      'small-business owners winding down, parents whose own children ' +
      'have grown up, neighbours who already look in on the older people ' +
      'on their street. Aged 21 or over, settled in the area, energised ' +
      'by being alongside someone unhurried.',
    list: [
      'Warmth and patience',
      'Reliability above almost everything else',
      'A history of being alongside friends, family, or neighbours ' +
        'without rushing them',
      'Settled life in the UK - we look for five or so years of ' +
        'residence, though we are open to fewer when the rest fits',
      'Stable weekly availability you can hold for at least six months',
      'Common sense and good judgement under pressure',
      'A car or comfortable public transport access in South Manchester, ' +
        'Trafford, Stockport, or Salford',
      'Willingness to go through Enhanced DBS, references, and our training',
      'Aged 21 or over',
    ],
  },

  notForYou: {
    title: 'This is probably not for you if...',
    list: [
      'You are looking for full-time hours from week one',
      'You want to do personal care (washing, dressing, medication)',
      'You prefer a clinical care role with a uniform and a clipboard',
      'You cannot commit to seeing the same families regularly',
    ],
  },

  process: {
    title: 'How the process works',
    steps: [
      'Apply online (three minutes).',
      'Phone screen with our team (thirty minutes).',
      'In-person interview in a café in your area (forty-five minutes).',
      'Enhanced DBS, two references, three training modules (two to three weeks).',
      'Final sign-off and your first match. Welcome to The Companion Club.',
    ],
  },

  closingLine: brand.closingLine,
} as const;

// ============================================================================
//  9. Contact
// ============================================================================

export const contact = {
  hero: {
    eyebrow: 'Contact',
    headline: 'Talk to us.',
    body:
      'Most families speak to us before they book. ' +
      'It is the right way round. ' +
      'We will listen, answer your questions, and tell you honestly ' +
      'whether we can help.',
  },

  channels: {
    phone: {
      label: 'Call us',
      number: brand.supportPhone,
      hours: 'Monday to Friday, 9am to 6pm. Saturdays, 10am to 2pm.',
    },
    email: {
      label: 'Email us',
      address: brand.supportEmail,
      sla: 'We reply within one working day.',
    },
    safeguarding: {
      label: 'Raise a safeguarding concern',
      address: brand.safeguardingEmail,
      sla: 'A named lead responds within four working hours.',
    },
  },

  form: {
    title: 'Or book a call',
    submitLabel: 'Book my call',
    fields: {
      yourName: { label: 'Your name', placeholder: 'Helen Smith' },
      yourPhone: { label: 'Your phone number', placeholder: '07700 900000' },
      recipientPostcode: {
        label: "Your mum or dad's postcode",
        placeholder: 'M20 1AA',
        help: 'So we can confirm we cover the area.',
      },
      whenToCall: {
        label: 'Best time to call',
        options: ['Mornings', 'Afternoons', 'Evenings', 'Anytime'],
      },
      tellUs: {
        label: 'What is on your mind?',
        placeholder:
          'A sentence or two about why you are looking, ' +
          'and what would feel right for your mum or dad.',
      },
    },
    consent:
      'By submitting, you agree to our privacy notice. ' +
      'We will only use your details to call you back about your enquiry.',
  },

  closingLine: brand.closingLine,
} as const;

// ============================================================================
//  10. Transactional emails
// ============================================================================
//  Every email follows the same shape: subject, preheader, greeting, body,
//  optional CTA, signoff. The signoff is always the brand closing line.
//
//  Placeholders:
//    {firstName}      First name of the recipient of the email
//    {recipientName}  First name of the visit recipient (mum, dad)
//    {companionName}  First name of the companion
//    {date}           "Wednesday 4 June"
//    {time}           "2pm"
//    {duration}       "two hours"
//    {visitRef}       "IGC-2026-00123"
//    {amount}         "£64.00"
//    {linkUrl}        Always include as a CTA, never inline a URL in body
// ============================================================================

export const emails = {

  // --------------------------------------------------------------------------
  //  Family side
  // --------------------------------------------------------------------------

  familyWelcome: {
    subject: 'Welcome, {firstName}. Here is what happens next.',
    preheader:
      'A few words on what to expect from us, and how we will look ' +
      'after your mum or dad.',
    greeting: 'Hello {firstName},',
    body: [
      'Thank you for getting in touch. We are so glad you did.',
      'One of our team will call you within one working day. ' +
        'It is a twenty minute conversation. We listen more than we talk. ' +
        'We will ask about your mum or dad: where they live, what they enjoy, ' +
        'how they are getting on. We will tell you honestly whether we can help.',
      'In the meantime, if you would like to read a little more about who we ' +
        'are and how we work, here are a few links.',
    ],
    cta: { label: 'How it works', href: '/how-it-works' },
    signoff: brand.closingLine,
  } satisfies EmailTemplate,

  bookingProposed: {
    subject: 'A companion we think will suit {recipientName}',
    preheader:
      'We would like to introduce {companionName}. Take a look and let us know.',
    greeting: 'Hello {firstName},',
    body: [
      'Thank you for the chat earlier this week. ' +
        'We have been thinking about who might suit {recipientName}, ' +
        'and we would like to introduce {companionName}.',
      '{companionName} lives near {recipientName} and has been with us for ' +
        'a while. We have written a short bio so you can get a feel for them ' +
        'before you meet.',
      'If they look right to you, reply to this email and we will arrange ' +
        'a free introduction visit. If they do not feel right, tell us. ' +
        'We will propose someone else. No pressure either way.',
    ],
    cta: { label: 'See {companionName}\'s bio', href: '{linkUrl}' },
    signoff: brand.closingLine,
  } satisfies EmailTemplate,

  bookingConfirmed: {
    subject: 'Your first visit is confirmed for {date}',
    preheader:
      '{companionName} will visit {recipientName} on {date} at {time}.',
    greeting: 'Hello {firstName},',
    body: [
      'Your first visit is booked.',
      '{companionName} will visit {recipientName} on {date} at {time}, ' +
        'for {duration}.',
      'Your reference for this visit is {visitRef}. ' +
        'We will send you a short note from {companionName} within four hours ' +
        'of the visit ending.',
      'If anything changes, please call us on ' + brand.supportPhone + '.',
    ],
    cta: { label: 'See visit details', href: '{linkUrl}' },
    signoff: brand.closingLine,
  } satisfies EmailTemplate,

  visitReminder24h: {
    subject: 'A reminder about tomorrow\'s visit',
    preheader:
      '{companionName} visits {recipientName} tomorrow at {time}.',
    greeting: 'Hello {firstName},',
    body: [
      'Just a short note to let you know that {companionName} will ' +
        'visit {recipientName} tomorrow, {date}, at {time}.',
      'You do not need to do anything. We will send you a note ' +
        'after the visit.',
    ],
    signoff: brand.closingLine,
  } satisfies EmailTemplate,

  postVisitReport: {
    subject: 'How {recipientName} was today, from {companionName}',
    preheader:
      'A short note from {companionName} about your visit.',
    greeting: 'Hello {firstName},',
    body: [
      'A note from {companionName} about today\'s visit with {recipientName}.',
      // The body of the post-visit report itself is inserted here at runtime.
      // It is companion-authored prose, never templated.
      '{reportBody}',
      'See you next week. If anything in this note prompts a question, ' +
        'please reply and we will get back to you.',
    ],
    cta: { label: 'See full visit details', href: '{linkUrl}' },
    signoff: brand.closingLine,
  } satisfies EmailTemplate,

  paymentReceipt: {
    subject: 'Your receipt for this week\'s visits',
    preheader: 'A receipt for {amount} for visits to {recipientName}.',
    greeting: 'Hello {firstName},',
    body: [
      'Thank you. We have charged {amount} to your card on file for ' +
        'this week\'s visits to {recipientName}.',
      'Your invoice is attached, and available any time in your account.',
    ],
    cta: { label: 'See your account', href: '{linkUrl}' },
    signoff: brand.closingLine,
  } satisfies EmailTemplate,

  paymentFailed: {
    subject: 'A small problem with your card',
    preheader:
      'We could not take this week\'s payment. Could you take a look?',
    greeting: 'Hello {firstName},',
    body: [
      'We tried to take this week\'s payment of {amount} for ' +
        'visits to {recipientName}, but the payment did not go through. ' +
        'Cards expire, banks block transactions, it happens.',
      'Could you update your card details when you have a moment? ' +
        'Visits are not affected for now, and we will try again in two days.',
    ],
    cta: { label: 'Update card details', href: '{linkUrl}' },
    signoff: brand.closingLine,
  } satisfies EmailTemplate,

  // --------------------------------------------------------------------------
  //  Companion side
  // --------------------------------------------------------------------------

  companionApplicationReceived: {
    subject: 'Thank you for applying to The Companion Club',
    preheader: 'We will be in touch within five working days.',
    greeting: 'Hello {firstName},',
    body: [
      'Thank you for applying to The Companion Club.',
      'One of our team reads every application carefully. ' +
        'We will be in touch within five working days. ' +
        'If you have not heard from us by then, please email us at ' +
        brand.supportEmail + ' and chase us.',
    ],
    signoff: brand.closingLine,
  } satisfies EmailTemplate,

  companionAccepted: {
    subject: 'Welcome to The Companion Club',
    preheader: 'Here is what happens in your first month with us.',
    greeting: 'Hello {firstName},',
    body: [
      'Welcome. We are so glad to have you with us.',
      'The next step is your onboarding. You will see your checklist in ' +
        'your account: Enhanced DBS, two references, three training modules. ' +
        'Most companions complete it in two to three weeks.',
      'Anything you need, the team is here for you. You are not on your own.',
    ],
    cta: { label: 'Open your onboarding checklist', href: '{linkUrl}' },
    signoff: brand.closingLine,
  } satisfies EmailTemplate,

  companionVisitAssigned: {
    subject: 'A new visit on your calendar: {date} at {time}',
    preheader: 'A visit with {recipientName} has been booked.',
    greeting: 'Hello {firstName},',
    body: [
      'You have a new visit on your calendar.',
      'Date: {date} at {time}, for {duration}. ' +
        'Recipient: {recipientName}. Reference: {visitRef}.',
      'You can see the full details, including any special notes from ' +
        'the family, in your portal.',
    ],
    cta: { label: 'Open the visit', href: '{linkUrl}' },
    signoff: brand.closingLine,
  } satisfies EmailTemplate,

  companionPostVisitReminder: {
    subject: 'A short note from today\'s visit, please',
    preheader: 'The family is waiting to hear how it went.',
    greeting: 'Hello {firstName},',
    body: [
      'Just a gentle nudge to file your note from today\'s visit with ' +
        '{recipientName} when you have a moment. ' +
        'It takes most companions about three minutes on a phone.',
      'The family loves these notes. They make a real difference.',
    ],
    cta: { label: 'File the note', href: '{linkUrl}' },
    signoff: brand.closingLine,
  } satisfies EmailTemplate,

  companionWeeklyPayout: {
    subject: 'Your pay for the week',
    preheader: 'A summary of this week\'s visits and earnings.',
    greeting: 'Hello {firstName},',
    body: [
      'This week you completed visits worth {amount}, which will be in ' +
        'your bank account by end of day Friday.',
      'A full breakdown is in your earnings page.',
    ],
    cta: { label: 'See earnings', href: '{linkUrl}' },
    signoff: brand.closingLine,
  } satisfies EmailTemplate,

  // --------------------------------------------------------------------------
  //  Auth and account
  // --------------------------------------------------------------------------

  magicLink: {
    subject: 'Your sign-in link',
    preheader: 'Click within fifteen minutes to sign in.',
    greeting: 'Hello,',
    body: [
      'Click the button below to sign in to your account. ' +
        'The link works once and expires in fifteen minutes.',
      'If you did not ask to sign in, please ignore this email. ' +
        'No one can sign in without the link.',
    ],
    cta: { label: 'Sign in', href: '{linkUrl}' },
    signoff: brand.closingLine,
  } satisfies EmailTemplate,

  passwordReset: {
    subject: 'Reset your password',
    preheader: 'Click within thirty minutes to set a new password.',
    greeting: 'Hello,',
    body: [
      'Someone (we hope it was you) asked to reset the password on this ' +
        'account. Click below to set a new one. The link expires in thirty minutes.',
      'If it was not you, please ignore this email. Your password has not changed.',
    ],
    cta: { label: 'Reset password', href: '{linkUrl}' },
    signoff: brand.closingLine,
  } satisfies EmailTemplate,

} as const;

// ============================================================================
//  11. SMS templates
// ============================================================================
//  Keep these short. 160 characters where possible. Branded but not chatty.
// ============================================================================

export const sms = {

  twoFactorCode: {
    body:
      'Your In Good Company sign-in code is {code}. ' +
      'It expires in 5 minutes. We will never ask for this code.',
    maxLength: 160,
  } satisfies SmsTemplate,

  familyVisitReminder24h: {
    body:
      'Hi {firstName}, just a reminder: {companionName} will visit ' +
      '{recipientName} tomorrow at {time}. - In Good Company',
    maxLength: 160,
  } satisfies SmsTemplate,

  companionVisitReminder24h: {
    body:
      'Hi {firstName}, a reminder: you visit {recipientName} at {time} ' +
      'tomorrow. Address and notes in your portal. - In Good Company',
    maxLength: 160,
  } satisfies SmsTemplate,

  companionVisitReminder2h: {
    body:
      'Hi {firstName}, your visit with {recipientName} starts in 2 hours ' +
      'at {time}. Drive safe. - In Good Company',
    maxLength: 160,
  } satisfies SmsTemplate,

  companionMissingReport: {
    body:
      'Hi {firstName}, we are still waiting for your note from today\'s ' +
      'visit. The family is waiting. Please file it when you can. ' +
      '- In Good Company',
    maxLength: 320,
  } satisfies SmsTemplate,

  urgentSafeguarding: {
    body:
      'A safeguarding concern has been raised. Our lead is on it ' +
      'and will call you within the hour. - In Good Company',
    maxLength: 160,
  } satisfies SmsTemplate,

} as const;

// ============================================================================
//  12. Post-visit report (companion-facing form scaffolding)
// ============================================================================
//  The post-visit report is companion-authored prose. We do not template the
//  body. But the form scaffolding (labels, hints, defaults, sign-off) lives
//  here so it can be edited as we learn what works.
// ============================================================================

export const postVisitReport = {
  formTitle: 'Your note for the family',
  formIntro:
    'A short note, in your own words. The family will read it within ' +
    'a few hours. Warm and specific is better than long and tidy.',

  fields: {
    whatYouDid: {
      label: 'Where you went and what you did',
      hint: 'One line. "We had a cup of tea and watched the football." Plenty.',
      placeholder: 'A cup of tea and a walk to the garden centre.',
    },
    howTheySeemed: {
      label: 'How {recipientName} seemed today',
      hint:
        'Two to four sentences. Warm, specific, your own words. ' +
        'Not clinical. Not a checklist. Just what you noticed.',
      placeholder:
        'In good spirits. Had been looking forward to going out. ' +
        'Bought a geranium for the front step and was very pleased with it. ' +
        'Asked about my grandchildren again. We had a proper laugh about the bus driver.',
    },
    thingsToKnow: {
      label: 'Things the family might like to know (optional)',
      hint:
        'Anything they would like to hear. A story shared. ' +
        'A piece of news. A small thing that meant something.',
      placeholder: 'She mentioned the GP appointment on Friday and seemed relaxed about it.',
    },
    flagAConcern: {
      label: 'Anything to flag (companion-only, optional)',
      hint:
        'Mood changes, mobility issues, anything that suggests we should ' +
        'pay more attention. This goes to our team, not the family. ' +
        'Tell us anything that is bothering you.',
      placeholder: '',
    },
    photoConsent: {
      label: 'Did you take a photo today, with their consent?',
      consentPrompt:
        'Confirm: {recipientName} verbally agreed to this photo being shared with the family.',
    },
  },

  signoffPreview: {
    label: 'How your note will end',
    line1: 'Until next time. You are in good company.',
    line2: '- {firstName}, with In Good Company.',
  },

  submitLabel: 'Send to the family',
  submittingLabel: 'Sending...',
  successMessage:
    'Sent. The family will read this within a few hours. Thank you.',

} as const;

// ============================================================================
//  13. Portal UI: form labels, validation, empty states
// ============================================================================

export const portalCommon = {

  signIn: {
    title: 'Sign in',
    subtitle: 'Welcome back.',
    emailLabel: 'Email',
    emailPlaceholder: 'helen@example.com',
    passwordLabel: 'Password',
    submitLabel: 'Sign in',
    magicLinkPrompt: 'Or sign in with a one-time link',
    magicLinkLabel: 'Email me a sign-in link',
    forgotPasswordLabel: 'Forgot your password?',
    signUpPrompt: 'New here?',
    signUpLabel: 'Create an account',
  },

  signUp: {
    title: 'Create an account',
    subtitle:
      'You will use this account to manage visits to your mum or dad.',
    firstNameLabel: 'Your first name',
    lastNameLabel: 'Your last name',
    emailLabel: 'Email',
    phoneLabel: 'Mobile (for visit reminders)',
    passwordLabel: 'Password',
    passwordHint:
      'At least twelve characters. A passphrase is easier than a code.',
    consentLabel:
      'I agree to the privacy notice and terms of service.',
    submitLabel: 'Create my account',
  },

  empty: {
    noUpcomingVisits: {
      title: 'No visits coming up yet.',
      body:
        'Once your first visit is booked, you will see it here. ' +
        'If you are expecting one, please call us on ' + brand.supportPhone + '.',
    },
    noPastVisits: {
      title: 'No past visits yet.',
      body: 'Your visit history will appear here after the first visit.',
    },
    noMessages: {
      title: 'No messages yet.',
      body:
        'When we send you something, it will appear here. ' +
        'We will also email you, so nothing important goes missing.',
    },
    noCompanionsAssigned: {
      title: 'No companion assigned yet.',
      body:
        'We are working on it. ' +
        'You will hear from us within 48 hours with a proposed companion.',
    },
  },

  loading: {
    generic: 'One moment...',
    visits: 'Looking up your visits...',
    payment: 'Securely processing...',
    saving: 'Saving...',
  },

  validation: {
    required: 'We need this.',
    email: 'That does not look like a valid email address.',
    phone: 'Please enter a UK mobile number.',
    postcode: 'Please enter a valid UK postcode.',
    passwordTooShort: 'Twelve characters or more, please.',
    passwordsDoNotMatch: 'The passwords do not match.',
    dateInPast: 'That date is in the past.',
    visitTooSoon:
      'We need at least 24 hours notice for the first visit. ' +
      'Please choose a later date.',
  },

  errors: {
    generic: {
      title: 'Something went wrong on our side.',
      body:
        'We are sorry. Please try again in a moment. ' +
        'If it keeps happening, call us on ' + brand.supportPhone + ' and we will sort it out.',
    },
    notFound: {
      title: 'We could not find that page.',
      body:
        'The link may be old, or the page may have moved. ' +
        'Try the home page, or call us on ' + brand.supportPhone + '.',
    },
    unauthorised: {
      title: 'You need to be signed in to see that.',
      body: 'Please sign in to your account.',
      cta: 'Sign in',
    },
    forbidden: {
      title: 'That is not yours to look at.',
      body:
        'This page belongs to a different role on the platform. ' +
        'If you think this is a mistake, please call us.',
    },
    payment: {
      title: 'Your card was declined.',
      body:
        'Your bank declined the payment. Cards expire, banks block, it happens. ' +
        'Please try a different card, or call your bank.',
    },
    rateLimit: {
      title: 'Too many tries.',
      body:
        'For security, we have paused this action for fifteen minutes. ' +
        'Please try again later.',
    },
  },

  success: {
    saved: 'Saved.',
    sent: 'Sent.',
    bookingCreated: 'Your visit is booked.',
    paymentTaken: 'Payment taken. Thank you.',
    profileUpdated: 'Your details are updated.',
  },

  confirm: {
    cancelVisit: {
      title: 'Cancel this visit?',
      body:
        'You will not be charged for visits cancelled more than 48 hours ahead. ' +
        'For visits within 48 hours, please call us.',
      confirmLabel: 'Yes, cancel this visit',
      cancelLabel: 'Keep the visit',
    },
    cancelSubscription: {
      title: 'Pause or cancel your subscription?',
      body:
        'Pausing keeps your companion match for when you come back. ' +
        'Cancelling closes the relationship. There is no penalty either way.',
      pauseLabel: 'Pause',
      cancelLabel: 'Cancel',
      keepLabel: 'Keep going',
    },
  },

} as const;

// ============================================================================
//  14. Operator console (internal, not customer-facing)
// ============================================================================
//  Operator strings can be more direct. They are read by trained staff.
//  Still in brand voice (no em dashes, no forbidden words).
// ============================================================================

export const operatorConsole = {
  todayDashboard: {
    title: 'Today',
    sections: {
      visitsToday: 'Visits today',
      missingReports: 'Reports overdue',
      newEnquiries: 'New enquiries',
      openCases: 'Open safeguarding cases',
      pendingMatches: 'Matches awaiting family response',
      expiringDbs: 'DBS expiring in 90 days',
    },
  },

  safeguarding: {
    severityLabels: {
      critical: 'Critical (immediate)',
      high: 'High (within 4 hours)',
      medium: 'Medium (within 24 hours)',
      low: 'Low (within 5 working days)',
    },
    statusLabels: {
      open: 'Open',
      triaging: 'Triaging',
      investigating: 'Investigating',
      resolving: 'Resolving',
      closed: 'Closed',
      escalated: 'Escalated externally',
    },
  },

  auditTrail: {
    title: 'Audit trail',
    intro:
      'Every change to a family, recipient, companion, visit, payment or ' +
      'safeguarding case is recorded here. Read-only.',
  },

  actions: {
    proposeMatch: 'Propose this companion to the family',
    confirmMatch: 'Confirm the match',
    flagConcern: 'Flag a concern',
    pauseCompanion: 'Pause this companion',
    suspendCompanion: 'Suspend this companion',
    offboardCompanion: 'Offboard this companion',
    refundFamily: 'Refund the family',
    overridePayout: 'Override this payout',
    exportForAudit: 'Export for audit',
  },

  reasonPrompt: 'Please write a short reason. This will be saved to the audit trail.',
} as const;

// ============================================================================
//  15. Footer (every page)
// ============================================================================

export const footer = {
  tagline: brand.tagline,
  contactPhone: brand.supportPhone,
  contactEmail: brand.supportEmail,
  legalEntity: brand.legalEntity + '. Registered in England and Wales.',
  closingLine: brand.closingLine,
  socialLinks: {
    // Placeholder. Fill in when accounts are live.
    instagram: '',
    linkedin: '',
    facebook: '',
  },
  legalLinks: {
    privacy: { label: 'Privacy', href: '/privacy' },
    terms: { label: 'Terms', href: '/terms' },
    cookies: { label: 'Cookies', href: '/cookies' },
    accessibility: { label: 'Accessibility', href: '/accessibility' },
    safeguarding: { label: 'Safeguarding', href: '/safeguarding' },
  },
} as const;

// ============================================================================
//  16. Default export
// ============================================================================

const content = {
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
} as const;

export default content;
export type Content = typeof content;
