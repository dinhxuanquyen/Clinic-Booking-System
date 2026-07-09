import { body, param } from 'express-validator';
import Appointment from '../models/appointmentModel.js';
import Counter from '../models/central/Counter.js';
import Doctor from '../models/doctorModel.js';
import DoctorScheduleTemplate from '../models/doctorScheduleTemplateModel.js';
import Notification from '../models/notificationModel.js';
import Schedule from '../models/scheduleModel.js';
import ScheduleException from '../models/scheduleExceptionModel.js';
import User from '../models/central/User.js';
import WaitingList from '../models/waitingListModel.js';
import { getClinicConnection } from '../config/db.js';
import { getClinicModels } from '../models/clinic/models.js';
import { sendAppointmentConfirmation } from '../services/emailService.js';
import { emitNotification } from '../services/socketService.js';
import { safelyOfferNextWaitingPatient } from '../services/waitingListService.js';
import { SLOT_HOLDING_APPOINTMENT_STATUSES } from '../constants/appointmentStatus.js';
import { ApiError } from '../utils/apiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { buildInsuranceSnapshot } from '../utils/insurance.js';
import { generateTimeSlots } from '../utils/slotUtils.js';
import { isPastDate, isPastOrCurrentSlot } from '../utils/vietnamTime.js';

const slotHoldingStatuses = SLOT_HOLDING_APPOINTMENT_STATUSES;
const activeWaitingStatuses = ['waiting', 'offered', 'accepted'];
const waitingListPopulate = [
  { path: 'doctorId', select: 'name avatar degree clinicId specialtyId doctorCode' },
  { path: 'clinicId', select: 'name clinicCode address phone image' },
  { path: 'specialtyId', select: 'name description image clinicId' }
];

const appointmentPopulate = [
  { path: 'patientId', select: 'name email phone role' },
  { path: 'doctorId', select: 'name email phone avatar degree clinicId specialtyId' },
  { path: 'clinicId', select: 'name address phone email' },
  { path: 'specialtyId', select: 'name description image clinicId' }
];

function getDayOfWeek(dateString) {
  const [year, month, day] = String(dateString).split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

function slotsFromTemplates(templates) {
  return templates.flatMap((item) => (
    item.isWorking
      ? generateTimeSlots({ start: item.startTime, end: item.endTime }, item.slotDuration)
      : []
  ));
}

async function getGeneratedScheduleSlots({ doctorId, clinicId, date }) {
  const dayOfWeek = getDayOfWeek(date);
  const [templates, exceptions, legacySchedule] = await Promise.all([
    DoctorScheduleTemplate.find({ doctorId, dayOfWeek }).sort({ startTime: 1 }),
    ScheduleException.find({ doctorId, date }).sort({ createdAt: 1 }),
    Schedule.findOne({ doctorId, clinicId, date, isWorkingDay: true })
  ]);

  let slots = templates.length ? slotsFromTemplates(templates) : [];
  if (!templates.length && legacySchedule) {
    slots = generateTimeSlots(legacySchedule.workingHours, legacySchedule.slotDuration);
  }

  for (const exception of exceptions) {
    if (exception.type === 'day_off') {
      slots = [];
      continue;
    }

    if (['half_day', 'custom_hours'].includes(exception.type)) {
      slots = generateTimeSlots(
        { start: exception.startTime, end: exception.endTime },
        exception.slotDuration || templates[0]?.slotDuration || legacySchedule?.slotDuration || 30
      );
      continue;
    }

    if (exception.type === 'overtime') {
      slots.push(...generateTimeSlots(
        { start: exception.startTime, end: exception.endTime },
        exception.slotDuration || templates[0]?.slotDuration || legacySchedule?.slotDuration || 30
      ));
    }
  }

  return Array.from(new Set(slots)).sort();
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

export const createWaitingListRules = [
  body('doctorId').isMongoId().withMessage('doctorId is invalid'),
  body('clinicId').isMongoId().withMessage('clinicId is invalid'),
  body('specialtyId').isMongoId().withMessage('specialtyId is invalid'),
  body('date').isISO8601({ strict: true }).withMessage('date must be YYYY-MM-DD'),
  body('timeSlot').trim().notEmpty().withMessage('timeSlot is required')
];

export const waitingListIdRules = [param('id').isMongoId().withMessage('Waiting list id is invalid')];

function waitingListCounterId({ doctorId, date, timeSlot }) {
  return `waitingList:${doctorId}:${date}:${timeSlot}`;
}

async function nextPosition(payload) {
  const counter = await Counter.findByIdAndUpdate(
    waitingListCounterId(payload),
    { $inc: { sequence: 1 } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  return counter.sequence;
}

async function syncAcceptedAppointmentToClinic(appointment, patientUser) {
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
      insuranceSnapshot: appointment.insuranceSnapshot,
      consultationStatus: appointment.consultationStatus,
      status: appointment.status
    },
    { upsert: true, new: true }
  );
}

async function offerNextForEntry(entry) {
  return safelyOfferNextWaitingPatient({
    doctorId: entry.doctorId,
    date: entry.date,
    timeSlot: entry.timeSlot
  });
}

export const createWaitingListEntry = asyncHandler(async (req, res) => {
  const { doctorId, clinicId, specialtyId, date, timeSlot } = req.body;

  if (isPastDate(date) || isPastOrCurrentSlot(date, timeSlot)) {
    throw new ApiError(400, 'Không thể đăng ký danh sách chờ cho khung giờ đã qua');
  }

  const doctor = await Doctor.findOne({ _id: doctorId, isActive: { $ne: false } });
  if (!doctor) throw new ApiError(404, 'Không tìm thấy bác sĩ');
  if (String(doctor.clinicId) !== String(clinicId) || String(doctor.specialtyId) !== String(specialtyId)) {
    throw new ApiError(422, 'Bác sĩ không thuộc cơ sở hoặc chuyên khoa đã chọn');
  }

  const scheduleSlots = await getGeneratedScheduleSlots({ doctorId, clinicId, date });
  if (!scheduleSlots.includes(timeSlot)) {
    throw new ApiError(400, 'Khung giờ không thuộc lịch làm việc của bác sĩ');
  }

  const duplicateWaitingEntry = await WaitingList.exists({
    patientId: req.user._id,
    doctorId,
    date,
    timeSlot,
    status: { $in: activeWaitingStatuses }
  });
  if (duplicateWaitingEntry) {
    throw new ApiError(409, 'Bạn đã đăng ký danh sách chờ cho khung giờ này.');
  }

  const patientAppointment = await Appointment.exists({
    patientId: req.user._id,
    date,
    timeSlot,
    status: { $in: slotHoldingStatuses }
  });
  if (patientAppointment) {
    throw new ApiError(409, 'Bạn đã có một lịch khám khác trong khung giờ này.');
  }

  const occupiedSlot = await Appointment.exists({
    doctorId,
    clinicId,
    date,
    timeSlot,
    status: { $in: slotHoldingStatuses }
  });
  if (!occupiedSlot) {
    throw new ApiError(409, 'Khung giờ vẫn còn trống, vui lòng đặt lịch trực tiếp.');
  }

  const position = await nextPosition({ doctorId, date, timeSlot });
  let waitingEntry;
  try {
    waitingEntry = await WaitingList.create({
      patientId: req.user._id,
      doctorId,
      clinicId,
      specialtyId,
      date,
      timeSlot,
      position,
      status: 'waiting'
    });
  } catch (error) {
    if (error?.code === 11000) {
      throw new ApiError(409, 'Bạn đã đăng ký danh sách chờ cho khung giờ này.');
    }
    throw error;
  }

  await waitingEntry.populate(waitingListPopulate);
  res.status(201).json({
    success: true,
    message: 'Đăng ký danh sách chờ thành công',
    data: waitingEntry
  });
});

export const getMyWaitingList = asyncHandler(async (req, res) => {
  const entries = await WaitingList.find({ patientId: req.user._id })
    .populate(waitingListPopulate)
    .sort({ createdAt: -1 });

  res.json({
    success: true,
    message: 'Danh sách chờ của bạn',
    data: entries
  });
});

export const acceptWaitingListOffer = asyncHandler(async (req, res) => {
  const now = new Date();
  const entry = await WaitingList.findOneAndUpdate(
    {
      _id: req.params.id,
      patientId: req.user._id,
      status: 'offered',
      offerExpiresAt: { $gt: now }
    },
    { $set: { status: 'accepted', acceptedAt: now } },
    { new: true }
  );

  if (!entry) {
    const current = await WaitingList.findOne({ _id: req.params.id, patientId: req.user._id });
    if (!current) throw new ApiError(404, 'Không tìm thấy lời mời danh sách chờ');

    if (current.status === 'offered' && current.offerExpiresAt <= now) {
      current.status = 'expired';
      current.expiredAt = now;
      await current.save();
      await offerNextForEntry(current);
      throw new ApiError(400, 'Lời mời nhận lịch đã hết hạn');
    }

    throw new ApiError(400, 'Lời mời nhận lịch không còn hiệu lực');
  }

  const conflictingAppointment = await Appointment.exists({
    patientId: req.user._id,
    date: entry.date,
    timeSlot: entry.timeSlot,
    status: { $in: slotHoldingStatuses }
  });
  if (conflictingAppointment) {
    entry.status = 'expired';
    entry.expiredAt = now;
    await entry.save();
    await offerNextForEntry(entry);
    throw new ApiError(409, 'Bạn đã có một lịch khám khác trong khung giờ này.');
  }

  let appointment;
  try {
    appointment = await Appointment.create({
      patientId: req.user._id,
      doctorId: entry.doctorId,
      clinicId: entry.clinicId,
      specialtyId: entry.specialtyId,
      date: entry.date,
      timeSlot: entry.timeSlot,
      reason: 'Nhận lịch từ danh sách chờ',
      patientInfo: {
        name: req.user.name,
        email: req.user.email,
        phone: req.user.phone,
        gender: req.user.gender,
        dateOfBirth: req.user.dateOfBirth
      },
      insuranceSnapshot: buildInsuranceSnapshot(req.user)
    });
  } catch (error) {
    if (error?.code === 11000) {
      entry.status = 'expired';
      entry.expiredAt = new Date();
      await entry.save();
      throw new ApiError(409, 'Khung giờ này không còn trống');
    }

    await WaitingList.updateOne(
      { _id: entry._id, status: 'accepted' },
      { $set: { status: 'offered' }, $unset: { acceptedAt: '' } }
    );
    throw error;
  }

  await WaitingList.updateMany(
    {
      _id: { $ne: entry._id },
      doctorId: entry.doctorId,
      date: entry.date,
      timeSlot: entry.timeSlot,
      status: { $in: ['waiting', 'offered'] }
    },
    { $set: { status: 'expired', expiredAt: new Date() } }
  );

  await syncAcceptedAppointmentToClinic(appointment, req.user);
  const populatedAppointment = await Appointment.findById(appointment._id).populate(appointmentPopulate);

  try {
    const notification = await Notification.create({
      role: 'admin',
      appointmentId: appointment._id,
      type: 'new_appointment',
      title: 'Có lịch hẹn mới từ danh sách chờ',
      message: `${req.user.name} đã nhận lịch với ${populatedAppointment.doctorId?.name || 'bác sĩ'} vào ${entry.date} ${entry.timeSlot}.`
    });
    emitNotification(notification.toObject());
    await createDoctorNotification({
      appointment: populatedAppointment,
      type: 'doctor_waiting_list_accepted',
      title: 'Có lịch khám mới từ danh sách chờ',
      message: `Bệnh nhân ${req.user.name} đã nhận lịch khám ngày ${entry.date}, khung giờ ${entry.timeSlot}.`
    });
  } catch (error) {
    console.error('Create waiting-list appointment notification failed:', error);
  }

  try {
    await sendAppointmentConfirmation({
      to: req.user.email,
      patientName: req.user.name,
      doctorName: populatedAppointment.doctorId?.name,
      clinicName: populatedAppointment.clinicId?.name,
      specialtyName: populatedAppointment.specialtyId?.name,
      date: populatedAppointment.date,
      timeSlot: populatedAppointment.timeSlot,
      status: populatedAppointment.status,
      insuranceSnapshot: populatedAppointment.insuranceSnapshot
    });
    appointment.emailConfirmationSentAt = new Date();
    await appointment.save();
  } catch (error) {
    console.error('Waiting-list appointment email failed:', error);
  }

  res.status(201).json({
    success: true,
    message: 'Nhận lịch khám thành công',
    data: { appointment: populatedAppointment, waitingList: entry }
  });
});

export const declineWaitingListOffer = asyncHandler(async (req, res) => {
  const entry = await WaitingList.findOneAndUpdate(
    { _id: req.params.id, patientId: req.user._id, status: 'offered' },
    { $set: { status: 'declined', declinedAt: new Date() } },
    { new: true }
  );

  if (!entry) {
    const current = await WaitingList.findOne({ _id: req.params.id, patientId: req.user._id });
    if (!current) throw new ApiError(404, 'Không tìm thấy lời mời danh sách chờ');
    throw new ApiError(400, 'Lời mời nhận lịch không còn hiệu lực');
  }

  await offerNextForEntry(entry);
  await entry.populate(waitingListPopulate);

  res.json({
    success: true,
    message: 'Đã từ chối lời mời nhận lịch',
    data: entry
  });
});

export const cancelWaitingListEntry = asyncHandler(async (req, res) => {
  const entry = await WaitingList.findOne({ _id: req.params.id, patientId: req.user._id });
  if (!entry) throw new ApiError(404, 'Không tìm thấy đăng ký danh sách chờ');
  if (!['waiting', 'offered'].includes(entry.status)) {
    throw new ApiError(400, 'Đăng ký danh sách chờ này không thể hủy');
  }

  const wasOffered = entry.status === 'offered';
  entry.status = 'cancelled';
  entry.cancelledAt = new Date();
  await entry.save();
  if (wasOffered) await offerNextForEntry(entry);
  await entry.populate(waitingListPopulate);

  res.json({
    success: true,
    message: 'Hủy đăng ký danh sách chờ thành công',
    data: entry
  });
});

