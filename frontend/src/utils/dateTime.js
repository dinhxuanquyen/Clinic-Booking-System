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

export function slotStartMinutes(timeSlot) {
  const [hours, minutes] = String(timeSlot || '').split('-')[0].split(':').map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  return hours * 60 + minutes;
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

export function nextVietnamDates(count = 7) {
  const dates = [];
  const [year, month, day] = getVietnamToday().split('-').map(Number);
  const base = new Date(year, month - 1, day);

  for (let index = 0; index < count; index += 1) {
    const value = new Date(base);
    value.setDate(base.getDate() + index);
    const nextYear = value.getFullYear();
    const nextMonth = String(value.getMonth() + 1).padStart(2, '0');
    const nextDay = String(value.getDate()).padStart(2, '0');
    dates.push(`${nextYear}-${nextMonth}-${nextDay}`);
  }

  return dates;
}
