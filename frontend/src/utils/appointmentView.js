import { cleanDisplayText } from './textEncoding.js';

const TERMINAL_STATUSES = ['completed', 'cancelled', 'no_show'];

const STATUS_META = {
  pending: { label: 'Chờ xác nhận', tone: 'warning' },
  confirmed: { label: 'Đã xác nhận', tone: 'success' },
  in_progress: { label: 'Đang khám', tone: 'info' },
  completed: { label: 'Hoàn thành', tone: 'primary' },
  cancelled: { label: 'Đã hủy', tone: 'neutral' },
  cancel_requested: { label: 'Đang chờ duyệt hủy', tone: 'danger' },
  reschedule_requested: { label: 'Đang chờ duyệt đổi lịch', tone: 'warning' },
  reschedule_rejected: { label: 'Yêu cầu đổi lịch bị từ chối', tone: 'danger' },
  no_show: { label: 'Không đến khám', tone: 'danger' }
};

const WAITING_STATUS_META = {
  waiting: { label: 'Đang chờ', tone: 'warning' },
  offered: { label: 'Đã đề nghị', tone: 'info' },
  accepted: { label: 'Đã chấp nhận', tone: 'success' },
  declined: { label: 'Đã từ chối', tone: 'danger' },
  expired: { label: 'Đã hết hạn', tone: 'neutral' },
  cancelled: { label: 'Đã hủy', tone: 'neutral' }
};

export function displayName(value, fallback = 'Đang cập nhật') {
  if (!value) return fallback;
  if (typeof value === 'object') {
    return cleanDisplayText(value.name || value.fullName || value.title, fallback);
  }
  return cleanDisplayText(value, fallback);
}

function parseDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function dateFromAppointment(appointment) {
  return parseDate(appointment?.date || appointment?.createdAt);
}

export function formatDateVN(value) {
  const date = parseDate(value);
  if (!date) return 'Chưa cập nhật';
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(date);
}

export function formatMonthYearVN(value) {
  const date = parseDate(value);
  if (!date) return 'Chưa cập nhật';
  return `Tháng ${date.getMonth() + 1}/${date.getFullYear()}`;
}

export function formatTimeSlot(slot) {
  if (!slot) return 'Chưa chọn giờ';
  return String(slot).replace(/\s*-\s*/, ' - ');
}

export function formatAppointmentDateTime(date, slot) {
  return `${formatDateVN(date)} · ${formatTimeSlot(slot)}`;
}

export function getAppointmentTypeLabel(appointment) {
  return appointment?.isFollowUp || appointment?.followUpRecordId ? 'Tái khám' : 'Khám lần đầu';
}

export function isFollowUpAppointment(appointment) {
  return Boolean(appointment?.isFollowUp || appointment?.followUpRecordId);
}

export function getAppointmentStatusLabel(status) {
  return STATUS_META[status]?.label || 'Không xác định';
}

export function getAppointmentStatusTone(status) {
  return STATUS_META[status]?.tone || 'neutral';
}

export function getWaitingStatusLabel(status) {
  return WAITING_STATUS_META[status]?.label || 'Không xác định';
}

export function getWaitingStatusTone(status) {
  return WAITING_STATUS_META[status]?.tone || 'neutral';
}

export function getAppointmentCode(appointment) {
  return appointment?.appointmentCode || appointment?.code || (appointment?._id ? `AP-${String(appointment._id).slice(-8).toUpperCase()}` : 'Chưa cấp mã');
}

export function getServicePackageName(appointment) {
  const servicePackage = appointment?.servicePackageSnapshot || appointment?.servicePackageId;
  if (servicePackage && typeof servicePackage === 'object') {
    return cleanDisplayText(servicePackage.name, 'Gói khám');
  }
  return 'Để bác sĩ tư vấn';
}

export function getDoctorDisplayName(appointment) {
  return displayName(appointment?.doctorId, 'Bác sĩ đang cập nhật');
}

export function getClinicDisplayName(appointment) {
  return displayName(appointment?.clinicId, 'Cơ sở đang cập nhật');
}

export function getSpecialtyDisplayName(appointment) {
  return displayName(appointment?.specialtyId, 'Chuyên khoa đang cập nhật');
}

export function isUpcomingAppointment(appointment) {
  if (!appointment || TERMINAL_STATUSES.includes(appointment.status)) return false;
  const date = dateFromAppointment(appointment);
  if (!date) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date.getTime() >= today.getTime();
}

export function isPastAppointment(appointment) {
  if (!appointment) return false;
  if (TERMINAL_STATUSES.includes(appointment.status)) return true;
  const date = dateFromAppointment(appointment);
  if (!date) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date.getTime() < today.getTime();
}

export function isTodayAppointment(appointment) {
  const date = dateFromAppointment(appointment);
  if (!date) return false;
  const today = new Date();
  return date.toDateString() === today.toDateString();
}

export function canRequestCancel(appointment) {
  return ['pending', 'confirmed'].includes(appointment?.status);
}

export function canRequestReschedule(appointment) {
  return appointment?.status === 'confirmed';
}

export function canCancelRescheduleRequest(appointment) {
  return appointment?.status === 'reschedule_requested';
}

export function canDownloadBookingPdf(appointment) {
  return Boolean(appointment?._id);
}

export function canDownloadQueueTicket(appointment) {
  return Boolean(appointment?.queueNumber);
}

export function canViewMedicalRecord(appointment) {
  return appointment?.status === 'completed';
}

export function canReviewDoctor(appointment) {
  return appointment?.status === 'completed';
}

export function formatQueueNumber(queueNumber) {
  if (!queueNumber) return '';
  return String(queueNumber).padStart(2, '0');
}

export function appointmentYear(appointment) {
  const date = dateFromAppointment(appointment);
  return date ? String(date.getFullYear()) : '';
}

export function appointmentSearchText(appointment) {
  return [
    getDoctorDisplayName(appointment),
    getClinicDisplayName(appointment),
    getSpecialtyDisplayName(appointment),
    getServicePackageName(appointment),
    appointment?.reason
  ].join(' ').toLowerCase();
}
