import { cleanDisplayText } from './textEncoding.js';

export function hasValue(value) {
  return value !== undefined && value !== null && String(value).trim() !== '';
}

export function entityId(value) {
  return typeof value === 'object' ? value?._id : value;
}

export function displayName(value, fallback = 'Đang cập nhật') {
  if (!value) return fallback;
  const raw = typeof value === 'object' ? value.name : value;
  return cleanDisplayText(raw, fallback);
}

export function displayText(value, fallback = 'Chưa cập nhật') {
  return cleanDisplayText(value, fallback);
}

function isValidDate(value) {
  if (!value) return false;
  const date = new Date(value);
  return !Number.isNaN(date.getTime());
}

export function formatDateVN(value, fallback = 'Chưa cập nhật') {
  if (!isValidDate(value)) return fallback;
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(new Date(value));
}

export function formatDateTimeVN(value, fallback = 'Chưa cập nhật') {
  if (!isValidDate(value)) return fallback;
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(new Date(value));
}

export function formatSlot(slot) {
  return String(slot || '').trim().replace(/\s*-\s*/g, ' - ');
}

export function appointmentTypeLabel(record) {
  const appointment = record?.appointmentId || {};
  return appointment.isFollowUp || appointment.followUpRecordId ? 'Tái khám' : 'Khám lần đầu';
}

export function appointmentStatusLabel(status) {
  const labels = {
    pending: 'Chờ xác nhận',
    confirmed: 'Đã xác nhận',
    in_progress: 'Đang khám',
    completed: 'Hoàn thành',
    cancelled: 'Đã hủy',
    cancel_requested: 'Yêu cầu hủy',
    reschedule_requested: 'Yêu cầu đổi lịch',
    no_show: 'Không đến khám'
  };
  return labels[status] || displayText(status);
}

export function recordCode(record) {
  return record?.recordCode || record?.medicalRecordCode || record?.code || `MR-${String(record?._id || '').slice(-8).toUpperCase()}`;
}

export function followUpStatusInfo(record) {
  if (record?.followUpStatus === 'completed') return { key: 'completed', label: 'Đã hoàn thành tái khám', tone: 'success' };
  if (!record?.followUpRequired) return { key: 'not_required', label: 'Không cần tái khám', tone: 'neutral' };
  if (record.followUpStatus === 'scheduled' || record.followUpStatus === 'booked') return { key: 'scheduled', label: 'Đã đặt lịch tái khám', tone: 'info' };
  if (record.followUpStatus === 'overdue') return { key: 'overdue', label: 'Quá hạn tái khám', tone: 'danger' };
  if (record.followUpStatus === 'cancelled') return { key: 'cancelled', label: 'Đã hủy lịch tái khám', tone: 'danger' };
  return { key: 'recommended', label: 'Cần đặt lịch tái khám', tone: 'warning' };
}

export function deriveClinicalStatus(record) {
  const followUpStatus = followUpStatusInfo(record);
  if (followUpStatus.key === 'overdue') return { key: 'overdue', label: 'Quá hạn tái khám', tone: 'danger' };
  if (followUpStatus.key === 'completed') return { key: 'completed', label: 'Đã hoàn thành tái khám', tone: 'success' };
  if (followUpStatus.key === 'scheduled') return { key: 'scheduled', label: 'Đã đặt tái khám', tone: 'info' };
  if (record?.followUpRequired) return { key: 'needs_follow_up', label: 'Cần theo dõi', tone: 'warning' };
  if (hasValue(record?.conclusion)) return { key: 'stable', label: 'Điều trị ổn định', tone: 'success' };
  return { key: 'updated', label: 'Đã có kết quả khám', tone: 'neutral' };
}

export function canBookFollowUp(record) {
  if (!record?.followUpRequired) return false;
  return ['recommended', 'overdue', 'cancelled'].includes(record.followUpStatus || 'recommended') && !record.followUpAppointmentId;
}

export function linkedFollowUpAppointmentId(record) {
  const appointment = record?.followUpAppointmentId;
  if (!appointment) return '';
  return typeof appointment === 'object' ? appointment._id : appointment;
}

export function followUpBookingUrl(record) {
  const clinicId = entityId(record?.clinicId) || '';
  const specialtyId = entityId(record?.specialtyId) || '';
  const doctorId = entityId(record?.doctorId) || '';
  const params = new URLSearchParams({
    followUpRecordId: record._id,
    clinicId,
    specialtyId,
    doctorId
  });
  return `/booking?${params.toString()}`;
}

export function getSourceFollowUpRecord(record) {
  const source = record?.appointmentId?.followUpRecordId;
  return source && typeof source === 'object' ? source : null;
}

export function getSourceFollowUpRecordId(record) {
  return entityId(record?.appointmentId?.followUpRecordId);
}

export function isFollowUpMedicalRecord(record) {
  return Boolean(record?.appointmentId?.isFollowUp || record?.appointmentId?.followUpRecordId);
}

export function sourceFollowUpVisitText(record) {
  const sourceRecord = getSourceFollowUpRecord(record);
  const sourceAppointment = sourceRecord?.appointmentId || record?.appointmentId?.originalAppointmentId;
  if (sourceAppointment?.date) {
    return `${formatDateVN(sourceAppointment.date)}${sourceAppointment.timeSlot ? ` · ${formatSlot(sourceAppointment.timeSlot)}` : ''}`;
  }
  if (sourceRecord?.createdAt) return formatDateVN(sourceRecord.createdAt);
  return 'lần khám trước';
}

export function followUpDescription(record) {
  const status = followUpStatusInfo(record);
  const dateText = record?.followUpDate ? formatDateVN(record.followUpDate) : '';

  if (status.key === 'not_required') return 'Bác sĩ chưa yêu cầu tái khám.';
  if (status.key === 'scheduled' && record.followUpAppointmentId) {
    const appointment = record.followUpAppointmentId;
    if (appointment?.date) return `Đã đặt lịch tái khám vào ${formatDateVN(appointment.date)}${appointment.timeSlot ? ` · ${formatSlot(appointment.timeSlot)}` : ''}.`;
    return 'Đã đặt lịch tái khám. Vui lòng kiểm tra trong mục Lịch hẹn của tôi.';
  }
  if (status.key === 'completed') return 'Đã hoàn thành tái khám cho hồ sơ này.';
  if (status.key === 'overdue') return dateText ? `Đã quá ngày tái khám đề xuất ${dateText}.` : 'Đã quá hạn tái khám.';
  if (status.key === 'cancelled') return 'Lịch tái khám đã hủy. Bạn có thể đặt lại nếu vẫn cần theo dõi.';
  return dateText ? `Bác sĩ đề xuất tái khám vào ${dateText}.` : 'Bác sĩ đề xuất tái khám, bạn có thể chọn ngày phù hợp.';
}

export function getVitalItems(record) {
  const vitals = record?.vitals || {};
  return [
    ['Huyết áp', vitals.bloodPressure, 'mmHg'],
    ['Nhịp tim', vitals.heartRate, 'lần/phút'],
    ['Nhiệt độ', vitals.temperature, '°C'],
    ['SpO2', vitals.spo2, '%'],
    ['Nhịp thở', vitals.respiratoryRate, 'lần/phút'],
    ['Chiều cao', vitals.height, 'cm'],
    ['Cân nặng', vitals.weight, 'kg'],
    ['BMI', vitals.bmi, '']
  ].filter(([, value]) => hasValue(value));
}

export function getInsuranceSnapshot(record) {
  return record?.insuranceSnapshot || record?.appointmentId?.insuranceSnapshot || null;
}

export function maskInsuranceNumber(value) {
  const text = String(value || '').trim();
  if (text.length <= 8) return text || 'Chưa cập nhật';
  return `${text.slice(0, 4)}${'*'.repeat(Math.max(4, text.length - 8))}${text.slice(-4)}`;
}

export function examDate(record) {
  return record?.appointmentId?.date || record?.createdAt;
}

export function examMonthKey(record) {
  const date = new Date(examDate(record));
  if (Number.isNaN(date.getTime())) return 'Không rõ thời gian';
  return `Tháng ${date.getMonth() + 1}/${date.getFullYear()}`;
}

export function prescriptionCount(record) {
  return Array.isArray(record?.prescription) ? record.prescription.length : 0;
}

export function hasAttachmentFiles(record) {
  return Array.isArray(record?.attachments) && record.attachments.length > 0;
}

export function hasInsuranceInfo(record) {
  const insurance = getInsuranceSnapshot(record);
  return Boolean(insurance?.number || insurance?.insuranceNumber || insurance?.cardNumber);
}

export function latestExamDate(records = []) {
  const timestamps = records
    .map((record) => new Date(examDate(record)).getTime())
    .filter((time) => !Number.isNaN(time));
  if (!timestamps.length) return '';
  return new Date(Math.max(...timestamps)).toISOString();
}

export function servicePackageName(record) {
  const appointmentPackage = record?.appointmentId?.servicePackageSnapshot || record?.appointmentId?.servicePackageId;
  const recordPackage = record?.servicePackageSnapshot || record?.servicePackageId;
  const servicePackage = recordPackage || appointmentPackage;
  if (servicePackage && typeof servicePackage === 'object') return displayName(servicePackage, 'Để bác sĩ tư vấn');
  return 'Để bác sĩ tư vấn';
}
