import type { Metadata } from 'next';
import { brand } from '@igc/content';
import { PageShell } from '@/components/marketing/PageShell';
import {
  LongFormHero,
  LongFormBody,
  DraftBanner,
  Sec,
  Sub,
  P,
  UL,
  KV,
  Table,
  Placeholder,
} from '@/components/marketing/LongForm';

export const metadata: Metadata = {
  title: 'Privacy',
  description: 'How we look after your personal data.',
  robots: { index: false, follow: true },
};

const REGISTERED_OFFICE = '38 Albert Square, Manchester M2 5DB';
const COMPANY_NUMBER = '16834200';
const ICO_REGISTRATION = 'ZB987654';

export default function PrivacyPage() {
  return (
    <PageShell>
      <LongFormHero
        eyebrow="Privacy"
        title="How we look after your personal data."
      />
      <LongFormBody>
        <DraftBanner>
          This privacy notice is a working draft. It must be reviewed and
          approved by a UK solicitor specialising in data protection before
          publication. Items shown in italics are placeholders awaiting real
          values from Companies House registration, ICO registration, and
          final business address confirmation.
        </DraftBanner>

        <P>
          This privacy notice explains what personal data {brand.legalEntity}{' '}
          collects, why we collect it, how we use it, and the rights you have
          over it. It applies to everyone we hold information about, including
          families who pay us, the recipients we visit, and the companions we
          work with.
        </P>

        <Sec n="1" id="who-we-are" heading="Who we are">
          <P>
            {brand.legalEntity} (&quot;we&quot;, &quot;us&quot;,
            &quot;our&quot;) is a private limited company registered in England
            and Wales.
          </P>
          <KV
            rows={[
              ['Company number', <Placeholder key="cn">{COMPANY_NUMBER}</Placeholder>],
              ['Registered office', <Placeholder key="ro">{REGISTERED_OFFICE}</Placeholder>],
              ['Trading address', <Placeholder key="ta">{REGISTERED_OFFICE}</Placeholder>],
              ['ICO registration', <Placeholder key="ico">{ICO_REGISTRATION}</Placeholder>],
              [
                'Contact email',
                <a key="e" href={`mailto:${brand.supportEmail}`} className="link">
                  {brand.supportEmail}
                </a>,
              ],
              ['Contact phone', brand.supportPhone],
            ]}
          />
          <P>
            We are the data controller for the personal data we hold about
            you, except where this notice tells you otherwise.
          </P>
        </Sec>

        <Sec n="2" id="dpo" heading="Our data protection officer">
          <P>
            We have appointed a data protection officer who is responsible for
            overseeing how we comply with this privacy notice and answering
            questions about how we handle your data.
          </P>
          <P>You can contact our data protection officer by:</P>
          <KV
            rows={[
              [
                'Email',
                <a key="dpoe" href="mailto:privacy@youareingoodcompany.co.uk" className="link">
                  privacy@youareingoodcompany.co.uk
                </a>,
              ],
              [
                'Post',
                <Placeholder key="dpop">
                  Data Protection Officer, {brand.legalEntity}, {REGISTERED_OFFICE}
                </Placeholder>,
              ],
            ]}
          />
        </Sec>

        <Sec n="3" id="data-we-collect" heading="The personal data we collect">
          <P>
            The data we collect depends on your relationship with us. The
            three groups below cover most situations.
          </P>

          <Sub n="3.1" heading="If you are a family payer">
            <P>
              When you contact us, register an account, or pay for visits, we
              collect:
            </P>
            <UL
              items={[
                'Identity data: your name, date of birth (optional), and any preferred name you tell us',
                'Contact data: your email address, your phone number, and your address',
                'Account data: your password (stored hashed, never in plain text), two-factor authentication settings, and account preferences',
                'Payment data: card details processed by Stripe (we never see or store your full card number), billing address, transaction history',
                'Communications data: messages you exchange with our team, notes from intake calls, and any complaints or concerns you raise',
                'Relationship data: the name and contact details of the person you are booking visits for, and your relationship to them',
                'Usage data: how you use our website, including pages visited, features used, and (with your explicit consent) product analytics',
              ]}
            />
          </Sub>

          <Sub n="3.2" heading="If you are a recipient (the person we visit)">
            <P>
              When a family member books visits for you, we collect:
            </P>
            <UL
              items={[
                'Identity data: your name, date of birth, and pronouns',
                'Contact data: your home address and, if you have one and want us to use it, your phone number',
                'Profile data: your interests, hobbies, and the kinds of visits you enjoy, captured during the intake conversation with the family payer',
                'Special category data: any health or mobility information that is relevant to a visit being safe and enjoyable (for example, "uses a walking frame", "wears a hearing aid in the left ear", "do not visit after 5pm because she gets tired"). We do not collect medical diagnoses or treatment information.',
                'Consent data: specific consents you have given, for example for a photo to be included in a post-visit report',
                'Visit data: records of visits including dates, durations, and the short notes companions write after each visit',
              ]}
            />
          </Sub>

          <Sub n="3.3" heading="If you are a companion">
            <P>
              When you apply to become a companion and (if successful) work
              with us, we collect:
            </P>
            <UL
              items={[
                'Identity data: your full legal name, date of birth, address, gender (if you share it), and right-to-work documentation',
                'Contact data: your email address and phone number',
                'Application data: your application form responses, references, in-person interview notes, and final sign-off documentation',
                'Compliance data: your Enhanced DBS certificate, training records, insurance information, and any other documents required by our safeguarding policy',
                'Bank data: the bank account details we pay you into. The full payment processing is handled by Stripe Connect; we do not store your full account number directly',
                'Work data: your availability, the visits you have completed, your post-visit reports, any concerns flagged, and your earnings history',
                'Performance data: records of training completed, any feedback from families, and notes from check-ins with the team',
              ]}
            />
          </Sub>
        </Sec>

        <Sec n="4" id="how-we-collect" heading="How we collect your data">
          <P>We collect your data in the following ways:</P>
          <UL
            items={[
              'Directly from you, when you fill in a form, register an account, speak to our team, or send us a message.',
              'From the family payer, when a family member sets up an account on behalf of a recipient.',
              'From third parties, specifically from uCheck (when we run Enhanced DBS checks for companions, with your explicit consent), Stripe (when processing payments and payouts), and from references you have asked us to contact.',
              'Automatically, when you use our website. This includes basic technical information like your IP address and browser type, as well as (with your consent) product analytics about how you use the site.',
            ]}
          />
        </Sec>

        <Sec n="5" id="lawful-basis" heading="Why we use your data, and the lawful basis">
          <P>
            Under UK GDPR, we must have a lawful basis for every type of data
            we process. The table below summarises our processing.
          </P>
          <Table
            columns={['What we do', 'Why', 'Lawful basis under UK GDPR']}
            rows={[
              [
                'Set up your account and provide visits',
                'To deliver the service you have asked us to deliver',
                'Performance of a contract (Article 6(1)(b))',
              ],
              [
                'Process payments and pay companions',
                'To meet our contractual obligations to you and to the companion',
                'Performance of a contract (Article 6(1)(b))',
              ],
              [
                'Send service emails and SMS (booking confirmations, visit reminders, post-visit reports)',
                'So you and your companion can do the visits safely',
                'Performance of a contract (Article 6(1)(b))',
              ],
              [
                'Run Enhanced DBS checks on companions',
                'To meet our safeguarding obligations and protect older adults',
                'Legal obligation (Article 6(1)(c)) and substantial public interest in safeguarding adults at risk (Article 9(2)(g) and Schedule 1 of the Data Protection Act 2018)',
              ],
              [
                "Hold information about a recipient's health or mobility relevant to a visit",
                'To make visits safe and appropriate for that person',
                'Substantial public interest in safeguarding adults at risk (Article 9(2)(g) and Schedule 1 of the Data Protection Act 2018)',
              ],
              [
                'Record visits, post-visit reports, and safeguarding cases',
                'To audit our work and respond to concerns',
                'Legitimate interests (Article 6(1)(f)) and substantial public interest in safeguarding (Article 9(2)(g))',
              ],
              [
                'Improve our website and our service',
                'To make the service better over time',
                'Legitimate interests (Article 6(1)(f)), or your explicit consent for analytics cookies',
              ],
              [
                'Send you marketing emails (only if you have asked)',
                'To tell you about news, updates, and content you have signed up for',
                'Consent (Article 6(1)(a))',
              ],
              [
                'Comply with our legal obligations (tax, accounting, HMRC, etc.)',
                'The law requires us to keep records',
                'Legal obligation (Article 6(1)(c))',
              ],
              [
                'Defend ourselves in a legal dispute',
                'To establish, exercise, or defend legal claims',
                'Legitimate interests (Article 6(1)(f))',
              ],
            ]}
          />
        </Sec>

        <Sec n="6" id="who-we-share-with" heading="Who we share your data with">
          <P>
            We do not sell your personal data. Ever. We share your data only
            with the following categories of recipient, and only when there is
            a clear need.
          </P>

          <Sub n="6.1" heading="Service providers we use">
            <P>
              These are the organisations that help us run the service. Each
              is a data processor acting under our instructions. We have
              signed Data Processing Agreements with all of them.
            </P>
            <Table
              columns={['Provider', 'What they do', 'Where they store data']}
              rows={[
                ['Stripe Payments Europe Limited', 'Card payments and companion payouts', 'UK and EU'],
                ['Brevo (Sendinblue SAS)', 'Transactional and marketing emails', 'EU'],
                ['Twilio Ireland Limited', 'SMS messages (visit reminders, two-factor authentication)', 'EU'],
                ['uCheck Limited', 'Enhanced DBS checks for companions', 'UK'],
                ['Stripe Identity', 'Identity verification for companions', 'UK and EU'],
                ['Neon (Databases Inc.)', 'Database hosting', 'EU'],
                ['Vercel Inc.', "Website hosting (via Vercel's EU region)", 'EU'],
                ['Cloudflare, Inc.', 'Content delivery network, DNS, and security', 'Global edge network, with EU as primary'],
                ['AWS (Amazon Web Services EMEA SARL)', 'File storage (S3, in eu-west-2)', 'UK and EU'],
                ['Sentry (Functional Software, Inc.)', 'Error tracking', 'EU'],
                ['Posthog Inc.', 'Product analytics (only if you have consented)', 'EU'],
                ['Better Stack', 'Application logs', 'EU'],
                ['Inngest, Inc.', 'Background job processing', 'EU'],
              ]}
            />
            <P>
              If we change providers or add new ones, we will update this
              table. Material changes will be announced via email to anyone
              with an active account.
            </P>
          </Sub>

          <Sub n="6.2" heading="Other recipients">
            <P>In some situations, we may share your data with:</P>
            <UL
              items={[
                'Our professional advisers, including lawyers, accountants, and insurers, where they have a confidentiality obligation to us',
                'HMRC, regulators, and law enforcement, where the law requires us to share specific information',
                'Local authority safeguarding teams, where we have a duty to refer a safeguarding concern and the law allows or requires us to do so',
                'Emergency services, where a person is in immediate danger',
                'A buyer or successor entity, if we are ever sold or merged. We would tell you in advance, and the new owner would be bound by the same privacy notice',
              ]}
            />
          </Sub>

          <Sub n="6.3" heading="What we never do">
            <UL
              items={[
                'We never sell your data.',
                'We never share your data with advertisers or marketing networks.',
                'We never share companion personal data with families beyond the professional first name and bio we agree with each companion.',
                'We never share family or recipient personal data with companions beyond what is necessary for the visit (recipient name, address, agreed activity, any special notes).',
              ]}
            />
          </Sub>
        </Sec>

        <Sec n="7" id="international" heading="International transfers">
          <P>
            Most of our data stays in the UK or the European Economic Area
            (EEA).
          </P>
          <P>
            A small number of our service providers may transfer data outside
            the UK and EEA. Where this happens:
          </P>
          <UL
            items={[
              "We rely on the UK's adequacy regulations where they exist (for example for transfers to EEA countries).",
              "For transfers to other countries, we use the UK Information Commissioner's International Data Transfer Agreement (IDTA) or the EU Standard Contractual Clauses with the UK Addendum.",
              'We complete a transfer impact assessment before any new international transfer.',
            ]}
          />
          <P>
            You can ask us for a copy of the safeguards we have in place for
            any specific transfer.
          </P>
        </Sec>

        <Sec n="8" id="retention" heading="How long we keep your data">
          <P>
            We keep your data only for as long as we need to. The table below
            summarises our retention periods.
          </P>
          <Table
            columns={['Data', 'How long we keep it', 'Why']}
            rows={[
              [
                'Active account data (family, recipient, companion)',
                'For as long as the account is active, plus six months after closure',
                'To handle late questions, refunds, or complaints',
              ],
              [
                'Visit records and post-visit reports',
                'Seven years from the date of the visit',
                'Care Act 2014 and safeguarding audit norms',
              ],
              [
                'Financial records (invoices, payments, payouts)',
                'Seven years from the end of the tax year',
                'HMRC requirements',
              ],
              [
                'Safeguarding case files',
                'Indefinitely, in pseudonymised form, with full detail for seven years',
                'Adult safeguarding audit norms',
              ],
              ['Marketing consent records', 'Until you withdraw consent', 'UK GDPR'],
              ['Audit log entries on sensitive actions', 'Seven years', 'Compliance and dispute resolution'],
              ['Cookie consent records', 'Twelve months', 'PECR and to re-prompt you for fresh consent'],
              ['Job application data for unsuccessful companion applicants', 'Six months from decision', 'To handle complaints and re-applications'],
            ]}
          />
          <P>
            When the retention period ends, we delete or fully anonymise the
            data.
          </P>
        </Sec>

        <Sec n="9" id="your-rights" heading="Your rights">
          <P>
            You have the following rights over the personal data we hold about
            you, under UK GDPR.
          </P>
          <UL
            items={[
              'The right to be informed about what we do with your data. That is what this notice is for.',
              'The right of access. You can ask us for a copy of the data we hold about you. We respond within one month.',
              'The right to rectification. If something we hold is wrong, you can ask us to correct it.',
              'The right to erasure (the "right to be forgotten"). You can ask us to delete your data. In some cases we cannot fully delete it (for example where we are required by law to keep financial records), and we will explain why.',
              'The right to restrict processing. You can ask us to pause our use of your data while we look into a concern.',
              'The right to data portability. You can ask us for a machine-readable copy of your data so you can move it elsewhere.',
              'The right to object to processing that we are doing on the basis of legitimate interests, including profiling.',
              'Rights related to automated decision-making. We do not make any decisions about you using automated decision-making or profiling.',
            ]}
          />
          <P>
            To exercise any of these rights, email{' '}
            <a href="mailto:privacy@youareingoodcompany.co.uk" className="link">
              privacy@youareingoodcompany.co.uk
            </a>
            . There is no fee. We respond within one month. We may need to
            confirm your identity before we act on a request.
          </P>
          <P>
            If you ask us to do something and we cannot, we will tell you why
            and explain how to complain to the Information Commissioner&apos;s
            Office.
          </P>
        </Sec>

        <Sec n="10" id="cookies" heading="Cookies and similar technologies">
          <P>
            We use a small number of cookies and similar technologies to make
            the website work and to understand how it is used.
          </P>
          <UL
            items={[
              'Strictly necessary cookies keep you signed in, remember your cookie preferences, and protect against fraud. These do not need your consent.',
              'Analytics cookies (Posthog, EU region) help us understand how the site is used so we can improve it. These are opt-in. We do not load them until you accept them.',
              'Marketing cookies would only be set if we ran advertising. We do not currently run any advertising and do not currently use marketing cookies.',
            ]}
          />
          <P>You can change your preferences any time at /cookies.</P>
        </Sec>

        <Sec n="11" id="children" heading="Our service is for adults">
          <P>
            Our service is for adults. We do not knowingly collect data from
            anyone under the age of 18.
          </P>
          <P>
            The recipients we visit are aged 65 or older, and the people who
            pay for visits (the family payers) are typically adults aged 35 or
            older. If you believe we hold data about a child, please contact
            us at{' '}
            <a href="mailto:privacy@youareingoodcompany.co.uk" className="link">
              privacy@youareingoodcompany.co.uk
            </a>{' '}
            and we will delete it.
          </P>
        </Sec>

        <Sec n="12" id="security" heading="Security">
          <P>We take the security of your data seriously.</P>
          <UL
            items={[
              'All data is encrypted in transit (TLS 1.3) and at rest (AES-256).',
              "Access to personal data is role-based and audit-logged. Every access to a recipient's profile is recorded.",
              'We use two-factor authentication for all staff accounts.',
              'We carry out an annual external penetration test.',
              'We have an incident response plan and breach notification process.',
            ]}
          />
          <P>
            No system is completely secure. If we ever detect a breach that
            is likely to result in a risk to you, we will tell you and the
            Information Commissioner&apos;s Office within 72 hours of becoming
            aware of it, as required by UK GDPR.
          </P>
        </Sec>

        <Sec n="13" id="complain" heading="How to complain">
          <P>
            If you are unhappy with how we have handled your data, please tell
            us first. Email{' '}
            <a href="mailto:privacy@youareingoodcompany.co.uk" className="link">
              privacy@youareingoodcompany.co.uk
            </a>{' '}
            or write to our data protection officer at the address in section
            2. We will do our best to resolve the issue.
          </P>
          <P>
            You also have the right to complain to the UK regulator, the
            Information Commissioner&apos;s Office (ICO), at any time.
          </P>
          <KV
            rows={[
              ['Website', 'www.ico.org.uk'],
              ['Helpline', '0303 123 1113'],
            ]}
          />
          <P>
            We would appreciate the chance to address your concerns before you
            approach the ICO.
          </P>
        </Sec>

        <Sec n="14" id="changes" heading="Changes to this notice">
          <P>
            We may update this notice from time to time. When we make a
            material change, we will:
          </P>
          <UL
            items={[
              'Update the "last reviewed" date at the top of this page',
              'Email anyone with an active account to tell them what has changed',
              'Give you a reasonable period to read the updated notice before it takes effect',
            ]}
          />
          <P>Minor changes (such as fixing a typo) may be made without notice.</P>
        </Sec>

        <Sec n="15" id="questions" heading="Questions">
          <P>
            If anything in this notice is unclear, or if you have a specific
            question about how we handle your data, please contact us:
          </P>
          <KV
            rows={[
              [
                'Email',
                <a key="qe" href="mailto:privacy@youareingoodcompany.co.uk" className="link">
                  privacy@youareingoodcompany.co.uk
                </a>,
              ],
              ['Phone', brand.supportPhone],
              [
                'Post',
                <Placeholder key="qp">
                  Data Protection Officer, {brand.legalEntity}, {REGISTERED_OFFICE}
                </Placeholder>,
              ],
            ]}
          />
          <P>We aim to respond within five working days.</P>
        </Sec>
      </LongFormBody>
    </PageShell>
  );
}

