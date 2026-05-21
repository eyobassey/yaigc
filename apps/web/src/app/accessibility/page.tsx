import type { Metadata } from 'next';
import { brand } from '@igc/content';
import { PageShell } from '@/components/marketing/PageShell';
import {
  LongFormHero,
  LongFormBody,
  DraftBanner,
  Sec,
  P,
  UL,
  KV,
  Placeholder,
} from '@/components/marketing/LongForm';

export const metadata: Metadata = {
  title: `Accessibility  ·  ${brand.fullName}`,
  description: 'A website that works for everyone.',
  robots: { index: false, follow: true },
};

const REGISTERED_ADDRESS = '38 Albert Square, Manchester M2 5DB';
const STATEMENT_DATE = '2026-05-21';

export default function AccessibilityPage() {
  return (
    <PageShell>
      <LongFormHero
        eyebrow="Accessibility"
        title="A website that works for everyone."
      />
      <LongFormBody>
        <DraftBanner>
          This statement is published in good faith. It will be updated after
          our first independent accessibility audit, which is scheduled for
          within four weeks of the public launch. Items shown in italics are
          placeholders that will be filled in after that first audit completes.
        </DraftBanner>

        <P>
          We have built {brand.domain} to be usable by as many people as
          possible, including those with disabilities and those using
          assistive technology. This statement explains how, what we know does
          not yet work, and how to tell us if you find something we have missed.
        </P>

        <Sec n="1" id="using" heading="Using this website">
          <P>We have designed the site to be:</P>
          <UL
            items={[
              'Readable at any zoom level up to 200%, on any modern browser, without losing any function',
              'Navigable with a keyboard only, with a visible focus indicator',
              'Compatible with the major screen readers (NVDA, VoiceOver, TalkBack)',
              "Readable in your browser's reader mode",
              'Colour-contrast compliant: every text and background combination meets at least 4.5:1 for body text and 3:1 for large text and UI elements',
              "Usable when animations are switched off (we respect your operating system's reduced-motion preference)",
            ]}
          />
          <P>You should be able to:</P>
          <UL
            items={[
              'Change your browser font size and the page will reflow',
              'Use only a keyboard to reach every link, button, form field, and accordion',
              'Navigate the page using its headings (the site uses a single H1 per page, and a clear H2/H3/H4 hierarchy)',
              'Listen to the page with a screen reader and have things announced in the right order',
              'Use voice-control software to operate every interactive element by name',
            ]}
          />
        </Sec>

        <Sec n="2" id="standard" heading="The standard we follow">
          <P>
            This website aims to conform with the{' '}
            <strong>Web Content Accessibility Guidelines (WCAG) 2.2, at the AA level</strong>.
          </P>
          <P>
            We have written our brand and code conventions to make AA
            conformance the floor, not the ceiling. Where we can reasonably
            meet AAA, we do.
          </P>
          <P>We will retest the site against WCAG 2.2 AA:</P>
          <UL
            items={[
              'Before every major release',
              'At least once a year by an independent third party',
              'Whenever we change something significant',
            ]}
          />
        </Sec>

        <Sec n="3" id="compliance-status" heading="Compliance status">
          <P>
            <Placeholder>
              This website is partially compliant with WCAG 2.2 AA. There are
              currently no known issues from internal testing, but the first
              independent audit has not yet taken place. We will replace this
              statement with an audit-backed compliance statement within four
              weeks of public launch.
            </Placeholder>
          </P>
        </Sec>

        <Sec n="4" id="not-yet-accessible" heading="What is not fully accessible yet">
          <P>
            This section will list known accessibility issues. As of{' '}
            <Placeholder>{STATEMENT_DATE}</Placeholder>, we know about the
            following.
          </P>
          <P>
            <Placeholder>
              No known issues identified during internal testing. The first
              independent audit is scheduled within four weeks of public
              launch and this section will be updated with the audit findings
              when that audit completes.
            </Placeholder>
          </P>
          <P>
            Where an issue is in our backlog to fix, we list its target fix
            date. Where an issue is one we have decided not to fix (because
            it would require a disproportionate burden under the Equality Act
            2010), we will explain why and offer an alternative way to access
            the content or service.
          </P>
        </Sec>

        <Sec n="5" id="not-in-scope" heading="Content not in scope">
          <P>
            A small number of items on the site are not within the scope of
            WCAG 2.2 AA conformance.
          </P>
          <UL
            items={[
              'Third-party content that we link to but do not control (for example, the websites of charities or partner organisations).',
              'Embedded third-party services that handle payments, identity verification, or DBS checks. We choose providers with strong accessibility records, but we cannot rewrite their interfaces.',
            ]}
          />
          <P>
            If you encounter an accessibility issue with one of these external
            services while trying to use our website, please contact us and
            we will help you complete the task another way.
          </P>
        </Sec>

        <Sec n="6" id="older-content" heading="Older content (PDFs, documents)">
          <P>We try to keep everything important on the website itself, in HTML.</P>
          <P>
            Some documents (for example, certificates of insurance, signed
            contracts, or PDFs you ask us to send) may not be fully
            accessible. If you need an alternative format, please contact us
            using the details in section 8 and we will send you an accessible
            version, normally within five working days.
          </P>
        </Sec>

        <Sec n="7" id="how-tested" heading="How we tested the site">
          <P>
            <Placeholder>
              The detailed test history below will be updated after the first
              independent audit.
            </Placeholder>
          </P>
          <UL
            items={[
              <>
                <strong>Internal testing.</strong> We tested the site with
                axe DevTools, Lighthouse, and keyboard-only navigation, against
                WCAG 2.2 AA. Last internal test:{' '}
                <Placeholder>{STATEMENT_DATE}</Placeholder>.
              </>,
              <>
                <strong>Screen-reader testing.</strong> We tested the site
                with NVDA on Windows, VoiceOver on macOS and iOS, and
                TalkBack on Android. Last screen-reader test:{' '}
                <Placeholder>{STATEMENT_DATE}</Placeholder>.
              </>,
              <>
                <strong>Independent audit.</strong>{' '}
                <Placeholder>
                  Scheduled within four weeks of public launch. The full
                  report will be available on request.
                </Placeholder>
              </>,
              <>
                <strong>User testing.</strong>{' '}
                <Placeholder>
                  Pending. We will be recruiting at least three people who
                  use assistive technology, including screen reader and
                  keyboard-only users, in the first quarter after launch.
                </Placeholder>
              </>,
            ]}
          />
        </Sec>

        <Sec n="8" id="report-a-problem" heading="Reporting an accessibility problem">
          <P>
            If you find something on this site that does not work for you,
            please tell us. We take it seriously.
          </P>
          <KV
            rows={[
              [
                'Email',
                <a key="e" href="mailto:accessibility@youareingoodcompany.co.uk" className="link">
                  accessibility@youareingoodcompany.co.uk
                </a>,
              ],
              ['Phone', brand.supportPhone],
              [
                'Post',
                <Placeholder key="p">
                  Accessibility Lead, {brand.legalEntity}, {REGISTERED_ADDRESS}
                </Placeholder>,
              ],
            ]}
          />
          <P>When you contact us, please tell us:</P>
          <UL
            items={[
              'The web address (URL) of the page where you ran into the problem',
              'What you were trying to do',
              'What happened, or did not happen',
              'The assistive technology you were using, if any',
            ]}
          />
          <P>
            We aim to respond within five working days. If a fix will take
            longer, we will tell you and give you an alternative way to
            complete what you were trying to do.
          </P>
        </Sec>

        <Sec n="9" id="enforcement" heading="Enforcement">
          <P>
            If you contact us with a complaint about the accessibility of
            this site and you are not happy with our response, you can
            contact the Equality and Human Rights Commission (EHRC). The
            EHRC is responsible for enforcing the Equality Act 2010.
          </P>
          <KV
            rows={[
              ['Equality Advisory and Support Service (EASS)', 'equalityadvisoryservice.com'],
              ['EASS helpline', '0808 800 0082'],
              ['EHRC website', 'equalityhumanrights.com'],
            ]}
          />
          <P>We would much rather hear from you first, so we can put things right.</P>
        </Sec>

        <Sec n="10" id="other-ways" heading="Other ways to use our service">
          <P>
            We know not everyone wants to use a website. If you would prefer to:
          </P>
          <UL
            items={[
              <>
                <strong>Talk to a person on the phone</strong>, call us on{' '}
                {brand.supportPhone}. Lines are open Monday to Friday, 9am to
                6pm, and Saturdays, 10am to 2pm.
              </>,
              <>
                <strong>Have a family member or friend help you</strong>,
                that is fine. They can speak to us with your permission.
              </>,
              <>
                <strong>Receive a printed version</strong> of any page on
                this site, ask us and we will post one to you, free of charge,
                normally within five working days.
              </>,
              <>
                <strong>Receive information in another format</strong> (large
                print, audio, easy-read), ask us and we will do our best.
                Tell us the format you need.
              </>,
            ]}
          />
        </Sec>

        <Sec n="11" id="working-on" heading="What we are working on">
          <P>
            Even if the audit finds the site fully compliant, accessibility
            is a continuing commitment. We are working on:
          </P>
          <UL
            items={[
              'Improving the descriptions we provide for any images and illustrations',
              'Making sure every new feature is reviewed for accessibility before it goes live',
              'Training every member of the engineering and design team in accessibility basics',
              'Including at least one person who uses assistive technology in our user research',
            ]}
          />
        </Sec>

        <Sec n="12" id="about-this" heading="About this statement">
          <KV
            rows={[
              [
                'Prepared',
                <Placeholder key="prep">{STATEMENT_DATE}</Placeholder>,
              ],
              [
                'Last reviewed',
                <Placeholder key="rev">{STATEMENT_DATE}</Placeholder>,
              ],
              [
                'Website last tested',
                <Placeholder key="tested">
                  {STATEMENT_DATE}, by our internal team
                </Placeholder>,
              ],
            ]}
          />
          <P>
            We commit to updating this statement at least once a year, and
            any time the site changes in a way that affects accessibility.
          </P>
        </Sec>
      </LongFormBody>
    </PageShell>
  );
}
