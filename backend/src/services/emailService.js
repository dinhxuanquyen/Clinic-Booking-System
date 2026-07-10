import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

let transporter;

function isSmtpConfigured() {
  return Boolean(env.smtp.host && env.smtp.user && env.smtp.pass);
}

function getTransporter() {
  if (transporter) return transporter;

  transporter = nodemailer.createTransport({
    host: env.smtp.host,
    port: env.smtp.port,
    secure: env.smtp.secure,
    auth: {
      user: env.smtp.user,
      pass: env.smtp.pass
    }
  });

  return transporter;
}

function text(value, fallback = 'Đang cập nhật') {
  return value || fallback;
}

function formatDate(value) {
  if (!value) return '';
  return new Date(value).toLocaleDateString('vi-VN');
}

function renderInsuranceRows(insuranceSnapshot) {
  if (!insuranceSnapshot?.enabled || !insuranceSnapshot?.insuranceNumber) return '';

  return `
    <tr><td style="padding: 8px; border: 1px solid #e5e7eb;">BHYT</td><td style="padding: 8px; border: 1px solid #e5e7eb;">${text(insuranceSnapshot.insuranceNumber)}</td></tr>
    <tr><td style="padding: 8px; border: 1px solid #e5e7eb;">Hạn BHYT</td><td style="padding: 8px; border: 1px solid #e5e7eb;">${text(formatDate(insuranceSnapshot.insuranceExpiryDate))}</td></tr>
    <tr><td style="padding: 8px; border: 1px solid #e5e7eb;">Nơi đăng ký KCB ban đầu</td><td style="padding: 8px; border: 1px solid #e5e7eb;">${text(insuranceSnapshot.insuranceRegisteredHospital)}</td></tr>
  `;
}

function followUpText(record) {
  if (!record?.followUpRequired) return 'Không cần tái khám';
  return record.followUpDate
    ? text(formatDate(record.followUpDate))
    : 'Cần tái khám - bệnh nhân chọn ngày phù hợp';
}

function renderEmailLayout({ title, children }) {
  return `
    <div style="margin: 0; padding: 24px; background: #f0f7ff; font-family: Arial, sans-serif; color: #172033;">
      <div style="max-width: 680px; margin: 0 auto; background: #ffffff; border-radius: 18px; overflow: hidden; border: 1px solid #dbeafe;">
        <div style="padding: 22px 26px; background: linear-gradient(135deg, #0d6efd, #0dcaf0); color: #ffffff;">
          <div style="font-size: 22px; font-weight: 800;">Clinic Booking</div>
          <div style="font-size: 13px; opacity: .9;">Hệ thống đặt lịch khám trực tuyến</div>
        </div>
        <div style="padding: 26px;">
          <h2 style="margin: 0 0 18px; color: #0f2b5b; font-size: 24px;">${title}</h2>
          ${children}
        </div>
        <div style="padding: 18px 26px; background: #f8fbff; color: #64748b; font-size: 13px; border-top: 1px solid #e5f2ff;">
          Email này được gửi tự động. Vui lòng không trả lời email này.
        </div>
      </div>
    </div>
  `;
}

function renderInfoCard(rows) {
  return `
    <table style="border-collapse: collapse; width: 100%; margin: 16px 0; border-radius: 14px; overflow: hidden; border: 1px solid #e5e7eb;">
      ${rows.map(([label, value]) => `
        <tr>
          <td style="width: 38%; padding: 10px 12px; border-bottom: 1px solid #e5e7eb; background: #f8fbff; color: #475569; font-weight: 700;">${label}</td>
          <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; color: #0f2b5b; font-weight: 700;">${text(value)}</td>
        </tr>
      `).join('')}
    </table>
  `;
}

function patientEmail(patient) {
  return patient?.email;
}

function doctorNotificationEmail(doctor) {
  return doctor?.personalEmail || doctor?.email;
}

async function sendBusinessEmail({ to, subject, html, missingRecipientLog }) {
  if (!to) {
    if (missingRecipientLog) console.warn(missingRecipientLog);
    return { skipped: true };
  }

  if (!isSmtpConfigured()) {
    console.log('Email service skipped because SMTP is not configured');
    console.log(`Business email target: ${to}`);
    return { skipped: true };
  }

  await getTransporter().sendMail({
    from: env.smtp.from,
    to,
    subject,
    html
  });

  return { skipped: false };
}

export async function sendAppointmentConfirmation({
  to,
  patientName,
  doctorName,
  clinicName,
  specialtyName,
  date,
  timeSlot,
  status,
  servicePackage,
  insuranceSnapshot
}) {
  if (!isSmtpConfigured() || !to) {
    console.log('Email service skipped because SMTP is not configured');
    return { skipped: true };
  }

  await getTransporter().sendMail({
    from: env.smtp.from,
    to,
    subject: 'Xác nhận lịch khám bệnh',
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #172033;">
        <h2>Xác nhận lịch khám bệnh</h2>
        <p>Xin chào <strong>${text(patientName)}</strong>,</p>
        <p>Lịch khám của bạn đã được ghi nhận thành công.</p>
        <table style="border-collapse: collapse; width: 100%; max-width: 640px;">
          <tr><td style="padding: 8px; border: 1px solid #e5e7eb;">Bệnh nhân</td><td style="padding: 8px; border: 1px solid #e5e7eb;">${text(patientName)}</td></tr>
          <tr><td style="padding: 8px; border: 1px solid #e5e7eb;">Bác sĩ</td><td style="padding: 8px; border: 1px solid #e5e7eb;">${text(doctorName)}</td></tr>
          <tr><td style="padding: 8px; border: 1px solid #e5e7eb;">Cơ sở</td><td style="padding: 8px; border: 1px solid #e5e7eb;">${text(clinicName)}</td></tr>
          <tr><td style="padding: 8px; border: 1px solid #e5e7eb;">Chuyên khoa</td><td style="padding: 8px; border: 1px solid #e5e7eb;">${text(specialtyName)}</td></tr>
          <tr><td style="padding: 8px; border: 1px solid #e5e7eb;">Ngày khám</td><td style="padding: 8px; border: 1px solid #e5e7eb;">${text(date)}</td></tr>
          <tr><td style="padding: 8px; border: 1px solid #e5e7eb;">Khung giờ</td><td style="padding: 8px; border: 1px solid #e5e7eb;">${text(timeSlot)}</td></tr>
          <tr><td style="padding: 8px; border: 1px solid #e5e7eb;">Dịch vụ khám</td><td style="padding: 8px; border: 1px solid #e5e7eb;">${text(servicePackage?.name || 'Để bác sĩ tư vấn')}</td></tr>
          <tr><td style="padding: 8px; border: 1px solid #e5e7eb;">Trạng thái</td><td style="padding: 8px; border: 1px solid #e5e7eb;">${text(status)}</td></tr>
          ${renderInsuranceRows(insuranceSnapshot)}
        </table>
        <p style="margin-top: 16px;">Vui lòng đến đúng giờ và mang theo giấy tờ cần thiết khi tới phòng khám.</p>
        <p>Trân trọng,<br/>Clinic Booking</p>
      </div>
    `
  });

  console.log('Email confirmation sent');
  return { skipped: false };
}

export async function sendResetPasswordOtp({ to, otp }) {
  if (!isSmtpConfigured() || !to) {
    console.log('Email service skipped because SMTP is not configured');
    console.log(`Reset password OTP for ${to || 'unknown email'}: ${otp}`);
    return { skipped: true };
  }

  await getTransporter().sendMail({
    from: env.smtp.from,
    to,
    subject: 'Đặt lại mật khẩu BookingCare Mini',
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #172033;">
        <h2>Đặt lại mật khẩu BookingCare Mini</h2>
        <p>Mã OTP đặt lại mật khẩu của bạn là:</p>
        <p style="font-size: 28px; font-weight: 700; letter-spacing: 6px; color: #0756b8;">${otp}</p>
        <p>Mã có hiệu lực trong 10 phút.</p>
        <p>Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.</p>
      </div>
    `
  });

  console.log('Reset password OTP email sent');
  return { skipped: false };
}

export async function sendEmailVerificationOtp({ to, otp }) {
  if (!isSmtpConfigured() || !to) {
    console.log('Email service skipped because SMTP is not configured');
    console.log(`Email verification OTP for ${to || 'unknown email'}: ${otp}`);
    return { skipped: true };
  }

  await getTransporter().sendMail({
    from: env.smtp.from,
    to,
    subject: 'Xác nhận tài khoản BookingCare Mini',
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #172033;">
        <h2>Xác nhận tài khoản BookingCare Mini</h2>
        <p>Mã OTP xác nhận email của bạn là:</p>
        <p style="font-size: 28px; font-weight: 700; letter-spacing: 6px; color: #0756b8;">${otp}</p>
        <p>Mã có hiệu lực trong 10 phút.</p>
        <p>Nếu bạn không đăng ký tài khoản, vui lòng bỏ qua email này.</p>
      </div>
    `
  });

  console.log('Email verification OTP sent');
  return { skipped: false };
}

export async function sendDoctorTemporaryPassword({ to, name, doctorCode = '', loginEmail = to, temporaryPassword }) {
  if (!isSmtpConfigured() || !to) {
    console.log('Email service skipped because SMTP is not configured');
    console.log(`Temporary doctor password for ${to || 'unknown email'}: ${temporaryPassword}`);
    return { skipped: true };
  }

  await getTransporter().sendMail({
    from: env.smtp.from,
    to,
    subject: 'Tài khoản bác sĩ Clinic Booking',
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.65; color: #172033; max-width: 640px;">
        <h2 style="color: #0f2b5b;">Tài khoản bác sĩ Clinic Booking</h2>
        <p>Chào <strong>BS. ${text(name, 'Bác sĩ')}</strong>,</p>
        <p>Tài khoản bác sĩ của bạn đã được tạo trên hệ thống Clinic Booking.</p>
        <div style="padding: 16px; border-radius: 12px; background: #f0f9ff; border-left: 4px solid #0ea5e9;">
          ${doctorCode ? `<p style="margin: 0 0 8px;"><strong>Mã bác sĩ:</strong> ${doctorCode}</p>` : ''}
          <p style="margin: 0 0 8px;"><strong>Email đăng nhập:</strong> ${loginEmail}</p>
          <p style="margin: 0;"><strong>Mật khẩu tạm:</strong> ${temporaryPassword}</p>
        </div>
        <p>Vui lòng đăng nhập và đổi mật khẩu ngay lần đầu sử dụng.</p>
        <p><a href="${env.appUrl}/login">${env.appUrl}/login</a></p>
        <p><strong>Lưu ý:</strong> Không chia sẻ mật khẩu này cho người khác.</p>
      </div>
    `
  });

  console.log('Doctor temporary password email sent');
  return { skipped: false };
}

export async function sendDoctorNewAppointmentEmail({ doctor, patient, appointment, clinic, specialty }) {
  const doctorEmail = doctor?.personalEmail || doctor?.email;

  if (!doctorEmail) {
    console.warn(`Doctor ${doctor?._id || appointment?.doctorId || 'unknown'} has no personal email for new appointment notification`);
    return { skipped: true };
  }

  if (!isSmtpConfigured()) {
    console.log('Email service skipped because SMTP is not configured');
    console.log(`Doctor new appointment email target: ${doctorEmail}`);
    return { skipped: true };
  }

  const appointmentLink = `${env.appUrl}/doctor/appointments?appointmentId=${appointment?._id || ''}`;
  const pendingNote = appointment?.status === 'pending'
    ? '<p style="margin-top: 16px; padding: 12px 14px; border-radius: 12px; background: #fff7ed; border-left: 4px solid #f59e0b;"><strong>Lưu ý:</strong> Vui lòng đăng nhập hệ thống để xác nhận hoặc xử lý lịch hẹn.</p>'
    : '';

  await getTransporter().sendMail({
    from: env.smtp.from,
    to: doctorEmail,
    subject: 'Có lịch khám mới - Clinic Booking',
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.65; color: #172033; max-width: 680px;">
        <h2 style="color: #0f2b5b;">Có lịch khám mới</h2>
        <p>Xin chào <strong>BS. ${text(doctor?.name, 'Bác sĩ')}</strong>,</p>
        <p>Bạn vừa có một lịch khám mới trên hệ thống Clinic Booking.</p>
        <table style="border-collapse: collapse; width: 100%; max-width: 680px;">
          <tr><td style="padding: 9px 10px; border: 1px solid #e5e7eb;"><strong>Tên bệnh nhân</strong></td><td style="padding: 9px 10px; border: 1px solid #e5e7eb;">${text(patient?.name)}</td></tr>
          <tr><td style="padding: 9px 10px; border: 1px solid #e5e7eb;"><strong>Số điện thoại</strong></td><td style="padding: 9px 10px; border: 1px solid #e5e7eb;">${text(patient?.phone)}</td></tr>
          <tr><td style="padding: 9px 10px; border: 1px solid #e5e7eb;"><strong>Ngày khám</strong></td><td style="padding: 9px 10px; border: 1px solid #e5e7eb;">${text(appointment?.date)}</td></tr>
          <tr><td style="padding: 9px 10px; border: 1px solid #e5e7eb;"><strong>Khung giờ</strong></td><td style="padding: 9px 10px; border: 1px solid #e5e7eb;">${text(appointment?.timeSlot)}</td></tr>
          <tr><td style="padding: 9px 10px; border: 1px solid #e5e7eb;"><strong>Cơ sở</strong></td><td style="padding: 9px 10px; border: 1px solid #e5e7eb;">${text(clinic?.name)}</td></tr>
          <tr><td style="padding: 9px 10px; border: 1px solid #e5e7eb;"><strong>Chuyên khoa</strong></td><td style="padding: 9px 10px; border: 1px solid #e5e7eb;">${text(specialty?.name)}</td></tr>
          <tr><td style="padding: 9px 10px; border: 1px solid #e5e7eb;"><strong>Lý do khám</strong></td><td style="padding: 9px 10px; border: 1px solid #e5e7eb;">${text(appointment?.reason)}</td></tr>
          <tr><td style="padding: 9px 10px; border: 1px solid #e5e7eb;"><strong>Trạng thái</strong></td><td style="padding: 9px 10px; border: 1px solid #e5e7eb;">${text(appointment?.status)}</td></tr>
        </table>
        ${pendingNote}
        <p style="margin-top: 16px;">
          <a href="${appointmentLink}" style="display: inline-block; padding: 11px 16px; border-radius: 999px; background: #0d6efd; color: #ffffff; text-decoration: none; font-weight: 700;">
            Xem lịch hẹn
          </a>
        </p>
        <p>Trân trọng,<br/>Clinic Booking</p>
      </div>
    `
  });

  console.log('Doctor new appointment email sent');
  return { skipped: false };
}

export async function sendAppointmentConfirmedEmail({ patient, doctor, appointment, clinic, specialty }) {
  return sendBusinessEmail({
    to: patientEmail(patient),
    subject: 'Lịch khám của bạn đã được xác nhận',
    missingRecipientLog: `Patient ${patient?._id || appointment?.patientId || 'unknown'} has no email for appointment confirmation`,
    html: renderEmailLayout({
      title: 'Lịch khám của bạn đã được xác nhận',
      children: `
        <p>Xin chào <strong>${text(patient?.name || appointment?.patientInfo?.name)}</strong>,</p>
        <p>Lịch khám của bạn đã được xác nhận. Vui lòng đến trước giờ khám 15 phút để làm thủ tục.</p>
        ${renderInfoCard([
          ['Tên bệnh nhân', patient?.name || appointment?.patientInfo?.name],
          ['Bác sĩ', doctor?.name],
          ['Chuyên khoa', specialty?.name],
          ['Cơ sở', clinic?.name],
          ['Ngày khám', appointment?.date],
          ['Khung giờ', appointment?.timeSlot],
          ['Trạng thái', 'Đã xác nhận']
        ])}
      `
    })
  });
}

export async function sendAppointmentCancelledEmail({ patient, doctor, appointment, reason = '', waitingListNotice = false }) {
  return sendBusinessEmail({
    to: patientEmail(patient),
    subject: 'Lịch khám đã được hủy',
    missingRecipientLog: `Patient ${patient?._id || appointment?.patientId || 'unknown'} has no email for appointment cancellation`,
    html: renderEmailLayout({
      title: 'Lịch khám đã được hủy',
      children: `
        <p>Xin chào <strong>${text(patient?.name || appointment?.patientInfo?.name)}</strong>,</p>
        <p>Lịch khám của bạn đã được hủy trên hệ thống Clinic Booking.</p>
        ${renderInfoCard([
          ['Bác sĩ', doctor?.name],
          ['Thời gian', `${text(appointment?.date)} ${text(appointment?.timeSlot, '')}`],
          ['Lý do hủy', reason || appointment?.cancelReason || appointment?.cancelRequest?.reason || appointment?.cancelRequest?.adminNote]
        ])}
        ${waitingListNotice ? '<p style="padding: 12px 14px; border-radius: 12px; background: #f0f9ff; border-left: 4px solid #0ea5e9;">Hệ thống sẽ ưu tiên bệnh nhân trong danh sách chờ cho khung giờ này.</p>' : ''}
      `
    })
  });
}

export async function sendAppointmentRescheduledEmail({
  patient,
  doctor,
  appointment,
  approved = true,
  oldDate,
  oldTimeSlot,
  newDate,
  newTimeSlot,
  adminNote = ''
}) {
  const subject = approved ? 'Lịch khám đã được cập nhật' : 'Yêu cầu đổi lịch chưa được chấp nhận';
  return sendBusinessEmail({
    to: patientEmail(patient),
    subject,
    missingRecipientLog: `Patient ${patient?._id || appointment?.patientId || 'unknown'} has no email for reschedule notification`,
    html: renderEmailLayout({
      title: subject,
      children: approved
        ? `
          <p>Xin chào <strong>${text(patient?.name || appointment?.patientInfo?.name)}</strong>,</p>
          <p>Yêu cầu đổi lịch của bạn đã được chấp thuận. Lịch khám đã được cập nhật như sau:</p>
          ${renderInfoCard([
            ['Bác sĩ', doctor?.name],
            ['Thời gian cũ', `${text(oldDate)} ${text(oldTimeSlot, '')}`],
            ['Thời gian mới', `${text(newDate || appointment?.date)} ${text(newTimeSlot || appointment?.timeSlot, '')}`],
            ['Ghi chú', adminNote]
          ])}
        `
        : `
          <p>Xin chào <strong>${text(patient?.name || appointment?.patientInfo?.name)}</strong>,</p>
          <p>Yêu cầu đổi lịch của bạn chưa được chấp nhận. Lịch khám hiện tại vẫn được giữ nguyên.</p>
          ${renderInfoCard([
            ['Bác sĩ', doctor?.name],
            ['Thời gian hiện tại', `${text(appointment?.date)} ${text(appointment?.timeSlot, '')}`],
            ['Thời gian đã yêu cầu', `${text(newDate)} ${text(newTimeSlot, '')}`],
            ['Phản hồi', adminNote]
          ])}
        `
    })
  });
}

export async function sendDoctorAppointmentCancelledEmail({ doctor, patient, appointment, reason = '' }) {
  const to = doctorNotificationEmail(doctor);
  return sendBusinessEmail({
    to,
    subject: 'Bệnh nhân đã hủy lịch khám',
    missingRecipientLog: `Doctor ${doctor?._id || appointment?.doctorId || 'unknown'} has no personal email for cancelled appointment`,
    html: renderEmailLayout({
      title: 'Bệnh nhân đã hủy lịch khám',
      children: `
        <p>Xin chào <strong>BS. ${text(doctor?.name, 'Bác sĩ')}</strong>,</p>
        <p>Bệnh nhân đã hủy lịch khám.</p>
        ${renderInfoCard([
          ['Bệnh nhân', patient?.name || appointment?.patientInfo?.name],
          ['Ngày', appointment?.date],
          ['Giờ', appointment?.timeSlot],
          ['Lý do', reason || appointment?.cancelRequest?.reason || appointment?.cancelReason]
        ])}
      `
    })
  });
}

export async function sendDoctorRescheduleRequestEmail({ doctor, patient, appointment }) {
  const request = appointment?.rescheduleRequest || {};
  return sendBusinessEmail({
    to: doctorNotificationEmail(doctor),
    subject: 'Có yêu cầu đổi lịch khám',
    missingRecipientLog: `Doctor ${doctor?._id || appointment?.doctorId || 'unknown'} has no personal email for reschedule request`,
    html: renderEmailLayout({
      title: 'Có yêu cầu đổi lịch khám',
      children: `
        <p>Xin chào <strong>BS. ${text(doctor?.name, 'Bác sĩ')}</strong>,</p>
        <p>Bệnh nhân vừa gửi yêu cầu đổi lịch khám.</p>
        ${renderInfoCard([
          ['Bệnh nhân', patient?.name || appointment?.patientInfo?.name],
          ['Thời gian hiện tại', `${text(request.oldDate || appointment?.date)} ${text(request.oldTimeSlot || appointment?.timeSlot, '')}`],
          ['Thời gian mong muốn', `${text(request.newDate)} ${text(request.newTimeSlot, '')}`],
          ['Lý do', request.reason]
        ])}
      `
    })
  });
}

export async function sendMedicalRecordUpdatedEmail({ patient, doctor, appointment, record }) {
  return sendBusinessEmail({
    to: patientEmail(patient),
    subject: 'Hồ sơ khám bệnh đã được cập nhật',
    missingRecipientLog: `Patient ${patient?._id || appointment?.patientId || 'unknown'} has no email for medical record update`,
    html: renderEmailLayout({
      title: 'Hồ sơ khám bệnh đã được cập nhật',
      children: `
        <p>Xin chào <strong>${text(patient?.name || appointment?.patientInfo?.name)}</strong>,</p>
        <p>Hồ sơ khám bệnh của bạn đã được bác sĩ cập nhật trên hệ thống Clinic Booking.</p>
        ${renderInfoCard([
          ['Bác sĩ', doctor?.name],
          ['Ngày khám', appointment?.date],
          ['Khung giờ', appointment?.timeSlot],
          ['Chẩn đoán', record?.diagnosis],
          ['Tái khám', followUpText(record)],
          ['Lời dặn', record?.advice]
        ])}
        <p style="margin-top: 16px;">
          <a href="${env.appUrl}/medical-records?recordId=${record?._id || record?.id || ''}" style="display: inline-block; padding: 11px 16px; border-radius: 999px; background: #0d6efd; color: #ffffff; text-decoration: none; font-weight: 700;">
            Xem hồ sơ khám bệnh
          </a>
        </p>
      `
    })
  });
}

export async function sendWaitingListOffer({ to, patientName, doctorName, date, timeSlot, expiresInMinutes = 10 }) {
  if (!isSmtpConfigured() || !to) {
    console.log('Email service skipped because SMTP is not configured');
    return { skipped: true };
  }

  await getTransporter().sendMail({
    from: env.smtp.from,
    to,
    subject: 'Có khung giờ khám trống - Clinic Booking',
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.65; color: #172033; max-width: 640px;">
        <h2 style="color: #0f2b5b;">Có lịch khám trống</h2>
        <p>Xin chào <strong>${text(patientName)}</strong>,</p>
        <p>Khung giờ <strong>${text(timeSlot)}</strong> ngày <strong>${text(date)}</strong> với <strong>${text(doctorName)}</strong> vừa có chỗ trống.</p>
        <div style="padding: 16px; border-radius: 12px; background: #f0f9ff; border-left: 4px solid #0ea5e9;">
          Bạn có ${expiresInMinutes} phút để xác nhận nhận lịch.
        </div>
        <p>Vui lòng mở Clinic Booking để phản hồi lời mời.</p>
      </div>
    `
  });

  console.log('Waiting list offer email sent');
  return { skipped: false };
}
