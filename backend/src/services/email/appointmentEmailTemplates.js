import {
  appointmentCode,
  appointmentStatusLabel,
  appointmentTypeLabel,
  escapeHtml,
  formatDateVN,
  formatTimeSlot,
  servicePackageName,
  text
} from './emailFormatters.js';
import { renderBadge, renderCallout, renderEmailLayout, renderInfoTable, renderTextEmail } from './emailTemplate.js';

function appointmentUrl(appUrl, appointment) {
  return `${appUrl}/appointments/my?appointmentId=${appointment?._id || appointment?.id || ''}`;
}

function doctorAppointmentUrl(appUrl, appointment) {
  return `${appUrl}/doctor/appointments?appointmentId=${appointment?._id || appointment?.id || ''}`;
}

function appointmentRows({ patient, doctor, appointment, clinic, specialty, includePatient = true, includeQueue = true, includeReason = false }) {
  return [
    ['Mã lịch hẹn', appointmentCode(appointment)],
    includePatient ? ['Bệnh nhân', patient?.name || appointment?.patientInfo?.name] : null,
    ['Bác sĩ', doctor?.name],
    ['Chuyên khoa', specialty?.name],
    ['Cơ sở', clinic?.name],
    ['Ngày khám', formatDateVN(appointment?.date) || appointment?.date],
    ['Khung giờ', formatTimeSlot(appointment?.timeSlot)],
    ['Loại lịch', appointmentTypeLabel(appointment)],
    ['Dịch vụ', servicePackageName(appointment)],
    ['Trạng thái', appointmentStatusLabel(appointment?.status)],
    includeQueue && appointment?.queueNumber ? ['Số thứ tự', String(appointment.queueNumber).padStart(2, '0')] : null,
    includeReason ? ['Lý do khám', appointment?.reason] : null
  ].filter(Boolean);
}

export function patientAppointmentCreatedTemplate({ appUrl, to, patientName, doctorName, clinicName, specialtyName, date, timeSlot, status, servicePackage, insuranceSnapshot }) {
  const rows = [
    ['Bệnh nhân', patientName],
    ['Bác sĩ', doctorName],
    ['Chuyên khoa', specialtyName],
    ['Cơ sở', clinicName],
    ['Ngày khám', formatDateVN(date) || date],
    ['Khung giờ', formatTimeSlot(timeSlot)],
    ['Loại lịch', status === 'follow_up' ? 'Tái khám' : 'Khám lần đầu'],
    ['Dịch vụ', servicePackage?.name || 'Để bác sĩ tư vấn'],
    ['Trạng thái', appointmentStatusLabel(status)]
  ];
  if (insuranceSnapshot?.enabled) rows.push(['BHYT', 'Đã ghi nhận trên hệ thống']);
  const title = 'Lịch khám đã được ghi nhận';
  const primaryAction = { label: 'Xem lịch hẹn của tôi', url: `${appUrl}/appointments/my` };

  return {
    to,
    subject: `Lịch khám ngày ${formatDateVN(date) || date} đã được ghi nhận`,
    html: renderEmailLayout({
      preheader: `Lịch khám với ${text(doctorName)} lúc ${text(formatTimeSlot(timeSlot))} tại ${text(clinicName)} đã được ghi nhận.`,
      eyebrow: 'Lịch khám',
      title,
      greeting: `Xin chào <strong>${escapeHtml(text(patientName, 'bạn'))}</strong>,`,
      intro: 'Lịch khám của bạn đã được ghi nhận trên hệ thống. Phòng khám hoặc bác sĩ sẽ xử lý theo quy trình hiện tại.',
      contentHtml: `${renderBadge(appointmentStatusLabel(status), status === 'confirmed' ? 'green' : 'amber')}${renderInfoTable(rows)}${renderCallout([
        'Vui lòng đến trước giờ khám 15 phút.',
        'Mang theo giấy tờ tùy thân và giấy tờ liên quan nếu có.',
        'Nếu không thể đến, bạn có thể đổi hoặc hủy lịch trên hệ thống.'
      ])}`,
      primaryAction
    }),
    text: renderTextEmail({ title, greeting: `Xin chào ${text(patientName, 'bạn')}`, rows, action: primaryAction })
  };
}

export function patientAppointmentConfirmedTemplate({ appUrl, patient, doctor, appointment, clinic, specialty }) {
  const rows = appointmentRows({ patient, doctor, appointment, clinic, specialty });
  const dateText = formatDateVN(appointment?.date) || appointment?.date || '';
  const timeText = formatTimeSlot(appointment?.timeSlot);
  const title = 'Lịch khám của bạn đã được xác nhận';
  const primaryAction = { label: 'Xem chi tiết lịch hẹn', url: appointmentUrl(appUrl, appointment) };
  const secondaryAction = { label: 'Tải phiếu đặt lịch', url: `${appUrl}/api/appointments/${appointment?._id || appointment?.id || ''}/pdf` };

  return {
    to: patient?.email,
    subject: `Lịch khám ngày ${dateText} đã được xác nhận`,
    html: renderEmailLayout({
      preheader: `Lịch khám với ${text(doctor?.name)} lúc ${timeText} tại ${text(clinic?.name)} đã được xác nhận.`,
      eyebrow: 'Xác nhận lịch khám',
      title,
      greeting: `Xin chào <strong>${escapeHtml(text(patient?.name || appointment?.patientInfo?.name, 'bạn'))}</strong>,`,
      intro: 'Lịch khám của bạn đã được xác nhận. Vui lòng đến trước giờ khám 15 phút để làm thủ tục.',
      contentHtml: `${renderBadge('Đã xác nhận', 'green')}${renderInfoTable(rows)}${renderCallout([
        'Mang theo giấy tờ cần thiết khi tới phòng khám.',
        'Đến sớm 15 phút để hoàn tất thủ tục.',
        'Thực hiện đổi hoặc hủy lịch trên hệ thống nếu không thể đến.'
      ], 'green')}`,
      primaryAction,
      secondaryAction,
      clinic
    }),
    text: renderTextEmail({ title, greeting: `Xin chào ${text(patient?.name || appointment?.patientInfo?.name, 'bạn')}`, rows, action: primaryAction, secondaryAction })
  };
}

export function patientAppointmentCancelledTemplate({ appUrl, patient, doctor, appointment, reason = '', waitingListNotice = false }) {
  const title = 'Lịch khám đã được hủy';
  const rows = [
    ['Bác sĩ', doctor?.name],
    ['Ngày khám', formatDateVN(appointment?.date) || appointment?.date],
    ['Khung giờ', formatTimeSlot(appointment?.timeSlot)],
    ['Lý do hủy', reason || appointment?.cancelReason || appointment?.cancelRequest?.reason || appointment?.cancelRequest?.adminNote]
  ];
  const primaryAction = { label: 'Xem lịch hẹn của tôi', url: appointmentUrl(appUrl, appointment) };

  return {
    to: patient?.email,
    subject: 'Lịch khám đã được hủy',
    html: renderEmailLayout({
      preheader: `Lịch khám ngày ${text(formatDateVN(appointment?.date) || appointment?.date)} đã được hủy.`,
      eyebrow: 'Cập nhật lịch khám',
      title,
      greeting: `Xin chào <strong>${escapeHtml(text(patient?.name || appointment?.patientInfo?.name, 'bạn'))}</strong>,`,
      intro: 'Lịch khám của bạn đã được hủy trên hệ thống BookingCare Mini.',
      contentHtml: `${renderBadge('Đã hủy', 'red')}${renderInfoTable(rows)}${waitingListNotice ? renderCallout(['Hệ thống sẽ ưu tiên bệnh nhân trong danh sách chờ cho khung giờ này.'], 'blue') : ''}`,
      primaryAction
    }),
    text: renderTextEmail({ title, greeting: `Xin chào ${text(patient?.name || appointment?.patientInfo?.name, 'bạn')}`, rows, action: primaryAction })
  };
}

export function patientAppointmentRescheduledTemplate({ appUrl, patient, doctor, appointment, approved, oldDate, oldTimeSlot, newDate, newTimeSlot, adminNote = '' }) {
  const title = approved ? 'Lịch khám đã được cập nhật' : 'Yêu cầu đổi lịch chưa được chấp nhận';
  const rows = approved
    ? [
      ['Bác sĩ', doctor?.name],
      ['Thời gian cũ', `${formatDateVN(oldDate) || oldDate || ''} ${formatTimeSlot(oldTimeSlot)}`.trim()],
      ['Thời gian mới', `${formatDateVN(newDate || appointment?.date) || newDate || appointment?.date || ''} ${formatTimeSlot(newTimeSlot || appointment?.timeSlot)}`.trim()],
      ['Ghi chú', adminNote]
    ]
    : [
      ['Bác sĩ', doctor?.name],
      ['Thời gian hiện tại', `${formatDateVN(appointment?.date) || appointment?.date || ''} ${formatTimeSlot(appointment?.timeSlot)}`.trim()],
      ['Thời gian đã yêu cầu', `${formatDateVN(newDate) || newDate || ''} ${formatTimeSlot(newTimeSlot)}`.trim()],
      ['Phản hồi', adminNote]
    ];
  const primaryAction = { label: 'Xem lịch hẹn', url: appointmentUrl(appUrl, appointment) };

  return {
    to: patient?.email,
    subject: title,
    html: renderEmailLayout({
      preheader: approved ? 'Yêu cầu đổi lịch của bạn đã được chấp thuận.' : 'Yêu cầu đổi lịch của bạn chưa được chấp nhận.',
      eyebrow: 'Đổi lịch khám',
      title,
      greeting: `Xin chào <strong>${escapeHtml(text(patient?.name || appointment?.patientInfo?.name, 'bạn'))}</strong>,`,
      intro: approved ? 'Lịch khám của bạn đã được cập nhật theo thông tin dưới đây.' : 'Lịch khám hiện tại vẫn được giữ nguyên.',
      contentHtml: `${renderBadge(approved ? 'Đã cập nhật' : 'Chưa chấp nhận', approved ? 'green' : 'amber')}${renderInfoTable(rows)}`,
      primaryAction
    }),
    text: renderTextEmail({ title, greeting: `Xin chào ${text(patient?.name || appointment?.patientInfo?.name, 'bạn')}`, rows, action: primaryAction })
  };
}

export function doctorNewAppointmentTemplate({ appUrl, doctor, patient, appointment, clinic, specialty }) {
  const rows = appointmentRows({ patient, doctor: null, appointment, clinic, specialty, includePatient: true, includeReason: true });
  const dateText = formatDateVN(appointment?.date) || appointment?.date || '';
  const timeText = formatTimeSlot(appointment?.timeSlot);
  const title = appointment?.isFollowUp ? 'Có lịch tái khám mới' : 'Có lịch khám mới cần xác nhận';
  const primaryAction = { label: 'Xem và xử lý lịch hẹn', url: doctorAppointmentUrl(appUrl, appointment) };

  return {
    to: doctor?.personalEmail || doctor?.email,
    subject: `Lịch khám mới cần xác nhận - ${dateText} ${timeText}`.trim(),
    html: renderEmailLayout({
      preheader: `Bạn có lịch khám mới của bệnh nhân ${text(patient?.name || appointment?.patientInfo?.name)}.`,
      eyebrow: 'Khu vực bác sĩ',
      title,
      greeting: `Xin chào <strong>BS. ${escapeHtml(text(doctor?.name, 'Bác sĩ'))}</strong>,`,
      intro: 'Bạn vừa có một lịch khám mới cần được xử lý trên hệ thống.',
      contentHtml: `${renderBadge('Chờ xác nhận', 'amber')}${renderInfoTable(rows)}${renderCallout(['Thông tin liên hệ và dữ liệu nhạy cảm của bệnh nhân chỉ nên xem trực tiếp trong hệ thống khi cần xử lý nghiệp vụ.'], 'amber')}`,
      primaryAction
    }),
    text: renderTextEmail({ title, greeting: `Xin chào BS. ${text(doctor?.name, 'Bác sĩ')}`, rows, action: primaryAction })
  };
}

export function doctorAppointmentCancelledTemplate({ appUrl, doctor, patient, appointment, reason = '' }) {
  const title = 'Bệnh nhân đã hủy lịch khám';
  const rows = [
    ['Bệnh nhân', patient?.name || appointment?.patientInfo?.name],
    ['Ngày khám', formatDateVN(appointment?.date) || appointment?.date],
    ['Khung giờ', formatTimeSlot(appointment?.timeSlot)],
    ['Lý do', reason || appointment?.cancelRequest?.reason || appointment?.cancelReason]
  ];
  const primaryAction = { label: 'Xem lịch hẹn', url: doctorAppointmentUrl(appUrl, appointment) };

  return {
    to: doctor?.personalEmail || doctor?.email,
    subject: 'Bệnh nhân đã hủy lịch khám',
    html: renderEmailLayout({
      preheader: `Lịch khám của bệnh nhân ${text(patient?.name || appointment?.patientInfo?.name)} đã được hủy.`,
      eyebrow: 'Khu vực bác sĩ',
      title,
      greeting: `Xin chào <strong>BS. ${escapeHtml(text(doctor?.name, 'Bác sĩ'))}</strong>,`,
      intro: 'Một lịch khám của bạn vừa được hủy trên hệ thống.',
      contentHtml: `${renderBadge('Đã hủy', 'red')}${renderInfoTable(rows)}`,
      primaryAction
    }),
    text: renderTextEmail({ title, greeting: `Xin chào BS. ${text(doctor?.name, 'Bác sĩ')}`, rows, action: primaryAction })
  };
}

export function doctorRescheduleRequestTemplate({ appUrl, doctor, patient, appointment }) {
  const request = appointment?.rescheduleRequest || {};
  const title = 'Có yêu cầu đổi lịch khám';
  const rows = [
    ['Bệnh nhân', patient?.name || appointment?.patientInfo?.name],
    ['Thời gian hiện tại', `${formatDateVN(request.oldDate || appointment?.date) || request.oldDate || appointment?.date || ''} ${formatTimeSlot(request.oldTimeSlot || appointment?.timeSlot)}`.trim()],
    ['Thời gian mong muốn', `${formatDateVN(request.newDate) || request.newDate || ''} ${formatTimeSlot(request.newTimeSlot)}`.trim()],
    ['Lý do', request.reason]
  ];
  const primaryAction = { label: 'Xem và xử lý yêu cầu', url: doctorAppointmentUrl(appUrl, appointment) };

  return {
    to: doctor?.personalEmail || doctor?.email,
    subject: 'Có yêu cầu đổi lịch khám',
    html: renderEmailLayout({
      preheader: `Bệnh nhân ${text(patient?.name || appointment?.patientInfo?.name)} vừa gửi yêu cầu đổi lịch.`,
      eyebrow: 'Khu vực bác sĩ',
      title,
      greeting: `Xin chào <strong>BS. ${escapeHtml(text(doctor?.name, 'Bác sĩ'))}</strong>,`,
      intro: 'Bệnh nhân vừa gửi yêu cầu đổi lịch khám. Vui lòng xử lý trên hệ thống.',
      contentHtml: `${renderBadge('Yêu cầu đổi lịch', 'amber')}${renderInfoTable(rows)}`,
      primaryAction
    }),
    text: renderTextEmail({ title, greeting: `Xin chào BS. ${text(doctor?.name, 'Bác sĩ')}`, rows, action: primaryAction })
  };
}

export function waitingListOfferTemplate({ appUrl, to, patientName, doctorName, date, timeSlot, expiresInMinutes = 10 }) {
  const title = 'Có khung giờ khám trống';
  const rows = [
    ['Bệnh nhân', patientName],
    ['Bác sĩ', doctorName],
    ['Ngày khám', formatDateVN(date) || date],
    ['Khung giờ', formatTimeSlot(timeSlot)],
    ['Thời hạn phản hồi', `${expiresInMinutes} phút`]
  ];
  const primaryAction = { label: 'Mở BookingCare Mini', url: `${appUrl}/appointments/my` };

  return {
    to,
    subject: `Có khung giờ khám trống ngày ${formatDateVN(date) || date}`,
    html: renderEmailLayout({
      preheader: `Khung giờ ${formatTimeSlot(timeSlot)} ngày ${formatDateVN(date) || date} vừa có chỗ trống.`,
      eyebrow: 'Danh sách chờ',
      title,
      greeting: `Xin chào <strong>${escapeHtml(text(patientName, 'bạn'))}</strong>,`,
      intro: 'Khung giờ bạn quan tâm vừa có chỗ trống. Vui lòng phản hồi trong thời hạn để nhận lịch.',
      contentHtml: `${renderBadge('Có chỗ trống', 'green')}${renderInfoTable(rows)}`,
      primaryAction
    }),
    text: renderTextEmail({ title, greeting: `Xin chào ${text(patientName, 'bạn')}`, rows, action: primaryAction })
  };
}
