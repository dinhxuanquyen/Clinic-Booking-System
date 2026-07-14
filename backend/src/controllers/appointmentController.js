import { body, param } from 'express-validator';
import Appointment from '../models/appointmentModel.js';
import MedicalRecord from '../models/medicalRecordModel.js';
import Doctor from '../models/doctorModel.js';
import DoctorReview from '../models/doctorReviewModel.js';
import Notification from '../models/notificationModel.js';
import User from '../models/central/User.js';
import WaitingList from '../models/waitingListModel.js';
import { getClinicConnection } from '../config/db.js';
import { getClinicModels } from '../models/clinic/models.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/apiError.js';
import {
  sendAppointmentCancelledEmail,
  sendAppointmentConfirmation,
  sendAppointmentConfirmedEmail,
  sendAppointmentRescheduledEmail,
  sendDoctorAppointmentCancelledEmail,
  sendDoctorNewAppointmentEmail,
  sendDoctorRescheduleRequestEmail
} from '../services/emailService.js';
import { emitNotification, emitToRole, emitToUser } from '../services/socketService.js';
import { assertBookableDateTime } from '../utils/vietnamTime.js';
import { safelyOfferNextWaitingPatient } from '../services/waitingListService.js';
import { syncFollowUpStatusForAppointment } from '../services/followUpService.js';
import { createAuditLog } from '../utils/auditLogger.js';
import { generateAppointmentPdf, generateQueueTicketPdf } from '../services/pdfService.js';
import { resolveServicePackageForAppointment } from '../services/servicePackageService.js';
import { buildInsuranceSnapshot } from '../utils/insurance.js';
import {
  APPOINTMENT_STATUS_VALUES,
  QUEUE_ELIGIBLE_APPOINTMENT_STATUSES,
  SLOT_HOLDING_APPOINTMENT_STATUSES,
  appointmentTransitionErrorMessage,
  canTransitionAppointmentStatus
} from '../constants/appointmentStatus.js';
import { FOLLOW_UP_TYPES } from '../constants/followUpStatus.js';

const appointmentPopulate = [
  { path: 'patientId', select: 'name email phone role' },
  { path: 'doctorId', select: 'name email personalEmail loginEmail phone avatar degree experienceYears clinicId specialtyId' },
  { path: 'clinicId', select: 'name address phone email' },
  { path: 'specialtyId', select: 'name description image clinicId' },
  { path: 'servicePackageId', select: 'name code price durationMinutes description targetPatients includes doctorId' },
  {
    path: 'followUpRecordId',
    select: 'appointmentId diagnosis conclusion followUpRequired followUpDate followUpStatus followUpAppointmentId followUpCompletedRecordId createdAt',
    populate: { path: 'appointmentId', select: 'date timeSlot status' }
  },
  { path: 'originalAppointmentId', select: 'date timeSlot status' }
];

const ACTIVE_WAITING_SLOT_STATUSES = ['offered'];

function logBookingFail(reason, payload = {}) {
  console.warn('[booking:create:fail]', {
    reason,
    patientId: payload.patientId ? String(payload.patientId) : undefined,
    doctorId: payload.doctorId ? String(payload.doctorId) : undefined,
    clinicId: payload.clinicId ? String(payload.clinicId) : undefined,
    specialtyId: payload.specialtyId ? String(payload.specialtyId) : undefined,
    date: payload.date,
    timeSlot: payload.timeSlot,
    servicePackageId: payload.servicePackageId ? String(payload.servicePackageId) : undefined
  });
}

function buildAppointmentNotification(previousStatus, appointment) {
  const doctorName = appointment.doctorId?.name || 'bác sĩ';
  const date = appointment.date;

  if (previousStatus === 'reschedule_requested' && appointment.rescheduleRequest?.decision === 'approved') {
    const title = 'Y\u00eau c\u1ea7u \u0111\u1ed5i l\u1ecbch \u0111\u00e3 \u0111\u01b0\u1ee3c ch\u1ea5p thu\u1eadn';
    const newDate = appointment.rescheduleRequest?.newDate || appointment.date;
    const newTimeSlot = appointment.rescheduleRequest?.newTimeSlot || appointment.timeSlot;

    return {
      title,
      message: `${title}: ${doctorName} - ${newDate} ${newTimeSlot}.`,
      type: 'reschedule_request_approved'
    };
  }

  if (previousStatus === 'reschedule_requested' && appointment.rescheduleRequest?.decision === 'rejected') {
    const title = 'Y\u00eau c\u1ea7u \u0111\u1ed5i l\u1ecbch kh\u00f4ng \u0111\u01b0\u1ee3c ch\u1ea5p thu\u1eadn';
    const requestedDate = appointment.rescheduleRequest?.newDate || date;

    return {
      title,
      message: `${title}: ${doctorName} - ${requestedDate}.`,
      type: 'reschedule_request_rejected'
    };
  }

  if (previousStatus === 'cancel_requested' && appointment.status === 'cancelled') {
    return {
      title: 'Yêu cầu hủy lịch đã được chấp thuận',
      message: `Yêu cầu hủy lịch hẹn của bạn với ${doctorName} vào ngày ${date} đã được chấp thuận.`,
      type: 'cancel_request_approved'
    };
  }

  if (previousStatus === 'cancel_requested' && appointment.status === 'confirmed') {
    return {
      title: 'Yêu cầu hủy lịch không được chấp thuận',
      message: `Yêu cầu hủy lịch hẹn của bạn với ${doctorName} vào ngày ${date} không được chấp thuận.`,
      type: 'cancel_request_rejected'
    };
  }

  if (previousStatus === 'reschedule_requested' && appointment.rescheduleRequest?.decision === 'approved') {
    const newDate = appointment.rescheduleRequest?.newDate || appointment.date;
    const newTimeSlot = appointment.rescheduleRequest?.newTimeSlot || appointment.timeSlot;

    return {
      title: 'Yêu cầu đổi lịch đã được chấp thuận',
      message: `Yêu cầu đổi lịch hẹn của bạn với ${doctorName} sang ngày ${newDate} khung giờ ${newTimeSlot} đã được chấp thuận.`,
      type: 'reschedule_request_approved'
    };
  }

  if (previousStatus === 'reschedule_requested' && appointment.rescheduleRequest?.decision === 'rejected') {
    const requestedDate = appointment.rescheduleRequest?.newDate || date;

    return {
      title: 'Yêu cầu đổi lịch không được chấp thuận',
      message: `Yêu cầu đổi lịch hẹn của bạn với ${doctorName} sang ngày ${requestedDate} không được chấp thuận.`,
      type: 'reschedule_request_rejected'
    };
  }

  if (appointment.status === 'confirmed') {
    return {
      title: 'Lịch hẹn đã được xác nhận',
      message: `Lịch hẹn của bạn với ${doctorName} vào ngày ${date} đã được xác nhận.`,
      type: 'appointment_confirmed'
    };
  }

  if (appointment.status === 'completed') {
    return {
      title: 'Lịch hẹn đã hoàn thành',
      message: `Lịch hẹn của bạn với ${doctorName} vào ngày ${date} đã hoàn thành.`,
      type: 'appointment_completed'
    };
  }

  if (appointment.status === 'in_progress') {
    return {
      title: 'Đã đến lượt khám của bạn',
      message: 'Phòng khám đã gọi bạn vào khám. Vui lòng đến phòng khám theo hướng dẫn.',
      type: 'consultation_called'
    };
  }

  if (appointment.status === 'cancelled') {
    return {
      title: 'Lịch hẹn đã bị hủy',
      message: `Lịch hẹn của bạn với ${doctorName} vào ngày ${date} đã bị hủy.`,
      type: 'appointment_cancelled'
    };
  }

  return null;
}

async function createAppointmentNotification(previousStatus, appointment) {
  const payload = buildAppointmentNotification(previousStatus, appointment);
  if (!payload) return false;

  const notification = await Notification.create({
    userId: appointment.patientId?._id || appointment.patientId,
    role: 'patient',
    appointmentId: appointment._id,
    ...payload
  });
  emitNotification(notification.toObject());
  return true;
}

async function createReviewAvailableNotification(appointment) {
  if (appointment.status !== 'completed') return null;

  const notification = await Notification.create({
    userId: appointment.patientId?._id || appointment.patientId,
    role: 'patient',
    appointmentId: appointment._id,
    type: 'doctor_review_available',
    title: 'Bạn có thể đánh giá bác sĩ',
    message: 'Buổi khám đã hoàn tất. Hãy chia sẻ trải nghiệm của bạn.',
    targetUrl: '/appointments/my',
    metadata: {
      appointmentId: appointment._id,
      doctorId: appointment.doctorId?._id || appointment.doctorId,
      clinicId: appointment.clinicId?._id || appointment.clinicId
    },
    isRead: false
  });
  emitNotification(notification.toObject());
  return notification;
}

async function createAdminNotification({ appointment, type, title, message }) {
  const notification = await Notification.create({
    role: 'admin',
    appointmentId: appointment._id,
    type,
    title,
    message
  });
  emitNotification(notification.toObject());
}

async function createDoctorNotification({ appointment, type, title, message }) {
  const doctorId = appointment.doctorId?._id || appointment.doctorId;
  if (!doctorId) return null;

  const doctorUser = await User.findOne({
    role: 'doctor',
    doctorId,
    isActive: { $ne: false }
  }).select('_id');

  if (!doctorUser) return null;

  const notification = await Notification.create({
    userId: doctorUser._id,
    doctorId,
    role: 'doctor',
    appointmentId: appointment._id,
    type,
    title,
    message,
    isRead: false
  });

  emitNotification(notification.toObject());
  return notification;
}

async function emitAppointmentUpdated(appointment) {
  if (!appointment) return;

  const payload = {
    appointmentId: appointment._id,
    status: appointment.status,
    consultationStatus: appointment.consultationStatus,
    queueNumber: appointment.queueNumber,
    appointment
  };

  emitToUser(appointment.patientId?._id || appointment.patientId, 'appointment:updated', payload);
  emitToRole('admin', 'appointment:updated', payload);

  const doctorId = appointment.doctorId?._id || appointment.doctorId;
  if (!doctorId) return;

  const doctorUser = await User.findOne({
    role: 'doctor',
    doctorId,
    isActive: { $ne: false }
  }).select('_id');

  if (doctorUser) {
    emitToUser(doctorUser._id, 'appointment:updated', payload);
  }
}

function adminAppointmentNames(appointment) {
  return {
    patientName: appointment.patientInfo?.name || appointment.patientId?.name || 'Bệnh nhân',
    doctorName: appointment.doctorId?.name || 'bác sĩ'
  };
}

function appointmentPatient(appointment, fallbackUser = null) {
  return {
    _id: appointment.patientId?._id || appointment.patientId || fallbackUser?._id,
    name: appointment.patientInfo?.name || appointment.patientId?.name || fallbackUser?.name,
    email: appointment.patientInfo?.email || appointment.patientId?.email || fallbackUser?.email,
    phone: appointment.patientInfo?.phone || appointment.patientId?.phone || fallbackUser?.phone
  };
}

function assertAppointmentPdfAccess(user, appointment) {
  if (user.role === 'admin') return;

  if (user.role === 'patient') {
    if (String(appointment.patientId?._id || appointment.patientId) !== String(user._id)) {
      throw new ApiError(403, 'Bạn không có quyền thực hiện thao tác này');
    }
    return;
  }

  if (user.role === 'doctor') {
    if (!user.doctorId) throw new ApiError(400, 'Tài khoản bác sĩ chưa được liên kết hồ sơ bác sĩ');
    if (String(appointment.doctorId?._id || appointment.doctorId) !== String(user.doctorId)) {
      throw new ApiError(403, 'Bạn không có quyền thực hiện thao tác này');
    }
    return;
  }

  throw new ApiError(403, 'Bạn không có quyền thực hiện thao tác này');
}

function streamPdf(res, doc, filename) {
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  doc.pipe(res);
  doc.end();
}

async function sendEmailSafely(label, sendEmail) {
  try {
    await sendEmail();
  } catch (error) {
    console.warn(`${label} failed:`, error.stack || error);
  }
}

async function runAppointmentSideEffect(label, task) {
  try {
    return await task();
  } catch (error) {
    console.warn(`${label} failed:`, error.stack || error);
    return null;
  }
}

export const createAppointmentRules = [
  body('clinicId').isMongoId().withMessage('clinicId is required'),
  body('doctorId').isMongoId().withMessage('doctorId is required'),
  body('specialtyId').isMongoId().withMessage('specialtyId is required'),
  body('date').isISO8601({ strict: true }).withMessage('date must be YYYY-MM-DD'),
  body('timeSlot').trim().notEmpty().withMessage('timeSlot is required'),
  body('reason').optional().trim(),
  body('patientInfo.name').optional().trim(),
  body('patientInfo.email').optional({ checkFalsy: true }).isEmail().withMessage('patientInfo.email is invalid').normalizeEmail(),
  body('patientInfo.phone').optional().trim(),
  body('patientInfo.gender').optional().trim(),
  body('patientInfo.dateOfBirth').optional().trim(),
  body('servicePackageId').optional({ checkFalsy: true }).isMongoId().withMessage('servicePackageId is invalid'),
  body('followUpRecordId').optional({ checkFalsy: true }).isMongoId().withMessage('followUpRecordId is invalid')
];

export const doctorAppointmentsRules = [param('doctorId').isMongoId().withMessage('doctorId is invalid')];
export const appointmentIdRule = [param('id').isMongoId().withMessage('appointment id is invalid')];

export const updateAppointmentStatusRules = [
  param('id').isMongoId().withMessage('appointment id is invalid'),
  body('status').isIn(APPOINTMENT_STATUS_VALUES).withMessage('Dữ liệu không hợp lệ'),
  body('adminNote').optional().trim(),
  body('reason').optional().trim()
];

export const updateConsultationStatusRules = [
  param('id').isMongoId().withMessage('appointment id is invalid'),
  body('consultationStatus')
    .isIn(['waiting', 'in_progress', 'completed', 'skipped'])
    .withMessage('consultationStatus is invalid')
];

export const cancelAppointmentRules = [
  param('id').isMongoId().withMessage('appointment id is invalid'),
  body('reason').optional().trim()
];

export const rescheduleAppointmentRules = [
  param('id').isMongoId().withMessage('appointment id is invalid'),
  body('newDate').isISO8601({ strict: true }).withMessage('newDate must be YYYY-MM-DD'),
  body('newTimeSlot').trim().notEmpty().withMessage('newTimeSlot is required'),
  body('reason').trim().notEmpty().withMessage('reason is required')
];

export const cancelRescheduleRequestRules = [
  param('id').isMongoId().withMessage('appointment id is invalid')
];

async function validateDoctorBooking({ doctorId, clinicId, specialtyId }) {
  const doctor = await Doctor.findOne({
    _id: doctorId,
    clinicId,
    specialtyId,
    isActive: true
  });

  if (!doctor) {
    throw new ApiError(422, 'Doctor does not belong to the selected clinic and specialty');
  }

  return doctor;
}

async function assertBookingSlotAvailable({ patientId, clinicId, doctorId, specialtyId, date, timeSlot, servicePackageId }) {
  const context = { patientId, clinicId, doctorId, specialtyId, date, timeSlot, servicePackageId };

  const patientAppointment = await Appointment.exists({
    patientId,
    date,
    timeSlot,
    status: { $in: SLOT_HOLDING_APPOINTMENT_STATUSES }
  });

  if (patientAppointment) {
    logBookingFail('patient_has_appointment_same_time', context);
    throw new ApiError(409, 'Bạn đã có một lịch khám khác trong khung giờ này.');
  }

  const activeWaitingOffer = await WaitingList.exists({
    doctorId,
    clinicId,
    date,
    timeSlot,
    status: { $in: ACTIVE_WAITING_SLOT_STATUSES },
    offerExpiresAt: { $gt: new Date() }
  });

  if (activeWaitingOffer) {
    logBookingFail('slot_held_by_waiting_list_offer', context);
    throw new ApiError(409, 'Khung giờ này đang được giữ cho bệnh nhân khác.');
  }

  const occupiedDoctorSlot = await Appointment.exists({
    doctorId,
    clinicId,
    date,
    timeSlot,
    status: { $in: SLOT_HOLDING_APPOINTMENT_STATUSES }
  });

  if (occupiedDoctorSlot) {
    logBookingFail('doctor_slot_already_booked', context);
    throw new ApiError(409, 'Khung giờ này đã được đặt.');
  }
}

async function validateFollowUpBooking({ followUpRecordId, patientId, clinicId, doctorId, specialtyId }) {
  if (!followUpRecordId) return null;

  const record = await MedicalRecord.findById(followUpRecordId).populate('appointmentId', 'status');
  if (!record) {
    throw new ApiError(404, 'Không tìm thấy hồ sơ tái khám');
  }

  if (String(record.patientId) !== String(patientId)) {
    throw new ApiError(403, 'Bạn không có quyền đặt tái khám cho hồ sơ này');
  }

  if (!record.followUpRequired) {
    throw new ApiError(400, 'Hồ sơ này không yêu cầu tái khám');
  }

  if (String(record.clinicId) !== String(clinicId) || String(record.specialtyId) !== String(specialtyId)) {
    throw new ApiError(400, 'Thông tin tái khám không khớp với cơ sở và chuyên khoa trong hồ sơ khám bệnh');
  }

  const originalDoctor = await Doctor.findById(record.doctorId).select('_id isActive name');
  const originalDoctorAvailable = Boolean(originalDoctor?.isActive);

  if (originalDoctorAvailable && String(record.doctorId) !== String(doctorId)) {
    throw new ApiError(400, 'Lịch tái khám cần đặt với bác sĩ đã chỉ định trong hồ sơ khám bệnh');
  }

  if (!originalDoctorAvailable) {
    const replacementDoctor = await Doctor.findOne({
      _id: doctorId,
      clinicId,
      specialtyId,
      isActive: true
    }).select('_id');

    if (!replacementDoctor) {
      throw new ApiError(400, 'Bác sĩ chỉ định tái khám hiện không còn hoạt động. Vui lòng chọn bác sĩ khác cùng chuyên khoa.');
    }
  }

  if (record.followUpAppointmentId) {
    const activeFollowUp = await Appointment.exists({
      _id: record.followUpAppointmentId,
      status: { $nin: ['cancelled', 'no_show'] }
    });
    if (activeFollowUp) {
      throw new ApiError(409, 'Bạn đã có lịch tái khám cho hồ sơ này');
    }
  }

  return record;
}

function resolveFollowUpType(record) {
  if (!record) return '';
  return record.followUpDate ? FOLLOW_UP_TYPES.DOCTOR_RECOMMENDED : FOLLOW_UP_TYPES.PATIENT_SELECTED;
}

async function ensureRescheduleSlotAvailable({ appointmentId, clinicId, doctorId, newDate, newTimeSlot }) {
  const existingAppointment = await Appointment.exists({
    _id: { $ne: appointmentId },
    clinicId,
    doctorId,
    date: newDate,
    timeSlot: newTimeSlot,
    status: { $in: SLOT_HOLDING_APPOINTMENT_STATUSES }
  });

  if (existingAppointment) {
    throw new ApiError(409, 'Khung giờ mới đã có người đặt');
  }
}

async function assignQueueNumberIfNeeded(appointment) {
  if (appointment.queueNumber) return appointment.queueNumber;

  const lastAppointment = await Appointment.findOne({
    _id: { $ne: appointment._id },
    doctorId: appointment.doctorId,
    date: appointment.date,
    queueNumber: { $exists: true, $ne: null }
  })
    .sort({ queueNumber: -1 })
    .select('queueNumber');

  appointment.queueNumber = (lastAppointment?.queueNumber || 0) + 1;
  appointment.consultationStatus = appointment.consultationStatus || 'waiting';
  return appointment.queueNumber;
}

async function ensureDoctorCanAccessAppointment(user, appointment) {
  if (user.role === 'admin') return;

  if (!user.doctorId) {
    throw new ApiError(400, 'Tài khoản bác sĩ chưa được liên kết hồ sơ bác sĩ');
  }

  if (String(appointment.doctorId?._id || appointment.doctorId) !== String(user.doctorId)) {
    throw new ApiError(403, 'Bạn không có quyền xử lý lịch hẹn này');
  }
}

function ensureCanProcessAppointmentStatus(user, appointment, nextStatus) {
  if (user.role === 'doctor') {
    if (!user.doctorId) {
      throw new ApiError(400, 'Tài khoản bác sĩ chưa được liên kết hồ sơ bác sĩ');
    }

    if (String(appointment.doctorId?._id || appointment.doctorId) !== String(user.doctorId)) {
      throw new ApiError(403, 'Bạn không có quyền xử lý lịch hẹn này');
    }
  }

  if (!canTransitionAppointmentStatus(appointment.status, nextStatus)) {
    throw new ApiError(400, appointmentTransitionErrorMessage(appointment.status, nextStatus));
  }
}

function ensureDoctorOwnsAppointment(user, appointment) {
  if (user.role !== 'doctor') return;

  if (!user.doctorId) {
    throw new ApiError(400, 'Tài khoản bác sĩ chưa được liên kết hồ sơ bác sĩ');
  }

  if (String(appointment.doctorId?._id || appointment.doctorId) !== String(user.doctorId)) {
    throw new ApiError(403, 'Bạn không có quyền xử lý lịch hẹn này');
  }
}
function getLinkedDoctorId(user) {
  if (user.role !== 'doctor') return null;

  if (!user.doctorId) {
    throw new ApiError(400, 'Tài khoản bác sĩ chưa được liên kết hồ sơ bác sĩ');
  }

  return user.doctorId;
}

async function syncClinicAppointment(appointment, patientUser) {
  const connection = await getClinicConnection(appointment.clinicId);
  const { Patient, Appointment: ClinicAppointment } = getClinicModels(connection);
  await ClinicAppointment.syncIndexes();

  const patient = await Patient.findOneAndUpdate(
    { clinicId: appointment.clinicId, userId: patientUser._id },
    {
      $setOnInsert: {
        clinicId: appointment.clinicId,
        userId: patientUser._id,
        name: patientUser.name,
        email: patientUser.email,
        phone: patientUser.phone
      }
    },
    { upsert: true, new: true }
  );

  await ClinicAppointment.findByIdAndUpdate(
    appointment._id,
    {
      _id: appointment._id,
      clinicId: appointment.clinicId,
      doctorId: appointment.doctorId,
      patientId: patient._id,
      specialtyId: appointment.specialtyId,
      date: appointment.date,
      timeSlot: appointment.timeSlot,
      reason: appointment.reason,
      cancelRequest: appointment.cancelRequest,
      rescheduleRequest: appointment.rescheduleRequest,
      confirmedAt: appointment.confirmedAt,
      completedAt: appointment.completedAt,
      cancelRequestedAt: appointment.cancelRequestedAt,
      cancelApprovedAt: appointment.cancelApprovedAt,
      noShowAt: appointment.noShowAt,
      noShowAuto: appointment.noShowAuto,
      rescheduleRequestedAt: appointment.rescheduleRequestedAt,
      rescheduleApprovedAt: appointment.rescheduleApprovedAt,
      startedAt: appointment.startedAt,
      startedBy: appointment.startedBy,
      completedBy: appointment.completedBy,
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
    },
    { upsert: true, new: true }
  );
}

export const createAppointment = asyncHandler(async (req, res) => {
  assertBookableDateTime(req.body.date, req.body.timeSlot);
  const doctor = await validateDoctorBooking(req.body);
  const followUpRecord = await validateFollowUpBooking({
    followUpRecordId: req.body.followUpRecordId,
    patientId: req.user._id,
    clinicId: req.body.clinicId,
    doctorId: req.body.doctorId,
    specialtyId: req.body.specialtyId
  });
  await assertBookingSlotAvailable({
    patientId: req.user._id,
    clinicId: req.body.clinicId,
    doctorId: req.body.doctorId,
    specialtyId: req.body.specialtyId,
    date: req.body.date,
    timeSlot: req.body.timeSlot,
    servicePackageId: req.body.servicePackageId
  });

  const patientInfo = {
    name: req.body.patientInfo?.name || req.user.name,
    email: req.body.patientInfo?.email || req.user.email,
    phone: req.body.patientInfo?.phone || req.user.phone,
    gender: req.body.patientInfo?.gender || req.user.gender,
    dateOfBirth: req.body.patientInfo?.dateOfBirth || req.user.dateOfBirth
  };
  let servicePackageSnapshot = null;
  try {
    ({ snapshot: servicePackageSnapshot } = await resolveServicePackageForAppointment({
      servicePackageId: req.body.servicePackageId,
      clinicId: req.body.clinicId,
      specialtyId: req.body.specialtyId,
      doctorId: req.body.doctorId
    }));
  } catch (error) {
    logBookingFail('service_package_validation_failed', {
      patientId: req.user._id,
      clinicId: req.body.clinicId,
      doctorId: req.body.doctorId,
      specialtyId: req.body.specialtyId,
      date: req.body.date,
      timeSlot: req.body.timeSlot,
      servicePackageId: req.body.servicePackageId
    });
    throw error;
  }

  let appointment;
  try {
    appointment = await Appointment.create({
      patientId: req.user._id,
      doctorId: req.body.doctorId,
      clinicId: req.body.clinicId,
      specialtyId: req.body.specialtyId,
      date: req.body.date,
      timeSlot: req.body.timeSlot,
      reason: req.body.reason,
      patientInfo,
      servicePackageId: req.body.servicePackageId || null,
      servicePackageSnapshot,
      insuranceSnapshot: buildInsuranceSnapshot(req.user),
      paymentStatus: servicePackageSnapshot ? 'unpaid' : 'unpaid',
      paymentMethod: servicePackageSnapshot ? 'clinic' : 'none',
      isFollowUp: Boolean(followUpRecord),
      followUpRecordId: followUpRecord?._id || null,
      followUpType: resolveFollowUpType(followUpRecord),
      originalAppointmentId: followUpRecord?.appointmentId?._id || followUpRecord?.appointmentId || null
    });
  } catch (error) {
    if (error?.code === 11000) {
      logBookingFail('doctor_slot_duplicate_index', {
        patientId: req.user._id,
        clinicId: req.body.clinicId,
        doctorId: req.body.doctorId,
        specialtyId: req.body.specialtyId,
        date: req.body.date,
        timeSlot: req.body.timeSlot,
        servicePackageId: req.body.servicePackageId
      });
      throw new ApiError(409, 'Khung giờ này đã được đặt.');
    }
    throw error;
  }

  const populatedAppointment = await Appointment.findById(appointment._id).populate(appointmentPopulate);

  if (followUpRecord) {
    await runAppointmentSideEffect('Follow-up appointment status sync', () => (
      syncFollowUpStatusForAppointment(populatedAppointment)
    ));
  }

  await syncClinicAppointment(appointment, req.user);

  const { patientName, doctorName } = adminAppointmentNames(populatedAppointment);
  await createAdminNotification({
    appointment: populatedAppointment,
    type: 'new_appointment',
    title: 'Có lịch hẹn mới',
    message: `${patientName} vừa đặt lịch với ${doctorName} vào ${populatedAppointment.date} ${populatedAppointment.timeSlot}.`
  });

  await createDoctorNotification({
    appointment: populatedAppointment,
    type: 'doctor_new_appointment',
    title: 'Có lịch khám mới',
    message: `Bệnh nhân ${patientName} đã đặt lịch khám ngày ${populatedAppointment.date}, khung giờ ${populatedAppointment.timeSlot}.`
  });

  try {
    await sendDoctorNewAppointmentEmail({
      doctor,
      patient: {
        name: patientInfo.name || req.user.name,
        phone: patientInfo.phone || req.user.phone
      },
      appointment: populatedAppointment,
      clinic: populatedAppointment.clinicId,
      specialty: populatedAppointment.specialtyId
    });
  } catch (error) {
    console.error('Doctor appointment email failed:', error.stack || error);
  }

  try {
    await sendAppointmentConfirmation({
      to: patientInfo.email || req.user.email,
      patientName: patientInfo.name || req.user.name,
      doctorName: populatedAppointment.doctorId?.name || doctor.name,
      clinicName: populatedAppointment.clinicId?.name,
      specialtyName: populatedAppointment.specialtyId?.name,
      date: populatedAppointment.date,
      timeSlot: populatedAppointment.timeSlot,
      status: populatedAppointment.status,
      servicePackage: populatedAppointment.servicePackageSnapshot,
      insuranceSnapshot: populatedAppointment.insuranceSnapshot
    });
    appointment.emailConfirmationSentAt = new Date();
    await appointment.save();
    await syncClinicAppointment(appointment, req.user);
  } catch (error) {
    console.error('Email confirmation error:', error.stack || error);
  }

  await createAuditLog({
    req,
    action: servicePackageSnapshot ? 'CREATE_APPOINTMENT_WITH_SERVICE' : 'CREATE_APPOINTMENT',
    entityType: 'Appointment',
    entityId: populatedAppointment._id,
    entityName: `${patientName} - ${doctorName}`,
    description: `${patientName} đặt lịch với ${doctorName} vào ${populatedAppointment.date} ${populatedAppointment.timeSlot}`,
    metadata: {
      doctorId: populatedAppointment.doctorId?._id || populatedAppointment.doctorId,
      clinicId: populatedAppointment.clinicId?._id || populatedAppointment.clinicId,
      specialtyId: populatedAppointment.specialtyId?._id || populatedAppointment.specialtyId,
      servicePackageId: populatedAppointment.servicePackageId?._id || populatedAppointment.servicePackageId || null,
      followUpRecordId: populatedAppointment.followUpRecordId || null,
      isFollowUp: Boolean(populatedAppointment.isFollowUp),
      followUpType: populatedAppointment.followUpType || null,
      status: populatedAppointment.status
    }
  });

  res.status(201).json({
    success: true,
    message: 'Appointment booked successfully',
    data: populatedAppointment
  });
});

export const myAppointments = asyncHandler(async (req, res) => {
  const appointments = await Appointment.find({ patientId: req.user._id })
    .populate(appointmentPopulate)
    .sort({ date: -1, timeSlot: 1 })
    .lean();

  const reviews = await DoctorReview.find({
    appointmentId: { $in: appointments.map((item) => item._id) },
    patientId: req.user._id
  }).lean();
  const reviewByAppointmentId = new Map(reviews.map((review) => [String(review.appointmentId), review]));

  res.json({
    success: true,
    message: 'My appointments fetched successfully',
    data: appointments.map((appointment) => ({
      ...appointment,
      doctorReview: reviewByAppointmentId.get(String(appointment._id)) || null
    }))
  });
});

export const exportAppointmentPdf = asyncHandler(async (req, res) => {
  const appointment = await Appointment.findById(req.params.id).populate(appointmentPopulate);
  if (!appointment) throw new ApiError(404, 'Không tìm thấy lịch hẹn');

  assertAppointmentPdfAccess(req.user, appointment);

  await createAuditLog({
    req,
    action: 'EXPORT_APPOINTMENT_PDF',
    entityType: 'Appointment',
    entityId: appointment._id,
    entityName: `${appointmentPatient(appointment).name || 'Bệnh nhân'} - ${appointment.date}`,
    description: 'Xuất PDF phiếu đặt lịch',
    metadata: {
      appointmentId: String(appointment._id)
    }
  });

  streamPdf(res, generateAppointmentPdf(appointment), `phieu-dat-lich-${appointment._id}.pdf`);
});

export const exportQueueTicketPdf = asyncHandler(async (req, res) => {
  const appointment = await Appointment.findById(req.params.id).populate(appointmentPopulate);
  if (!appointment) throw new ApiError(404, 'Không tìm thấy lịch hẹn');

  assertAppointmentPdfAccess(req.user, appointment);
  if (!QUEUE_ELIGIBLE_APPOINTMENT_STATUSES.includes(appointment.status)) {
    throw new ApiError(400, 'Chỉ có thể xuất phiếu khám khi lịch đã được xác nhận');
  }

  await createAuditLog({
    req,
    action: 'EXPORT_QUEUE_TICKET_PDF',
    entityType: 'Appointment',
    entityId: appointment._id,
    entityName: `${appointmentPatient(appointment).name || 'Bệnh nhân'} - ${appointment.date}`,
    description: 'Xuất PDF phiếu khám / số thứ tự',
    metadata: {
      appointmentId: String(appointment._id)
    }
  });

  streamPdf(res, generateQueueTicketPdf(appointment), `phieu-kham-${appointment._id}.pdf`);
});

export const getAppointments = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.clinicId) filter.clinicId = req.query.clinicId;
  if (req.query.doctorId) filter.doctorId = req.query.doctorId;
  if (req.query.specialtyId) filter.specialtyId = req.query.specialtyId;
  if (req.query.status) filter.status = req.query.status;
  if (req.query.date) filter.date = req.query.date;

  const appointments = await Appointment.find(filter).populate(appointmentPopulate).sort({ date: -1, timeSlot: 1 });

  res.json({
    success: true,
    message: 'Appointments fetched successfully',
    data: appointments
  });
});

export const getDoctorAppointments = asyncHandler(async (req, res) => {
  const doctor = await Doctor.findById(req.params.doctorId);
  if (!doctor) {
    throw new ApiError(404, 'Doctor not found');
  }

  if (req.user.role === 'doctor' && String(getLinkedDoctorId(req.user)) !== String(doctor._id)) {
    throw new ApiError(403, 'Bạn không có quyền xem lịch hẹn của bác sĩ khác');
  }

  const filter = { doctorId: req.params.doctorId };
  if (req.query.status) filter.status = req.query.status;
  if (req.query.date) filter.date = req.query.date;
  if (req.query.fromDate || req.query.toDate) {
    filter.date = {};
    if (req.query.fromDate) filter.date.$gte = req.query.fromDate;
    if (req.query.toDate) filter.date.$lte = req.query.toDate;
  }

  const appointments = await Appointment.find(filter).populate(appointmentPopulate).sort({ date: -1, timeSlot: 1 });

  res.json({
    success: true,
    message: 'Doctor appointments fetched successfully',
    data: appointments
  });
});

export const updateAppointmentStatus = asyncHandler(async (req, res) => {
  const appointment = await Appointment.findById(req.params.id);

  if (!appointment) {
    throw new ApiError(404, 'Không tìm thấy dữ liệu');
  }

  const previousStatus = appointment.status;
  const adminNote = req.body.adminNote || '';
  const actionReason = req.body.reason || '';
  const handledAt = new Date();
  const rescheduleRequest = appointment.rescheduleRequest?.toObject?.() || appointment.rescheduleRequest || {};
  const nextStatus = req.body.status;

  ensureDoctorOwnsAppointment(req.user, appointment);

  if (appointment.status === nextStatus) {
    const populatedAppointment = await Appointment.findById(appointment._id).populate(appointmentPopulate);
    return res.json({
      success: true,
      message: 'Appointment status already up to date',
      data: populatedAppointment
    });
  }

  ensureCanProcessAppointmentStatus(req.user, appointment, nextStatus);

  if (appointment.status === 'reschedule_requested' && req.body.status === 'confirmed') {
    if (!rescheduleRequest.newDate || !rescheduleRequest.newTimeSlot) {
      throw new ApiError(400, 'Yêu cầu đổi lịch không hợp lệ');
    }

    await ensureRescheduleSlotAvailable({
      appointmentId: appointment._id,
      clinicId: appointment.clinicId,
      doctorId: appointment.doctorId,
      newDate: rescheduleRequest.newDate,
      newTimeSlot: rescheduleRequest.newTimeSlot
    });

    appointment.date = rescheduleRequest.newDate;
    appointment.timeSlot = rescheduleRequest.newTimeSlot;
    appointment.status = 'confirmed';
    appointment.confirmedAt = appointment.confirmedAt || handledAt;
    appointment.confirmedBy = appointment.confirmedBy || req.user._id;
    await assignQueueNumberIfNeeded(appointment);
    appointment.rescheduleApprovedAt = handledAt;
    appointment.rescheduleRequest = {
      ...rescheduleRequest,
      handledAt,
      handledBy: req.user._id,
      adminNote: adminNote || rescheduleRequest.adminNote || '',
      decision: 'approved'
    };
  } else if (appointment.status === 'reschedule_requested' && req.body.status === 'reschedule_rejected') {
    appointment.status = 'confirmed';
    appointment.confirmedAt = appointment.confirmedAt || handledAt;
    appointment.confirmedBy = appointment.confirmedBy || req.user._id;
    await assignQueueNumberIfNeeded(appointment);
    appointment.rescheduleRequest = {
      ...rescheduleRequest,
      handledAt,
      handledBy: req.user._id,
      adminNote: adminNote || rescheduleRequest.adminNote || '',
      decision: 'rejected'
    };
  } else if (req.body.status === 'reschedule_rejected') {
    throw new ApiError(400, 'Chỉ có thể từ chối yêu cầu đổi lịch đang chờ xử lý');
  } else {
    const isHandlingCancelRequest =
      appointment.status === 'cancel_requested' && ['cancelled', 'confirmed'].includes(req.body.status);

    appointment.status = req.body.status;
    if (req.body.status === 'confirmed') {
      appointment.confirmedAt = appointment.confirmedAt || handledAt;
      appointment.confirmedBy = appointment.confirmedBy || req.user._id;
      await assignQueueNumberIfNeeded(appointment);
    }
    if (req.body.status === 'in_progress') {
      appointment.startedAt = appointment.startedAt || handledAt;
      appointment.startedBy = appointment.startedBy || req.user._id;
      appointment.checkInAt = appointment.checkInAt || handledAt;
      appointment.startConsultationAt = appointment.startConsultationAt || handledAt;
      appointment.consultationStatus = 'in_progress';
      await assignQueueNumberIfNeeded(appointment);
    }
    if (req.body.status === 'completed') {
      appointment.completedAt = handledAt;
      appointment.completedBy = req.user._id;
      appointment.consultationStatus = 'completed';
      appointment.finishConsultationAt = appointment.finishConsultationAt || handledAt;
    }
    if (req.body.status === 'cancelled') {
      appointment.cancelApprovedAt = handledAt;
      appointment.cancelledAt = appointment.cancelledAt || handledAt;
      appointment.cancelledBy = appointment.cancelledBy || req.user._id;
      appointment.cancelReason = actionReason || appointment.cancelReason || adminNote || '';
    }
    if (isHandlingCancelRequest) {
      appointment.cancelRequest = {
        ...(appointment.cancelRequest?.toObject?.() || appointment.cancelRequest || {}),
        handledAt,
        handledBy: req.user._id,
        adminNote: adminNote || appointment.cancelRequest?.adminNote || ''
      };
    }
  }

  await appointment.save();

  const patientUser = await User.findById(appointment.patientId);
  if (patientUser) {
    await runAppointmentSideEffect('Appointment clinic sync', () => syncClinicAppointment(appointment, patientUser));
  }

  let populatedAppointment = await Appointment.findById(appointment._id).populate(appointmentPopulate);
  await runAppointmentSideEffect('Follow-up appointment status sync', () => (
    syncFollowUpStatusForAppointment(populatedAppointment)
  ));

  const notificationCreated = await runAppointmentSideEffect(
    'Appointment status notification',
    () => createAppointmentNotification(previousStatus, populatedAppointment)
  );
  if (notificationCreated) {
    appointment.notificationSentAt = new Date();
    await appointment.save();
    if (patientUser) {
      await runAppointmentSideEffect('Appointment notification clinic sync', () => syncClinicAppointment(appointment, patientUser));
    }
    populatedAppointment = await Appointment.findById(appointment._id).populate(appointmentPopulate);
  }

  if (previousStatus !== 'completed' && populatedAppointment.status === 'completed') {
    await runAppointmentSideEffect('Doctor review invitation notification', () => createReviewAvailableNotification(populatedAppointment));
  }

  if (previousStatus !== 'in_progress' && populatedAppointment.status === 'in_progress') {
    await runAppointmentSideEffect('Consultation called socket emit', async () => {
      emitToUser(populatedAppointment.patientId?._id || populatedAppointment.patientId, 'queue:called', {
        appointmentId: String(populatedAppointment._id),
        consultationStatus: populatedAppointment.consultationStatus,
        queueNumber: populatedAppointment.queueNumber,
        title: 'Đã đến lượt khám của bạn',
        message: 'Vui lòng vào phòng khám.'
      });
      emitToRole('admin', 'queue:updated', {
        appointmentId: String(populatedAppointment._id),
        consultationStatus: populatedAppointment.consultationStatus,
        queueNumber: populatedAppointment.queueNumber
      });
    });
  }

  try {
  if (previousStatus === 'pending' && populatedAppointment.status === 'confirmed') {
    await sendEmailSafely('Appointment confirmed email', () => sendAppointmentConfirmedEmail({
      patient: appointmentPatient(populatedAppointment, patientUser),
      doctor: populatedAppointment.doctorId,
      appointment: populatedAppointment,
      clinic: populatedAppointment.clinicId,
      specialty: populatedAppointment.specialtyId
    }));
  }

  if (previousStatus === 'reschedule_requested' && populatedAppointment.rescheduleRequest?.decision) {
    const approved = populatedAppointment.rescheduleRequest.decision === 'approved';
    await sendEmailSafely('Appointment rescheduled email', () => sendAppointmentRescheduledEmail({
      patient: appointmentPatient(populatedAppointment, patientUser),
      doctor: populatedAppointment.doctorId,
      appointment: populatedAppointment,
      approved,
      oldDate: populatedAppointment.rescheduleRequest?.oldDate,
      oldTimeSlot: populatedAppointment.rescheduleRequest?.oldTimeSlot,
      newDate: populatedAppointment.rescheduleRequest?.newDate,
      newTimeSlot: populatedAppointment.rescheduleRequest?.newTimeSlot,
      adminNote: populatedAppointment.rescheduleRequest?.adminNote
    }));
  }

  if (previousStatus !== 'cancelled' && populatedAppointment.status === 'cancelled') {
    await sendEmailSafely('Appointment cancelled email', () => sendAppointmentCancelledEmail({
      patient: appointmentPatient(populatedAppointment, patientUser),
      doctor: populatedAppointment.doctorId,
      appointment: populatedAppointment,
      reason: populatedAppointment.cancelReason || populatedAppointment.cancelRequest?.reason || populatedAppointment.cancelRequest?.adminNote || actionReason || adminNote,
      waitingListNotice: true
    }));
  }

  if (previousStatus !== 'cancelled' && populatedAppointment.status === 'cancelled') {
    const { patientName } = adminAppointmentNames(populatedAppointment);
    await createDoctorNotification({
      appointment: populatedAppointment,
      type: 'doctor_appointment_cancelled',
      title: 'Lịch khám đã bị hủy',
      message: `Lịch khám của bệnh nhân ${patientName} ngày ${populatedAppointment.date}, khung giờ ${populatedAppointment.timeSlot} đã bị hủy.`
    });
  }

  if (previousStatus === 'reschedule_requested' && populatedAppointment.rescheduleRequest?.decision === 'approved') {
    const { patientName } = adminAppointmentNames(populatedAppointment);
    await createDoctorNotification({
      appointment: populatedAppointment,
      type: 'doctor_appointment_rescheduled',
      title: 'Lịch khám đã được đổi',
      message: `Lịch khám của bệnh nhân ${patientName} đã được đổi sang ngày ${populatedAppointment.date}, khung giờ ${populatedAppointment.timeSlot}.`
    });
  }

  if (req.user.role === 'doctor') {
    const { patientName, doctorName } = adminAppointmentNames(populatedAppointment);
    const actionText = {
      confirmed: 'xác nhận lịch hẹn',
      cancelled: 'hủy lịch hẹn',
      reschedule_rejected: 'từ chối yêu cầu đổi lịch'
    }[req.body.status] || 'cập nhật lịch hẹn';

    await createAdminNotification({
      appointment: populatedAppointment,
      type: 'doctor_appointment_action',
      title: 'Bác sĩ đã xử lý lịch hẹn',
      message: `${doctorName} đã ${actionText} của bệnh nhân ${patientName} ngày ${populatedAppointment.date}, khung giờ ${populatedAppointment.timeSlot}.`
    });
  }

  if (previousStatus !== 'cancelled' && appointment.status === 'cancelled') {
    await safelyOfferNextWaitingPatient({
      doctorId: appointment.doctorId,
      date: appointment.date,
      timeSlot: appointment.timeSlot
    });
  }

  const appointmentAction = (() => {
    if (previousStatus === 'reschedule_requested' && populatedAppointment.rescheduleRequest?.decision === 'approved') return 'RESCHEDULE_APPOINTMENT';
    if (previousStatus === 'reschedule_requested' && populatedAppointment.rescheduleRequest?.decision === 'rejected') return 'RESCHEDULE_APPOINTMENT';
    if (populatedAppointment.status === 'cancelled') return 'CANCEL_APPOINTMENT';
    if (populatedAppointment.status === 'in_progress') return 'START_APPOINTMENT';
    if (populatedAppointment.status === 'completed') return 'COMPLETE_APPOINTMENT';
    if (populatedAppointment.status === 'confirmed') return 'CONFIRM_APPOINTMENT';
    return 'UPDATE_APPOINTMENT_STATUS';
  })();

  await createAuditLog({
    req,
    action: appointmentAction,
    entityType: 'Appointment',
    entityId: populatedAppointment._id,
    entityName: `${populatedAppointment.patientInfo?.name || populatedAppointment.patientId?.name || 'Bệnh nhân'} - ${populatedAppointment.doctorId?.name || 'bác sĩ'}`,
    description: `Cập nhật lịch hẹn từ ${previousStatus} sang ${populatedAppointment.status}`,
    metadata: {
      previousStatus,
      nextStatus: populatedAppointment.status,
      adminNote,
      reason: actionReason,
      rescheduleDecision: populatedAppointment.rescheduleRequest?.decision || ''
    }
  });

  await emitAppointmentUpdated(populatedAppointment);
  } catch (error) {
    console.warn('Appointment status side effect failed:', error.stack || error);
  }

  res.json({
    success: true,
    message: 'Cập nhật trạng thái lịch hẹn thành công',
    data: populatedAppointment
  });
});

export const cancelAppointment = asyncHandler(async (req, res) => {
  const appointment = await Appointment.findById(req.params.id);

  if (!appointment) {
    throw new ApiError(404, 'Không tìm thấy lịch hẹn');
  }

  if (String(appointment.patientId) !== String(req.user._id)) {
    throw new ApiError(403, 'Bạn không có quyền hủy lịch hẹn này');
  }

  if (['completed', 'cancelled', 'no_show'].includes(appointment.status)) {
    throw new ApiError(400, 'Lịch hẹn đã hoàn thành, đã hủy hoặc không đến khám');
  }

  const reason = req.body.reason?.trim() || '';
  if (appointment.status === 'confirmed' && !reason) {
    throw new ApiError(400, 'Vui lòng nhập lý do hủy lịch');
  }

  const nextStatus = appointment.status === 'pending' ? 'cancelled' : 'cancel_requested';
  const requestedAt = new Date();
  const message = nextStatus === 'cancelled'
    ? 'Hủy lịch hẹn thành công'
    : 'Đã gửi yêu cầu hủy lịch. Vui lòng chờ phòng khám xác nhận.';

  appointment.status = nextStatus;
  if (nextStatus === 'cancelled') {
    appointment.cancelApprovedAt = requestedAt;
  } else {
    appointment.cancelRequestedAt = requestedAt;
  }
  appointment.cancelRequest = {
    ...(appointment.cancelRequest?.toObject?.() || appointment.cancelRequest || {}),
    reason,
    requestedAt: nextStatus === 'cancel_requested' ? requestedAt : appointment.cancelRequest?.requestedAt
  };
  await appointment.save();
  await syncClinicAppointment(appointment, req.user);

  const populatedAppointment = await Appointment.findById(appointment._id).populate(appointmentPopulate);

  if (nextStatus === 'cancelled') {
    await runAppointmentSideEffect('Follow-up appointment cancellation sync', () => (
      syncFollowUpStatusForAppointment(populatedAppointment)
    ));
    await runAppointmentSideEffect('Appointment cancellation realtime emit', () => emitAppointmentUpdated(populatedAppointment));
  }

  if (nextStatus === 'cancel_requested') {
    const { patientName, doctorName } = adminAppointmentNames(populatedAppointment);
    await createAdminNotification({
      appointment: populatedAppointment,
      type: 'cancel_request',
      title: 'Có yêu cầu hủy lịch',
      message: `${patientName} yêu cầu hủy lịch với ${doctorName}.`
    });
    await createDoctorNotification({
      appointment: populatedAppointment,
      type: 'doctor_cancel_request',
      title: 'Có yêu cầu hủy lịch',
      message: `Bệnh nhân ${patientName} yêu cầu hủy lịch khám ngày ${populatedAppointment.date}, khung giờ ${populatedAppointment.timeSlot}.`
    });
  } else {
    const { patientName } = adminAppointmentNames(populatedAppointment);
    await createDoctorNotification({
      appointment: populatedAppointment,
      type: 'doctor_appointment_cancelled',
      title: 'Lịch khám đã bị hủy',
      message: `Bệnh nhân ${patientName} đã hủy lịch khám ngày ${populatedAppointment.date}, khung giờ ${populatedAppointment.timeSlot}.`
    });
    await safelyOfferNextWaitingPatient({
      doctorId: appointment.doctorId,
      date: appointment.date,
      timeSlot: appointment.timeSlot
    });
    await sendEmailSafely('Doctor appointment cancelled email', () => sendDoctorAppointmentCancelledEmail({
      doctor: populatedAppointment.doctorId,
      patient: appointmentPatient(populatedAppointment, req.user),
      appointment: populatedAppointment,
      reason
    }));
  }

  await createAuditLog({
    req,
    action: nextStatus === 'cancelled' ? 'CANCEL_APPOINTMENT' : 'REQUEST_CANCEL_APPOINTMENT',
    entityType: 'Appointment',
    entityId: populatedAppointment._id,
    entityName: `${populatedAppointment.patientInfo?.name || req.user.name} - ${populatedAppointment.doctorId?.name || 'bác sĩ'}`,
    description: nextStatus === 'cancelled'
      ? 'Bệnh nhân hủy lịch hẹn'
      : 'Bệnh nhân gửi yêu cầu hủy lịch hẹn',
    metadata: { reason, status: nextStatus }
  });

  res.json({
    success: true,
    message,
    data: populatedAppointment
  });
});

export const requestAppointmentReschedule = asyncHandler(async (req, res) => {
  const appointment = await Appointment.findById(req.params.id);

  if (!appointment) {
    throw new ApiError(404, 'Không tìm thấy lịch hẹn');
  }

  if (String(appointment.patientId) !== String(req.user._id)) {
    throw new ApiError(403, 'Bạn không có quyền yêu cầu đổi lịch hẹn này');
  }

  if (appointment.status !== 'confirmed') {
    throw new ApiError(400, 'Chỉ có thể yêu cầu đổi lịch hẹn đã được xác nhận');
  }

  const newDate = req.body.newDate?.trim();
  const newTimeSlot = req.body.newTimeSlot?.trim();
  const reason = req.body.reason?.trim();

  assertBookableDateTime(newDate, newTimeSlot);

  await ensureRescheduleSlotAvailable({
    appointmentId: appointment._id,
    clinicId: appointment.clinicId,
    doctorId: appointment.doctorId,
    newDate,
    newTimeSlot
  });

  appointment.status = 'reschedule_requested';
  appointment.rescheduleRequestedAt = new Date();
  appointment.rescheduleRequest = {
    ...(appointment.rescheduleRequest?.toObject?.() || appointment.rescheduleRequest || {}),
    oldDate: appointment.date,
    oldTimeSlot: appointment.timeSlot,
    newDate,
    newTimeSlot,
    reason,
    requestedAt: appointment.rescheduleRequestedAt,
    handledAt: undefined,
    handledBy: undefined,
    adminNote: '',
    decision: ''
  };

  await appointment.save();
  await syncClinicAppointment(appointment, req.user);

  const populatedAppointment = await Appointment.findById(appointment._id).populate(appointmentPopulate);

  const { patientName } = adminAppointmentNames(populatedAppointment);
  await createDoctorNotification({
    appointment: populatedAppointment,
    type: 'doctor_reschedule_request',
    title: 'Có yêu cầu đổi lịch',
    message: `Bệnh nhân ${patientName} muốn đổi lịch sang ngày ${newDate}, khung giờ ${newTimeSlot}.`
  });
  await sendEmailSafely('Doctor reschedule request email', () => sendDoctorRescheduleRequestEmail({
    doctor: populatedAppointment.doctorId,
    patient: appointmentPatient(populatedAppointment, req.user),
    appointment: populatedAppointment
  }));

  await createAuditLog({
    req,
    action: 'RESCHEDULE_APPOINTMENT',
    entityType: 'Appointment',
    entityId: populatedAppointment._id,
    entityName: `${patientName} - ${populatedAppointment.doctorId?.name || 'bác sĩ'}`,
    description: `Bệnh nhân yêu cầu đổi lịch sang ${newDate} ${newTimeSlot}`,
    metadata: {
      oldDate: appointment.rescheduleRequest?.oldDate,
      oldTimeSlot: appointment.rescheduleRequest?.oldTimeSlot,
      newDate,
      newTimeSlot,
      reason
    }
  });

  await createAdminNotification({
    appointment: populatedAppointment,
    type: 'reschedule_request',
    title: 'Có yêu cầu đổi lịch',
    message: `${patientName} muốn đổi lịch sang ${newDate} ${newTimeSlot}.`
  });

  res.json({
    success: true,
    message: 'Đã gửi yêu cầu đổi lịch. Vui lòng chờ phòng khám xác nhận.',
    data: populatedAppointment
  });
});

export const cancelAppointmentRescheduleRequest = asyncHandler(async (req, res) => {
  const appointment = await Appointment.findById(req.params.id);

  if (!appointment) {
    throw new ApiError(404, 'Không tìm thấy lịch hẹn');
  }

  if (String(appointment.patientId) !== String(req.user._id)) {
    throw new ApiError(403, 'Bạn không có quyền hủy yêu cầu đổi lịch hẹn này');
  }

  if (appointment.status !== 'reschedule_requested') {
    throw new ApiError(400, 'Chỉ có thể hủy yêu cầu đổi lịch đang chờ xử lý');
  }

  appointment.status = 'confirmed';
  appointment.rescheduleRequest = {
    ...(appointment.rescheduleRequest?.toObject?.() || appointment.rescheduleRequest || {}),
    handledAt: new Date(),
    decision: 'cancelled_by_patient'
  };

  await appointment.save();
  await syncClinicAppointment(appointment, req.user);

  const populatedAppointment = await Appointment.findById(appointment._id).populate(appointmentPopulate);

  res.json({
    success: true,
    message: 'Đã hủy yêu cầu đổi lịch',
    data: populatedAppointment
  });
});

export const getDoctorQueueToday = asyncHandler(async (req, res) => {
  const date = req.query.date || new Date().toISOString().slice(0, 10);
  const filter = {
    date,
    status: { $in: QUEUE_ELIGIBLE_APPOINTMENT_STATUSES }
  };

  if (req.user.role === 'admin') {
    if (req.query.doctorId) filter.doctorId = req.query.doctorId;
  } else {
    filter.doctorId = getLinkedDoctorId(req.user);
  }

  const appointments = await Appointment.find(filter)
    .populate(appointmentPopulate)
    .sort({ date: 1, timeSlot: 1, queueNumber: 1 });

  res.json({
    success: true,
    message: 'Doctor queue fetched successfully',
    data: appointments
  });
});

export const updateConsultationStatus = asyncHandler(async (req, res) => {
  const appointment = await Appointment.findById(req.params.id);

  if (!appointment) {
    throw new ApiError(404, 'Không tìm thấy dữ liệu');
  }

  await ensureDoctorCanAccessAppointment(req.user, appointment);

  if (!QUEUE_ELIGIBLE_APPOINTMENT_STATUSES.includes(appointment.status)) {
    throw new ApiError(400, 'Chỉ có thể cập nhật quá trình khám cho lịch đã được xác nhận');
  }

  const nextStatus = req.body.consultationStatus;
  const previousConsultationStatus = appointment.consultationStatus || 'waiting';
  const now = new Date();

  if (req.user.role === 'doctor' && nextStatus === 'completed') {
    throw new ApiError(400, 'Vui lòng tạo hồ sơ khám bệnh để hoàn thành lịch khám');
  }

  if (previousConsultationStatus === nextStatus) {
    const populatedAppointment = await Appointment.findById(appointment._id).populate(appointmentPopulate);
    return res.json({
      success: true,
      message: 'Consultation status already up to date',
      data: populatedAppointment
    });
  }

  const consultationStatusChanged = previousConsultationStatus !== nextStatus;
  appointment.consultationStatus = nextStatus;

  if (nextStatus === 'waiting') {
    appointment.checkInAt = appointment.checkInAt || now;
  }

  if (nextStatus === 'in_progress') {
    appointment.checkInAt = appointment.checkInAt || now;
    appointment.startConsultationAt = appointment.startConsultationAt || now;
    appointment.startedAt = appointment.startedAt || now;
    appointment.startedBy = appointment.startedBy || req.user._id;
    appointment.status = 'in_progress';
  }

  if (nextStatus === 'completed') {
    appointment.finishConsultationAt = appointment.finishConsultationAt || now;
    appointment.completedAt = appointment.completedAt || now;
    appointment.completedBy = appointment.completedBy || req.user._id;
    appointment.status = 'completed';
  }

  await appointment.save();

  const patientUser = await User.findById(appointment.patientId);
  if (patientUser) {
    await syncClinicAppointment(appointment, patientUser);
  }

  let populatedAppointment = await Appointment.findById(appointment._id).populate(appointmentPopulate);

  if (consultationStatusChanged && nextStatus === 'in_progress') {
    const notification = await Notification.create({
      userId: appointment.patientId,
      role: 'patient',
      appointmentId: appointment._id,
      type: 'consultation_called',
      title: 'Đã đến lượt khám của bạn',
      message: 'Phòng khám đã gọi bạn vào khám. Vui lòng đến phòng khám theo hướng dẫn.',
      isRead: false
    });
    emitNotification(notification.toObject());
    emitToUser(appointment.patientId, 'queue:called', {
      appointmentId: String(appointment._id),
      consultationStatus: appointment.consultationStatus,
      queueNumber: appointment.queueNumber,
      title: 'Đã đến lượt khám của bạn',
      message: 'Vui lòng vào phòng khám.'
    });
  }

  if (consultationStatusChanged && nextStatus === 'completed') {
    const notification = await Notification.create({
      userId: appointment.patientId,
      role: 'patient',
      appointmentId: appointment._id,
      type: 'consultation_completed',
      title: 'Buổi khám đã hoàn thành',
      message: 'Buổi khám của bạn đã được hoàn thành. Bạn có thể xem lại thông tin lịch hẹn.',
      isRead: false
    });
    emitNotification(notification.toObject());
    emitToUser(appointment.patientId, 'queue:completed', {
      appointmentId: String(appointment._id),
      consultationStatus: appointment.consultationStatus,
      queueNumber: appointment.queueNumber,
      title: 'Buổi khám đã hoàn thành'
    });
  }

  if (consultationStatusChanged) {
    emitToRole('admin', 'queue:updated', {
      appointmentId: String(appointment._id),
      consultationStatus: appointment.consultationStatus,
      queueNumber: appointment.queueNumber
    });
  }

  if (consultationStatusChanged) {
    const action = nextStatus === 'in_progress'
      ? 'START_APPOINTMENT'
      : nextStatus === 'completed'
        ? 'COMPLETE_APPOINTMENT'
        : 'UPDATE_APPOINTMENT_STATUS';

    await createAuditLog({
      req,
      action,
      entityType: 'Appointment',
      entityId: populatedAppointment._id,
      entityName: `${populatedAppointment.patientInfo?.name || populatedAppointment.patientId?.name || 'Bệnh nhân'} - ${populatedAppointment.doctorId?.name || 'bác sĩ'}`,
      description: `Cập nhật trạng thái khám từ ${previousConsultationStatus} sang ${nextStatus}`,
      metadata: {
        previousConsultationStatus,
        nextConsultationStatus: nextStatus,
        appointmentStatus: populatedAppointment.status
      }
    });
  }

  await emitAppointmentUpdated(populatedAppointment);

  res.json({
    success: true,
    message: 'Consultation status updated successfully',
    data: populatedAppointment
  });
});

export const todayAppointments = asyncHandler(async (req, res) => {
  const date = req.query.date || new Date().toISOString().slice(0, 10);
  const filter = { clinicId: req.params.clinicId, date };
  if (req.user.role === 'doctor') {
    filter.doctorId = getLinkedDoctorId(req.user);
  }

  const appointments = await Appointment.find(filter)
    .populate(appointmentPopulate)
    .sort({ timeSlot: 1 });

  res.json({
    success: true,
    message: 'Today appointments fetched successfully',
    data: appointments
  });
});


