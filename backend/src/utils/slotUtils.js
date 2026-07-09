function toMinutes(time) {
  const [hours, minutes] = String(time).split(':').map(Number);
  return hours * 60 + minutes;
}

function toTime(totalMinutes) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

export function generateTimeSlots(workingHours, slotDuration) {
  if (!workingHours?.start || !workingHours?.end || !slotDuration) {
    return [];
  }

  const start = toMinutes(workingHours.start);
  const end = toMinutes(workingHours.end);
  const duration = Number(slotDuration);

  if (!Number.isFinite(start) || !Number.isFinite(end) || !Number.isFinite(duration) || duration <= 0 || start >= end) {
    return [];
  }

  const slots = [];
  for (let cursor = start; cursor + duration <= end; cursor += duration) {
    slots.push(`${toTime(cursor)}-${toTime(cursor + duration)}`);
  }

  return slots;
}
