function idOf(value) {
  if (!value) return '';
  return String(value._id || value);
}

function shortId(value) {
  const id = idOf(value);
  return id ? id.slice(-8).toUpperCase() : '';
}

export function buildMedicalRecordCode(record) {
  return record?.recordCode || record?.medicalRecordCode || record?.code || (shortId(record) ? `MR-${shortId(record)}` : 'MR');
}

export function buildAppointmentCode(appointment) {
  return appointment?.appointmentCode || appointment?.code || (shortId(appointment) ? `AP-${shortId(appointment)}` : 'AP');
}

export function formatDateForFilename(value) {
  if (!value) return '';

  const text = String(value);
  const isoDate = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoDate) return `${isoDate[3]}-${isoDate[2]}-${isoDate[1]}`;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'Asia/Ho_Chi_Minh'
  }).format(date).replace(/\//g, '-');
}

export function sanitizeFilename(value, fallback = 'file', maxLength = 80) {
  const normalized = String(value || '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\/\\:*?"<>|]/g, '')
    .replace(/[^a-zA-Z0-9._ -]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[.-]+|[.-]+$/g, '')
    .slice(0, maxLength)
    .replace(/-+$/g, '');

  return normalized || fallback;
}

export function medicalRecordPdfFilename(record) {
  const appointment = record?.appointmentId || {};
  const recordCode = sanitizeFilename(buildMedicalRecordCode(record), shortId(record) || 'MR');
  const patientName = sanitizeFilename(
    record?.patientId?.name || appointment?.patientSnapshot?.name || appointment?.patientInfo?.name || '',
    '',
    64
  );
  const examDate = formatDateForFilename(appointment?.date || record?.createdAt) || formatDateForFilename(new Date());
  const parts = ['ket-qua-kham', recordCode, patientName, examDate].filter(Boolean);
  return `${parts.join('-')}.pdf`;
}

export function appointmentPdfFilename(appointment) {
  const appointmentCode = sanitizeFilename(buildAppointmentCode(appointment), shortId(appointment) || 'AP');
  const patientName = sanitizeFilename(
    appointment?.patientInfo?.name || appointment?.patientId?.name || appointment?.patientSnapshot?.name || '',
    '',
    64
  );
  const date = formatDateForFilename(appointment?.date || appointment?.createdAt) || formatDateForFilename(new Date());
  const parts = ['phieu-dat-lich', appointmentCode, patientName, date].filter(Boolean);
  return `${parts.join('-')}.pdf`;
}

export function queueTicketPdfFilename(appointment) {
  const appointmentCode = sanitizeFilename(buildAppointmentCode(appointment), shortId(appointment) || 'AP');
  const queueNumber = appointment?.queueNumber ? String(appointment.queueNumber).padStart(2, '0') : 'chua-cap';
  return `phieu-kham-${appointmentCode}-STT-${sanitizeFilename(queueNumber, 'chua-cap')}.pdf`;
}
