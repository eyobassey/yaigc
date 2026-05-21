import { brand } from '@igc/content';

const SITE_URL = `https://${brand.domain}`;
const WORDMARK_URL = `${SITE_URL}/email/wordmark-horizontal-moss-on-cream@2x.png`;

const COLOR = {
  cream: '#FAF8F3',
  paper: '#F2EFE4',
  moss: '#3C5A3A',
  terracotta: '#C97B5F',
  charcoal: '#2D2D2D',
  stone: '#8B8680',
};

export interface CompanionApplicationReceivedInput {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  postcode: string;
}

export function companionApplicationReceivedHtml(
  input: CompanionApplicationReceivedInput,
) {
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
  <title>${e(`We have your application  ·  ${brand.fullName}`)}</title>
</head>
<body style="margin:0; padding:0; background-color:${COLOR.cream};">
  <div style="display:none; max-height:0; overflow:hidden; opacity:0; mso-hide:all;">
    Your application to ${e(brand.companionSubBrand)} has been received.
  </div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${COLOR.cream};">
    <tr>
      <td align="center" style="padding:48px 24px;">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px; width:100%;">
          <tr>
            <td align="center" style="padding-bottom:40px;">
              <a href="${SITE_URL}" style="text-decoration:none;">
                <img src="${WORDMARK_URL}" alt="${e(brand.fullName)}" width="320" height="40" style="display:block; height:auto; max-width:320px; border:0;" />
              </a>
            </td>
          </tr>

          <tr>
            <td style="padding-bottom:16px;">
              <h1 style="margin:0; font-family:Georgia, 'Times New Roman', serif; font-size:32px; font-weight:normal; line-height:1.15; color:${COLOR.moss}; letter-spacing:-0.01em;">
                Thank you, ${e(input.firstName)}.
              </h1>
              <p style="margin:8px 0 0 0; font-family:Georgia, 'Times New Roman', serif; font-size:20px; font-style:italic; line-height:1.4; color:${COLOR.terracotta};">
                We have your application.
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding-bottom:24px;">
              <p style="margin:0; font-family:Arial, Helvetica, sans-serif; font-size:17px; line-height:1.6; color:${COLOR.charcoal};">
                A coordinator from ${e(brand.fullName)} will be in touch within
                a working day, usually less. We read every application and
                respond to every one — yes, no, or "we have questions" — even
                if you do not hear back the same day.
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding-bottom:8px;">
              <p style="margin:0; font-family:Arial, Helvetica, sans-serif; font-size:13px; line-height:1.5; color:${COLOR.stone}; text-transform:uppercase; letter-spacing:0.08em;">
                What you sent us
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom:32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${COLOR.paper}; border-radius:12px;">
                <tr>
                  <td style="padding:20px 24px; font-family:Arial, Helvetica, sans-serif; font-size:15px; line-height:1.6; color:${COLOR.charcoal};">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                      ${row('Name', `${e(input.firstName)} ${e(input.lastName)}`)}
                      ${row('Email', e(input.email))}
                      ${row('Phone', e(input.phone))}
                      ${row('Postcode', e(input.postcode))}
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

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
                <li><strong>Phone screen.</strong> A 30-minute call. We ask about you, you ask about us.</li>
                <li><strong>In-person interview.</strong> In a café in your area, about 45 minutes.</li>
                <li><strong>Vetting.</strong> Enhanced DBS, two references, three short training modules. Two to three weeks end to end.</li>
                <li><strong>First match and welcome.</strong> Your first family. Your first visit.</li>
              </ol>
            </td>
          </tr>

          <tr>
            <td style="padding-bottom:32px;">
              <p style="margin:0 0 8px 0; font-family:Arial, Helvetica, sans-serif; font-size:15px; line-height:1.55; color:${COLOR.charcoal};">
                Questions? Reply to this email or call us on
                <a href="tel:${e(brand.supportPhone.replace(/\s/g, ''))}" style="color:${COLOR.moss}; text-decoration:underline;">${e(brand.supportPhone)}</a>.
              </p>
            </td>
          </tr>

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

export function companionApplicationReceivedText(
  input: CompanionApplicationReceivedInput,
) {
  return `Thank you, ${input.firstName}.

We have your application.

A coordinator will be in touch within a working day, usually less. We read every application and respond to every one — yes, no, or "we have questions" — even if you do not hear back the same day.

WHAT YOU SENT US

Name:     ${input.firstName} ${input.lastName}
Email:    ${input.email}
Phone:    ${input.phone}
Postcode: ${input.postcode}

WHAT HAPPENS NEXT

1. Phone screen. A 30-minute call. We ask about you, you ask about us.
2. In-person interview. In a café in your area, about 45 minutes.
3. Vetting. Enhanced DBS, two references, three short training modules. Two to three weeks end to end.
4. First match and welcome. Your first family. Your first visit.

Questions? Reply to this email or call us on ${brand.supportPhone}.

${brand.closingLine}

${brand.legalEntity}
Manchester, UK
`;
}

export function companionApplicationReceivedSubject() {
  return `We have your application  ·  ${brand.fullName}`;
}
