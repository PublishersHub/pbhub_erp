export interface EmailBrandingContext {
  brandName?: string | null;
  brandLogoUrl?: string | null;
  brandPrimary?: string | null;
  brandTagline?: string | null;
}

export interface BrandedHtmlInput {
  branding?: EmailBrandingContext;
  preheader?: string;     // hidden preview text
  heading: string;        // big H1 at top of body
  intro: string;          // first paragraph
  ctaLabel?: string;      // optional button label
  ctaUrl?: string;        // optional button link
  bodyAfterCta?: string;  // optional paragraph(s) after the button
  footerNote?: string;    // smaller subdued text at the bottom
}

const DEFAULT_PRIMARY = '#3b82f6';
const DEFAULT_NAME = 'PbHub HRMS';

export function renderBrandedHtml(input: BrandedHtmlInput): string {
  const name = input.branding?.brandName?.trim() || DEFAULT_NAME;
  const primary = input.branding?.brandPrimary || DEFAULT_PRIMARY;
  const logo = input.branding?.brandLogoUrl;
  const tagline = input.branding?.brandTagline?.trim() || '';

  const safeIntro = escape(input.intro);
  const safeAfter = input.bodyAfterCta ? escape(input.bodyAfterCta) : '';
  const safeFooter = input.footerNote ? escape(input.footerNote) : '';
  const safeHeading = escape(input.heading);
  const safePreheader = input.preheader ? escape(input.preheader) : '';

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escape(name)}</title>
</head>
<body style="margin:0;padding:0;background:#f5f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0f172a;">
  <span style="display:none;font-size:0;line-height:0;color:transparent;">${safePreheader}</span>
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f5f5f7;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="560" style="max-width:560px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 12px rgba(15,23,42,0.06);">
          <tr>
            <td style="padding:24px 32px;border-bottom:1px solid #e2e8f0;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="vertical-align:middle;padding-right:12px;">${
                    logo
                      ? `<img src="${escape(logo)}" alt="${escape(name)}" width="40" height="40" style="display:block;border-radius:8px;object-fit:cover;">`
                      : `<div style="width:40px;height:40px;border-radius:8px;background:${primary};display:flex;align-items:center;justify-content:center;color:#ffffff;font-weight:700;font-size:18px;">${escape(name.slice(0, 1))}</div>`
                  }</td>
                  <td style="vertical-align:middle;">
                    <div style="font-weight:600;font-size:14px;color:#0f172a;">${escape(name)}</div>
                    ${tagline ? `<div style="font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;margin-top:2px;">${escape(tagline)}</div>` : ''}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <h1 style="font-size:22px;font-weight:600;line-height:1.3;color:#0f172a;margin:0 0 16px 0;">${safeHeading}</h1>
              <p style="font-size:15px;line-height:1.6;color:#334155;margin:0 0 24px 0;">${safeIntro}</p>
              ${
                input.ctaLabel && input.ctaUrl
                  ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto 24px auto;">
                      <tr><td style="border-radius:12px;background:${primary};">
                        <a href="${escape(input.ctaUrl)}" target="_blank" rel="noopener" style="display:inline-block;padding:12px 24px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:12px;">${escape(input.ctaLabel)}</a>
                      </td></tr>
                    </table>`
                  : ''
              }
              ${safeAfter ? `<p style="font-size:14px;line-height:1.6;color:#475569;margin:0 0 16px 0;">${safeAfter}</p>` : ''}
              ${
                input.ctaUrl
                  ? `<p style="font-size:12px;line-height:1.6;color:#94a3b8;margin:24px 0 0 0;word-break:break-all;">If the button doesn't work, copy and paste this link into your browser: <br><span style="color:${primary};">${escape(input.ctaUrl)}</span></p>`
                  : ''
              }
            </td>
          </tr>
          ${
            safeFooter
              ? `<tr><td style="padding:16px 32px;border-top:1px solid #e2e8f0;background:#f8fafc;font-size:12px;line-height:1.5;color:#64748b;">${safeFooter}</td></tr>`
              : ''
          }
        </table>
        <p style="font-size:11px;color:#94a3b8;margin:16px 0 0 0;">Sent by ${escape(name)}</p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function escape(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
