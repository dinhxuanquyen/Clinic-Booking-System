import Appointment from '../models/appointmentModel.js';
import MedicalRecord from '../models/medicalRecordModel.js';
import Notification from '../models/notificationModel.js';
import { APPOINTMENT_STATUSES } from '../constants/appointmentStatus.js';
import { FOLLOW_UP_STATUSES } from '../constants/followUpStatus.js';
import { createAuditLog } from '../utils/auditLogger.js';
import { emitNotification } from './socketService.js';

const JOB_INTERVAL_MS = 60 * 60 * 1000;
const REMINDER_WINDOW_MS = 24 * 60 * 60 * 1000;

function toObjectId(value) {
  return value?._id || value || null;
}

function formatDate(value) {
  if (!value) return '';
  return String(value).slice(0, 10);
}

function startOfTodayInVietnam(now = new Date()) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  return new Date(`${formatter.format(now)}T00:00:00+07:00`);
}

function isPastFollowUpDate(record, now = new Date()) {
  if (!record.followUpDate) return false;
  return new Date(record.followUpDate).getTime() < startOfTodayInVietnam(now).getTime();
}

async function safeSideEffect(label, fn) {
  try {
    await fn();
  } catch (error) {
    console.warn(`${label} failed:`, error.stack || error);
  }
}

async function createFollowUpNotification(record, type, title, message) {
  const notification = await Notification.create({
    userId: record.patientId,
    role: 'patient',
    appointmentId: toObjectId(record.appointmentId),
    type,
    title,
    message,
    targetUrl: `/medical-records?recordId=${record._id}`,
    metadata: {
      medicalRecordId: record._id,
      appointmentId: toObjectId(record.appointmentId),
      doctorId: toObjectId(record.doctorId),
      clinicId: toObjectId(record.clinicId),
      followUpDate: formatDate(record.followUpDate)
    },
    isRead: false
  });

  emitNotification(notification.toObject());
  return notification;
}

export async function syncFollowUpStatusForAppointment(appointment, now = new Date()) {
  const followUpRecordId = toObjectId(appointment?.followUpRecordId);
  if (!followUpRecordId) return null;

  const record = await MedicalRecord.findById(followUpRecordId);
  if (!record || !record.followUpRequired) return null;

  if (appointment.status === APPOINTMENT_STATUSES.COMPLETED) {
    record.followUpStatus = FOLLOW_UP_STATUSES.COMPLETED;
    record.followUpCompletedAt = appointment.completedAt || now;
    record.followUpOverdueAt = undefined;
    await record.save();
    return record;
  }

  if ([APPOINTMENT_STATUSES.CANCELLED, APPOINTMENT_STATUSES.NO_SHOW].includes(appointment.status)) {
    record.followUpAppointmentId = null;
    record.followUpCompletedAt = undefined;
    record.followUpStatus = isPastFollowUpDate(record, now) ? FOLLOW_UP_STATUSES.OVERDUE : FOLLOW_UP_STATUSES.RECOMMENDED;
    if (record.followUpStatus === FOLLOW_UP_STATUSES.OVERDUE) {
      record.followUpOverdueAt = record.followUpOverdueAt || now;
    }
    await record.save();
    return record;
  }

  if (record.followUpStatus !== FOLLOW_UP_STATUSES.SCHEDULED) {
    record.followUpStatus = FOLLOW_UP_STATUSES.SCHEDULED;
    record.followUpAppointmentId = toObjectId(appointment._id);
    await record.save();
  }

  return record;
}

async function syncScheduledFollowUps(now) {
  const records = await MedicalRecord.find({
    followUpRequired: true,
    followUpStatus: FOLLOW_UP_STATUSES.SCHEDULED,
    followUpAppointmentId: { $ne: null }
  }).select('_id followUpRequired followUpStatus followUpDate followUpAppointmentId followUpCompletedAt followUpOverdueAt');

  let synced = 0;
  for (const record of records) {
    const appointment = await Appointment.findById(record.followUpAppointmentId)
      .select('_id status completedAt followUpRecordId');
    if (!appointment) continue;

    const updated = await syncFollowUpStatusForAppointment(appointment, now);
    if (updated) synced += 1;
  }

  return synced;
}

async function markOverdueFollowUps(now) {
  const todayStart = startOfTodayInVietnam(now);
  const records = await MedicalRecord.find({
    followUpRequired: true,
    followUpStatus: FOLLOW_UP_STATUSES.RECOMMENDED,
    followUpDate: { $lt: todayStart },
    followUpAppointmentId: null
  }).select('_id patientId appointmentId doctorId clinicId followUpDate followUpStatus followUpOverdueAt');

  let updated = 0;
  for (const record of records) {
    record.followUpStatus = FOLLOW_UP_STATUSES.OVERDUE;
    record.followUpOverdueAt = record.followUpOverdueAt || now;
    await record.save();
    updated += 1;

    await safeSideEffect('Follow-up overdue notification', () => createFollowUpNotification(
      record,
      'follow_up_overdue',
      'Bạn đã quá hạn tái khám',
      'Bạn đã quá hạn tái khám theo khuyến nghị của bác sĩ. Vui lòng đặt lịch sớm để được theo dõi tiếp.'
    ));
    await safeSideEffect('Follow-up overdue audit log', () => createAuditLog({
      action: 'MARK_FOLLOW_UP_OVERDUE',
      entityType: 'MedicalRecord',
      entityId: record._id,
      entityName: `Hồ sơ khám bệnh ${record._id}`,
      description: 'Tự động đánh dấu hồ sơ quá hạn tái khám',
      metadata: {
        medicalRecordId: record._id,
        appointmentId: record.appointmentId,
        patientId: record.patientId,
        followUpDate: record.followUpDate
      }
    }));
  }

  return updated;
}

async function sendDueSoonFollowUpReminders(now) {
  const maxDate = new Date(now.getTime() + REMINDER_WINDOW_MS);
  const records = await MedicalRecord.find({
    followUpRequired: true,
    followUpStatus: FOLLOW_UP_STATUSES.RECOMMENDED,
    followUpDate: { $gte: startOfTodayInVietnam(now), $lte: maxDate },
    followUpAppointmentId: null,
    $or: [
      { followUpReminderSentAt: { $exists: false } },
      { followUpReminderSentAt: null }
    ]
  }).select('_id patientId appointmentId doctorId clinicId followUpDate followUpReminderSentAt');

  let sent = 0;
  for (const record of records) {
    record.followUpReminderSentAt = now;
    await record.save();
    sent += 1;

    await safeSideEffect('Follow-up due soon notification', () => createFollowUpNotification(
      record,
      'follow_up_due_soon',
      'Sắp đến lịch tái khám',
      `Bạn có lịch tái khám được khuyến nghị vào ngày ${formatDate(record.followUpDate)}. Vui lòng đặt lịch phù hợp.`
    ));
  }

  return sent;
}

export async function processFollowUpRecords(now = new Date()) {
  const [synced, overdue, reminders] = await Promise.all([
    syncScheduledFollowUps(now),
    markOverdueFollowUps(now),
    sendDueSoonFollowUpReminders(now)
  ]);

  if (synced || overdue || reminders) {
    console.log(`Follow-up job synced ${synced}, marked overdue ${overdue}, sent reminders ${reminders}`);
  }

  return { synced, overdue, reminders };
}

export function startFollowUpJob() {
  processFollowUpRecords().catch((error) => {
    console.warn('Follow-up initial run failed:', error.stack || error);
  });

  const timer = setInterval(() => {
    processFollowUpRecords().catch((error) => {
      console.warn('Follow-up job failed:', error.stack || error);
    });
  }, JOB_INTERVAL_MS);

  timer.unref?.();
  return timer;
}
