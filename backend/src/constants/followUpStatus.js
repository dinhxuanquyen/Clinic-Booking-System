export const FOLLOW_UP_STATUSES = Object.freeze({
  NONE: 'none',
  RECOMMENDED: 'recommended',
  SCHEDULED: 'scheduled',
  COMPLETED: 'completed',
  OVERDUE: 'overdue',
  CANCELLED: 'cancelled'
});

export const FOLLOW_UP_STATUS_VALUES = Object.freeze(Object.values(FOLLOW_UP_STATUSES));

export const FOLLOW_UP_TYPES = Object.freeze({
  DOCTOR_RECOMMENDED: 'doctor_recommended',
  PATIENT_SELECTED: 'patient_selected'
});

export const FOLLOW_UP_TYPE_VALUES = Object.freeze(Object.values(FOLLOW_UP_TYPES));

export const OPEN_FOLLOW_UP_STATUSES = Object.freeze([
  FOLLOW_UP_STATUSES.RECOMMENDED,
  FOLLOW_UP_STATUSES.OVERDUE
]);

export const BOOKED_FOLLOW_UP_STATUSES = Object.freeze([
  FOLLOW_UP_STATUSES.SCHEDULED,
  FOLLOW_UP_STATUSES.COMPLETED
]);
