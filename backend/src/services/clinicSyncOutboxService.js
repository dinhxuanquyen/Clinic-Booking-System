import Appointment from '../models/appointmentModel.js';
import ClinicSyncOutbox from '../models/clinicSyncOutboxModel.js';
import User from '../models/central/User.js';
import { getClinicConnection } from '../config/db.js';
import { getClinicModels } from '../models/clinic/models.js';

const OPERATION_UPSERT_APPOINTMENT = 'upsert_appointment';
const DEFAULT_INTERVAL_MS = 30_000;
const MAX_BATCH_SIZE = 25;
const LOCK_TIMEOUT_MS = 2 * 60 * 1000;
const MAX_RETRY_DELAY_MS = 30 * 60 * 1000;

let workerRunning = false;
let immediateRunScheduled = false;

function appointmentEventKey(appointmentId) {
  return `appointment:${appointmentId}`;
}

function retryDelayMs(attempts) {
  const exponent = Math.max(Number(attempts || 1) - 1, 0);
  return Math.min(5_000 * (2 ** exponent), MAX_RETRY_DELAY_MS);
}

function clinicAppointmentPayload(appointment, clinicPatientId) {
  return {
    _id: appointment._id,
    clinicId: appointment.clinicId,
    doctorId: appointment.doctorId,
    patientId: clinicPatientId,
    specialtyId: appointment.specialtyId,
    date: appointment.date,
    timeSlot: appointment.timeSlot,
    reason: appointment.reason,
    cancelRequest: appointment.cancelRequest,
    rescheduleRequest: appointment.rescheduleRequest,
    confirmedAt: appointment.confirmedAt,
    startedAt: appointment.startedAt,
    startedBy: appointment.startedBy,
    completedAt: appointment.completedAt,
    completedBy: appointment.completedBy,
    noShowAt: appointment.noShowAt,
    noShowAuto: appointment.noShowAuto,
    cancelRequestedAt: appointment.cancelRequestedAt,
    cancelApprovedAt: appointment.cancelApprovedAt,
    rescheduleRequestedAt: appointment.rescheduleRequestedAt,
    rescheduleApprovedAt: appointment.rescheduleApprovedAt,
    notificationSentAt: appointment.notificationSentAt,
    emailConfirmationSentAt: appointment.emailConfirmationSentAt,
    servicePackageId: appointment.servicePackageId,
    servicePackageSnapshot: appointment.servicePackageSnapshot,
    insuranceSnapshot: appointment.insuranceSnapshot,
    paymentStatus: appointment.paymentStatus,
    paymentMethod: appointment.paymentMethod,
    isFollowUp: appointment.isFollowUp,
    followUpRecordId: appointment.followUpRecordId,
    followUpType: appointment.followUpType,
    originalAppointmentId: appointment.originalAppointmentId,
    queueNumber: appointment.queueNumber,
    consultationStatus: appointment.consultationStatus,
    checkInAt: appointment.checkInAt,
    startConsultationAt: appointment.startConsultationAt,
    finishConsultationAt: appointment.finishConsultationAt,
    status: appointment.status
  };
}

export async function syncAppointmentToClinic(appointmentId) {
  const appointment = await Appointment.findById(appointmentId);
  if (!appointment) {
    return { skipped: true, reason: 'appointment_not_found' };
  }

  const patientUser = await User.findById(appointment.patientId).select('name email phone');
  if (!patientUser) {
    throw new Error(`Patient ${appointment.patientId} not found for clinic appointment sync`);
  }

  const connection = await getClinicConnection(appointment.clinicId);
  const { Patient, Appointment: ClinicAppointment } = getClinicModels(connection);
  await Promise.all([Patient.init(), ClinicAppointment.init()]);

  const patient = await Patient.findOneAndUpdate(
    { clinicId: appointment.clinicId, userId: patientUser._id },
    {
      $set: {
        name: patientUser.name,
        email: patientUser.email,
        phone: patientUser.phone
      },
      $setOnInsert: {
        clinicId: appointment.clinicId,
        userId: patientUser._id
      }
    },
    { upsert: true, new: true, runValidators: true }
  );

  await ClinicAppointment.findByIdAndUpdate(
    appointment._id,
    clinicAppointmentPayload(appointment, patient._id),
    { upsert: true, new: true, runValidators: true }
  );

  return { skipped: false };
}

async function enqueueAppointmentSync(appointmentOrId) {
  const appointmentId = appointmentOrId?._id || appointmentOrId;
  let clinicId = appointmentOrId?.clinicId;

  if (!appointmentId) {
    throw new Error('appointmentId is required to enqueue clinic sync');
  }

  if (!clinicId) {
    const appointment = await Appointment.findById(appointmentId).select('clinicId');
    if (!appointment) return null;
    clinicId = appointment.clinicId;
  }

  return ClinicSyncOutbox.findOneAndUpdate(
    { eventKey: appointmentEventKey(appointmentId) },
    {
      $set: {
        operation: OPERATION_UPSERT_APPOINTMENT,
        entityId: appointmentId,
        clinicId,
        status: 'pending',
        attempts: 0,
        nextAttemptAt: new Date(),
        lastError: ''
      },
      $unset: { lockedAt: 1 },
      $inc: { revision: 1 }
    },
    { upsert: true, new: true, setDefaultsOnInsert: false }
  );
}

async function claimNextJob(now = new Date()) {
  const staleLock = new Date(now.getTime() - LOCK_TIMEOUT_MS);

  return ClinicSyncOutbox.findOneAndUpdate(
    {
      $or: [
        { status: 'pending', nextAttemptAt: { $lte: now } },
        { status: 'processing', lockedAt: { $lte: staleLock } }
      ]
    },
    {
      $set: { status: 'processing', lockedAt: now },
      $inc: { attempts: 1 }
    },
    { new: true, sort: { nextAttemptAt: 1, createdAt: 1 } }
  );
}

async function completeJob(job) {
  await ClinicSyncOutbox.deleteOne({
    _id: job._id,
    revision: job.revision
  });
}

async function retryJob(job, error) {
  const delay = retryDelayMs(job.attempts);
  const result = await ClinicSyncOutbox.updateOne(
    { _id: job._id, revision: job.revision },
    {
      $set: {
        status: 'pending',
        nextAttemptAt: new Date(Date.now() + delay),
        lastError: String(error?.message || error).slice(0, 2000)
      },
      $unset: { lockedAt: 1 }
    }
  );

  if (result.matchedCount > 0) {
    console.warn(
      `Clinic sync ${job.eventKey} failed on attempt ${job.attempts}; retrying in ${Math.ceil(delay / 1000)}s`,
      error?.message || error
    );
  }
}

async function processJob(job) {
  try {
    if (job.operation === OPERATION_UPSERT_APPOINTMENT) {
      await syncAppointmentToClinic(job.entityId);
    }
    await completeJob(job);
  } catch (error) {
    await retryJob(job, error);
  }
}

export async function processClinicSyncOutbox(maxJobs = MAX_BATCH_SIZE) {
  if (workerRunning) return 0;
  workerRunning = true;

  let processed = 0;
  try {
    while (processed < maxJobs) {
      const job = await claimNextJob();
      if (!job) break;
      await processJob(job);
      processed += 1;
    }
  } finally {
    workerRunning = false;
  }

  return processed;
}

function triggerClinicSyncProcessing() {
  if (immediateRunScheduled) return;
  immediateRunScheduled = true;

  setImmediate(() => {
    immediateRunScheduled = false;
    processClinicSyncOutbox().catch((error) => {
      console.warn('Immediate clinic sync outbox run failed:', error.stack || error);
    });
  });
}

export async function queueClinicAppointmentSync(appointmentOrId) {
  const job = await enqueueAppointmentSync(appointmentOrId);
  if (job) triggerClinicSyncProcessing();
  return job;
}

export function startClinicSyncOutboxJob(intervalMs = DEFAULT_INTERVAL_MS) {
  processClinicSyncOutbox().catch((error) => {
    console.warn('Initial clinic sync outbox run failed:', error.stack || error);
  });

  const timer = setInterval(() => {
    processClinicSyncOutbox().catch((error) => {
      console.warn('Clinic sync outbox job failed:', error.stack || error);
    });
  }, intervalMs);

  timer.unref?.();
  return timer;
}
