import { escapeHtml, followUpStatusLabel, formatDateVN, formatTimeSlot, text } from './emailFormatters.js';
import { renderBadge, renderCallout, renderEmailLayout, renderInfoTable, renderTextEmail } from './emailTemplate.js';

function recordUrl(appUrl, record) {
  return `${appUrl}/medical-records?recordId=${record?._id || record?.id || ''}`;
}

function followUpBookingUrl(appUrl, record) {
  return `${appUrl}/booking?followUpRecordId=${record?._id || record?.id || ''}`;
}

function followUpAppointmentText(appointment) {
  if (!appointment || typeof appointment !== 'object') return '';
  const date = formatDateVN(appointment.date) || appointment.date || '';
  const slot = formatTimeSlot(appointment.timeSlot);
  return `${date} ${slot}`.trim();
}

export function followUpPlanText(record) {
  if (!record?.followUpRequired) return 'Không cần tái khám';

  const status = record.followUpStatus || 'recommended';
  const scheduledText = followUpAppointmentText(record.followUpAppointmentId);

  if (status === 'scheduled') return scheduledText ? `Đã đặt lịch tái khám ngày ${scheduledText}` : 'Đã đặt lịch tái khám';
  if (status === 'completed') return 'Đã hoàn thành tái khám';
  if (status === 'overdue') return 'Quá hạn tái khám';
  if (status === 'cancelled') return 'Lịch tái khám đã hủy, vui lòng đặt lại nếu vẫn cần theo dõi';

  return record.followUpDate
    ? `Khuyến nghị tái khám ngày ${formatDateVN(record.followUpDate)}`
    : 'Cần tái khám - bệnh nhân chọn ngày phù hợp';
}

export function shouldShowFollowUpBookingCta(record) {
  if (!record?.followUpRequired) return false;
  const status = record.followUpStatus || 'recommended';
  return ['recommended', 'overdue', 'cancelled'].includes(status);
}

export function medicalRecordUpdatedTemplate({ appUrl, patient, doctor, appointment, record }) {
  const title = 'Hồ sơ khám bệnh đã được cập nhật';
  const rows = [
    ['Bác sĩ', doctor?.name],
    ['Ngày khám', formatDateVN(appointment?.date) || appointment?.date],
    ['Khung giờ', formatTimeSlot(appointment?.timeSlot)],
    ['Kế hoạch tái khám', followUpPlanText(record)]
  ];
  const primaryAction = { label: 'Xem kết quả khám', url: recordUrl(appUrl, record) };
  const secondaryAction = { label: 'Tải PDF kết quả khám', url: `${appUrl}/api/medical-records/${record?._id || record?.id || ''}/pdf` };

  return {
    to: patient?.email,
    subject: 'Hồ sơ khám bệnh đã được cập nhật',
    html: renderEmailLayout({
      preheader: 'Hồ sơ khám bệnh của bạn đã được cập nhật trên hệ thống.',
      eyebrow: 'Kết quả khám',
      title,
      greeting: `Xin chào <strong>${escapeHtml(text(patient?.name || appointment?.patientInfo?.name, 'bạn'))}</strong>,`,
      intro: 'Bác sĩ đã cập nhật hồ sơ khám bệnh của bạn trên hệ thống BookingCare Mini. Vì lý do bảo mật, email này không hiển thị chẩn đoán, đơn thuốc hoặc thông tin y tế chi tiết.',
      contentHtml: `${renderBadge('Đã cập nhật', 'green')}${renderInfoTable(rows)}${renderCallout(['Vui lòng đăng nhập hệ thống để xem đầy đủ kết quả khám.', 'Không chuyển tiếp email này cho người không có thẩm quyền.'], 'blue')}`,
      primaryAction,
      secondaryAction
    }),
    text: renderTextEmail({ title, greeting: `Xin chào ${text(patient?.name || appointment?.patientInfo?.name, 'bạn')}`, rows, action: primaryAction, secondaryAction })
  };
}

export function followUpDueSoonTemplate({ appUrl, patient, record }) {
  const title = 'Sắp đến lịch tái khám';
  const rows = [
    ['Ngày tái khám khuyến nghị', record?.followUpDate ? formatDateVN(record.followUpDate) : 'Bệnh nhân chọn ngày phù hợp'],
    ['Trạng thái', followUpStatusLabel(record?.followUpStatus || 'recommended')]
  ];
  const primaryAction = { label: 'Xem kế hoạch tái khám', url: recordUrl(appUrl, record) };
  const secondaryAction = shouldShowFollowUpBookingCta(record) ? { label: 'Đặt lịch tái khám', url: followUpBookingUrl(appUrl, record) } : null;

  return {
    to: patient?.email,
    subject: 'Sắp đến lịch tái khám được khuyến nghị',
    html: renderEmailLayout({
      preheader: 'Bạn có lịch tái khám được bác sĩ khuyến nghị.',
      eyebrow: 'Tái khám',
      title,
      greeting: `Xin chào <strong>${escapeHtml(text(patient?.name, 'bạn'))}</strong>,`,
      intro: 'Bác sĩ đã khuyến nghị bạn tái khám để theo dõi kết quả điều trị.',
      contentHtml: `${renderBadge(followUpStatusLabel(record?.followUpStatus || 'recommended'), 'amber')}${renderInfoTable(rows)}`,
      primaryAction,
      secondaryAction
    }),
    text: renderTextEmail({ title, greeting: `Xin chào ${text(patient?.name, 'bạn')}`, rows, action: primaryAction, secondaryAction })
  };
}

export function followUpOverdueTemplate({ appUrl, patient, record }) {
  const title = 'Bạn đã quá hạn tái khám';
  const rows = [
    ['Ngày tái khám khuyến nghị', record?.followUpDate ? formatDateVN(record.followUpDate) : 'Bệnh nhân chọn ngày phù hợp'],
    ['Trạng thái', 'Quá hạn tái khám']
  ];
  const primaryAction = { label: 'Đặt lịch tái khám', url: followUpBookingUrl(appUrl, record) };
  const secondaryAction = { label: 'Xem hồ sơ khám', url: recordUrl(appUrl, record) };

  return {
    to: patient?.email,
    subject: 'Bạn đã quá hạn tái khám',
    html: renderEmailLayout({
      preheader: 'Bạn đã quá ngày tái khám theo khuyến nghị của bác sĩ.',
      eyebrow: 'Tái khám',
      title,
      greeting: `Xin chào <strong>${escapeHtml(text(patient?.name, 'bạn'))}</strong>,`,
      intro: 'Bạn đã quá ngày tái khám theo khuyến nghị. Nếu vẫn còn triệu chứng hoặc cần theo dõi thêm, vui lòng đặt lịch tái khám sớm.',
      contentHtml: `${renderBadge('Quá hạn tái khám', 'red')}${renderInfoTable(rows)}`,
      primaryAction,
      secondaryAction
    }),
    text: renderTextEmail({ title, greeting: `Xin chào ${text(patient?.name, 'bạn')}`, rows, action: primaryAction, secondaryAction })
  };
}
