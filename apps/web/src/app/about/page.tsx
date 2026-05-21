import type { Metadata } from 'next';
import Link from 'next/link';
import { brand } from '@igc/content';
import { PageShell } from '@/components/marketing/PageShell';

export const metadata: Metadata = {
  title: 'About',
  description: 'A real company, started for a real reason.',
};

export default function AboutPage() {
  return (
    <PageShell>
      <Hero />
      <WhyWeExist />
      <WhatWeAre />
      <WhereWeWork />
      <Promises />
      <HowFunded />
      <ReadyToTalk />
    </PageShell>
  );
}

function Hero() {
  return (
    <section className="bg-cream pt-[clamp(3rem,8vw,6rem)] pb-[clamp(2rem,5vw,4rem)]">
      <div className="max-w-[1240px] mx-auto px-[clamp(1.25rem,4vw,2.5rem)]">
        <div className="max-w-[760px]">
          <span className="font-body text-[0.8125rem] font-medium uppercase tracking-[0.18em] text-stone mb-6 inline-block">
            About
          </span>
          <h1 className="font-head font-normal text-moss text-[clamp(2.5rem,6vw,4.5rem)] leading-[1.05] tracking-[-0.025em]">
            A real company,
            <br />
            <em className="italic text-terracotta">started for a real reason.</em>
          </h1>
        </div>
      </div>
    </section>
  );
}

function WhyWeExist() {
  return (
    <Section heading="Why we exist">
      <Prose>
        <p>
          We started this company because we watched our own families navigate
          the gap between regulated home-care and nothing at all.
        </p>
        <p>
          Charities have waitlists, sometimes years long. Home-care agencies
          want to sell clinical hours measured in fifteen-minute slots. Neither
          of those was what our own mums and dads needed.
        </p>
        <p>
          Most of our parents do not need washing or dressing or medication.
          They need a familiar face on a Wednesday afternoon. They need someone
          who comes back next week, and the week after, who knows their name
          and remembers their stories.
        </p>
        <p className="font-head italic text-terracotta text-[1.375rem] leading-[1.4]">
          That is what we have built.
        </p>
      </Prose>
    </Section>
  );
}

function WhatWeAre() {
  return (
    <Section heading="What we are" tint>
      <Prose>
        <p>
          We are a closed marketplace of vetted, trained, insured companions
          who visit older adults on a regular schedule. We are not a care
          agency. We do not deliver personal care, medication management, or
          anything clinical. We deliver visits.
        </p>
        <p>
          A visit is a cup of tea and a chat. A walk to the corner shop. A bus
          to the garden centre. The cinema on a quiet Wednesday afternoon. It
          is whatever the person we are visiting actually enjoys.
        </p>
        <p>
          Every companion goes through Enhanced DBS, two references, an
          in-person interview, and three training modules on safeguarding,
          dignity, and lone-working before their first visit. That takes about
          three weeks. We do not shortcut it.
        </p>
        <p>
          After every visit, the companion sends the family a short note.
          Where they went, what they did, how your mum or dad seemed. Most
          families read the note on their way home from work. It is the small
          thing that changes the most.
        </p>
      </Prose>
    </Section>
  );
}

function WhereWeWork() {
  return (
    <Section heading="Where we work">
      <Prose>
        <p>We launched in Greater Manchester, in four neighbouring boroughs:</p>
      </Prose>
      <ul className="mt-6 grid gap-3 max-w-[36ch] min-[600px]:grid-cols-2 min-[600px]:gap-x-12">
        {['South Manchester', 'Trafford', 'Stockport', 'Salford'].map((b) => (
          <li key={b} className="flex items-start gap-3 text-charcoal leading-[1.55]">
            <span aria-hidden="true" className="mt-1 text-moss font-semibold">✓</span>
            <span>{b}</span>
          </li>
        ))}
      </ul>
      <Prose className="mt-8">
        <p>
          We chose these four because they are the catchment we know best, and
          because a Didsbury-based companion can reach Chorlton, Sale,
          Stockport, and Salford in under half an hour. That tightness is what
          lets us keep the same companion matched with the same family week
          after week.
        </p>
        <p>
          We will grow into the rest of Greater Manchester next, and then into
          one or two more cities the year after. We will not expand faster
          than we can vet companions properly.
        </p>
      </Prose>
    </Section>
  );
}

function Promises() {
  return (
    <>
      <Section heading="Our promise" tint>
        <Prose className="mb-6">
          <p>This is what we promise the families who pay us.</p>
        </Prose>
        <PromiseList
          items={[
            'The same companion every visit. Always. If they are unwell, we tell you in advance, propose a familiar back-up, and stay in touch with you.',
            'A real person on the phone when you call us. Monday to Friday, 9am to 6pm. Saturdays, 10am to 2pm.',
            'A short note from the companion within four hours of every visit. With a photo, when the recipient has agreed to one.',
            'Honest pricing. One hourly rate. No hidden fees. Pause or cancel in one click, no retention conversation.',
            'A named safeguarding lead who responds to concerns within four working hours and who tells you what we are doing about it.',
          ]}
        />
        <Prose className="mt-8">
          <p>
            If we ever fall short on one of these, we want to hear about it.
            Email{' '}
            <a
              href={`mailto:${brand.supportEmail}`}
              className="text-moss underline decoration-moss/40 underline-offset-4 hover:text-terracotta hover:decoration-terracotta"
            >
              {brand.supportEmail}
            </a>{' '}
            and tell us.
          </p>
        </Prose>
      </Section>

      <Section heading="Our promise to companions">
        <Prose className="mb-6">
          <p>This is what we promise the people who do the visits.</p>
        </Prose>
        <PromiseList
          items={[
            'Meaningful work with families you come to know. Not a different home every day, not a stranger every shift.',
            'A fair hourly rate, paid weekly. No zero-hour scraps. No surprise deductions.',
            'Insurance and training paid for by us, never out of your pocket.',
            `A team you can pick up the phone to. You are part of ${brand.companionSubBrand}, not on your own.`,
            'Respect for your time. Visits are scheduled around your availability, not imposed on it.',
          ]}
        />
        <Prose className="mt-8">
          <p>
            Companions can read more on the page for those interested in
            joining us, at{' '}
            <Link
              href="/companions/join"
              className="text-moss underline decoration-moss/40 underline-offset-4 hover:text-terracotta hover:decoration-terracotta"
            >
              /companions/join
            </Link>
            .
          </p>
        </Prose>
      </Section>
    </>
  );
}

function HowFunded() {
  return (
    <Section heading="How we are funded" tint>
      <Prose>
        <p>
          We are a private limited company, {brand.legalEntity}, registered in
          England and Wales. Most of our visits are paid for by adult children
          buying companionship for their parents. A growing number are funded
          through Attendance Allowance (which most older recipients can spend
          on exactly this kind of help, with no assessment) or Direct Payments
          from local authority adult social care budgets, where the recipient
          has chosen to use us.
        </p>
        <p>
          We are not a charity. We do not take donations. We work for the
          families we serve, and we are accountable to them.
        </p>
      </Prose>
      <FounderNote />
    </Section>
  );
}

function FounderNote() {
  return (
    <figure className="mt-12 bg-paper border border-moss/[0.08] rounded-[24px] p-[clamp(1.75rem,3vw,2.5rem)]">
      <blockquote className="font-head italic text-charcoal text-[clamp(1.125rem,1.75vw,1.3125rem)] leading-[1.55] max-w-[60ch]">
        <p>
          I built this because I watched my own mother grow older in Nigeria
          while I worked in Manchester, and I thought often about who was
          sitting with her on the days I could not call. I am not the only
          person in this situation. Millions of us are managing the same quiet
          worry from a distance.
        </p>
        <p className="mt-4">
          If we have done our work properly, you should be able to read this
          page and feel two things: that we are a real company taking your
          worry seriously, and that the visits we do are the kind of thing a
          thoughtful friend would do for someone they cared about. That is the
          whole company in one sentence.
        </p>
      </blockquote>
      <figcaption className="font-body not-italic text-sm tracking-[0.12em] uppercase mt-6 text-stone">
        Bassey Eyo, Founder, Manchester
      </figcaption>
    </figure>
  );
}

function ReadyToTalk() {
  return (
    <section className="bg-moss text-cream py-[clamp(4rem,10vw,8rem)]">
      <div className="max-w-[760px] mx-auto px-[clamp(1.25rem,4vw,2.5rem)] text-center">
        <h2 className="font-head font-normal text-cream text-[clamp(2rem,5vw,3rem)] leading-[1.1] tracking-[-0.02em]">
          Ready to talk?
        </h2>
        <p className="text-cream/85 leading-[1.65] mt-6 max-w-[44ch] mx-auto">
          The first call is twenty minutes. We listen more than we talk. We
          will tell you honestly whether we are the right fit for your mum or
          dad. If we are not, we will tell you who is.
        </p>
        <div className="mt-10 flex flex-wrap gap-4 justify-center">
          <Link
            href="/#contact"
            className="inline-flex items-center justify-center px-9 py-[1.125rem] rounded-full bg-cream text-moss text-base font-medium hover:bg-cream-deep transition-colors"
          >
            Book a call
          </Link>
          <a
            href={`tel:${brand.supportPhone.replace(/\s/g, '')}`}
            className="inline-flex items-center justify-center px-9 py-[1.125rem] rounded-full border border-cream text-cream text-base font-medium hover:bg-cream hover:text-moss transition-colors"
          >
            Or call us on {brand.supportPhone}
          </a>
        </div>
      </div>
    </section>
  );
}

// ----- small primitives used by the about page sections -----

function Section({
  heading,
  tint,
  children,
}: {
  heading: string;
  tint?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className={`${tint ? 'bg-cream-deep' : 'bg-cream'} py-[clamp(3rem,6vw,5rem)]`}>
      <div className="max-w-[880px] mx-auto px-[clamp(1.25rem,4vw,2.5rem)]">
        <h2 className="font-head font-normal text-moss text-[clamp(1.75rem,4vw,2.5rem)] leading-[1.1] tracking-[-0.02em] mb-8">
          {heading}
        </h2>
        {children}
      </div>
    </section>
  );
}

function Prose({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`flex flex-col gap-5 text-charcoal text-[1.0625rem] leading-[1.7] max-w-[60ch] ${className}`}
    >
      {children}
    </div>
  );
}

function PromiseList({ items }: { items: string[] }) {
  return (
    <ul className="flex flex-col gap-3">
      {items.map((item) => (
        <li key={item} className="flex items-start gap-3 text-charcoal leading-[1.6] max-w-[60ch]">
          <span aria-hidden="true" className="mt-1 text-moss font-semibold">
            ✓
          </span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}
