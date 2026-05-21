import { brand } from '@igc/content';

const SITE_URL = `https://${brand.domain}`;
const WORDMARK_URL = `${SITE_URL}/email/wordmark-horizontal-moss-on-cream@2x.png`;

const COLOR = {
  cream: '#FAF8F3',
  paper: '#F2EFE4',
  moss: '#3C5A3A',
  mossDark: '#2E4A2C',
  terracotta: '#C97B5F',
  charcoal: '#2D2D2D',
  stone: '#8B8680',
};

export interface FamilyWelcomeInput {
  payerFirstName: string;
  payerEmail: string;
  billingName: string;
  recipientFirstName: string;
  recipientLastName: string;
  recipientPreferredName: string | null;
  relationshipToRecipient: string;
}

/**
 * Sent to the payer after the operator converts an Enquiry into a Family.
 * Confirms what we have on file, sets next-steps expectations (companion
 * proposal within 48h, free introduction visit), and points to /sign-in
 * for when they want to log in.
 */
export function familyWelcomeHtml(input: FamilyWelcomeInput) {
  const e = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const recipientLine = input.recipientPreferredName
    ? `${e(input.recipientFirstName)} ${e(input.recipientLastName)} (known as ${e(input.recipientPreferredName)})`
    : `${e(input.recipientFirstName)} ${e(input.recipientLastName)}`;

  const callName = input.recipientPreferredName || input.recipientFirstName;

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="light" />
  <meta name="supported-color-schemes" content="light" />
  <title>${e(`Your account is ready  ·  ${brand.fullName}`)}</title>
</head>
<body style="margin:0; padding:0; background-color:${COLOR.cream}; -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%;">
  <div style="display:none; max-height:0; overflow:hidden; opacity:0; mso-hide:all;">
    Your ${e(brand.fullName)} account is set up. Next: we propose a companion within 48 hours.
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${COLOR.cream};">
    <tr>
      <td align="center" style="padding:48px 24px;">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px; width:100%;">

          <!-- Wordmark -->
          <tr>
            <td align="center" style="padding-bottom:40px;">
              <a href="${SITE_URL}" style="text-decoration:none;">
                <img src="${WORDMARK_URL}" alt="${e(brand.fullName)}" width="320" height="40" style="display:block; height:auto; max-width:320px; border:0;" />
              </a>
            </td>
          </tr>

          <!-- Greeting -->
          <tr>
            <td style="padding-bottom:16px;">
              <h1 style="margin:0; font-family:Georgia, 'Times New Roman', serif; font-size:32px; font-weight:normal; line-height:1.15; color:${COLOR.moss}; letter-spacing:-0.01em;">
                Welcome, ${e(input.payerFirstName)}.
              </h1>
              <p style="margin:8px 0 0 0; font-family:Georgia, 'Times New Roman', serif; font-size:20px; font-style:italic; line-height:1.4; color:${COLOR.terracotta};">
                Your account is set up.
              </p>
            </td>
          </tr>

          <!-- Lead -->
          <tr>
            <td style="padding-bottom:24px;">
              <p style="margin:0; font-family:Arial, Helvetica, sans-serif; font-size:17px; line-height:1.6; color:${COLOR.charcoal};">
                Thank you for the call. Here is what we have on file. If
                anything below is not right, reply to this email or call us
                and we will fix it on the spot.
              </p>
            </td>
          </tr>

          <!-- What we have on file -->
          <tr>
            <td style="padding-bottom:8px;">
              <p style="margin:0; font-family:Arial, Helvetica, sans-serif; font-size:13px; line-height:1.5; color:${COLOR.stone}; text-transform:uppercase; letter-spacing:0.08em;">
                On file
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom:32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${COLOR.paper}; border-radius:12px;">
                <tr>
                  <td style="padding:20px 24px; font-family:Arial, Helvetica, sans-serif; font-size:15px; line-height:1.6; color:${COLOR.charcoal};">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                      ${row('Billing name', e(input.billingName))}
                      ${row('Recipient', recipientLine)}
                      ${row('Relationship', e(input.relationshipToRecipient))}
                      ${row('Account email', e(input.payerEmail))}
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- What happens next -->
          <tr>
            <td style="padding-bottom:8px;">
              <p style="margin:0; font-family:Arial, Helvetica, sans-serif; font-size:13px; line-height:1.5; color:${COLOR.stone}; text-transform:uppercase; letter-spacing:0.08em;">
                What happens next
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom:32px;">
              <ol style="margin:0; padding-left:20px; font-family:Arial, Helvetica, sans-serif; font-size:16px; line-height:1.7; color:${COLOR.charcoal};">
                <li>Within 48 hours we email you a profile of a companion we think will be a good fit for ${e(callName)}. Photo, first name, a short bio.</li>
                <li>If you like the look of them, we set up a free introduction visit. About an hour. No commitment.</li>
                <li>After the introduction visit, if it felt right for everyone, we set up a regular weekly or fortnightly rhythm.</li>
                <li>You receive a short note from the companion within four hours of every visit.</li>
              </ol>
            </td>
          </tr>

          <!-- Sign in CTA -->
          <tr>
            <td style="padding-bottom:8px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" bgcolor="${COLOR.moss}" style="border-radius:9999px;">
                    <a href="${SITE_URL}/sign-in" style="display:inline-block; padding:14px 32px; font-family:Arial, Helvetica, sans-serif; font-size:15px; font-weight:500; color:${COLOR.cream}; text-decoration:none; border-radius:9999px;">
                      Sign in to your account
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom:32px;">
              <p style="margin:8px 0 0 0; font-family:Arial, Helvetica, sans-serif; font-size:13px; line-height:1.55; color:${COLOR.stone};">
                We email you a one-time sign-in link, no password needed.
              </p>
            </td>
          </tr>

          <!-- Phone -->
          <tr>
            <td style="padding-bottom:32px;">
              <p style="margin:0 0 8px 0; font-family:Arial, Helvetica, sans-serif; font-size:15px; line-height:1.55; color:${COLOR.charcoal};">
                Want to talk first? Call us on
                <a href="tel:${e(brand.supportPhone.replace(/\s/g, ''))}" style="color:${COLOR.moss}; text-decoration:underline;">${e(brand.supportPhone)}</a>.
              </p>
              <p style="margin:0; font-family:Arial, Helvetica, sans-serif; font-size:13px; line-height:1.55; color:${COLOR.stone};">
                Monday to Friday, 9am to 6pm. Saturdays, 10am to 2pm.
              </p>
            </td>
          </tr>

          <!-- Hairline + brand closing -->
          <tr>
            <td style="border-top:1px solid rgba(60,90,58,0.15); padding-top:24px;">
              <p style="margin:0 0 12px 0; font-family:Georgia, 'Times New Roman', serif; font-size:18px; font-style:italic; color:${COLOR.terracotta};">
                ${e(brand.closingLine)}
              </p>
              <p style="margin:0; font-family:Arial, Helvetica, sans-serif; font-size:13px; line-height:1.55; color:${COLOR.stone};">
                ${e(brand.legalEntity)} &middot; Manchester, UK
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function row(label: string, value: string) {
  return `<tr>
    <td style="padding:2px 0; font-family:Arial, Helvetica, sans-serif; font-size:13px; color:#8B8680; text-transform:uppercase; letter-spacing:0.06em; width:32%; vertical-align:top; white-space:nowrap;">${label}</td>
    <td style="padding:2px 0 2px 12px; font-family:Arial, Helvetica, sans-serif; font-size:15px; color:#2D2D2D; word-break:break-word;">${value}</td>
  </tr>`;
}

export function familyWelcomeText(input: FamilyWelcomeInput) {
  const recipientLine = input.recipientPreferredName
    ? `${input.recipientFirstName} ${input.recipientLastName} (known as ${input.recipientPreferredName})`
    : `${input.recipientFirstName} ${input.recipientLastName}`;
  const callName = input.recipientPreferredName || input.recipientFirstName;

  return `Welcome, ${input.payerFirstName}.

Your account is set up.

Thank you for the call. Here is what we have on file. If anything below is not right, reply to this email or call us and we will fix it on the spot.

ON FILE

Billing name:  ${input.billingName}
Recipient:     ${recipientLine}
Relationship:  ${input.relationshipToRecipient}
Account email: ${input.payerEmail}

WHAT HAPPENS NEXT

1. Within 48 hours we email you a profile of a companion we think will be a good fit for ${callName}. Photo, first name, a short bio.
2. If you like the look of them, we set up a free introduction visit. About an hour. No commitment.
3. After the introduction visit, if it felt right for everyone, we set up a regular weekly or fortnightly rhythm.
4. You receive a short note from the companion within four hours of every visit.

Sign in to your account at ${SITE_URL}/sign-in. We email you a one-time sign-in link, no password needed.

Want to talk first? Call us on ${brand.supportPhone}. Monday to Friday, 9am to 6pm. Saturdays, 10am to 2pm.

${brand.closingLine}

${brand.legalEntity}
Manchester, UK
`;
}

export function familyWelcomeSubject() {
  return `Your account is ready  ·  ${brand.fullName}`;
}
