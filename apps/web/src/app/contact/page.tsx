import type { Metadata } from 'next';
import { brand } from '@igc/content';
import { PageShell } from '@/components/marketing/PageShell';
import { ContactForm } from './ContactForm';

export const metadata: Metadata = {
  title: 'Book a call',
  description:
    'Twenty minutes on the phone. We listen, you decide. No commitment.',
};

export default function ContactPage() {
  return (
    <PageShell>
      <section className="bg-cream pt-[clamp(3rem,8vw,6rem)] pb-[clamp(4rem,10vw,8rem)]">
        <div className="max-w-[1100px] mx-auto px-[clamp(1.25rem,4vw,2.5rem)] grid gap-[clamp(2.5rem,5vw,4rem)] min-[900px]:grid-cols-[1fr_1.4fr]">
          <div>
            <span className="font-body text-[0.8125rem] font-medium uppercase tracking-[0.18em] text-stone mb-6 inline-block">
              Get in touch
            </span>
            <h1 className="font-head font-normal text-moss text-[clamp(2.25rem,5vw,3.5rem)] leading-[1.05] tracking-[-0.025em]">
              Twenty minutes.
              <br />
              <em className="italic text-terracotta">No commitment.</em>
            </h1>
            <p className="text-charcoal text-lg leading-[1.65] mt-6 max-w-[42ch]">
              Tell us a little about your mum or dad and we will call you
              within a working day. The first call is twenty minutes. We
              listen more than we talk.
            </p>

            <div className="mt-10 bg-paper border border-moss/[0.08] rounded-[16px] p-6">
              <p className="font-head italic text-terracotta text-[1.125rem] leading-[1.4] mb-3">
                Would rather talk now?
              </p>
              <p className="text-charcoal leading-[1.55] mb-3">
                Call us on{' '}
                <a
                  href={`tel:${brand.supportPhone.replace(/\s/g, '')}`}
                  className="link font-medium"
                >
                  {brand.supportPhone}
                </a>
                .
              </p>
              <p className="text-stone text-sm leading-[1.55]">
                Monday to Friday, 9am to 6pm. Saturdays, 10am to 2pm.
              </p>
            </div>
          </div>

          <div>
            <ContactForm />
          </div>
        </div>
      </section>
    </PageShell>
  );
}
