// Shared email chrome: wordmark header, brand footer, key/value table,
// "what happens next" list, sign-in CTA. Used by the newer notification
// templates (match-confirmed, subscription-created) to avoid copying 150
// lines of <table> for each event. Existing templates still inline their
// chrome; migrating them is a future cleanup, not this stage's work.

import { brand } from '@igc/content';

export const SITE_URL = `https://${brand.domain}`;
const WORDMARK_URL = `${SITE_URL}/email/wordmark-horizontal-moss-on-cream@2x.png`;

export const COLOR = {
  cream: '#FAF8F3',
  paper: '#F2EFE4',
  moss: '#3C5A3A',
  mossDark: '#2E4A2C',
  terracotta: '#C97B5F',
  charcoal: '#2D2D2D',
  stone: '#8B8680',
};

export function escapeHtml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export interface EmailBlocks {
  /** Hidden preheader text shown by inbox clients. */
  preheader: string;
  /** Inside <title>. */
  titleTag: string;
  /** Big heading, e.g. "Confirmed, Sarah." */
  heading: string;
  /** Italic terracotta subline under the heading. */
  italicSubline: string;
  /** First paragraph of the body. */
  lead: string;
  /** Optional key/value rows shown in the paper card. */
  dataRows?: Array<{ label: string; value: string }>;
  /** Heading shown above the data rows; defaults to "On file". */
  dataRowsHeading?: string;
  /** Optional numbered list of next steps. */
  nextSteps?: string[];
  /** Optional CTA button. */
  cta?: { label: string; href: string; subline?: string };
}

export function renderEmailHtml(b: EmailBlocks) {
  const e = escapeHtml;
  const subline = b.cta?.subline
    ? `<p style="margin:8px 0 0 0; font-family:Arial, Helvetica, sans-serif; font-size:13px; line-height:1.55; color:${COLOR.stone};">${e(b.cta.subline)}</p>`
    : '';
  const cta = b.cta
    ? `<tr><td style="padding-bottom:8px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0">
          <tr><td align="center" bgcolor="${COLOR.moss}" style="border-radius:9999px;">
            <a href="${b.cta.href}" style="display:inline-block; padding:14px 32px; font-family:Arial, Helvetica, sans-serif; font-size:15px; font-weight:500; color:${COLOR.cream}; text-decoration:none; border-radius:9999px;">${e(b.cta.label)}</a>
          </td></tr>
        </table>
      </td></tr>
      <tr><td style="padding-bottom:32px;">${subline}</td></tr>`
    : '';

  const dataCard = b.dataRows?.length
    ? `<tr><td style="padding-bottom:8px;">
        <p style="margin:0; font-family:Arial, Helvetica, sans-serif; font-size:13px; line-height:1.5; color:${COLOR.stone}; text-transform:uppercase; letter-spacing:0.08em;">${e(b.dataRowsHeading ?? 'On file')}</p>
      </td></tr>
      <tr><td style="padding-bottom:32px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${COLOR.paper}; border-radius:12px;">
          <tr><td style="padding:20px 24px;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
              ${b.dataRows
                .map(
                  (r) =>
                    `<tr>
                      <td style="padding:2px 0; font-family:Arial, Helvetica, sans-serif; font-size:13px; color:${COLOR.stone}; text-transform:uppercase; letter-spacing:0.06em; width:32%; vertical-align:top; white-space:nowrap;">${e(r.label)}</td>
                      <td style="padding:2px 0 2px 12px; font-family:Arial, Helvetica, sans-serif; font-size:15px; color:${COLOR.charcoal}; word-break:break-word;">${r.value}</td>
                    </tr>`,
                )
                .join('')}
            </table>
          </td></tr>
        </table>
      </td></tr>`
    : '';

  const nextSteps = b.nextSteps?.length
    ? `<tr><td style="padding-bottom:8px;">
        <p style="margin:0; font-family:Arial, Helvetica, sans-serif; font-size:13px; line-height:1.5; color:${COLOR.stone}; text-transform:uppercase; letter-spacing:0.08em;">What happens next</p>
      </td></tr>
      <tr><td style="padding-bottom:32px;">
        <ol style="margin:0; padding-left:20px; font-family:Arial, Helvetica, sans-serif; font-size:16px; line-height:1.7; color:${COLOR.charcoal};">
          ${b.nextSteps.map((s) => `<li>${e(s)}</li>`).join('')}
        </ol>
      </td></tr>`
    : '';

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="light" />
  <meta name="supported-color-schemes" content="light" />
  <title>${e(b.titleTag)}</title>
</head>
<body style="margin:0; padding:0; background-color:${COLOR.cream}; -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%;">
  <div style="display:none; max-height:0; overflow:hidden; opacity:0; mso-hide:all;">${e(b.preheader)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${COLOR.cream};">
    <tr><td align="center" style="padding:48px 24px;">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px; width:100%;">
        <tr><td align="center" style="padding-bottom:40px;">
          <a href="${SITE_URL}" style="text-decoration:none;">
            <img src="${WORDMARK_URL}" alt="${e(brand.fullName)}" width="320" height="40" style="display:block; height:auto; max-width:320px; border:0;" />
          </a>
        </td></tr>
        <tr><td style="padding-bottom:16px;">
          <h1 style="margin:0; font-family:Georgia, 'Times New Roman', serif; font-size:32px; font-weight:normal; line-height:1.15; color:${COLOR.moss}; letter-spacing:-0.01em;">${e(b.heading)}</h1>
          <p style="margin:8px 0 0 0; font-family:Georgia, 'Times New Roman', serif; font-size:20px; font-style:italic; line-height:1.4; color:${COLOR.terracotta};">${e(b.italicSubline)}</p>
        </td></tr>
        <tr><td style="padding-bottom:24px;">
          <p style="margin:0; font-family:Arial, Helvetica, sans-serif; font-size:17px; line-height:1.6; color:${COLOR.charcoal};">${e(b.lead)}</p>
        </td></tr>
        ${dataCard}
        ${nextSteps}
        ${cta}
        <tr><td style="padding-bottom:32px;">
          <p style="margin:0 0 8px 0; font-family:Arial, Helvetica, sans-serif; font-size:15px; line-height:1.55; color:${COLOR.charcoal};">Questions? Call us on <a href="tel:${e(brand.supportPhone.replace(/\s/g, ''))}" style="color:${COLOR.moss}; text-decoration:underline;">${e(brand.supportPhone)}</a>.</p>
          <p style="margin:0; font-family:Arial, Helvetica, sans-serif; font-size:13px; line-height:1.55; color:${COLOR.stone};">Monday to Friday, 9am to 6pm. Saturdays, 10am to 2pm.</p>
        </td></tr>
        <tr><td style="border-top:1px solid rgba(60,90,58,0.15); padding-top:24px;">
          <p style="margin:0 0 12px 0; font-family:Georgia, 'Times New Roman', serif; font-size:18px; font-style:italic; color:${COLOR.terracotta};">${e(brand.closingLine)}</p>
          <p style="margin:0; font-family:Arial, Helvetica, sans-serif; font-size:13px; line-height:1.55; color:${COLOR.stone};">${e(brand.legalEntity)} &middot; Manchester, UK</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export function renderEmailText(b: EmailBlocks): string {
  const parts: string[] = [];
  parts.push(b.heading);
  parts.push('');
  parts.push(b.italicSubline);
  parts.push('');
  parts.push(b.lead);
  parts.push('');
  if (b.dataRows?.length) {
    parts.push((b.dataRowsHeading ?? 'ON FILE').toUpperCase());
    parts.push('');
    const padTo = Math.max(...b.dataRows.map((r) => r.label.length)) + 2;
    for (const r of b.dataRows) {
      parts.push(`${(r.label + ':').padEnd(padTo)} ${stripTags(r.value)}`);
    }
    parts.push('');
  }
  if (b.nextSteps?.length) {
    parts.push('WHAT HAPPENS NEXT');
    parts.push('');
    b.nextSteps.forEach((s, i) => parts.push(`${i + 1}. ${s}`));
    parts.push('');
  }
  if (b.cta) {
    parts.push(`${b.cta.label}: ${b.cta.href}`);
    if (b.cta.subline) parts.push(b.cta.subline);
    parts.push('');
  }
  parts.push(`Questions? Call us on ${brand.supportPhone}.`);
  parts.push('Monday to Friday, 9am to 6pm. Saturdays, 10am to 2pm.');
  parts.push('');
  parts.push(brand.closingLine);
  parts.push('');
  parts.push(brand.legalEntity);
  parts.push('Manchester, UK');
  return parts.join('\n');
}

function stripTags(s: string) {
  return s.replace(/<[^>]*>/g, '');
}
