import { brand } from '@igc/content';

const SITE_URL = `https://${brand.domain}`;
// Full-name horizontal wordmark (moss on cream). Rendered at 800x100 source;
// displayed at ~320px wide so height is around 40px — a clean email header.
const WORDMARK_URL = `${SITE_URL}/email/wordmark-horizontal-moss-on-cream@2x.png`;

// Brand palette mirrored from packages/design-tokens. Inline-only in emails
// because most clients strip <style> blocks.
const COLOR = {
  cream: '#FAF8F3',
  paper: '#F2EFE4',
  moss: '#3C5A3A',
  mossDark: '#2E4A2C',
  terracotta: '#C97B5F',
  charcoal: '#2D2D2D',
  stone: '#8B8680',
};

/**
 * The HTML body of the magic-link email. Table-based layout because Gmail,
 * Outlook 2019, and Apple Mail all render tables consistently. Inline CSS
 * because most email clients drop <style> blocks. Two fonts only —
 * Georgia for the head, Arial for the body — both ubiquitous on every
 * platform. The wordmark loads as PNG because not every client renders SVG
 * (notably Outlook for Windows).
 */
export function magicLinkHtml({ url, host }: { url: string; host: string }) {
  const escapedUrl = url.replace(/&/g, '&amp;').replace(/"/g, '&quot;');

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="light" />
  <meta name="supported-color-schemes" content="light" />
  <title>Sign in to ${brand.fullName}</title>
</head>
<body style="margin:0; padding:0; background-color:${COLOR.cream}; -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%;">
  <!-- Preview text shown in inbox previews; hidden visually. -->
  <div style="display:none; max-height:0; overflow:hidden; opacity:0; mso-hide:all;">
    Your one-time sign-in link to ${brand.fullName}. Valid for 24 hours.
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${COLOR.cream};">
    <tr>
      <td align="center" style="padding:48px 24px;">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px; width:100%;">

          <!-- Wordmark -->
          <tr>
            <td align="center" style="padding-bottom:40px;">
              <a href="${SITE_URL}" style="text-decoration:none;">
                <img src="${WORDMARK_URL}" alt="${brand.fullName}" width="320" height="40" style="display:block; height:auto; max-width:320px; border:0;" />
              </a>
            </td>
          </tr>

          <!-- Heading -->
          <tr>
            <td style="padding-bottom:16px;">
              <h1 style="margin:0; font-family:Georgia, 'Times New Roman', serif; font-size:32px; font-weight:normal; line-height:1.15; color:${COLOR.moss}; letter-spacing:-0.01em;">
                Sign in to your account.
              </h1>
            </td>
          </tr>

          <!-- Lead -->
          <tr>
            <td style="padding-bottom:32px;">
              <p style="margin:0; font-family:Arial, Helvetica, sans-serif; font-size:17px; line-height:1.6; color:${COLOR.charcoal};">
                Click the button below to sign in to ${brand.fullName}. The link is valid for 24 hours and works only once.
              </p>
            </td>
          </tr>

          <!-- CTA button -->
          <tr>
            <td style="padding-bottom:32px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" bgcolor="${COLOR.moss}" style="border-radius:9999px;">
                    <a href="${escapedUrl}" style="display:inline-block; padding:16px 36px; font-family:Arial, Helvetica, sans-serif; font-size:16px; font-weight:500; color:${COLOR.cream}; text-decoration:none; border-radius:9999px;">
                      Sign in to ${brand.fullName}
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Fallback link -->
          <tr>
            <td style="padding-bottom:40px;">
              <p style="margin:0 0 6px 0; font-family:Arial, Helvetica, sans-serif; font-size:14px; line-height:1.55; color:${COLOR.stone};">
                If the button does not work, copy and paste this link into your browser:
              </p>
              <p style="margin:0; font-family:Arial, Helvetica, sans-serif; font-size:13px; line-height:1.55; word-break:break-all;">
                <a href="${escapedUrl}" style="color:${COLOR.moss}; text-decoration:underline;">${escapedUrl}</a>
              </p>
            </td>
          </tr>

          <!-- Hairline + brand closing -->
          <tr>
            <td style="border-top:1px solid rgba(60,90,58,0.15); padding-top:24px;">
              <p style="margin:0 0 12px 0; font-family:Georgia, 'Times New Roman', serif; font-size:18px; font-style:italic; color:${COLOR.terracotta};">
                ${brand.closingLine}
              </p>
              <p style="margin:0; font-family:Arial, Helvetica, sans-serif; font-size:13px; line-height:1.55; color:${COLOR.stone};">
                ${brand.legalEntity} &middot; Manchester, UK<br />
                If you did not ask to sign in, you can safely ignore this email. No account will be created.
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

/**
 * Plain-text fallback for clients that prefer text/plain. Most modern clients
 * still render the HTML version; this is there as a safety net and for
 * accessibility tooling.
 */
export function magicLinkText({ url, host }: { url: string; host: string }) {
  return `Sign in to ${brand.fullName}

Click this link to sign in. The link is valid for 24 hours and works only once.

${url}

If you did not ask to sign in, you can safely ignore this email. No account will be created.

—

${brand.closingLine}

${brand.legalEntity}
Manchester, UK
`;
}

export function magicLinkSubject() {
  return `Sign in to ${brand.fullName}`;
}
