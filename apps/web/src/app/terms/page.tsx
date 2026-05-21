import type { Metadata } from 'next';
import Link from 'next/link';
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
  title: 'Terms of service',
  description: 'The agreement between us, in plain English.',
  robots: { index: false, follow: true },
};

const COMPANY_NUMBER = '16834200';
const REGISTERED_ADDRESS = '38 Albert Square, Manchester M2 5DB';
const INSURANCE_CAP = '£5,000,000';
const LIABILITY_CAP = '£1,000';

export default function TermsPage() {
  return (
    <PageShell>
      <LongFormHero
        eyebrow="Terms of service"
        title="The agreement between us, in plain English."
      />
      <LongFormBody>
        <DraftBanner>
          These terms are a working draft. They must be reviewed and approved
          by a UK solicitor specialising in consumer contracts and adult
          safeguarding before publication. Specific dispute-resolution,
          liability, and warranty provisions should be reviewed against
          current UK case law and the Consumer Rights Act 2015. Items shown
          in italics are placeholders awaiting final values.
        </DraftBanner>

        <P>
          These terms govern your use of the service we provide at{' '}
          {brand.domain}. We have tried to write them clearly. Where the law
          requires us to use specific terminology, we have done so and
          explained what it means.
        </P>

        <Sec n="1" id="parties" heading="Who these terms are between">
          <P>
            These terms are between you (the family payer, the person paying
            for and arranging visits) and {brand.legalEntity}, a private
            limited company registered in England and Wales (company number{' '}
            <Placeholder>{COMPANY_NUMBER}</Placeholder>).
          </P>
          <P>
            In these terms, &quot;we&quot;, &quot;us&quot;, and &quot;our&quot;
            mean {brand.legalEntity}. &quot;You&quot; and &quot;your&quot;
            mean the family payer.
          </P>
          <P>
            If you are arranging visits for a parent, spouse, grandparent, or
            another adult (&quot;the recipient&quot;), you confirm by accepting
            these terms that you have the recipient&apos;s understanding and
            agreement to receive visits from us.
          </P>
        </Sec>

        <Sec n="2" id="what-we-do" heading="What we do">
          <P>
            We are a closed marketplace of vetted, trained, insured companions
            who provide non-clinical companionship visits to older adults.
          </P>
          <P>
            A typical visit is a cup of tea and a chat, a walk, a trip to the
            garden centre, or another sociable activity agreed between the
            companion and the recipient.
          </P>
        </Sec>

        <Sec n="3" id="what-we-do-not-do" heading="What we do not do">
          <P>We are not a care provider. We do not deliver:</P>
          <UL
            items={[
              'Personal care (washing, dressing, toileting, continence support)',
              'Medication management or any clinical task',
              'Cleaning, laundry, or housekeeping',
              'Skilled nursing or therapy',
              'Overnight stays',
              'Crisis or emergency response',
            ]}
          />
          <P>
            If the recipient&apos;s needs change so that they require any of
            the above, we will tell you, and where we can, we will recommend
            a regulated provider.
          </P>
          <P>
            We are not registered with the Care Quality Commission, and these
            terms should not be read as offering anything within the
            CQC&apos;s scope of regulation.
          </P>
        </Sec>

        <Sec n="4" id="booking" heading="Booking a visit">
          <Sub n="4.1" heading="How a booking is made">
            <UL
              items={[
                'You contact us, usually by booking a call.',
                'We have a short intake conversation with you.',
                'We propose one or more companions.',
                'You confirm the companion you would like to start with.',
                'We schedule an introduction visit. This visit is free of charge, subject to a refundable deposit (see section 5).',
                'After the introduction visit, you confirm whether you would like to start a regular schedule, and we set up your subscription.',
              ]}
            />
          </Sub>

          <Sub n="4.2" heading="The cooling-off window">
            <P>
              We will not deliver any visit within 24 hours of the booking
              being made. This gives you and the recipient time to change
              your mind.
            </P>
          </Sub>

          <Sub n="4.3" heading="Our right to decline a booking">
            <P>
              We may decline to take on a new family, or to schedule a
              particular visit, where:
            </P>
            <UL
              items={[
                'The recipient is outside our current service area',
                "The recipient's needs are outside our scope (see section 3)",
                'We do not have a suitable companion available',
                'We have reasonable grounds to believe a visit would not be safe for the recipient, the companion, or the wider household',
                'You have not paid amounts due on a prior booking',
                'We have previously asked you to stop a behaviour that has not stopped',
              ]}
            />
            <P>We will explain our reasons in writing where we decline a booking.</P>
          </Sub>
        </Sec>

        <Sec n="5" id="pricing-and-payment" heading="Pricing and payment">
          <Sub n="5.1" heading="Our prices">
            <P>
              Our prices are listed on <Link href="/pricing" className="link">/pricing</Link>{' '}
              and confirmed to you in writing before any visit is booked. The
              price you pay is the price quoted to you. We do not add hidden
              fees.
            </P>
            <P>
              Visits are charged at our standard hourly rate, with a two-hour
              minimum per visit. Travel time within the agreed service area
              is included in the hourly rate.
            </P>
          </Sub>

          <Sub n="5.2" heading="How you pay">
            <P>
              We use Stripe to process card payments. Your card details are
              stored securely by Stripe; we never see your full card number.
            </P>
            <P>You can choose one of:</P>
            <UL
              items={[
                'A weekly subscription for one regular visit per week',
                'A fortnightly subscription for one visit every two weeks',
                'A block of hours purchased in advance and drawn down per visit',
                'A one-off booking for a single visit',
              ]}
            />
            <P>Subscriptions are billed weekly or fortnightly in advance.</P>
          </Sub>

          <Sub n="5.3" heading="The introduction visit deposit">
            <P>
              When we schedule your first (introduction) visit, we take a{' '}
              <strong>£25 refundable deposit</strong> to your card. This
              deposit is refunded in full either:
            </P>
            <UL
              items={[
                'When the introduction visit takes place and you decide to continue. The deposit is credited against your first regular visit, or',
                'When the introduction visit takes place and you decide not to continue. We refund the deposit within five working days.',
              ]}
            />
            <P>
              If you cancel the introduction visit with less than 48 hours
              notice, or do not attend, the deposit is not refunded.
            </P>
          </Sub>

          <Sub n="5.4" heading="Failed payments">
            <P>
              If a payment fails, we will try again twice over five days
              using Stripe&apos;s standard retry process. If all three
              attempts fail, we will pause upcoming visits and contact you to
              update your card. We will not cancel your account or your
              companion match without first contacting you.
            </P>
          </Sub>

          <Sub n="5.5" heading="Refunds">
            <P>We will refund a visit that did not take place as agreed, including:</P>
            <UL
              items={[
                'Visits cancelled by us (other than for force majeure events outside our reasonable control)',
                'Visits where the companion did not arrive',
                "Visits that started materially late or ended materially early due to the companion's actions",
              ]}
            />
            <P>
              For all other refund requests, we will consider them in good
              faith. Email{' '}
              <a href={`mailto:${brand.supportEmail}`} className="link">
                {brand.supportEmail}
              </a>{' '}
              with the visit reference.
            </P>
          </Sub>

          <Sub n="5.6" heading="VAT">
            <P>
              <Placeholder>
                Our prices currently exclude VAT. We will update this section
                if our VAT position changes. (To be confirmed pre-launch with
                accountant.)
              </Placeholder>
            </P>
          </Sub>
        </Sec>

        <Sec n="6" id="cancellations" heading="Cancellations">
          <Sub n="6.1" heading="Cancelling a single visit">
            <P>
              You can cancel a single visit through your account, by email,
              or by phone, at any time.
            </P>
            <Table
              columns={['When you cancel', 'What happens']}
              rows={[
                ['More than 48 hours before the visit start time', 'Full refund or credit to your next visit'],
                ['Between 48 and 24 hours before', '50% credit to your next visit; companion is paid in full'],
                ['Less than 24 hours before', 'No refund; companion is paid in full'],
                ['With a safeguarding concern at any time', 'Full refund; the concern is owned by our safeguarding lead'],
              ]}
            />
          </Sub>

          <Sub n="6.2" heading="Pausing your subscription">
            <P>
              You can pause your subscription for any reason (a holiday,
              illness, a hospital stay, a season where less is needed). While
              paused, you are not billed. We will hold your companion match
              for up to twelve weeks. After twelve weeks paused, we may
              re-allocate the companion to another family, and your match
              resumes when you return only if the companion is still available.
            </P>
          </Sub>

          <Sub n="6.3" heading="Cancelling your subscription">
            <P>
              You can cancel at any time. There is no minimum term and no
              cancellation fee.
            </P>
            <P>To cancel:</P>
            <UL
              items={[
                'Click "Cancel" in your account',
                <>
                  Or email{' '}
                  <a href={`mailto:${brand.supportEmail}`} className="link">
                    {brand.supportEmail}
                  </a>
                </>,
                <>Or call us on {brand.supportPhone}</>,
              ]}
            />
            <P>We will confirm cancellation in writing within one working day.</P>
          </Sub>

          <Sub n="6.4" heading="Your statutory cooling-off period">
            <P>
              Under the Consumer Contracts (Information, Cancellation and
              Additional Charges) Regulations 2013, you have a right to
              cancel within 14 days of agreeing to take a service, without
              giving a reason and without penalty.
            </P>
            <P>
              If you ask us to start delivering visits during this 14-day
              period, you agree that:
            </P>
            <UL
              items={[
                'We can charge you for the visits we have already delivered before you cancelled',
                'You waive your right to a full refund for those completed visits',
              ]}
            />
            <P>You do not lose your right to cancel for visits not yet delivered.</P>
          </Sub>

          <Sub n="6.5" heading="Our right to cancel">
            <P>We may cancel your subscription or any booked visit where:</P>
            <UL
              items={[
                'You have not paid amounts due, after we have given you reasonable notice',
                "You, the recipient, or any other person in the recipient's household has behaved in a way that endangered the safety, wellbeing, or dignity of the companion",
                'We have a serious and reasonable concern about the welfare of the recipient that we cannot resolve through ordinary safeguarding steps',
                'We are required to do so by law, by a regulator, or by a court',
              ]}
            />
            <P>
              We will explain our reasons in writing. Where possible, we will
              give you notice so you can make alternative arrangements.
            </P>
          </Sub>
        </Sec>

        <Sec n="7" id="the-companion" heading="The companion">
          <Sub n="7.1" heading="Vetting">
            <P>Every companion has:</P>
            <UL
              items={[
                'An Enhanced DBS check, renewed in line with our safeguarding policy',
                'Completed at least three training modules on safeguarding, dignity, and lone-working',
                'Provided two satisfactory references',
                'Passed an in-person interview and a final sign-off interview with us',
                'Public Liability Insurance and Professional Indemnity Insurance in place',
              ]}
            />
          </Sub>

          <Sub n="7.2" heading="The relationship">
            <P>
              Companions are{' '}
              <Placeholder>
                engaged by us as workers under section 230(3)(b) of the
                Employment Rights Act 1996
              </Placeholder>
              . Their precise legal relationship with us is described in their
              own engagement terms, which we will confirm to you on request.
              (To be confirmed pre-launch following employment law advice and
              HMRC IR35 review.)
            </P>
            <P>
              In all cases, the companion is acting on our behalf when they
              visit you. We are responsible for the visit, the companion&apos;s
              conduct during the visit, and the post-visit report.
            </P>
          </Sub>

          <Sub n="7.3" heading="Continuity">
            <P>
              We try to match you with one companion and keep that companion
              for as long as it works for both sides. If the companion is
              unwell, on holiday, or unavailable, we will:
            </P>
            <UL
              items={[
                'Tell you in advance where possible',
                'Offer a familiar back-up companion from the same area',
                'Not send anyone the recipient has never met without your prior agreement',
              ]}
            />
          </Sub>

          <Sub n="7.4" heading="Activities outside the home">
            <P>
              The companion may, with your prior agreement and the
              recipient&apos;s wish, take the recipient outside the home (for
              example, to a café, the shops, a park, a garden centre, or the
              cinema).
            </P>
            <P>
              The companion is insured for these activities. If a recipient
              asks to go somewhere the companion is not comfortable taking
              them (for example, on a long-distance drive, to a financial
              appointment, or to a place the companion does not consider
              safe), the companion will tell us and we will discuss it with
              you.
            </P>
          </Sub>

          <Sub n="7.5" heading="What the companion will not do">
            <P>For the safety of everyone, the companion will not:</P>
            <UL
              items={[
                'Administer medication',
                'Provide personal care (washing, dressing, toileting, continence support)',
                "Manage the recipient's finances, sign anything on the recipient's behalf, or be a witness to any legal document",
                'Accept gifts of significant value from the recipient',
                "Discuss the recipient's affairs with anyone other than you (the family payer) or our team",
                'Bring family members, friends, or pets to a visit without our prior agreement',
              ]}
            />
          </Sub>
        </Sec>

        <Sec n="8" id="post-visit-reports" heading="Post-visit reports">
          <P>
            After every visit, the companion writes a short note describing
            what they did, how the recipient seemed, and anything they think
            you should know.
          </P>
          <P>
            We share this note with you, the family payer, normally within
            four hours of the visit ending. The note may include a photo
            taken during the visit, but only where the recipient has given
            verbal consent at the time, which is recorded in our system.
          </P>
          <P>
            You may share the post-visit report with other family members at
            your discretion. You may not share it publicly (for example, on
            social media) without our written agreement, because it may
            contain information about our companion, our service, and the
            recipient&apos;s home.
          </P>
        </Sec>

        <Sec n="9" id="safeguarding" heading="Safeguarding">
          <P>
            The wellbeing of the recipient is the most important thing we are
            responsible for.
          </P>

          <Sub n="9.1" heading="What you can expect from us">
            <UL
              items={[
                'A named safeguarding lead who is accountable for any concern raised',
                'A written safeguarding policy you can request a copy of',
                'A response to any concern within four working hours',
                'Clear records of what we did and why',
              ]}
            />
          </Sub>

          <Sub n="9.2" heading="What we expect from you">
            <UL
              items={[
                "Tell us anything you think we need to know about the recipient's health, mobility, history, or current situation, before visits start",
                'Tell us if anything material changes',
                'Tell us straight away if you have a concern about a visit or a companion',
                'Treat our companions with respect',
              ]}
            />
          </Sub>

          <Sub n="9.3" heading="When we may share information">
            <P>
              We may share information with statutory authorities (police,
              local authority adult social care, NHS, the recipient&apos;s
              GP) where:
            </P>
            <UL
              items={[
                'We believe there is a serious risk of harm to the recipient or another person',
                'The law requires or permits us to share information',
                'It is necessary to prevent or detect a crime',
              ]}
            />
            <P>
              Where we share information for safeguarding purposes, we will
              tell you unless telling you would itself increase the risk to
              the recipient.
            </P>
          </Sub>
        </Sec>

        <Sec n="10" id="liability" heading="Our liability">
          <Sub n="10.1" heading="What we are liable for">
            <P>
              We are responsible for our negligence and the negligence of our
              companions acting in the course of their visit. If a companion
              causes damage to the recipient&apos;s home through carelessness,
              we will put it right or pay for it to be put right.
            </P>
            <P>
              Our Public Liability Insurance covers up to{' '}
              <Placeholder>{INSURANCE_CAP} per incident</Placeholder>. We can
              provide a copy of the certificate on request.
            </P>
          </Sub>

          <Sub n="10.2" heading="What we are not liable for">
            <P>We are not liable for:</P>
            <UL
              items={[
                'Loss or damage that was not foreseeable when these terms were agreed',
                'Loss or damage arising from your failure to give us important information about the recipient',
                "Loss or damage caused by the recipient or any other person in the recipient's household",
                'Loss of profit, business, or revenue',
                'Anything caused by an event outside our reasonable control (a pandemic, severe weather, transport disruption, government action)',
              ]}
            />
          </Sub>

          <Sub n="10.3" heading="What we never limit">
            <P>Nothing in these terms limits or excludes our liability for:</P>
            <UL
              items={[
                'Death or personal injury caused by our negligence',
                'Fraud or fraudulent misrepresentation',
                'Anything else where it would be unlawful for us to limit liability',
              ]}
            />
          </Sub>

          <Sub n="10.4" heading="Total cap on liability">
            <P>
              For all other losses, our total liability to you under these
              terms is capped at the amount you have paid us in the twelve
              months immediately before the event giving rise to the claim,
              or <Placeholder>{LIABILITY_CAP}</Placeholder>, whichever is
              higher. (Final cap to be confirmed with insurer and solicitor.)
            </P>
          </Sub>
        </Sec>

        <Sec n="11" id="your-responsibilities" heading="Your responsibilities">
          <P>When you sign up and pay for visits, you confirm that:</P>
          <UL
            items={[
              'You are over 18 and have authority to enter into this agreement',
              'The recipient is at least 65 years old and lives in our current service area, and you have their understanding and agreement to receive visits',
              'The information you have given us about the recipient is accurate and complete, including health, mobility, and any safeguarding-relevant information',
              'You will tell us if anything material changes',
              'You will pay for visits as agreed',
              'You will treat our companions and our team with respect',
            ]}
          />
        </Sec>

        <Sec n="12" id="changes" heading="Changes to the service">
          <P>
            We may change how the service works from time to time. We will
            tell you about material changes in advance.
          </P>
          <P>
            We may also change these terms. If we change them in a way that
            affects your existing subscription:
          </P>
          <UL
            items={[
              'We will tell you by email at least 30 days in advance',
              'You can cancel without penalty if you do not agree with the changes',
              'If you continue to use the service after the change takes effect, you are agreeing to the new terms',
            ]}
          />
        </Sec>

        <Sec n="13" id="if-something-goes-wrong" heading="If something goes wrong">
          <P>
            If anything goes wrong, please tell us first. Most issues are
            resolved quickly with a phone call or an email.
          </P>
          <P>
            Email{' '}
            <a href={`mailto:${brand.supportEmail}`} className="link">
              {brand.supportEmail}
            </a>{' '}
            or call us on {brand.supportPhone}. We aim to respond within one
            working day.
          </P>
          <P>
            If we cannot resolve the issue between us, you may be able to
            refer the dispute to a relevant ombudsman or to take court
            action.{' '}
            <Placeholder>
              We are not currently a member of an ADR (alternative dispute
              resolution) scheme.
            </Placeholder>
          </P>
        </Sec>

        <Sec n="14" id="law" heading="Law and jurisdiction">
          <P>
            These terms are governed by the laws of England and Wales. Any
            dispute arising from them will be heard in the courts of England
            and Wales.
          </P>
          <P>
            If you live in Scotland or Northern Ireland, you may bring
            proceedings in your local courts and we may bring proceedings in
            ours, where the law permits.
          </P>
        </Sec>

        <Sec n="15" id="other" heading="Other provisions">
          <Sub n="15.1" heading="No third-party rights">
            <P>
              A person who is not a party to this contract has no rights
              under the Contracts (Rights of Third Parties) Act 1999 to
              enforce these terms, except where these terms expressly say
              otherwise.
            </P>
          </Sub>

          <Sub n="15.2" heading="Severability">
            <P>
              If any part of these terms is found by a court to be unlawful
              or unenforceable, the rest of the terms continue to apply.
            </P>
          </Sub>

          <Sub n="15.3" heading="No waiver">
            <P>
              If we do not enforce a right under these terms straight away,
              that does not stop us enforcing it later.
            </P>
          </Sub>

          <Sub n="15.4" heading="Whole agreement">
            <P>
              These terms (together with our{' '}
              <Link href="/privacy" className="link">privacy notice</Link>{' '}
              and any specific confirmation we give you in writing) are the
              whole agreement between us on this subject.
            </P>
          </Sub>
        </Sec>

        <Sec n="16" id="contact" heading="Contact us">
          <KV
            rows={[
              [
                'Email',
                <a key="e" href={`mailto:${brand.supportEmail}`} className="link">
                  {brand.supportEmail}
                </a>,
              ],
              ['Phone', brand.supportPhone],
              [
                'Post',
                <Placeholder key="p">
                  {brand.legalEntity}, {REGISTERED_ADDRESS}
                </Placeholder>,
              ],
              [
                'Data protection',
                <a key="dp" href="mailto:privacy@youareingoodcompany.co.uk" className="link">
                  privacy@youareingoodcompany.co.uk
                </a>,
              ],
              [
                'Safeguarding concerns',
                <a key="sg" href="mailto:safeguarding@youareingoodcompany.co.uk" className="link">
                  safeguarding@youareingoodcompany.co.uk
                </a>,
              ],
            ]}
          />
        </Sec>
      </LongFormBody>
    </PageShell>
  );
}
