import { body, param } from 'express-validator';
import Appointment from '../models/appointmentModel.js';
import MedicalRecord from '../models/medicalRecordModel.js';
import Notification from '../models/notificationModel.js';
import User from '../models/central/User.js';
import { getClinicConnection } from '../config/db.js';
import { getClinicModels } from '../models/clinic/models.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/apiError.js';
import { createAuditLog } from '../utils/auditLogger.js';
import { emitNotification, emitToRole, emitToUser } from '../services/socketService.js';
import { sendMedicalRecordUpdatedEmail } from '../services/emailService.js';
import { generateMedicalRecordPdf } from '../services/pdfService.js';
import { FOLLOW_UP_STATUSES } from '../constants/followUpStatus.js';

const medicalRecordPopulate = [
  { path: 'appointmentId', select: 'date timeSlot reason status queueNumber consultationStatus completedAt noShowAt noShowAuto servicePackageId servicePackageSnapshot insuranceSnapshot paymentStatus paymentMethod isFollowUp followUpRecordId originalAppointmentId' },
  { path: 'patientId', select: 'name email phone' },
  { path: 'doctorId', select: 'name degree avatar personalEmail email' },
  { path: 'clinicId', select: 'name address phone' },
  { path: 'specialtyId', select: 'name' },
  { path: 'createdBy', select: 'name role' },
  { path: 'updatedBy', select: 'name role' }
];

const appointmentPopulate = [
  { path: 'patientId', select: 'name email phone role' },
  { path: 'doctorId', select: 'name email personalEmail loginEmail phone avatar degree experienceYears clinicId specialtyId' },
  { path: 'clinicId', select: 'name address phone email' },
  { path: 'specialtyId', select: 'name description image clinicId' },
  { path: 'servicePackageId', select: 'name code price durationMinutes description targetPatients includes doctorId' }
];

const followUpAppointmentPopulate = {
  path: 'followUpAppointmentId',
  select: 'date timeSlot status queueNumber consultationStatus cancelledAt completedAt noShowAt'
};

export const createMedicalRecordRules = [
  body('appointmentId').isMongoId().withMessage('appointmentId is invalid'),
  body('symptoms').optional().trim(),
  body('vitals').optional().isObject(),
  body('allergies').optional().trim(),
  body('icd10Code').optional().trim(),
  body('diagnosis').trim().notEmpty().withMessage('Chẩn đoán là bắt buộc'),
  body('conclusion').trim().notEmpty().withMessage('Kết luận là bắt buộc'),
  body('prescription').optional().isArray().withMessage('prescription must be an array'),
  body('prescription.*.medicineName').optional().trim(),
  body('prescription.*.dosage').optional().trim(),
  body('prescription.*.frequency').optional().trim(),
  body('prescription.*.duration').optional().trim(),
  body('prescription.*.note').optional().trim(),
  body('attachments').optional().isArray(),
  body('attachments.*.url').optional().trim().notEmpty(),
  body('attachments.*.name').optional().trim().notEmpty(),
  body('advice').optional().trim(),
  body('followUpRequired').optional().isBoolean().withMessage('followUpRequired must be boolean'),
  body('followUpDate').optional({ checkFalsy: true }).isISO8601().withMessage('followUpDate is invalid'),
  body('note').optional().trim()
];

export const medicalRecordIdRule = [param('id').isMongoId().withMessage('medical record id is invalid')];
export const appointmentMedicalRecordRule = [param('appointmentId').isMongoId().withMessage('appointment id is invalid')];

function normalizePrescription(items = []) {
  return items
    .map((item) => ({
      medicineName: String(item?.medicineName || '').trim(),
      dosage: String(item?.dosage || '').trim(),
      frequency: String(item?.frequency || '').trim(),
      duration: String(item?.duration || '').trim(),
      note: String(item?.note || '').trim()
    }))
    .filter((item) => item.medicineName || item.dosage || item.frequency || item.duration || item.note);
}

function normalizeVitals(vitals) {
  if (!vitals || typeof vitals !== 'object' || Array.isArray(vitals)) return {};

  return Object.entries(vitals).reduce((result, [key, value]) => {
    if (value === '' || value === null || value === undefined) return result;
    result[key] = value;
    return result;
  }, {});
}

function assertPrescriptionValid(prescription) {
  const invalid = prescription.find((item) => !item.medicineName);
  if (invalid) {
    throw new ApiError(400, 'Tên thuốc là bắt buộc nếu có kê đơn');
  }
}

function parseBoolean(value) {
  return value === true || value === 'true' || value === '1' || value === 1;
}

function assertRecordAccess(user, record) {
  if (user.role === 'admin') return;

  if (user.role === 'doctor') {
    if (!user.doctorId) throw new ApiError(400, 'Tài khoản bác sĩ chưa được liên kết hồ sơ bác sĩ');
    if (String(record.doctorId?._id || record.doctorId) !== String(user.doctorId)) {
      throw new ApiError(403, 'Bạn không có quyền thực hiện thao tác này');
    }
    return;
  }

  if (user.role === 'patient') {
    if (String(record.patientId?._id || record.patientId) !== String(user._id)) {
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

async function syncClinicAppointment(appointment, patientUser) {
  if (!patientUser) return;

  const connection = await getClinicConnection(appointment.clinicId);
  const { Patient, Appointment: ClinicAppointment } = getClinicModels(connection);

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
      paymentStatus: appointment.paymentStatus,
      paymentMethod: appointment.paymentMethod,
      isFollowUp: appointment.isFollowUp,
      followUpRecordId: appointment.followUpRecordId,
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

async function emitAppointmentUpdated(appointment) {
  const payload = {
    appointmentId: appointment._id,
    status: appointment.status,
    consultationStatus: appointment.consultationStatus,
    queueNumber: appointment.queueNumber,
    appointment
  };

  emitToUser(appointment.patientId?._id || appointment.patientId, 'appointment:updated', payload);
  emitToRole('admin', 'appointment:updated', payload);

  const doctorUser = await User.findOne({
    role: 'doctor',
    doctorId: appointment.doctorId?._id || appointment.doctorId,
    isActive: { $ne: false }
  }).select('_id');

  if (doctorUser) emitToUser(doctorUser._id, 'appointment:updated', payload);
}

async function notifyPatientMedicalRecordCreated(record, appointment) {
  const notification = await Notification.create({
    userId: appointment.patientId,
    role: 'patient',
    appointmentId: appointment._id,
    type: 'medical_record_created',
    title: 'Hồ sơ khám bệnh đã được cập nhật',
    message: 'Bác sĩ đã hoàn thành hồ sơ khám bệnh của bạn.',
    targetUrl: `/medical-records?recordId=${record._id}`,
    metadata: {
      appointmentId: appointment._id,
      medicalRecordId: record._id,
      doctorId: appointment.doctorId,
      clinicId: appointment.clinicId
    },
    isRead: false
  });

  const payload = notification.toObject();
  emitNotification(payload);
  emitToUser(appointment.patientId, 'medical-record:created', {
    appointmentId: appointment._id,
    medicalRecordId: record._id
  });
}

async function notifyPatientReviewAvailable(appointment) {
  const notification = await Notification.create({
    userId: appointment.patientId,
    role: 'patient',
    appointmentId: appointment._id,
    type: 'doctor_review_available',
    title: 'Bạn có thể đánh giá bác sĩ',
    message: 'Buổi khám đã hoàn tất. Hãy chia sẻ trải nghiệm của bạn.',
    targetUrl: '/appointments/my',
    metadata: {
      appointmentId: appointment._id,
      doctorId: appointment.doctorId,
      clinicId: appointment.clinicId
    },
    isRead: false
  });

  emitNotification(notification.toObject());
}

async function notifyPatientFollowUpRecommended(record, appointment) {
  if (!record.followUpRequired) return;

  const followUpDate = record.followUpDate ? String(record.followUpDate).slice(0, 10) : null;
  const message = followUpDate
    ? `Bạn nên tái khám vào ngày ${followUpDate}. Vui lòng đặt lịch để được theo dõi tiếp.`
    : 'Bác sĩ khuyến nghị bạn tái khám. Vui lòng chọn thời gian phù hợp để đặt lịch tái khám.';

  const notification = await Notification.create({
    userId: appointment.patientId,
    role: 'patient',
    appointmentId: appointment._id,
    type: 'follow_up_recommended',
    title: 'Bác sĩ khuyến nghị tái khám',
    message,
    targetUrl: `/medical-records?recordId=${record._id}`,
    metadata: {
      appointmentId: appointment._id,
      medicalRecordId: record._id,
      doctorId: appointment.doctorId,
      clinicId: appointment.clinicId,
      followUpDate
    },
    isRead: false
  });

  emitNotification(notification.toObject());
}

async function sendMedicalRecordEmailSafely({ record, appointment, patient }) {
  try {
    await sendMedicalRecordUpdatedEmail({
      patient,
      doctor: appointment.doctorId,
      appointment,
      record
    });
  } catch (error) {
    console.warn('Medical record email failed:', error.stack || error);
  }
}

async function runMedicalRecordSideEffect(label, task) {
  try {
    await task();
  } catch (error) {
    console.warn(`${label} failed:`, error.stack || error);
  }
}

export const createMedicalRecord = asyncHandler(async (req, res) => {
  if (req.user.role !== 'doctor') {
    throw new ApiError(403, 'Chỉ bác sĩ được tạo hồ sơ khám bệnh');
  }

  if (!req.user.doctorId) {
    throw new ApiError(400, 'Tài khoản bác sĩ chưa được liên kết hồ sơ bác sĩ');
  }

  const appointment = await Appointment.findById(req.body.appointmentId);
  if (!appointment) throw new ApiError(404, 'Không tìm thấy dữ liệu');

  if (String(appointment.doctorId?._id || appointment.doctorId) !== String(req.user.doctorId)) {
    throw new ApiError(403, 'Bạn không có quyền thực hiện thao tác này');
  }

  const existed = await MedicalRecord.findOne({ appointmentId: appointment._id }).populate(medicalRecordPopulate);
  if (existed) {
    const populatedAppointment = await Appointment.findById(appointment._id).populate(appointmentPopulate);
    return res.status(200).json({
      success: true,
      message: 'Hồ sơ khám bệnh đã tồn tại',
      data: {
        medicalRecord: existed,
        appointment: populatedAppointment
      }
    });
  }

  if (appointment.status === 'completed') {
    throw new ApiError(400, 'Lịch hẹn đã hoàn thành, vui lòng xem hồ sơ đã tạo');
  }

  if (appointment.status === 'no_show') {
    throw new ApiError(400, 'Không thể tạo hồ sơ cho lịch không đến khám');
  }

  if (appointment.status !== 'in_progress') {
    throw new ApiError(400, 'Chỉ có thể tạo hồ sơ khi lịch đang khám');
  }
  const prescription = normalizePrescription(req.body.prescription);
  assertPrescriptionValid(prescription);
  const vitals = normalizeVitals(req.body.vitals);
  const followUpRequired = parseBoolean(req.body.followUpRequired);
  const followUpDate = followUpRequired && req.body.followUpDate ? req.body.followUpDate : null;

  const now = new Date();
  const record = await MedicalRecord.create({
    appointmentId: appointment._id,
    patientId: appointment.patientId,
    doctorId: appointment.doctorId,
    clinicId: appointment.clinicId,
    specialtyId: appointment.specialtyId,
    symptoms: req.body.symptoms || '',
    vitals,
    allergies: req.body.allergies || '',
    icd10Code: req.body.icd10Code || '',
    diagnosis: req.body.diagnosis,
    conclusion: req.body.conclusion,
    prescription,
    attachments: req.body.attachments || [],
    advice: req.body.advice || '',
    followUpRequired,
    followUpDate,
    followUpStatus: followUpRequired ? FOLLOW_UP_STATUSES.RECOMMENDED : FOLLOW_UP_STATUSES.NONE,
    note: req.body.note || '',
    createdBy: req.user._id,
    updatedBy: req.user._id
  });

  appointment.status = 'completed';
  appointment.consultationStatus = 'completed';
  appointment.completedAt = appointment.completedAt || now;
  appointment.completedBy = appointment.completedBy || req.user._id;
  appointment.finishConsultationAt = appointment.finishConsultationAt || now;
  await appointment.save();

  const patientUser = await User.findById(appointment.patientId).select('name email phone');
  if (patientUser) {
    await runMedicalRecordSideEffect('Medical record clinic sync', () => syncClinicAppointment(appointment, patientUser));
  }

  const populatedRecord = await MedicalRecord.findById(record._id).populate(medicalRecordPopulate);
  const populatedAppointment = await Appointment.findById(appointment._id).populate(appointmentPopulate);

  await runMedicalRecordSideEffect('Medical record patient notification', () => notifyPatientMedicalRecordCreated(record, appointment));
  await runMedicalRecordSideEffect('Follow-up recommendation notification', () => notifyPatientFollowUpRecommended(record, appointment));
  await runMedicalRecordSideEffect('Doctor review invitation notification', () => notifyPatientReviewAvailable(appointment));
  await sendMedicalRecordEmailSafely({ record: populatedRecord, appointment: populatedAppointment, patient: patientUser });

  await runMedicalRecordSideEffect('Medical record audit log', () => createAuditLog({
    req,
    action: 'CREATE_MEDICAL_RECORD',
    entityType: 'MedicalRecord',
    entityId: record._id,
    entityName: `${patientUser?.name || 'Bệnh nhân'} - ${populatedAppointment?.doctorId?.name || 'bác sĩ'}`,
    description: 'Bác sĩ đã tạo hồ sơ khám bệnh và hoàn thành lịch khám',
    metadata: {
      appointmentId: String(appointment._id),
      patientId: String(appointment.patientId),
      doctorId: String(appointment.doctorId)
    }
  }));

  await runMedicalRecordSideEffect('Medical record socket emit', () => emitAppointmentUpdated(populatedAppointment));

  res.status(201).json({
    success: true,
    message: 'Tạo hồ sơ khám bệnh thành công',
    data: {
      medicalRecord: populatedRecord,
      appointment: populatedAppointment
    }
  });
});

export const getMedicalRecordById = asyncHandler(async (req, res) => {
  const record = await MedicalRecord.findById(req.params.id).populate(medicalRecordPopulate);
  if (!record) throw new ApiError(404, 'Không tìm thấy dữ liệu');

  assertRecordAccess(req.user, record);

  res.json({
    success: true,
    message: 'Medical record fetched successfully',
    data: record
  });
});

export const exportMedicalRecordPdf = asyncHandler(async (req, res) => {
  const record = await MedicalRecord.findById(req.params.id).populate(medicalRecordPopulate);
  if (!record) throw new ApiError(404, 'Không tìm thấy dữ liệu');

  assertRecordAccess(req.user, record);

  await createAuditLog({
    req,
    action: 'EXPORT_MEDICAL_RECORD_PDF',
    entityType: 'MedicalRecord',
    entityId: record._id,
    entityName: `${record.patientId?.name || 'Bệnh nhân'} - ${record.doctorId?.name || 'bác sĩ'}`,
    description: 'Xuất PDF kết quả khám / hồ sơ khám bệnh',
    metadata: {
      medicalRecordId: String(record._id),
      appointmentId: String(record.appointmentId?._id || record.appointmentId)
    }
  });

  streamPdf(res, generateMedicalRecordPdf(record), `ket-qua-kham-${record._id}.pdf`);
});

export const getMedicalRecordByAppointment = asyncHandler(async (req, res) => {
  const record = await MedicalRecord.findOne({ appointmentId: req.params.appointmentId }).populate(medicalRecordPopulate);
  if (!record) throw new ApiError(404, 'Không tìm thấy dữ liệu');

  assertRecordAccess(req.user, record);

  res.json({
    success: true,
    message: 'Medical record fetched successfully',
    data: record
  });
});

export const getMyMedicalRecords = asyncHandler(async (req, res) => {
  const records = await MedicalRecord.find({ patientId: req.user._id })
    .populate(medicalRecordPopulate)
    .sort({ createdAt: -1 });

  res.json({
    success: true,
    message: 'Medical records fetched successfully',
    data: records
  });
});

export const getMyFollowUpRecords = asyncHandler(async (req, res) => {
  const records = await MedicalRecord.find({
    patientId: req.user._id,
    followUpRequired: true
  })
    .populate([...medicalRecordPopulate, followUpAppointmentPopulate])
    .sort({ followUpStatus: 1, followUpDate: 1, createdAt: -1 });

  const summary = records.reduce((result, record) => {
    const status = record.followUpStatus || FOLLOW_UP_STATUSES.RECOMMENDED;
    result.total += 1;
    result[status] = (result[status] || 0) + 1;
    if (!record.followUpDate) result.noDate += 1;
    if ([FOLLOW_UP_STATUSES.RECOMMENDED, FOLLOW_UP_STATUSES.OVERDUE].includes(status)) {
      result.needBooking += 1;
    }
    return result;
  }, {
    total: 0,
    needBooking: 0,
    noDate: 0,
    recommended: 0,
    scheduled: 0,
    completed: 0,
    overdue: 0
  });

  res.json({
    success: true,
    message: 'Follow-up records fetched successfully',
    data: records,
    meta: { summary }
  });
});

export const getDoctorMedicalRecords = asyncHandler(async (req, res) => {
  if (!req.user.doctorId) {
    throw new ApiError(400, 'Tài khoản bác sĩ chưa được liên kết hồ sơ bác sĩ');
  }

  const filter = { doctorId: req.user.doctorId };
  if (req.query.clinicId) filter.clinicId = req.query.clinicId;
  if (req.query.specialtyId) filter.specialtyId = req.query.specialtyId;
  if (req.query.followUpStatus) filter.followUpStatus = req.query.followUpStatus;
  if (String(req.query.followUpOnly || '') === 'true') filter.followUpRequired = true;

  if (req.query.followUpFrom || req.query.followUpTo) {
    filter.followUpDate = {};
    if (req.query.followUpFrom) filter.followUpDate.$gte = new Date(`${req.query.followUpFrom}T00:00:00.000Z`);
    if (req.query.followUpTo) filter.followUpDate.$lte = new Date(`${req.query.followUpTo}T23:59:59.999Z`);
  }

  if (req.query.date) {
    const start = new Date(`${req.query.date}T00:00:00.000Z`);
    const end = new Date(`${req.query.date}T23:59:59.999Z`);
    filter.createdAt = { $gte: start, $lte: end };
  }

  let records = await MedicalRecord.find(filter)
    .populate(medicalRecordPopulate)
    .sort({ createdAt: -1 });

  if (req.query.patientName) {
    const keyword = String(req.query.patientName).trim().toLowerCase();
    records = records.filter((record) => String(record.patientId?.name || '').toLowerCase().includes(keyword));
  }

  const followUpSummary = records.reduce((summary, record) => {
    if (!record.followUpRequired) return summary;
    const status = record.followUpStatus || 'recommended';
    summary.total += 1;
    summary[status] = (summary[status] || 0) + 1;
    return summary;
  }, {
    total: 0,
    recommended: 0,
    scheduled: 0,
    completed: 0,
    overdue: 0
  });

  res.json({
    success: true,
    message: 'Doctor medical records fetched successfully',
    data: records,
    meta: { followUpSummary }
  });
});



