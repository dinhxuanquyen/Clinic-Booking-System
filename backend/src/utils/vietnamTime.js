const vietnamDateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Ho_Chi_Minh',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit'
});

const vietnamTimeFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Ho_Chi_Minh',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false
});

export function getVietnamToday() {
  const parts = vietnamDateFormatter.formatToParts(new Date());
  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  const day = parts.find((part) => part.type === 'day')?.value;
  return `${year}-${month}-${day}`;
}

export function getVietnamCurrentMinutes() {
  const parts = vietnamTimeFormatter.formatToParts(new Date());
  const hours = Number(parts.find((part) => part.type === 'hour')?.value || 0);
  const minutes = Number(parts.find((part) => part.type === 'minute')?.value || 0);
  return hours * 60 + minutes;
}

export function timeToMinutes(time) {
  const [hours, minutes] = String(time || '').split(':').map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  return hours * 60 + minutes;
}

export function slotStartMinutes(timeSlot) {
  const start = String(timeSlot || '').split('-')[0];
  return timeToMinutes(start);
}

export function isPastDate(date) {
  return String(date) < getVietnamToday();
}

export function isPastOrCurrentSlot(date, timeSlot) {
  if (isPastDate(date)) return true;
  if (String(date) !== getVietnamToday()) return false;

  const startMinutes = slotStartMinutes(timeSlot);
  if (startMinutes === null) return false;
  return startMinutes <= getVietnamCurrentMinutes();
}

export function assertBookableDateTime(date, timeSlot) {
  if (isPastDate(date)) {
    const error = new Error('Không thể đặt lịch trong quá khứ');
    error.statusCode = 400;
    throw error;
  }

  if (isPastOrCurrentSlot(date, timeSlot)) {
    const error = new Error('Khung giờ này đã qua, vui lòng chọn khung giờ khác');
    error.statusCode = 400;
    throw error;
  }
}
