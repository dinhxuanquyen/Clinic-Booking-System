import mongoose from 'mongoose';
import { connectCentralDb } from '../config/db.js';
import Appointment from '../models/appointmentModel.js';
import MedicalRecord from '../models/medicalRecordModel.js';
import { APPOINTMENT_STATUSES } from '../constants/appointmentStatus.js';
import { FOLLOW_UP_STATUSES } from '../constants/followUpStatus.js';

const INACTIVE_APPOINTMENT_STATUSES = new Set([
  APPOINTMENT_STATUSES.CANCELLED,
  APPOINTMENT_STATUSES.NO_SHOW
]);

function idOf(value) {
  return value?._id || value || null;
}

function idString(value) {
  const id = idOf(value);
  return id ? String(id) : '';
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

function isActiveFollowUpAppointment(appointment) {
  return appointment && !INACTIVE_APPOINTMENT_STATUSES.has(appointment.status);
}

function compareDates(a, b) {
  const parsedATime = a ? new Date(a).getTime() : 0;
  const parsedBTime = b ? new Date(b).getTime() : 0;
  const aTime = Number.isNaN(parsedATime) ? 0 : parsedATime;
  const bTime = Number.isNaN(parsedBTime) ? 0 : parsedBTime;
  return aTime - bTime;
}

function sortFollowUpAppointments(a, b) {
  if (a.status === APPOINTMENT_STATUSES.COMPLETED && b.status !== APPOINTMENT_STATUSES.COMPLETED) return -1;
  if (b.status === APPOINTMENT_STATUSES.COMPLETED && a.status !== APPOINTMENT_STATUSES.COMPLETED) return 1;

  const dateCompare = compareDates(`${b.date || ''}T00:00:00`, `${a.date || ''}T00:00:00`);
  if (dateCompare !== 0) return dateCompare;

  return compareDates(b.updatedAt || b.createdAt, a.updatedAt || a.createdAt);
}

async function findBestFollowUpAppointment(record) {
  const appointmentIds = new Set();
  if (record.followUpAppointmentId) appointmentIds.add(idString(record.followUpAppointmentId));

  const query = {
    $or: [
      { followUpRecordId: record._id },
      ...(appointmentIds.size ? [{ _id: { $in: [...appointmentIds] } }] : [])
    ]
  };

  const appointments = await Appointment.find(query)
    .select('_id status date timeSlot completedAt followUpRecordId createdAt updatedAt')
    .lean();

  const linked = appointments
    .filter((appointment) => idString(appointment.followUpRecordId) === idString(record._id))
    .filter(isActiveFollowUpAppointment)
    .sort(sortFollowUpAppointments);

  if (linked.length > 0) return linked[0];

  const direct = appointments
    .filter((appointment) => appointmentIds.has(idString(appointment._id)))
    .filter(isActiveFollowUpAppointment)
    .sort(sortFollowUpAppointments);

  return direct[0] || null;
}

function desiredFollowUpState(record, appointment, now) {
  if (!record.followUpRequired) {
    return {
      followUpStatus: FOLLOW_UP_STATUSES.NONE,
      followUpAppointmentId: null,
      followUpOverdueAt: null,
      followUpCompletedAt: null
    };
  }

  if (appointment?.status === APPOINTMENT_STATUSES.COMPLETED) {
    return {
      followUpStatus: FOLLOW_UP_STATUSES.COMPLETED,
      followUpAppointmentId: idOf(appointment._id),
      followUpOverdueAt: null,
      followUpCompletedAt: appointment.completedAt || now
    };
  }

  if (appointment) {
    return {
      followUpStatus: FOLLOW_UP_STATUSES.SCHEDULED,
      followUpAppointmentId: idOf(appointment._id),
      followUpOverdueAt: null,
      followUpCompletedAt: null
    };
  }

  if (isPastFollowUpDate(record, now)) {
    return {
      followUpStatus: FOLLOW_UP_STATUSES.OVERDUE,
      followUpAppointmentId: null,
      followUpOverdueAt: record.followUpOverdueAt || now,
      followUpCompletedAt: null
    };
  }

  return {
    followUpStatus: FOLLOW_UP_STATUSES.RECOMMENDED,
    followUpAppointmentId: null,
    followUpOverdueAt: null,
    followUpCompletedAt: null
  };
}

function sameDate(a, b) {
  if (!a && !b) return true;
  if (!a || !b) return false;
  return new Date(a).getTime() === new Date(b).getTime();
}

function buildUpdate(record, desired) {
  const $set = {};
  const $unset = {};

  if (record.followUpStatus !== desired.followUpStatus) {
    $set.followUpStatus = desired.followUpStatus;
  }

  if (idString(record.followUpAppointmentId) !== idString(desired.followUpAppointmentId)) {
    if (desired.followUpAppointmentId) $set.followUpAppointmentId = desired.followUpAppointmentId;
    else $unset.followUpAppointmentId = '';
  }

  if (!sameDate(record.followUpOverdueAt, desired.followUpOverdueAt)) {
    if (desired.followUpOverdueAt) $set.followUpOverdueAt = desired.followUpOverdueAt;
    else $unset.followUpOverdueAt = '';
  }

  if (!sameDate(record.followUpCompletedAt, desired.followUpCompletedAt)) {
    if (desired.followUpCompletedAt) $set.followUpCompletedAt = desired.followUpCompletedAt;
    else $unset.followUpCompletedAt = '';
  }

  const update = {};
  if (Object.keys($set).length) update.$set = $set;
  if (Object.keys($unset).length) update.$unset = $unset;
  return update;
}

function incrementStatus(summary, status) {
  summary.byStatus[status] = (summary.byStatus[status] || 0) + 1;
}

function printChange(record, desired, appointment) {
  const appointmentInfo = appointment ? ` appointment=${idString(appointment._id)} status=${appointment.status}` : ' appointment=none';
  console.log(
    `- ${idString(record._id)}: ${record.followUpStatus || 'unset'} -> ${desired.followUpStatus}${appointmentInfo}`
  );
}

async function syncFollowUpStatuses({ dryRun = true } = {}) {
  const now = new Date();
  const records = await MedicalRecord.find({
    $or: [
      { followUpRequired: true },
      { followUpStatus: { $ne: FOLLOW_UP_STATUSES.NONE } },
      { followUpAppointmentId: { $ne: null } }
    ]
  }).select('_id followUpRequired followUpDate followUpStatus followUpAppointmentId followUpOverdueAt followUpCompletedAt');

  const summary = {
    dryRun,
    scanned: records.length,
    alreadyConsistent: 0,
    updated: 0,
    byStatus: {},
    noRecommendedDate: 0
  };

  for (const record of records) {
    const appointment = await findBestFollowUpAppointment(record);
    const desired = desiredFollowUpState(record, appointment, now);
    const update = buildUpdate(record, desired);
    incrementStatus(summary, desired.followUpStatus);

    if (record.followUpRequired && !record.followUpDate && desired.followUpStatus === FOLLOW_UP_STATUSES.RECOMMENDED) {
      summary.noRecommendedDate += 1;
    }

    if (!Object.keys(update).length) {
      summary.alreadyConsistent += 1;
      continue;
    }

    printChange(record, desired, appointment);
    summary.updated += 1;

    if (!dryRun) {
      await MedicalRecord.updateOne({ _id: record._id }, update);
    }
  }

  return summary;
}

async function run() {
  const apply = process.argv.includes('--apply');
  const dryRun = !apply;

  await connectCentralDb();
  const summary = await syncFollowUpStatuses({ dryRun });

  console.log('\nFollow-up status sync summary');
  console.log(`Mode: ${summary.dryRun ? 'dry-run' : 'apply'}`);
  console.log(`Scanned: ${summary.scanned}`);
  console.log(`Already consistent: ${summary.alreadyConsistent}`);
  console.log(`Would update / updated: ${summary.updated}`);
  console.log(`No recommended date: ${summary.noRecommendedDate}`);
  console.log('Target statuses:', summary.byStatus);

  if (summary.dryRun) {
    console.log('\nNo data was changed. Run with --apply to update records.');
  }
}

run()
  .catch((error) => {
    console.error('Follow-up status sync failed:', error.stack || error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
