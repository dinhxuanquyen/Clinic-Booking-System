import Appointment from '../models/appointmentModel.js';
import Notification from '../models/notificationModel.js';
import User from '../models/central/User.js';
import { getClinicConnection } from '../config/db.js';
import { getClinicModels } from '../models/clinic/models.js';
import { APPOINTMENT_STATUSES } from '../constants/appointmentStatus.js';
import { createAuditLog } from '../utils/auditLogger.js';
import { emitNotification, emitToRole, emitToUser } from './socketService.js';
import { syncFollowUpStatusForAppointment } from './followUpService.js';

const NO_SHOW_GRACE_MINUTES = 120;
const NO_SHOW_GRACE_MS = NO_SHOW_GRACE_MINUTES * 60 * 1000;
const JOB_INTERVAL_MS = 60 * 60 * 1000;

function parseAppointmentStart(date, timeSlot) {
  const start = String(timeSlot || '').split('-')[0]?.trim();
  const match = start?.match(/^(\d{1,2}):(\d{2})$/);

  if (!date || !match) return null;

  const hour = match[1].padStart(2, '0');
  const minute = match[2];
  const value = new Date(`${date}T${hour}:${minute}:00+07:00`);
  return Number.isNaN(value.getTime()) ? null : value;
}

function isNoShowCandidate(appointment, now) {
  const startAt = parseAppointmentStart(appointment.date, appointment.timeSlot);
  if (!startAt) return false;
  return startAt.getTime() + NO_SHOW_GRACE_MS < now.getTime();
}

async function syncClinicAppointmentNoShow(appointment) {
  const connection = await getClinicConnection(appointment.clinicId);
  const { Appointment: ClinicAppointment } = getClinicModels(connection);

  await ClinicAppointment.findByIdAndUpdate(appointment._id, {
    status: appointment.status,
    noShowAt: appointment.noShowAt,
    noShowAuto: appointment.noShowAuto
  });
}

async function notifyPatientNoShow(appointment) {
  const notification = await Notification.create({
    userId: appointment.patientId,
    role: 'patient',
    appointmentId: appointment._id,
    type: 'appointment_no_show',
    title: 'Bạn đã bỏ lỡ lịch khám',
    message: 'Bạn đã bỏ lỡ lịch khám. Vui lòng đặt lịch mới nếu vẫn cần được thăm khám.',
    targetUrl: `/appointments/my?appointmentId=${appointment._id}`,
    metadata: {
      appointmentId: appointment._id,
      doctorId: appointment.doctorId,
      clinicId: appointment.clinicId,
      date: appointment.date,
      timeSlot: appointment.timeSlot
    },
    isRead: false
  });

  emitNotification(notification.toObject());
}

async function emitAppointmentNoShow(appointment) {
  const populated = await Appointment.findById(appointment._id)
    .populate('patientId', 'name email phone')
    .populate('doctorId', 'name degree')
    .populate('clinicId', 'name address')
    .populate('specialtyId', 'name');

  const payload = {
    appointmentId: String(appointment._id),
    status: APPOINTMENT_STATUSES.NO_SHOW,
    appointment: populated || appointment
  };

  emitToUser(appointment.patientId, 'appointment:updated', payload);
  emitToRole('admin', 'appointment:updated', payload);

  if (appointment.doctorId) {
    const doctorUser = await User.findOne({ role: 'doctor', doctorId: appointment.doctorId }).select('_id');
    if (doctorUser) emitToUser(doctorUser._id, 'appointment:updated', payload);
  }
}

async function safeSideEffect(label, fn) {
  try {
    await fn();
  } catch (error) {
    console.warn(`${label} failed:`, error.stack || error);
  }
}

export async function processNoShowAppointments(now = new Date()) {
  const appointments = await Appointment.find({ status: APPOINTMENT_STATUSES.CONFIRMED })
    .select('_id patientId doctorId clinicId specialtyId date timeSlot status noShowAt noShowAuto patientInfo followUpRecordId')
    .limit(500);

  let updated = 0;

  for (const appointment of appointments) {
    if (!isNoShowCandidate(appointment, now)) continue;

    appointment.status = APPOINTMENT_STATUSES.NO_SHOW;
    appointment.noShowAt = now;
    appointment.noShowAuto = true;
    await appointment.save();
    updated += 1;

    await safeSideEffect('No-show clinic sync', () => syncClinicAppointmentNoShow(appointment));
    await safeSideEffect('No-show follow-up sync', () => syncFollowUpStatusForAppointment(appointment, now));
    await safeSideEffect('No-show patient notification', () => notifyPatientNoShow(appointment));
    await safeSideEffect('No-show realtime emit', () => emitAppointmentNoShow(appointment));
    await safeSideEffect('No-show audit log', () => createAuditLog({
      action: 'AUTO_MARK_NO_SHOW',
      entityType: 'Appointment',
      entityId: appointment._id,
      entityName: `${appointment.patientInfo?.name || 'Bệnh nhân'} - ${appointment.date} ${appointment.timeSlot}`,
      description: 'Tự động đánh dấu lịch hẹn không đến khám',
      metadata: {
        appointmentId: appointment._id,
        patientId: appointment.patientId,
        doctorId: appointment.doctorId,
        clinicId: appointment.clinicId,
        date: appointment.date,
        timeSlot: appointment.timeSlot,
        noShowAt: now,
        graceMinutes: NO_SHOW_GRACE_MINUTES
      }
    }));
  }

  if (updated > 0) {
    console.log(`Appointment attendance job marked ${updated} appointment(s) as no_show`);
  }

  return updated;
}

export function startAppointmentAttendanceJob() {
  processNoShowAppointments().catch((error) => {
    console.warn('Appointment attendance initial run failed:', error.stack || error);
  });

  const timer = setInterval(() => {
    processNoShowAppointments().catch((error) => {
      console.warn('Appointment attendance job failed:', error.stack || error);
    });
  }, JOB_INTERVAL_MS);

  timer.unref?.();
  return timer;
}
