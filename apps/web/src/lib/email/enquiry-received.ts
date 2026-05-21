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

export interface EnquiryReceivedInput {
  name: string;
  email: string;
  phone: string | null;
  postcode: string | null;
  message: string;
}

/**
 * Confirmation email sent to a public visitor after they submit /contact.
 * Echoes their submission back so they can verify what we received, and
 * sets expectations: a real person will call within a working day. Brand
 * voice, table layout, inline CSS so Outlook + Gmail + Apple Mail render
 * consistently.
 */
export function enquiryReceivedHtml(input: EnquiryReceivedInput) {
  const e = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="light" />
  <meta name="supported-color-schemes" content="light" />
  <title>We have your message ${e(`· ${brand.fullName}`)}</title>
</head>
<body style="margin:0; padding:0; background-color:${COLOR.cream}; -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%;">
  <div style="display:none; max-height:0; overflow:hidden; opacity:0; mso-hide:all;">
    Thank you for getting in touch. A real person will call you within a working day.
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
                Thank you, ${e(input.name.split(/\s+/)[0] ?? input.name)}.
              </h1>
            </td>
          </tr>

          <!-- Lead -->
          <tr>
            <td style="padding-bottom:24px;">
              <p style="margin:0; font-family:Arial, Helvetica, sans-serif; font-size:17px; line-height:1.6; color:${COLOR.charcoal};">
                We have your message. A real person from our team will call
                you within a working day. The first call is twenty minutes.
                We listen more than we talk.
              </p>
            </td>
          </tr>

          <!-- What you told us -->
          <tr>
            <td style="padding-bottom:8px;">
              <p style="margin:0; font-family:Arial, Helvetica, sans-serif; font-size:13px; line-height:1.5; color:${COLOR.stone}; text-transform:uppercase; letter-spacing:0.08em;">
                What you told us
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom:32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${COLOR.paper}; border-radius:12px;">
                <tr>
                  <td style="padding:20px 24px; font-family:Arial, Helvetica, sans-serif; font-size:15px; line-height:1.6; color:${COLOR.charcoal};">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                      ${rowField('Name', e(input.name))}
                      ${rowField('Email', e(input.email))}
                      ${input.phone ? rowField('Phone', e(input.phone)) : ''}
                      ${input.postcode ? rowField('Postcode', e(input.postcode)) : ''}
                    </table>
                    <div style="margin-top:16px; padding-top:16px; border-top:1px solid rgba(60,90,58,0.12); white-space:pre-wrap;">
                      ${e(input.message)}
                    </div>
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
                <li>A coordinator from our team calls you, usually within a working day. We always call from a UK number.</li>
                <li>We listen. We ask about your mum or dad. We tell you honestly whether we are a good fit.</li>
                <li>If it feels right, we propose a companion. Photo, first name, a short bio. You choose.</li>
                <li>A free introduction visit, on us. No commitment.</li>
              </ol>
            </td>
          </tr>

          <!-- Contact us -->
          <tr>
            <td style="padding-bottom:32px;">
              <p style="margin:0 0 8px 0; font-family:Arial, Helvetica, sans-serif; font-size:15px; line-height:1.55; color:${COLOR.charcoal};">
                Want to talk sooner? Call us on
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
                ${e(brand.legalEntity)} &middot; Manchester, UK<br />
                If you did not send this message, you can ignore this email. No account has been created.
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

function rowField(label: string, value: string) {
  return `<tr>
    <td style="padding:2px 0; font-family:Arial, Helvetica, sans-serif; font-size:13px; color:#8B8680; text-transform:uppercase; letter-spacing:0.06em; width:30%; vertical-align:top; white-space:nowrap;">${label}</td>
    <td style="padding:2px 0 2px 12px; font-family:Arial, Helvetica, sans-serif; font-size:15px; color:#2D2D2D; word-break:break-word;">${value}</td>
  </tr>`;
}

export function enquiryReceivedText(input: EnquiryReceivedInput) {
  return `Thank you, ${input.name}.

We have your message. A real person from our team will call you within a working day. The first call is twenty minutes. We listen more than we talk.

WHAT YOU TOLD US

Name:     ${input.name}
Email:    ${input.email}${input.phone ? `\nPhone:    ${input.phone}` : ''}${input.postcode ? `\nPostcode: ${input.postcode}` : ''}

${input.message}

WHAT HAPPENS NEXT

1. A coordinator from our team calls you, usually within a working day. We always call from a UK number.
2. We listen. We ask about your mum or dad. We tell you honestly whether we are a good fit.
3. If it feels right, we propose a companion. Photo, first name, a short bio. You choose.
4. A free introduction visit, on us. No commitment.

Want to talk sooner? Call us on ${brand.supportPhone}. Monday to Friday, 9am to 6pm. Saturdays, 10am to 2pm.

${brand.closingLine}

${brand.legalEntity}
Manchester, UK
`;
}

export function enquiryReceivedSubject() {
  // No em dash in subject (brand voice). Middle dot keeps the visual rhythm.
  return `We have your message  ·  ${brand.fullName}`;
}
