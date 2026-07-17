import { escapeHtml, text } from './emailFormatters.js';
import { renderCallout, renderEmailLayout, renderInfoTable, renderOtpBox, renderTextEmail } from './emailTemplate.js';

export function emailVerificationOtpTemplate({ to, otp }) {
  const title = 'Xác nhận tài khoản BookingCare Mini';
  const rows = [['Thời gian hiệu lực', '10 phút']];

  return {
    to,
    subject: 'Xác nhận tài khoản BookingCare Mini',
    html: renderEmailLayout({
      preheader: 'Nhập mã OTP trong email này để xác nhận tài khoản của bạn.',
      eyebrow: 'Bảo mật tài khoản',
      title,
      intro: 'Mã OTP xác nhận email của bạn là:',
      contentHtml: `${renderOtpBox(otp)}${renderInfoTable(rows)}${renderCallout(['Không chia sẻ mã này cho bất kỳ ai.', 'Nếu bạn không đăng ký tài khoản, vui lòng bỏ qua email này.'], 'amber')}`,
      securityNote: true
    }),
    text: renderTextEmail({
      title,
      intro: `Mã OTP xác nhận email: ${otp}`,
      rows,
      notes: ['Không chia sẻ mã này cho bất kỳ ai.']
    })
  };
}

export function resetPasswordOtpTemplate({ to, otp }) {
  const title = 'Đặt lại mật khẩu BookingCare Mini';
  const rows = [['Thời gian hiệu lực', '10 phút']];

  return {
    to,
    subject: 'Đặt lại mật khẩu BookingCare Mini',
    html: renderEmailLayout({
      preheader: 'Nhập mã OTP trong email này để đặt lại mật khẩu.',
      eyebrow: 'Bảo mật tài khoản',
      title,
      intro: 'Mã OTP đặt lại mật khẩu của bạn là:',
      contentHtml: `${renderOtpBox(otp)}${renderInfoTable(rows)}${renderCallout(['Không chia sẻ mã này cho bất kỳ ai.', 'Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.'], 'amber')}`,
      securityNote: true
    }),
    text: renderTextEmail({
      title,
      intro: `Mã OTP đặt lại mật khẩu: ${otp}`,
      rows,
      notes: ['Không chia sẻ mã này cho bất kỳ ai.']
    })
  };
}

export function doctorTemporaryPasswordTemplate({ appUrl, to, name, doctorCode = '', loginEmail = to, temporaryPassword }) {
  const title = 'Tài khoản bác sĩ đã được cấp';
  const rows = [
    ['Mã bác sĩ', doctorCode],
    ['Email đăng nhập', loginEmail],
    ['Mật khẩu tạm', temporaryPassword]
  ];
  const primaryAction = { label: 'Đăng nhập hệ thống', url: `${appUrl}/login` };

  return {
    to,
    subject: 'Tài khoản bác sĩ BookingCare Mini',
    html: renderEmailLayout({
      preheader: 'Tài khoản bác sĩ của bạn đã được cấp trên hệ thống BookingCare Mini.',
      eyebrow: 'Tài khoản bác sĩ',
      title,
      greeting: `Xin chào <strong>BS. ${escapeHtml(text(name, 'Bác sĩ'))}</strong>,`,
      intro: 'Tài khoản bác sĩ của bạn đã được tạo trên hệ thống. Vui lòng đăng nhập và đổi mật khẩu ngay trong lần sử dụng đầu tiên.',
      contentHtml: `${renderInfoTable(rows)}${renderCallout(['Bắt buộc đổi mật khẩu trong lần đăng nhập đầu tiên.', 'Không chia sẻ mật khẩu tạm này cho bất kỳ ai.'], 'amber')}`,
      primaryAction,
      securityNote: true
    }),
    text: renderTextEmail({
      title,
      greeting: `Xin chào BS. ${text(name, 'Bác sĩ')}`,
      intro: 'Tài khoản bác sĩ của bạn đã được tạo. Vui lòng đổi mật khẩu trong lần đăng nhập đầu tiên.',
      rows,
      action: primaryAction,
      notes: ['Không chia sẻ mật khẩu tạm này cho bất kỳ ai.']
    })
  };
}
