import Appointment from '../models/appointmentModel.js';
import MedicalRecord from '../models/medicalRecordModel.js';
import Notification from '../models/notificationModel.js';
import User from '../models/central/User.js';
import { APPOINTMENT_STATUSES } from '../constants/appointmentStatus.js';
import { FOLLOW_UP_STATUSES } from '../constants/followUpStatus.js';
import { createAuditLog } from '../utils/auditLogger.js';
import { sendFollowUpDueSoonEmail, sendFollowUpOverdueEmail } from './emailService.js';
import { emitNotification, emitToUser } from './socketService.js';

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

async function emitFollowUpUpdated(record, reason = 'updated') {
  if (!record?.patientId) return;

  const payload = {
    medicalRecordId: String(record._id),
    appointmentId: String(toObjectId(record.appointmentId) || ''),
    patientId: String(toObjectId(record.patientId) || ''),
    doctorId: String(toObjectId(record.doctorId) || ''),
    followUpStatus: record.followUpStatus,
    followUpDate: formatDate(record.followUpDate),
    followUpAppointmentId: record.followUpAppointmentId ? String(toObjectId(record.followUpAppointmentId)) : null,
    followUpCompletedRecordId: record.followUpCompletedRecordId ? String(toObjectId(record.followUpCompletedRecordId)) : null,
    reason
  };

  emitToUser(toObjectId(record.patientId), 'follow-up:updated', payload);

  const doctorId = toObjectId(record.doctorId);
  if (!doctorId) return;

  const doctorUser = await User.findOne({
    role: 'doctor',
    doctorId,
    isActive: { $ne: false }
  }).select('_id');

  if (doctorUser?._id) {
    emitToUser(doctorUser._id, 'follow-up:updated', payload);
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

async function getFollowUpPatient(record) {
  if (!record?.patientId) return null;
  return User.findById(record.patientId).select('name email');
}

export async function syncFollowUpStatusForAppointment(appointment, now = new Date()) {
  const followUpRecordId = toObjectId(appointment?.followUpRecordId);
  if (!followUpRecordId) return null;

  const record = await MedicalRecord.findById(followUpRecordId);
  if (!record || !record.followUpRequired) return null;

  if (appointment.status === APPOINTMENT_STATUSES.COMPLETED) {
    const completedRecord = await MedicalRecord.findOne({ appointmentId: toObjectId(appointment._id) }).select('_id');
    if (!completedRecord?._id) {
      const currentFollowUpAppointmentId = record.followUpAppointmentId ? String(toObjectId(record.followUpAppointmentId)) : '';
      const nextFollowUpAppointmentId = String(toObjectId(appointment._id));
      const shouldSyncScheduledState = record.followUpStatus !== FOLLOW_UP_STATUSES.SCHEDULED
        || currentFollowUpAppointmentId !== nextFollowUpAppointmentId
        || Boolean(record.followUpCompletedRecordId)
        || Boolean(record.followUpCompletedAt);

      if (shouldSyncScheduledState) {
        record.followUpStatus = FOLLOW_UP_STATUSES.SCHEDULED;
        record.followUpAppointmentId = toObjectId(appointment._id);
        record.followUpCompletedRecordId = null;
        record.followUpCompletedAt = undefined;
        record.followUpOverdueAt = undefined;
        await record.save();
        await emitFollowUpUpdated(record, 'completed_without_record');
      }
      return record;
    }

    record.followUpStatus = FOLLOW_UP_STATUSES.COMPLETED;
    record.followUpAppointmentId = toObjectId(appointment._id);
    record.followUpCompletedRecordId = completedRecord._id;
    record.followUpCompletedAt = appointment.completedAt || now;
    record.followUpOverdueAt = undefined;
    await record.save();
    await emitFollowUpUpdated(record, 'completed');
    return record;
  }

  if ([APPOINTMENT_STATUSES.CANCELLED, APPOINTMENT_STATUSES.NO_SHOW].includes(appointment.status)) {
    record.followUpAppointmentId = toObjectId(appointment._id);
    record.followUpCompletedRecordId = null;
    record.followUpCompletedAt = undefined;
    record.followUpStatus = isPastFollowUpDate(record, now) ? FOLLOW_UP_STATUSES.OVERDUE : FOLLOW_UP_STATUSES.RECOMMENDED;
    if (record.followUpStatus === FOLLOW_UP_STATUSES.OVERDUE) {
      record.followUpOverdueAt = record.followUpOverdueAt || now;
    } else {
      record.followUpOverdueAt = undefined;
    }
    await record.save();
    await emitFollowUpUpdated(record, appointment.status === APPOINTMENT_STATUSES.NO_SHOW ? 'no_show' : 'cancelled');
    return record;
  }

  const currentFollowUpAppointmentId = record.followUpAppointmentId ? String(toObjectId(record.followUpAppointmentId)) : '';
  const nextFollowUpAppointmentId = String(toObjectId(appointment._id));

  if (record.followUpStatus !== FOLLOW_UP_STATUSES.SCHEDULED || currentFollowUpAppointmentId !== nextFollowUpAppointmentId) {
    record.followUpStatus = FOLLOW_UP_STATUSES.SCHEDULED;
    record.followUpAppointmentId = toObjectId(appointment._id);
    record.followUpCompletedRecordId = null;
    record.followUpCompletedAt = undefined;
    record.followUpOverdueAt = undefined;
    await record.save();
    await emitFollowUpUpdated(record, 'scheduled');
  }

  return record;
}

async function syncScheduledFollowUps(now) {
  const records = await MedicalRecord.find({
    followUpRequired: true,
    followUpStatus: FOLLOW_UP_STATUSES.SCHEDULED,
    followUpAppointmentId: { $ne: null }
  }).select('_id followUpRequired followUpStatus followUpDate followUpAppointmentId followUpCompletedRecordId followUpCompletedAt followUpOverdueAt');

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
    followUpDate: { $lt: todayStart }
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
      'Bạn đã quá hạn tái khám. Vui lòng đặt lịch nếu vẫn cần theo dõi.'
    ));
    await safeSideEffect('Follow-up overdue email', async () => {
      const patient = await getFollowUpPatient(record);
      await sendFollowUpOverdueEmail({ patient, record });
    });
    await safeSideEffect('Follow-up overdue realtime emit', () => emitFollowUpUpdated(record, 'overdue'));
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
    $or: [
      { followUpReminderSentAt: { $exists: false } },
      { followUpReminderSentAt: null }
    ]
  }).select('_id patientId appointmentId doctorId clinicId followUpDate followUpStatus followUpReminderSentAt');

  let sent = 0;
  for (const record of records) {
    record.followUpReminderSentAt = now;
    await record.save();
    sent += 1;

    await safeSideEffect('Follow-up due soon notification', () => createFollowUpNotification(
      record,
      'follow_up_due_soon',
      'Sắp đến lịch tái khám',
      'Bạn có lịch tái khám được khuyến nghị vào ngày mai.'
    ));
    await safeSideEffect('Follow-up due soon email', async () => {
      const patient = await getFollowUpPatient(record);
      await sendFollowUpDueSoonEmail({ patient, record });
    });
    await safeSideEffect('Follow-up due soon realtime emit', () => emitFollowUpUpdated(record, 'due_soon'));
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
