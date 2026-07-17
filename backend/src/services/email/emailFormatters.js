export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function text(value, fallback = 'Đang cập nhật') {
  const normalized = String(value ?? '').trim();
  return normalized || fallback;
}

function isValidDate(value) {
  if (!value) return false;
  const date = new Date(value);
  return !Number.isNaN(date.getTime());
}

export function formatDateVN(value) {
  if (!isValidDate(value)) return '';
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'Asia/Ho_Chi_Minh'
  }).format(new Date(value));
}

export function formatDateTimeVN(value) {
  if (!isValidDate(value)) return '';
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Ho_Chi_Minh'
  }).format(new Date(value));
}

export function formatTimeSlot(slot) {
  return String(slot || '').trim().replace(/\s*-\s*/g, ' - ');
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
    reschedule_rejected: 'Từ chối đổi lịch',
    no_show: 'Không đến khám'
  };

  return labels[status] || text(status);
}

export function appointmentTypeLabel(appointmentOrType) {
  if (appointmentOrType === 'follow_up') return 'Tái khám';
  if (appointmentOrType === 'first_visit') return 'Khám lần đầu';
  return appointmentOrType?.isFollowUp || appointmentOrType?.followUpRecordId ? 'Tái khám' : 'Khám lần đầu';
}

export function followUpStatusLabel(status) {
  const labels = {
    none: 'Không cần tái khám',
    recommended: 'Cần đặt lịch tái khám',
    scheduled: 'Đã đặt lịch tái khám',
    completed: 'Đã hoàn thành tái khám',
    overdue: 'Quá hạn tái khám',
    cancelled: 'Đã hủy lịch tái khám'
  };

  return labels[status] || 'Cần tái khám';
}

export function appointmentCode(appointment) {
  const id = String(appointment?._id || appointment?.id || '');
  return appointment?.appointmentCode || appointment?.code || (id ? `AP-${id.slice(-8).toUpperCase()}` : 'AP');
}

export function servicePackageName(source) {
  const servicePackage = source?.servicePackageSnapshot || source?.servicePackageId || source?.servicePackage;
  return servicePackage?.name || 'Để bác sĩ tư vấn';
}

export function joinLines(lines = []) {
  return lines.filter(Boolean).join('\n');
}
