import { escapeHtml, joinLines, text } from './emailFormatters.js';

const DEFAULT_SUPPORT_EMAIL = 'support@clinicbooking.vn';
const DEFAULT_HOTLINE = '1900 0000';

export function renderButton(action, variant = 'primary') {
  if (!action?.url || !action?.label) return '';
  const background = variant === 'secondary' ? '#0ea5e9' : '#0d6efd';
  return `
    <table role="presentation" border="0" cellspacing="0" cellpadding="0" style="margin: 14px 8px 0 0; display: inline-table;">
      <tr>
        <td align="center" bgcolor="${background}" style="border-radius: 999px;">
          <a href="${escapeHtml(action.url)}" style="display: inline-block; padding: 12px 18px; color: #ffffff; font-family: Arial, Helvetica, sans-serif; font-size: 14px; font-weight: 700; text-decoration: none;">
            ${escapeHtml(action.label)}
          </a>
        </td>
      </tr>
    </table>
  `;
}

export function renderBadge(label, tone = 'blue') {
  const tones = {
    blue: ['#dbeafe', '#1d4ed8'],
    green: ['#dcfce7', '#15803d'],
    amber: ['#fef3c7', '#b45309'],
    red: ['#fee2e2', '#b91c1c'],
    slate: ['#e2e8f0', '#334155']
  };
  const [background, color] = tones[tone] || tones.blue;
  return `<span style="display: inline-block; padding: 6px 10px; border-radius: 999px; background: ${background}; color: ${color}; font-size: 12px; font-weight: 700;">${escapeHtml(label)}</span>`;
}

export function renderInfoTable(rows = []) {
  const visibleRows = rows.filter(([, value]) => value !== undefined && value !== null && String(value).trim() !== '');
  if (!visibleRows.length) return '';

  return `
    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="border-collapse: collapse; margin: 18px 0; border: 1px solid #e2e8f0; border-radius: 14px; overflow: hidden;">
      ${visibleRows.map(([label, value], index) => `
        <tr>
          <td width="38%" style="padding: 11px 12px; border-bottom: ${index === visibleRows.length - 1 ? '0' : '1px solid #e2e8f0'}; background: #f8fafc; color: #64748b; font-size: 13px; font-weight: 700; vertical-align: top;">
            ${escapeHtml(label)}
          </td>
          <td style="padding: 11px 12px; border-bottom: ${index === visibleRows.length - 1 ? '0' : '1px solid #e2e8f0'}; color: #0f172a; font-size: 14px; font-weight: 700; vertical-align: top;">
            ${escapeHtml(text(value))}
          </td>
        </tr>
      `).join('')}
    </table>
  `;
}

export function renderCallout(items = [], tone = 'blue') {
  const visibleItems = items.filter(Boolean);
  if (!visibleItems.length) return '';
  const colors = {
    blue: ['#eff6ff', '#60a5fa'],
    amber: ['#fffbeb', '#f59e0b'],
    red: ['#fef2f2', '#ef4444'],
    green: ['#f0fdf4', '#22c55e']
  };
  const [background, border] = colors[tone] || colors.blue;
  return `
    <div style="margin: 18px 0; padding: 14px 16px; background: ${background}; border-left: 4px solid ${border}; border-radius: 12px; color: #334155; font-size: 14px;">
      ${visibleItems.map((item) => `<div style="margin: 4px 0;">${escapeHtml(item)}</div>`).join('')}
    </div>
  `;
}

export function renderOtpBox(otp) {
  return `
    <div style="margin: 20px 0; padding: 18px 20px; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 16px; color: #0f2b5b; font-size: 30px; font-weight: 800; letter-spacing: 7px; text-align: center;">
      ${escapeHtml(otp)}
    </div>
  `;
}

export function renderEmailLayout({
  preheader = '',
  eyebrow = '',
  title,
  greeting = '',
  intro = '',
  contentHtml = '',
  primaryAction,
  secondaryAction,
  clinic = {},
  securityNote = true,
  supportEmail,
  hotline,
  appName = 'BookingCare Mini'
}) {
  const support = supportEmail || clinic?.email || DEFAULT_SUPPORT_EMAIL;
  const phone = hotline || clinic?.phone || DEFAULT_HOTLINE;
  const address = clinic?.address || '';

  return `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          @media only screen and (max-width: 600px) {
            .email-shell { padding: 0 !important; }
            .email-container { width: 100% !important; border-radius: 0 !important; }
            .email-body { padding: 22px !important; }
            .email-title { font-size: 24px !important; line-height: 1.25 !important; }
            .email-cta table { width: 100% !important; display: table !important; }
            .email-cta a { display: block !important; text-align: center !important; }
          }
        </style>
      </head>
      <body style="margin: 0; padding: 0; background: #f1f5f9; font-family: Arial, Helvetica, sans-serif; color: #172033;">
        <div style="display: none; max-height: 0; overflow: hidden; opacity: 0; color: transparent;">
          ${escapeHtml(preheader)}
        </div>
        <div class="email-shell" style="padding: 28px 14px; background: #f1f5f9;">
          <table role="presentation" class="email-container" align="center" width="640" border="0" cellspacing="0" cellpadding="0" style="width: 640px; max-width: 640px; margin: 0 auto; background: #ffffff; border: 1px solid #dbeafe; border-radius: 20px; overflow: hidden;">
            <tr>
              <td style="padding: 22px 26px; background: #0f2b5b; color: #ffffff;">
                <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                  <tr>
                    <td width="46" valign="middle">
                      <div style="width: 40px; height: 40px; border-radius: 12px; background: #13b5d8; color: #ffffff; font-size: 22px; font-weight: 800; line-height: 40px; text-align: center;">B</div>
                    </td>
                    <td valign="middle">
                      <div style="font-size: 21px; font-weight: 800; line-height: 1.1;">${escapeHtml(appName)}</div>
                      <div style="margin-top: 3px; font-size: 13px; color: #bfdbfe;">Hệ thống đặt lịch khám trực tuyến</div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td class="email-body" style="padding: 28px 30px 30px;">
                ${eyebrow ? `<div style="margin-bottom: 10px; color: #0891b2; font-size: 12px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase;">${escapeHtml(eyebrow)}</div>` : ''}
                <h1 class="email-title" style="margin: 0 0 14px; color: #0f2b5b; font-size: 28px; line-height: 1.22; font-weight: 800;">${escapeHtml(title)}</h1>
                ${greeting ? `<p style="margin: 0 0 12px; color: #334155; font-size: 15px; line-height: 1.65;">${greeting}</p>` : ''}
                ${intro ? `<p style="margin: 0 0 14px; color: #334155; font-size: 15px; line-height: 1.65;">${intro}</p>` : ''}
                ${contentHtml}
                <div class="email-cta" style="margin-top: 18px;">
                  ${renderButton(primaryAction, 'primary')}
                  ${renderButton(secondaryAction, 'secondary')}
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding: 20px 30px; background: #f8fafc; border-top: 1px solid #e2e8f0; color: #64748b; font-size: 12px; line-height: 1.6;">
                <div>Email được gửi tự động từ hệ thống ${escapeHtml(appName)}. Vui lòng không trả lời email này.</div>
                <div>Hotline: ${escapeHtml(phone)}${support ? ` · Hỗ trợ: ${escapeHtml(support)}` : ''}</div>
                ${address ? `<div>Cơ sở: ${escapeHtml(address)}</div>` : ''}
                ${securityNote ? '<div style="margin-top: 10px;">Email này có thể chứa thông tin cá nhân. Vui lòng không chuyển tiếp cho người không có thẩm quyền.</div>' : ''}
              </td>
            </tr>
          </table>
        </div>
      </body>
    </html>
  `;
}

export function renderTextEmail({
  title,
  greeting = '',
  intro = '',
  rows = [],
  action,
  secondaryAction,
  notes = []
}) {
  return joinLines([
    title,
    '',
    greeting.replace(/<[^>]*>/g, ''),
    intro.replace(/<[^>]*>/g, ''),
    '',
    ...rows.filter(([, value]) => value !== undefined && value !== null && String(value).trim() !== '').map(([label, value]) => `${label}: ${text(value)}`),
    '',
    ...notes,
    action?.url ? `${action.label}: ${action.url}` : '',
    secondaryAction?.url ? `${secondaryAction.label}: ${secondaryAction.url}` : '',
    '',
    'Email được gửi tự động từ hệ thống BookingCare Mini. Vui lòng không trả lời email này.'
  ]);
}
