import { body, param } from 'express-validator';
import Doctor from '../models/doctorModel.js';
import DoctorScheduleTemplate from '../models/doctorScheduleTemplateModel.js';
import User from '../models/central/User.js';
import Clinic from '../models/clinicModel.js';
import Specialty from '../models/specialtyModel.js';
import Appointment from '../models/appointmentModel.js';
import { getClinicConnection } from '../config/db.js';
import { getClinicModels } from '../models/clinic/models.js';
import { ApiError } from '../utils/apiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { generateDoctorCode } from '../services/doctorCodeService.js';
import { getVietnamToday } from '../utils/vietnamTime.js';
import { createAuditLog } from '../utils/auditLogger.js';

const populateDoctor = [
  { path: 'clinicId', select: 'name clinicCode address phone email' },
  { path: 'specialtyId', select: 'name description image clinicId' }
];
const activeDoctorFilter = { isActive: { $ne: false } };
const dayKeyToNumber = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6
};

export const doctorIdRule = [param('id').isMongoId().withMessage('Doctor id is invalid')];
export const clinicIdParamRule = [param('clinicId').isMongoId().withMessage('Clinic id is invalid')];
export const specialtyIdParamRule = [param('specialtyId').isMongoId().withMessage('Specialty id is invalid')];
export const updateMyDoctorProfileRules = [
  body('name').optional().trim().notEmpty().withMessage('Doctor name is required'),
  body('personalEmail').optional().isEmail().withMessage('Doctor personal email must be valid').normalizeEmail(),
  body('phone').optional().trim(),
  body('dateOfBirth').optional({ checkFalsy: true }).isISO8601({ strict: true }).withMessage('dateOfBirth must be valid'),
  body('gender').optional().isIn(['', 'male', 'female', 'other']).withMessage('Gender is invalid'),
  body('address').optional().trim(),
  body('avatar').optional().trim(),
  body('description').optional().trim()
];

export const doctorRules = [
  body('name').trim().notEmpty().withMessage('Doctor name is required'),
  body('email').optional({ checkFalsy: true }).isEmail().withMessage('Doctor email must be valid').normalizeEmail(),
  body('personalEmail').isEmail().withMessage('Doctor personal email must be valid').normalizeEmail(),
  body('loginEmail').optional({ checkFalsy: true }).isEmail().withMessage('Doctor login email must be valid').normalizeEmail(),
  body('doctorCode').optional({ checkFalsy: true }).matches(/^DR\d{4,}$/).withMessage('doctorCode must use format DR0001'),
  body('phone').trim().notEmpty().withMessage('Doctor phone is required'),
  body('avatar').optional().trim(),
  body('degree').optional().trim(),
  body('position').optional().trim(),
  body('workplace').optional().trim(),
  body('bio').optional().trim(),
  body('experienceYears').optional().isInt({ min: 0 }).withMessage('experienceYears must be >= 0'),
  body('description').optional().trim(),
  body('clinicId').isMongoId().withMessage('clinicId is required'),
  body('specialtyId').isMongoId().withMessage('specialtyId is required'),
  body('workingDays').optional().isArray().withMessage('workingDays must be an array'),
  body('workingHours').isObject().withMessage('workingHours is required'),
  body('workingHours.start').trim().notEmpty().withMessage('workingHours.start is required'),
  body('workingHours.end').trim().notEmpty().withMessage('workingHours.end is required')
];

async function validateDoctorRelations({ clinicId, specialtyId }) {
  const clinic = await Clinic.exists({ _id: clinicId, isActive: true });
  if (!clinic) {
    throw new ApiError(404, 'Clinic not found');
  }

  const specialty = await Specialty.exists({ _id: specialtyId, clinicId, isActive: true });
  if (!specialty) {
    throw new ApiError(404, 'Specialty not found for this clinic');
  }
}

function toClinicDoctorPayload(doctor) {
  return {
    _id: doctor._id,
    clinicId: doctor.clinicId,
    name: doctor.name,
    email: doctor.email,
    personalEmail: doctor.personalEmail || doctor.email,
    loginEmail: doctor.loginEmail || undefined,
    doctorCode: doctor.doctorCode,
    phone: doctor.phone,
    dateOfBirth: doctor.dateOfBirth,
    gender: doctor.gender,
    address: doctor.address,
    avatarUrl: doctor.avatar,
    degree: doctor.degree,
    position: doctor.position,
    workplace: doctor.workplace,
    bio: doctor.bio,
    specialtyId: doctor.specialtyId,
    experienceYears: doctor.experienceYears,
    description: doctor.description,
    workingDays: doctor.workingDays,
    workingHours: doctor.workingHours,
    isActive: doctor.isActive
  };
}

function toMinutes(time) {
  const [hours, minutes] = String(time || '').split(':').map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return NaN;
  return hours * 60 + minutes;
}

function buildScheduleTemplateFromDoctorPayload(doctor, payload) {
  const workingDays = Array.isArray(payload.workingDays)
    ? payload.workingDays.map((item) => String(item || '').trim().toLowerCase())
    : [];
  const startTime = String(payload.workingHours?.start || '').trim();
  const endTime = String(payload.workingHours?.end || '').trim();
  const start = toMinutes(startTime);
  const end = toMinutes(endTime);

  if (!workingDays.length) return [];

  if (!startTime || !endTime || !Number.isFinite(start) || !Number.isFinite(end) || start >= end) {
    throw new ApiError(400, 'Giờ làm việc mặc định không hợp lệ');
  }

  return workingDays
    .map((day) => dayKeyToNumber[day])
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

async function replaceDoctorScheduleTemplateFromPayload(doctor, payload) {
  const hasSchedulePayload = Object.hasOwn(payload, 'workingDays') || Object.hasOwn(payload, 'workingHours');
  if (!hasSchedulePayload) return;

  const templates = buildScheduleTemplateFromDoctorPayload(doctor, payload);
  await DoctorScheduleTemplate.deleteMany({ doctorId: doctor._id });
  if (templates.length) {
    await DoctorScheduleTemplate.insertMany(templates);
  }
}

async function syncClinicDoctor(doctor) {
  const connection = await getClinicConnection(doctor.clinicId);
  const { Doctor: ClinicDoctor } = getClinicModels(connection);

  await ClinicDoctor.findByIdAndUpdate(doctor._id, toClinicDoctorPayload(doctor), {
    upsert: true,
    new: true,
    runValidators: true
  });
}

function doctorAccountStatus(user) {
  if (!user) return 'Chưa liên kết';
  if (user.isActive === false) return 'Đã khóa';
  if (user.mustChangePassword) return 'Chưa đổi mật khẩu';
  return 'Đang hoạt động';
}

function addDays(dateString, amount) {
  const date = new Date(`${dateString}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

function weekRange(today) {
  const date = new Date(`${today}T00:00:00.000Z`);
  const day = date.getUTCDay() || 7;
  const start = addDays(today, 1 - day);
  const end = addDays(start, 6);
  return { start, end };
}

async function buildDoctorProfilePayload(user, doctor) {
  const populatedDoctor = await Doctor.findById(doctor._id)
    .populate({ path: 'clinicId', select: 'name clinicCode address phone email' })
    .populate({ path: 'specialtyId', select: 'name description image clinicId' });

  const today = getVietnamToday();
  const { start, end } = weekRange(today);
  const [totalAppointments, todayAppointments, weekAppointments, servedPatients] = await Promise.all([
    Appointment.countDocuments({ doctorId: doctor._id }),
    Appointment.countDocuments({ doctorId: doctor._id, date: today }),
    Appointment.countDocuments({ doctorId: doctor._id, date: { $gte: start, $lte: end } }),
    Appointment.distinct('patientId', { doctorId: doctor._id, status: 'completed' })
  ]);

  return {
    doctorCode: populatedDoctor.doctorCode || '',
    fullName: populatedDoctor.name || user.name,
    avatar: populatedDoctor.avatar || user.avatar || '',
    personalEmail: populatedDoctor.personalEmail || populatedDoctor.email || '',
    loginEmail: populatedDoctor.loginEmail || user.email,
    phone: populatedDoctor.phone || user.phone || '',
    dateOfBirth: populatedDoctor.dateOfBirth || user.dateOfBirth || '',
    gender: populatedDoctor.gender || user.gender || '',
    address: populatedDoctor.address || user.address || '',
    clinic: populatedDoctor.clinicId?.name || '',
    clinicCode: populatedDoctor.clinicId?.clinicCode || '',
    specialty: populatedDoctor.specialtyId?.name || '',
    degree: populatedDoctor.degree || '',
    experienceYears: populatedDoctor.experienceYears || 0,
    description: populatedDoctor.description || populatedDoctor.bio || '',
    lastLoginAt: user.lastLoginAt || null,
    passwordChangedAt: user.passwordChangedAt || user.initialPasswordChangedAt || null,
    accountStatus: doctorAccountStatus(user),
    stats: {
      totalAppointments,
      todayAppointments,
      weekAppointments,
      servedPatients: servedPatients.length,
      averageRating: populatedDoctor.ratingAverage || 0,
      ratingCount: populatedDoctor.ratingCount || 0
    }
  };
}

async function getLinkedDoctorForUser(user) {
  if (!user.doctorId) {
    throw new ApiError(400, 'Tài khoản bác sĩ chưa được liên kết hồ sơ bác sĩ');
  }

  const doctor = await Doctor.findOne({ _id: user.doctorId, isActive: { $ne: false } });
  if (!doctor) {
    throw new ApiError(404, 'Không tìm thấy hồ sơ bác sĩ');
  }

  return doctor;
}

export const getMyDoctorProfile = asyncHandler(async (req, res) => {
  const doctor = await getLinkedDoctorForUser(req.user);
  const data = await buildDoctorProfilePayload(req.user, doctor);

  res.json({
    success: true,
    message: 'Doctor profile fetched successfully',
    data
  });
});

export const updateMyDoctorProfile = asyncHandler(async (req, res) => {
  const doctor = await getLinkedDoctorForUser(req.user);
  const allowedFields = ['name', 'personalEmail', 'phone', 'dateOfBirth', 'gender', 'address', 'avatar', 'description'];
  const updates = {};

  for (const field of allowedFields) {
    if (Object.hasOwn(req.body, field)) updates[field] = req.body[field];
  }

  if (updates.personalEmail) {
    const existingDoctor = await Doctor.exists({
      _id: { $ne: doctor._id },
      isActive: { $ne: false },
      $or: [{ personalEmail: updates.personalEmail }, { email: updates.personalEmail }]
    });
    if (existingDoctor) {
      throw new ApiError(409, 'Email nhận OTP đã được sử dụng bởi bác sĩ khác');
    }
    updates.email = updates.personalEmail;
  }

  const updatedDoctor = await Doctor.findByIdAndUpdate(doctor._id, updates, {
    new: true,
    runValidators: true
  });
  await syncClinicDoctor(updatedDoctor);

  const userUpdates = {};
  for (const field of ['name', 'phone', 'dateOfBirth', 'gender', 'address', 'avatar']) {
    if (Object.hasOwn(updates, field)) userUpdates[field] = updates[field];
  }
  if (Object.keys(userUpdates).length) {
    await User.findByIdAndUpdate(req.user._id, userUpdates, { runValidators: true });
  }

  const refreshedUser = await User.findById(req.user._id);
  const data = await buildDoctorProfilePayload(refreshedUser, updatedDoctor);

  res.json({
    success: true,
    message: 'Cập nhật hồ sơ bác sĩ thành công',
    data
  });
});

export const getDoctors = asyncHandler(async (req, res) => {
  const filter = { ...activeDoctorFilter };
  if (req.query.clinicId) filter.clinicId = req.query.clinicId;
  if (req.query.specialtyId) filter.specialtyId = req.query.specialtyId;

  const doctors = await Doctor.find(filter).populate(populateDoctor).sort({ createdAt: -1 });

  res.json({
    success: true,
    message: 'Doctors fetched successfully',
    data: doctors
  });
});

export const getDoctorById = asyncHandler(async (req, res) => {
  const doctor = await Doctor.findOne({ _id: req.params.id, ...activeDoctorFilter }).populate(populateDoctor);
  if (!doctor) {
    throw new ApiError(404, 'Doctor not found');
  }

  res.json({
    success: true,
    message: 'Doctor fetched successfully',
    data: doctor
  });
});

export const getDoctorsByClinic = asyncHandler(async (req, res) => {
  const doctors = await Doctor.find({ clinicId: req.params.clinicId, ...activeDoctorFilter }).populate(populateDoctor).sort({
    name: 1
  });

  res.json({
    success: true,
    message: 'Clinic doctors fetched successfully',
    data: doctors
  });
});

export const getDoctorsBySpecialty = asyncHandler(async (req, res) => {
  const doctors = await Doctor.find({ specialtyId: req.params.specialtyId, ...activeDoctorFilter }).populate(populateDoctor).sort({
    name: 1
  });

  res.json({
    success: true,
    message: 'Specialty doctors fetched successfully',
    data: doctors
  });
});

export const createDoctor = asyncHandler(async (req, res) => {
  await validateDoctorRelations(req.body);

  const personalEmail = (req.body.personalEmail || req.body.email || '').toLowerCase();
  const existingEmail = await Doctor.exists({
    ...activeDoctorFilter,
    $or: [{ personalEmail }, { email: personalEmail }]
  });
  if (existingEmail) {
    throw new ApiError(409, 'Email cá nhân đã được sử dụng bởi bác sĩ đang hoạt động');
  }

  const payload = {
    ...req.body,
    email: req.body.email || personalEmail,
    personalEmail,
    doctorCode: req.body.doctorCode || (await generateDoctorCode())
  };

  const existingDoctorCode = await Doctor.exists({ doctorCode: payload.doctorCode });
  if (existingDoctorCode) {
    throw new ApiError(409, 'Doctor code already exists');
  }

  const doctor = await Doctor.create(payload);
  await replaceDoctorScheduleTemplateFromPayload(doctor, payload);
  await syncClinicDoctor(doctor);

  const populatedDoctor = await Doctor.findById(doctor._id).populate(populateDoctor);
  await createAuditLog({
    req,
    action: 'CREATE_DOCTOR',
    entityType: 'Doctor',
    entityId: doctor._id,
    entityName: doctor.name,
    description: `Tạo bác sĩ ${doctor.name}`,
    metadata: {
      doctorCode: doctor.doctorCode,
      clinicId: doctor.clinicId,
      specialtyId: doctor.specialtyId
    }
  });

  res.status(201).json({
    success: true,
    message: 'Doctor created successfully',
    data: populatedDoctor
  });
});

export const updateDoctor = asyncHandler(async (req, res) => {
  await validateDoctorRelations(req.body);

  const currentDoctor = await Doctor.findById(req.params.id);
  if (!currentDoctor) {
    throw new ApiError(404, 'Doctor not found');
  }

  const personalEmail = (req.body.personalEmail || req.body.email || currentDoctor.personalEmail || currentDoctor.email || '').toLowerCase();
  const existingEmail = await Doctor.exists({
    _id: { $ne: req.params.id },
    ...activeDoctorFilter,
    $or: [{ personalEmail }, { email: personalEmail }]
  });
  if (existingEmail) {
    throw new ApiError(409, 'Email cá nhân đã được sử dụng bởi bác sĩ đang hoạt động');
  }

  const payload = {
    ...req.body,
    email: req.body.email || personalEmail,
    personalEmail,
    doctorCode: req.body.doctorCode || currentDoctor.doctorCode || (await generateDoctorCode())
  };

  const existingDoctorCode = await Doctor.exists({ doctorCode: payload.doctorCode, _id: { $ne: req.params.id } });
  if (existingDoctorCode) {
    throw new ApiError(409, 'Doctor code already exists');
  }

  const doctor = await Doctor.findByIdAndUpdate(req.params.id, payload, {
    new: true,
    runValidators: true
  });

  if (!doctor) {
    throw new ApiError(404, 'Doctor not found');
  }

  await syncClinicDoctor(doctor);
  await replaceDoctorScheduleTemplateFromPayload(doctor, payload);

  const populatedDoctor = await Doctor.findById(doctor._id).populate(populateDoctor);
  await createAuditLog({
    req,
    action: 'UPDATE_DOCTOR',
    entityType: 'Doctor',
    entityId: doctor._id,
    entityName: doctor.name,
    description: `Cập nhật bác sĩ ${doctor.name}`,
    metadata: {
      doctorCode: doctor.doctorCode,
      clinicId: doctor.clinicId,
      specialtyId: doctor.specialtyId
    }
  });

  res.json({
    success: true,
    message: 'Doctor updated successfully',
    data: populatedDoctor
  });
});

export const deleteDoctor = asyncHandler(async (req, res) => {
  const doctor = await Doctor.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
  if (!doctor) {
    throw new ApiError(404, 'Doctor not found');
  }

  const connection = await getClinicConnection(doctor.clinicId);
  const { Doctor: ClinicDoctor } = getClinicModels(connection);
  await ClinicDoctor.findByIdAndUpdate(doctor._id, { isActive: false });
  await User.updateMany({ doctorId: doctor._id }, { $unset: { doctorId: '' } });

  await createAuditLog({
    req,
    action: 'DELETE_DOCTOR',
    entityType: 'Doctor',
    entityId: doctor._id,
    entityName: doctor.name,
    description: `Xóa bác sĩ ${doctor.name}`,
    metadata: { doctorCode: doctor.doctorCode, clinicId: doctor.clinicId }
  });

  res.json({
    success: true,
    message: 'Doctor deleted successfully',
    data: { id: doctor._id }
  });
});
