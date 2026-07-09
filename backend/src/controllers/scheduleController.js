import { body, param, query } from 'express-validator';
import Schedule from '../models/scheduleModel.js';
import DoctorScheduleTemplate from '../models/doctorScheduleTemplateModel.js';
import ScheduleException from '../models/scheduleExceptionModel.js';
import Doctor from '../models/doctorModel.js';
import Appointment from '../models/appointmentModel.js';
import Notification from '../models/notificationModel.js';
import User from '../models/central/User.js';
import { ApiError } from '../utils/apiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { generateTimeSlots } from '../utils/slotUtils.js';
import { isPastDate, isPastOrCurrentSlot } from '../utils/vietnamTime.js';
import { createAuditLog } from '../utils/auditLogger.js';
import { emitNotification } from '../services/socketService.js';

const schedulePopulate = [
  { path: 'doctorId', select: 'name email phone clinicId specialtyId' },
  { path: 'clinicId', select: 'name address phone email' }
];
let templateIndexSyncPromise = null;
const dayNumberToKey = {
  0: 'sunday',
  1: 'monday',
  2: 'tuesday',
  3: 'wednesday',
  4: 'thursday',
  5: 'friday',
  6: 'saturday'
};
const dayKeyToNumber = Object.fromEntries(
  Object.entries(dayNumberToKey).map(([number, key]) => [key, Number(number)])
);

export const scheduleIdRule = [param('id').isMongoId().withMessage('Schedule id is invalid')];
export const scheduleExceptionIdRule = [param('id').isMongoId().withMessage('Schedule exception id is invalid')];
export const availableSlotsRules = [
  param('doctorId').isMongoId().withMessage('doctorId is invalid'),
  query('date').isISO8601({ strict: true }).withMessage('date must be YYYY-MM-DD')
];

export const scheduleRules = [
  body('doctorId').optional({ checkFalsy: true }).isMongoId().withMessage('doctorId is invalid'),
  body('clinicId').optional({ checkFalsy: true }).isMongoId().withMessage('clinicId is invalid'),
  body('date').isISO8601({ strict: true }).withMessage('date must be YYYY-MM-DD'),
  body('workingHours').isObject().withMessage('workingHours is required'),
  body('workingHours.start').trim().notEmpty().withMessage('workingHours.start is required'),
  body('workingHours.end').trim().notEmpty().withMessage('workingHours.end is required'),
  body('slotDuration').isInt({ min: 5 }).withMessage('slotDuration must be at least 5 minutes'),
  body('isWorkingDay').optional().isBoolean().withMessage('isWorkingDay must be boolean'),
  body('note').optional().trim()
];

export const scheduleTemplateRules = [
  body().isArray({ min: 0 }).withMessage('Schedule template must be an array'),
  body('*.dayOfWeek').isInt({ min: 0, max: 6 }).withMessage('dayOfWeek must be 0-6'),
  body('*.startTime').trim().notEmpty().withMessage('startTime is required'),
  body('*.endTime').trim().notEmpty().withMessage('endTime is required'),
  body('*.slotDuration').isInt({ min: 5 }).withMessage('slotDuration must be at least 5 minutes'),
  body('*.isWorking').optional().isBoolean().withMessage('isWorking must be boolean')
];

export const scheduleExceptionRules = [
  body('doctorId').optional({ checkFalsy: true }).isMongoId().withMessage('doctorId is invalid'),
  body('date').isISO8601({ strict: true }).withMessage('date must be YYYY-MM-DD'),
  body('type').isIn(['day_off', 'half_day', 'custom_hours', 'overtime']).withMessage('type is invalid'),
  body('reason').optional().trim(),
  body('startTime').optional({ checkFalsy: true }).trim().notEmpty().withMessage('startTime is invalid'),
  body('endTime').optional({ checkFalsy: true }).trim().notEmpty().withMessage('endTime is invalid'),
  body('slotDuration').optional({ checkFalsy: true }).isInt({ min: 5 }).withMessage('slotDuration must be at least 5 minutes')
];

async function validateDoctorClinic({ doctorId, clinicId }) {
  const doctor = await Doctor.findOne({ _id: doctorId, clinicId, isActive: true });
  if (!doctor) {
    throw new ApiError(422, 'Doctor does not belong to the selected clinic');
  }

  return doctor;
}

async function getLinkedDoctor(user) {
  if (user.role !== 'doctor') return null;

  if (!user.doctorId) {
    throw new ApiError(400, 'Tài khoản bác sĩ chưa được liên kết hồ sơ bác sĩ');
  }

  const doctor = await Doctor.findOne({ _id: user.doctorId, isActive: true });
  if (!doctor) {
    throw new ApiError(400, 'Tài khoản bác sĩ chưa được liên kết hồ sơ bác sĩ');
  }

  return doctor;
}

async function resolveSchedulePayload(req) {
  if (req.user.role === 'doctor') {
    const doctor = await getLinkedDoctor(req.user);
    return {
      ...req.body,
      doctorId: doctor._id,
      clinicId: doctor.clinicId
    };
  }

  if (!req.body.doctorId) {
    throw new ApiError(400, 'doctorId is required');
  }

  if (!req.body.clinicId) {
    throw new ApiError(400, 'clinicId is required');
  }

  await validateDoctorClinic(req.body);
  return req.body;
}

function getDayOfWeek(dateString) {
  const [year, month, day] = String(dateString).split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

function toMinutes(time) {
  const [hours, minutes] = String(time || '').split(':').map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return NaN;
  return hours * 60 + minutes;
}

function buildLegacyDoctorScheduleFields(items) {
  const workingItems = items.filter((item) => item.isWorking !== false);
  const workingDays = Array.from(new Set(
    workingItems
      .map((item) => dayNumberToKey[Number(item.dayOfWeek)])
      .filter(Boolean)
  ));

  if (!workingItems.length) {
    return {
      workingDays: []
    };
  }

  const startTime = workingItems
    .map((item) => item.startTime)
    .sort((a, b) => toMinutes(a) - toMinutes(b))[0];
  const endTime = workingItems
    .map((item) => item.endTime)
    .sort((a, b) => toMinutes(b) - toMinutes(a))[0];

  return {
    workingDays,
    workingHours: { start: startTime, end: endTime }
  };
}

function buildTemplateItemsFromLegacyDoctor(doctor) {
  const workingDays = Array.isArray(doctor.workingDays) ? doctor.workingDays : [];
  const startTime = String(doctor.workingHours?.start || '').trim();
  const endTime = String(doctor.workingHours?.end || '').trim();
  const start = toMinutes(startTime);
  const end = toMinutes(endTime);

  if (!workingDays.length || !startTime || !endTime || !Number.isFinite(start) || !Number.isFinite(end) || start >= end) {
    return [];
  }

  return workingDays
    .map((day) => dayKeyToNumber[String(day || '').toLowerCase()])
    .filter((dayOfWeek) => Number.isInteger(dayOfWeek))
    .map((dayOfWeek) => ({
      doctorId: doctor._id,
      dayOfWeek,
      startTime,
      endTime,
      slotDuration: 30,
      isWorking: true
    }));
}

async function ensureTemplateIndexes() {
  if (!templateIndexSyncPromise) {
    templateIndexSyncPromise = DoctorScheduleTemplate.syncIndexes().catch((error) => {
      templateIndexSyncPromise = null;
      throw error;
    });
  }

  return templateIndexSyncPromise;
}

function normalizeTemplateItems(items) {
  const seen = new Set();

  return items.map((item, index) => {
    const dayOfWeek = Number(item.dayOfWeek);
    const startTime = String(item.startTime || '').trim();
    const endTime = String(item.endTime || '').trim();
    const slotDuration = Number(item.slotDuration);
    const start = toMinutes(startTime);
    const end = toMinutes(endTime);

    if (!Number.isInteger(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) {
      throw new ApiError(400, `Ca làm việc #${index + 1} có thứ không hợp lệ`);
    }

    if (!startTime || !endTime || !Number.isFinite(start) || !Number.isFinite(end) || start >= end) {
      throw new ApiError(400, `Ca làm việc #${index + 1} có giờ bắt đầu/kết thúc không hợp lệ`);
    }

    if (!Number.isFinite(slotDuration) || slotDuration <= 0) {
      throw new ApiError(400, `Ca làm việc #${index + 1} có slotDuration không hợp lệ`);
    }

    const key = `${dayOfWeek}-${startTime}-${endTime}`;
    if (seen.has(key)) {
      throw new ApiError(400, 'Không được tạo trùng ca làm việc cùng ngày');
    }
    seen.add(key);

    return {
      dayOfWeek,
      startTime,
      endTime,
      slotDuration,
      isWorking: item.isWorking !== false
    };
  });
}

async function resolveDoctorForScheduleAccess(req) {
  if (req.user.role === 'doctor') {
    return getLinkedDoctor(req.user);
  }

  if (!req.body.doctorId && !req.query.doctorId) {
    throw new ApiError(400, 'doctorId is required');
  }

  const doctorId = req.body.doctorId || req.query.doctorId;
  const doctor = await Doctor.findOne({ _id: doctorId, isActive: true });
  if (!doctor) {
    throw new ApiError(404, 'Doctor not found');
  }

  return doctor;
}

function slotsFromTemplates(templates) {
  return templates.flatMap((item) => (
    item.isWorking
      ? generateTimeSlots({ start: item.startTime, end: item.endTime }, item.slotDuration)
      : []
  ));
}

async function buildDynamicSlots({ doctor, date }) {
  const dayOfWeek = getDayOfWeek(date);
  const [templates, exceptions, legacySchedule] = await Promise.all([
    DoctorScheduleTemplate.find({ doctorId: doctor._id, dayOfWeek }).sort({ startTime: 1 }),
    ScheduleException.find({ doctorId: doctor._id, date }).sort({ createdAt: 1 }),
    Schedule.findOne({ doctorId: doctor._id, clinicId: doctor.clinicId, date })
  ]);

  let slots = templates.length ? slotsFromTemplates(templates) : [];
  let source = templates.length ? 'template' : 'legacy';

  if (!templates.length && legacySchedule?.isWorkingDay) {
    slots = generateTimeSlots(legacySchedule.workingHours, legacySchedule.slotDuration);
  }

  for (const exception of exceptions) {
    if (exception.type === 'day_off') {
      slots = [];
      source = 'exception';
      continue;
    }

    if (['half_day', 'custom_hours'].includes(exception.type)) {
      slots = generateTimeSlots(
        { start: exception.startTime, end: exception.endTime },
        exception.slotDuration || templates[0]?.slotDuration || legacySchedule?.slotDuration || 30
      );
      source = 'exception';
      continue;
    }

    if (exception.type === 'overtime') {
      slots = [
        ...slots,
        ...generateTimeSlots(
          { start: exception.startTime, end: exception.endTime },
          exception.slotDuration || templates[0]?.slotDuration || legacySchedule?.slotDuration || 30
        )
      ];
      source = 'exception';
    }
  }

  return {
    slots: Array.from(new Set(slots)).sort(),
    source,
    hasTemplate: templates.length > 0,
    hasException: exceptions.length > 0
  };
}

async function notifyAffectedAppointments({ doctorId, date, reason }) {
  const appointments = await Appointment.find({
    doctorId,
    date,
    status: { $in: ['pending', 'confirmed', 'in_progress', 'cancel_requested', 'reschedule_requested'] }
  }).populate([
    { path: 'patientId', select: 'name email' },
    { path: 'doctorId', select: 'name' }
  ]);

  if (!appointments.length) return;

  const doctorUser = await User.findOne({ role: 'doctor', doctorId, isActive: { $ne: false } }).select('_id');

  for (const appointment of appointments) {
    const message = `Lịch khám ngày ${date} bị ảnh hưởng do thay đổi lịch làm việc của bác sĩ${reason ? `: ${reason}` : '.'}`;
    const patientNotification = await Notification.create({
      userId: appointment.patientId?._id || appointment.patientId,
      role: 'patient',
      doctorId,
      appointmentId: appointment._id,
      type: 'schedule_exception_affected',
      title: 'Lịch khám bị ảnh hưởng',
      message,
      isRead: false
    });
    emitNotification(patientNotification.toObject());

    const adminNotification = await Notification.create({
      role: 'admin',
      doctorId,
      appointmentId: appointment._id,
      type: 'schedule_exception_affected',
      title: 'Lịch khám bị ảnh hưởng',
      message,
      isRead: false
    });
    emitNotification(adminNotification.toObject());

    if (doctorUser) {
      const doctorNotification = await Notification.create({
        userId: doctorUser._id,
        role: 'doctor',
        doctorId,
        appointmentId: appointment._id,
        type: 'schedule_exception_affected',
        title: 'Lịch khám bị ảnh hưởng',
        message,
        isRead: false
      });
      emitNotification(doctorNotification.toObject());
    }
  }
}

export const getAvailableSlots = asyncHandler(async (req, res) => {
  const doctor = await Doctor.findOne({ _id: req.params.doctorId, isActive: true });
  if (!doctor) {
    throw new ApiError(404, 'Doctor not found');
  }

  const dynamicSchedule = await buildDynamicSlots({ doctor, date: req.query.date });

  if (!dynamicSchedule.slots.length) {
    return res.json({
      success: true,
      message: 'Bác sĩ không làm việc trong ngày này',
      data: []
    });
  }

  const slots = dynamicSchedule.slots;
  const appointments = await Appointment.find({
    doctorId: doctor._id,
    clinicId: doctor.clinicId,
    date: req.query.date,
    status: { $in: ['pending', 'confirmed', 'in_progress', 'cancel_requested', 'reschedule_requested', 'completed'] }
  }).select('timeSlot');

  const bookedSlots = new Set(appointments.map((item) => item.timeSlot));
  const data = slots.map((slot) => {
    const isPastSlot = isPastDate(req.query.date) || isPastOrCurrentSlot(req.query.date, slot);
    const available = !isPastSlot && !bookedSlots.has(slot);
    return {
      timeSlot: slot,
      available,
      label: isPastSlot ? 'Đã qua' : (available ? 'Còn trống' : 'Đã có người đặt')
    };
  });

  res.json({
    success: true,
    message: 'Available slots fetched successfully',
    data
  });
});

export const getSchedules = asyncHandler(async (req, res) => {
  const filter = {};

  if (req.user.role === 'doctor') {
    const doctor = await getLinkedDoctor(req.user);
    filter.doctorId = doctor._id;
    filter.clinicId = doctor.clinicId;
  } else {
    if (req.query.doctorId) filter.doctorId = req.query.doctorId;
    if (req.query.clinicId) filter.clinicId = req.query.clinicId;
  }

  if (req.query.date) filter.date = req.query.date;

  const schedules = await Schedule.find(filter).populate(schedulePopulate).sort({ date: -1 });

  res.json({
    success: true,
    message: 'Schedules fetched successfully',
    data: schedules
  });
});

export const createSchedule = asyncHandler(async (req, res) => {
  const payload = await resolveSchedulePayload(req);

  const schedule = await Schedule.findOneAndUpdate(
    { doctorId: payload.doctorId, clinicId: payload.clinicId, date: payload.date },
    payload,
    { upsert: true, new: true, runValidators: true }
  ).populate(schedulePopulate);

  res.status(201).json({
    success: true,
    message: 'Schedule created successfully',
    data: schedule
  });
});

export const updateSchedule = asyncHandler(async (req, res) => {
  const existingSchedule = await Schedule.findById(req.params.id);
  if (!existingSchedule) {
    throw new ApiError(404, 'Schedule not found');
  }

  const payload = await resolveSchedulePayload(req);

  if (req.user.role === 'doctor' && String(existingSchedule.doctorId) !== String(payload.doctorId)) {
    throw new ApiError(403, 'Bạn không có quyền sửa lịch làm việc của bác sĩ khác');
  }

  const schedule = await Schedule.findByIdAndUpdate(req.params.id, payload, {
    new: true,
    runValidators: true
  }).populate(schedulePopulate);

  if (!schedule) {
    throw new ApiError(404, 'Schedule not found');
  }

  res.json({
    success: true,
    message: 'Schedule updated successfully',
    data: schedule
  });
});

export const deleteSchedule = asyncHandler(async (req, res) => {
  const schedule = await Schedule.findById(req.params.id);

  if (!schedule) {
    throw new ApiError(404, 'Schedule not found');
  }

  if (req.user.role === 'doctor') {
    const doctor = await getLinkedDoctor(req.user);
    if (String(schedule.doctorId) !== String(doctor._id)) {
      throw new ApiError(403, 'Bạn không có quyền xóa lịch làm việc của bác sĩ khác');
    }
  }

  await Schedule.findByIdAndDelete(req.params.id);

  res.json({
    success: true,
    message: 'Schedule deleted successfully',
    data: null
  });
});

export const getDoctorScheduleTemplate = asyncHandler(async (req, res) => {
  const doctor = await resolveDoctorForScheduleAccess(req);
  let templates = await DoctorScheduleTemplate.find({ doctorId: doctor._id }).sort({ dayOfWeek: 1, startTime: 1 });

  if (!templates.length) {
    const legacyTemplates = buildTemplateItemsFromLegacyDoctor(doctor);
    if (legacyTemplates.length) {
      await ensureTemplateIndexes();
      try {
        templates = await DoctorScheduleTemplate.insertMany(legacyTemplates);
      } catch (error) {
        if (error?.code !== 11000) throw error;
        templates = await DoctorScheduleTemplate.find({ doctorId: doctor._id }).sort({ dayOfWeek: 1, startTime: 1 });
      }
      templates = templates.sort((a, b) => Number(a.dayOfWeek) - Number(b.dayOfWeek) || a.startTime.localeCompare(b.startTime));
    }
  }

  res.json({
    success: true,
    message: 'Schedule template fetched successfully',
    data: templates
  });
});

export const updateDoctorScheduleTemplate = asyncHandler(async (req, res) => {
  const doctor = await resolveDoctorForScheduleAccess(req);
  const items = Array.isArray(req.body) ? req.body : [];
  const normalizedItems = normalizeTemplateItems(items);

  await ensureTemplateIndexes();
  await DoctorScheduleTemplate.deleteMany({ doctorId: doctor._id });

  const templates = normalizedItems.length
    ? await DoctorScheduleTemplate.insertMany(normalizedItems.map((item) => ({
      doctorId: doctor._id,
      dayOfWeek: item.dayOfWeek,
      startTime: item.startTime,
      endTime: item.endTime,
      slotDuration: item.slotDuration,
      isWorking: item.isWorking
    })))
    : [];

  await Doctor.findByIdAndUpdate(doctor._id, buildLegacyDoctorScheduleFields(normalizedItems), {
    runValidators: true
  });

  await createAuditLog({
    req,
    action: 'UPDATE_SCHEDULE_TEMPLATE',
    entityType: 'ScheduleTemplate',
    entityId: doctor._id,
    entityName: doctor.name,
    description: `Cập nhật lịch làm việc mặc định của bác sĩ ${doctor.name}`,
    metadata: {
      doctorId: doctor._id,
      shifts: normalizedItems.length
    }
  });

  res.json({
    success: true,
    message: 'Schedule template updated successfully',
    data: templates
  });
});

export const getScheduleExceptions = asyncHandler(async (req, res) => {
  const doctor = await resolveDoctorForScheduleAccess(req);
  const filter = { doctorId: doctor._id };
  if (req.query.date) filter.date = req.query.date;

  const exceptions = await ScheduleException.find(filter)
    .populate({ path: 'doctorId', select: 'name clinicId specialtyId' })
    .populate({ path: 'createdBy', select: 'name email role' })
    .sort({ date: -1, createdAt: -1 });

  res.json({
    success: true,
    message: 'Schedule exceptions fetched successfully',
    data: exceptions
  });
});

export const createScheduleException = asyncHandler(async (req, res) => {
  const doctor = await resolveDoctorForScheduleAccess(req);
  const exception = await ScheduleException.create({
    doctorId: doctor._id,
    date: req.body.date,
    type: req.body.type,
    reason: req.body.reason || '',
    startTime: req.body.startTime || '',
    endTime: req.body.endTime || '',
    slotDuration: req.body.slotDuration ? Number(req.body.slotDuration) : undefined,
    createdBy: req.user._id
  });

  await notifyAffectedAppointments({
    doctorId: doctor._id,
    date: exception.date,
    reason: exception.reason || exception.type
  });

  await createAuditLog({
    req,
    action: 'CREATE_SCHEDULE_EXCEPTION',
    entityType: 'ScheduleException',
    entityId: exception._id,
    entityName: `${doctor.name} - ${exception.date}`,
    description: `Tạo ngoại lệ lịch làm việc cho bác sĩ ${doctor.name} ngày ${exception.date}`,
    metadata: {
      doctorId: doctor._id,
      date: exception.date,
      type: exception.type,
      reason: exception.reason,
      startTime: exception.startTime,
      endTime: exception.endTime
    }
  });

  res.status(201).json({
    success: true,
    message: 'Schedule exception created successfully',
    data: exception
  });
});

export const updateScheduleException = asyncHandler(async (req, res) => {
  const doctor = await resolveDoctorForScheduleAccess(req);
  const exception = await ScheduleException.findOne({ _id: req.params.id, doctorId: doctor._id });
  if (!exception) {
    throw new ApiError(404, 'Schedule exception not found');
  }

  exception.date = req.body.date;
  exception.type = req.body.type;
  exception.reason = req.body.reason || '';
  exception.startTime = req.body.startTime || '';
  exception.endTime = req.body.endTime || '';
  exception.slotDuration = req.body.slotDuration ? Number(req.body.slotDuration) : undefined;
  await exception.save();

  await notifyAffectedAppointments({
    doctorId: doctor._id,
    date: exception.date,
    reason: exception.reason || exception.type
  });

  await createAuditLog({
    req,
    action: 'UPDATE_SCHEDULE_EXCEPTION',
    entityType: 'ScheduleException',
    entityId: exception._id,
    entityName: `${doctor.name} - ${exception.date}`,
    description: `Cập nhật ngoại lệ lịch làm việc cho bác sĩ ${doctor.name} ngày ${exception.date}`,
    metadata: {
      doctorId: doctor._id,
      date: exception.date,
      type: exception.type,
      reason: exception.reason,
      startTime: exception.startTime,
      endTime: exception.endTime
    }
  });

  res.json({
    success: true,
    message: 'Schedule exception updated successfully',
    data: exception
  });
});

export const deleteScheduleException = asyncHandler(async (req, res) => {
  const doctor = await resolveDoctorForScheduleAccess(req);
  const exception = await ScheduleException.findOneAndDelete({ _id: req.params.id, doctorId: doctor._id });
  if (!exception) {
    throw new ApiError(404, 'Schedule exception not found');
  }

  await createAuditLog({
    req,
    action: 'DELETE_SCHEDULE_EXCEPTION',
    entityType: 'ScheduleException',
    entityId: exception._id,
    entityName: `${doctor.name} - ${exception.date}`,
    description: `Xóa ngoại lệ lịch làm việc của bác sĩ ${doctor.name} ngày ${exception.date}`,
    metadata: {
      doctorId: doctor._id,
      date: exception.date,
      type: exception.type,
      reason: exception.reason
    }
  });

  res.json({
    success: true,
    message: 'Schedule exception deleted successfully',
    data: null
  });
});
