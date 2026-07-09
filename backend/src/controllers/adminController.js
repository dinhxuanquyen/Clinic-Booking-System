import crypto from 'node:crypto';
import { body, param } from 'express-validator';
import User from '../models/central/User.js';
import Clinic from '../models/clinicModel.js';
import Doctor from '../models/doctorModel.js';
import Specialty from '../models/specialtyModel.js';
import Service from '../models/central/Service.js';
import AuditLog from '../models/auditLogModel.js';
import { getClinicConnection } from '../config/db.js';
import { getClinicModels } from '../models/clinic/models.js';
import { ApiError } from '../utils/apiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendDoctorTemporaryPassword } from '../services/emailService.js';
import { ensureClinicCode } from '../services/clinicCodeService.js';
import { generateDoctorCode } from '../services/doctorCodeService.js';
import { validatePasswordStrength } from '../utils/passwordPolicy.js';
import { createAuditLog } from '../utils/auditLogger.js';

export const clinicRules = [
  body('name').notEmpty(),
  body('address').notEmpty(),
  body('phone').notEmpty(),
  body('email').optional({ checkFalsy: true }).isEmail()
];
export const specialtyRules = [body('name').notEmpty(), body('clinicId').isMongoId()];
export const serviceRules = [body('name').notEmpty(), body('price').isFloat({ min: 0 })];
export const doctorRules = [
  body('clinicId').isMongoId(),
  body('name').notEmpty(),
  body('specialtyId').isMongoId(),
  body('experienceYears').optional().isInt({ min: 0 })
];
export const scheduleRules = [
  body('clinicId').isMongoId(),
  body('doctorId').isMongoId(),
  body('date').isISO8601({ strict: true }),
  body('timeSlots').isArray({ min: 1 })
];
export const idParamRule = [param('id').isMongoId()];
export const doctorAccountParamRule = [param('doctorId').isMongoId().withMessage('doctorId is invalid')];
export const createDoctorAccountRules = [
  param('doctorId').isMongoId().withMessage('doctorId is invalid')
];
export const linkDoctorAccountRules = [
  param('doctorId').isMongoId().withMessage('doctorId is invalid'),
  body('userId').isMongoId().withMessage('userId is required')
];
export const resetDoctorPasswordRules = [
  param('doctorId').isMongoId().withMessage('doctorId is invalid'),
  body('sendEmail').optional().isBoolean().withMessage('sendEmail must be boolean'),
  body('newPassword').optional().notEmpty().withMessage('Password is required')
];
export const updateDoctorAccountStatusRules = [
  param('doctorId').isMongoId().withMessage('doctorId is invalid'),
  body('isActive').isBoolean().withMessage('isActive must be boolean')
];
export const auditLogIdParamRule = [param('id').isMongoId().withMessage('Audit log id is invalid')];

function generateTemporaryPassword(length = 12, userInfo = {}) {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghijkmnopqrstuvwxyz';
  const digits = '23456789';
  const special = '!@#$%^&*';
  const all = `${upper}${lower}${digits}${special}`;

  for (let attempt = 0; attempt < 20; attempt += 1) {
    const characters = [
      upper[crypto.randomInt(upper.length)],
      lower[crypto.randomInt(lower.length)],
      digits[crypto.randomInt(digits.length)],
      special[crypto.randomInt(special.length)]
    ];

    while (characters.length < length) {
      characters.push(all[crypto.randomInt(all.length)]);
    }

    for (let index = characters.length - 1; index > 0; index -= 1) {
      const swapIndex = crypto.randomInt(index + 1);
      [characters[index], characters[swapIndex]] = [characters[swapIndex], characters[index]];
    }

    const password = characters.join('');
    if (validatePasswordStrength(password, userInfo).valid) return password;
  }

  return `Aa1!${crypto.randomBytes(8).toString('base64url').slice(0, 8)}`;
}

function userResponse(user) {
  return {
    _id: user._id,
    id: user._id,
    name: user.name,
    email: user.email,
    phone: user.phone || '',
    avatar: user.avatar || '',
    role: user.role,
    mustChangePassword: Boolean(user.mustChangePassword),
    isActive: user.isActive !== false,
    clinicId: user.clinicId,
    doctorId: user.doctorId,
    temporaryPasswordCreatedAt: user.temporaryPasswordCreatedAt,
    initialPasswordChangedAt: user.initialPasswordChangedAt,
    lastLoginAt: user.lastLoginAt,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  };
}

export const dashboard = asyncHandler(async (req, res) => {
  const [users, clinics, specialties, services] = await Promise.all([
    User.countDocuments(),
    Clinic.countDocuments(),
    Specialty.countDocuments(),
    Service.countDocuments()
  ]);
  res.json({ data: { users, clinics, specialties, services } });
});

export const listUsers = asyncHandler(async (req, res) => {
  const users = await User.find().select('-password').sort({ createdAt: -1 });
  res.json({ data: users });
});

export const listDoctorUsers = asyncHandler(async (req, res) => {
  const users = await User.find({ role: 'doctor' }).select('-password').sort({ createdAt: -1 });

  res.json({
    success: true,
    message: 'Doctor users fetched successfully',
    data: users.map(userResponse)
  });
});

export const listAuditLogs = asyncHandler(async (req, res) => {
  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 100);
  const filter = {};

  if (req.query.actorRole) filter.actorRole = req.query.actorRole;
  if (req.query.action) filter.action = req.query.action;
  if (req.query.entityType) filter.entityType = req.query.entityType;
  if (req.query.startDate || req.query.endDate) {
    filter.createdAt = {};
    if (req.query.startDate) filter.createdAt.$gte = new Date(req.query.startDate);
    if (req.query.endDate) {
      const endDate = new Date(req.query.endDate);
      endDate.setHours(23, 59, 59, 999);
      filter.createdAt.$lte = endDate;
    }
  }
  if (req.query.keyword) {
    const keyword = new RegExp(String(req.query.keyword).trim(), 'i');
    filter.$or = [
      { actorName: keyword },
      { action: keyword },
      { entityType: keyword },
      { entityName: keyword },
      { description: keyword },
      { ipAddress: keyword }
    ];
  }

  const [logs, total] = await Promise.all([
    AuditLog.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    AuditLog.countDocuments(filter)
  ]);

  res.json({
    success: true,
    data: {
      logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(Math.ceil(total / limit), 1)
      }
    }
  });
});

export const getAuditLogDetail = asyncHandler(async (req, res) => {
  const log = await AuditLog.findById(req.params.id);
  if (!log) throw new ApiError(404, 'Audit log not found');

  res.json({
    success: true,
    data: log
  });
});

export const createDoctorAccount = asyncHandler(async (req, res) => {
  const doctor = await Doctor.findOne({ _id: req.params.doctorId, isActive: true });
  if (!doctor) {
    throw new ApiError(404, 'Doctor not found');
  }

  if (!doctor.personalEmail) {
    throw new ApiError(422, 'Vui lòng cập nhật email cá nhân của bác sĩ trước khi cấp tài khoản');
  }

  if (!doctor.clinicId) {
    throw new ApiError(422, 'Bác sĩ chưa được liên kết với cơ sở');
  }

  if (!doctor.doctorCode) {
    doctor.doctorCode = await generateDoctorCode();
    await Doctor.updateOne({ _id: doctor._id }, { $set: { doctorCode: doctor.doctorCode } });
  }

  const clinic = await Clinic.findOne({ _id: doctor.clinicId, isActive: { $ne: false } }).select('name clinicCode');
  if (!clinic) throw new ApiError(404, 'Clinic not found');
  const clinicCode = await ensureClinicCode(clinic);

  const loginEmail = `${clinicCode}-${doctor.doctorCode}@clinicbooking.vn`;
  const existingEmail = await User.exists({ email: loginEmail.toLowerCase() });
  if (existingEmail) {
    throw new ApiError(409, 'Email đăng nhập bác sĩ đã tồn tại');
  }

  const linkedUser = await User.exists({ role: 'doctor', doctorId: doctor._id });
  if (linkedUser) {
    throw new ApiError(409, 'Bác sĩ này đã có tài khoản đăng nhập');
  }

  const temporaryPassword = generateTemporaryPassword(12, {
    name: doctor.name,
    email: loginEmail,
    phone: doctor.phone
  });
  const user = await User.create({
    name: doctor.name,
    email: loginEmail,
    password: temporaryPassword,
    role: 'doctor',
    isEmailVerified: true,
    mustChangePassword: true,
    temporaryPasswordCreatedAt: new Date(),
    clinicId: doctor.clinicId,
    doctorId: doctor._id
  });
  await Doctor.findByIdAndUpdate(doctor._id, { loginEmail });
  const connection = await getClinicConnection(doctor.clinicId);
  const { Doctor: ClinicDoctor } = getClinicModels(connection);
  await ClinicDoctor.updateOne(
    { _id: doctor._id },
    { $set: { doctorCode: doctor.doctorCode, personalEmail: doctor.personalEmail, loginEmail } }
  );

  let emailSent = false;
  try {
    const emailResult = await sendDoctorTemporaryPassword({
      to: doctor.personalEmail,
      name: doctor.name,
      doctorCode: doctor.doctorCode,
      loginEmail,
      temporaryPassword
    });
    emailSent = !emailResult?.skipped;
  } catch (error) {
    console.error('Send doctor temporary password email failed:', error);
  }

  await createAuditLog({
    req,
    action: 'CREATE_DOCTOR_ACCOUNT',
    entityType: 'Doctor',
    entityId: doctor._id,
    entityName: doctor.name,
    description: `Tạo tài khoản đăng nhập cho bác sĩ ${doctor.name}`,
    metadata: { loginEmail, emailSent }
  });

  res.status(201).json({
    success: true,
    message: 'Tạo tài khoản bác sĩ thành công',
    data: { user: userResponse(user), emailSent },
    warning: emailSent ? null : 'Tạo tài khoản thành công nhưng gửi email thất bại'
  });
});

export const linkDoctorAccount = asyncHandler(async (req, res) => {
  const doctor = await Doctor.findOne({ _id: req.params.doctorId, isActive: true });
  if (!doctor) {
    throw new ApiError(404, 'Doctor not found');
  }

  const user = await User.findById(req.body.userId);
  if (!user || user.role !== 'doctor') {
    throw new ApiError(422, 'Tài khoản được chọn không phải tài khoản bác sĩ');
  }

  if (user.doctorId && String(user.doctorId) !== String(doctor._id)) {
    throw new ApiError(409, 'Tài khoản bác sĩ này đã được liên kết với hồ sơ khác');
  }

  const linkedUser = await User.exists({
    _id: { $ne: user._id },
    role: 'doctor',
    doctorId: doctor._id
  });

  if (linkedUser) {
    throw new ApiError(409, 'Bác sĩ này đã có tài khoản đăng nhập');
  }

  user.doctorId = doctor._id;
  user.clinicId = doctor.clinicId;
  await user.save();
  await Doctor.findByIdAndUpdate(doctor._id, { loginEmail: user.email });

  await createAuditLog({
    req,
    action: 'CREATE_DOCTOR_ACCOUNT',
    entityType: 'Doctor',
    entityId: doctor._id,
    entityName: doctor.name,
    description: `Liên kết tài khoản bác sĩ cho ${doctor.name}`,
    metadata: { userId: user._id, loginEmail: user.email }
  });

  res.json({
    success: true,
    message: 'Liên kết tài khoản bác sĩ thành công',
    data: { user: userResponse(user) }
  });
});

export const getDoctorDetail = asyncHandler(async (req, res) => {
  const doctor = await Doctor.findOne({ _id: req.params.doctorId, isActive: true })
    .populate({ path: 'clinicId', select: 'name clinicCode address phone email' })
    .populate({ path: 'specialtyId', select: 'name description image clinicId' });

  if (!doctor) {
    throw new ApiError(404, 'Doctor not found');
  }

  const account = await User.findOne({ role: 'doctor', doctorId: doctor._id }).select('-password');

  res.json({
    success: true,
    message: 'Doctor detail fetched successfully',
    data: {
      doctor,
      account: account ? userResponse(account) : null
    }
  });
});

export const resetDoctorPassword = asyncHandler(async (req, res) => {
  const doctor = await Doctor.findOne({ _id: req.params.doctorId, isActive: true });
  if (!doctor) {
    throw new ApiError(404, 'Doctor not found');
  }

  const user = await User.findOne({ role: 'doctor', doctorId: doctor._id }).select('+password');
  if (!user) {
    throw new ApiError(404, 'Bác sĩ chưa có tài khoản đăng nhập');
  }

  const sendEmail = req.body.sendEmail === true;
  let emailSent = false;

  if (!sendEmail && !req.body.newPassword) {
    throw new ApiError(422, 'Vui lòng nhập mật khẩu mới hoặc chọn gửi mật khẩu tạm qua email');
  }

  if (sendEmail) {
    if (!doctor.personalEmail) {
      throw new ApiError(422, 'Vui lòng cập nhật email cá nhân của bác sĩ trước khi cấp lại mật khẩu');
    }

    const temporaryPassword = generateTemporaryPassword(12, {
      name: doctor.name || user.name,
      email: user.email,
      phone: user.phone || doctor.phone
    });
    user.password = temporaryPassword;
    user.mustChangePassword = true;
    user.temporaryPasswordCreatedAt = new Date();
    await user.save();

    try {
      const emailResult = await sendDoctorTemporaryPassword({
        to: doctor.personalEmail,
        name: doctor.name || user.name,
        doctorCode: doctor.doctorCode || '',
        loginEmail: user.email,
        temporaryPassword
      });
      emailSent = !emailResult?.skipped;
    } catch (error) {
      console.error('Send reset doctor temporary password email failed:', error);
    }
  } else {
    const passwordPolicy = validatePasswordStrength(req.body.newPassword, {
      name: user.name || doctor.name,
      email: user.email,
      phone: user.phone
    });
    if (!passwordPolicy.valid) {
      throw new ApiError(422, passwordPolicy.message);
    }

    user.password = req.body.newPassword;
    user.mustChangePassword = false;
    user.temporaryPasswordCreatedAt = null;
    user.passwordChangedAt = new Date();
    await user.save();
  }

  await createAuditLog({
    req,
    action: 'RESET_DOCTOR_PASSWORD',
    entityType: 'Doctor',
    entityId: doctor._id,
    entityName: doctor.name,
    description: `Cấp lại mật khẩu cho bác sĩ ${doctor.name}`,
    metadata: { sendEmail, emailSent, mustChangePassword: user.mustChangePassword }
  });

  res.json({
    success: true,
    message: 'Cấp lại mật khẩu bác sĩ thành công',
    data: { user: userResponse(user), emailSent, mustChangePassword: user.mustChangePassword },
    warning: sendEmail && !emailSent ? 'Cấp lại mật khẩu thành công nhưng gửi email thất bại' : null
  });
});

export const updateDoctorAccountStatus = asyncHandler(async (req, res) => {
  const doctor = await Doctor.findOne({ _id: req.params.doctorId, isActive: true });
  if (!doctor) {
    throw new ApiError(404, 'Doctor not found');
  }

  const user = await User.findOne({ role: 'doctor', doctorId: doctor._id });
  if (!user) {
    throw new ApiError(404, 'Bác sĩ chưa có tài khoản đăng nhập');
  }

  user.isActive = req.body.isActive;
  await user.save();

  await createAuditLog({
    req,
    action: user.isActive ? 'UNLOCK_DOCTOR_ACCOUNT' : 'LOCK_DOCTOR_ACCOUNT',
    entityType: 'Doctor',
    entityId: doctor._id,
    entityName: doctor.name,
    description: `${user.isActive ? 'Mở khóa' : 'Khóa'} tài khoản bác sĩ ${doctor.name}`,
    metadata: { userId: user._id, loginEmail: user.email }
  });

  res.json({
    success: true,
    message: user.isActive ? 'Mở khóa tài khoản bác sĩ thành công' : 'Khóa tài khoản bác sĩ thành công',
    data: { user: userResponse(user) }
  });
});

export const createClinic = asyncHandler(async (req, res) => {
  const clinic = await Clinic.create(req.body);
  await createAuditLog({
    req,
    action: 'CREATE_CLINIC',
    entityType: 'Clinic',
    entityId: clinic._id,
    entityName: clinic.name,
    description: `Tạo cơ sở ${clinic.name}`,
    metadata: { clinicCode: clinic.clinicCode }
  });
  res.status(201).json({ data: clinic });
});

export const updateClinic = asyncHandler(async (req, res) => {
  const clinic = await Clinic.findByIdAndUpdate(req.params.id, req.body, { new: true });
  await createAuditLog({
    req,
    action: 'UPDATE_CLINIC',
    entityType: 'Clinic',
    entityId: clinic?._id || req.params.id,
    entityName: clinic?.name || '',
    description: `Cập nhật cơ sở ${clinic?.name || req.params.id}`,
    metadata: req.body
  });
  res.json({ data: clinic });
});

export const createSpecialty = asyncHandler(async (req, res) => {
  const specialty = await Specialty.create(req.body);
  await createAuditLog({
    req,
    action: 'CREATE_SPECIALTY',
    entityType: 'Specialty',
    entityId: specialty._id,
    entityName: specialty.name,
    description: `Tạo chuyên khoa ${specialty.name}`,
    metadata: { clinicId: specialty.clinicId }
  });
  res.status(201).json({ data: specialty });
});

export const updateSpecialty = asyncHandler(async (req, res) => {
  const specialty = await Specialty.findByIdAndUpdate(req.params.id, req.body, { new: true });
  await createAuditLog({
    req,
    action: 'UPDATE_SPECIALTY',
    entityType: 'Specialty',
    entityId: specialty?._id || req.params.id,
    entityName: specialty?.name || '',
    description: `Cập nhật chuyên khoa ${specialty?.name || req.params.id}`,
    metadata: req.body
  });
  res.json({ data: specialty });
});

export const createService = asyncHandler(async (req, res) => {
  res.status(201).json({ data: await Service.create(req.body) });
});

export const updateService = asyncHandler(async (req, res) => {
  res.json({ data: await Service.findByIdAndUpdate(req.params.id, req.body, { new: true }) });
});

export const createDoctor = asyncHandler(async (req, res) => {
  const connection = await getClinicConnection(req.body.clinicId);
  const { Doctor } = getClinicModels(connection);
  const doctor = await Doctor.create(req.body);
  await createAuditLog({
    req,
    action: 'CREATE_DOCTOR',
    entityType: 'Doctor',
    entityId: doctor._id,
    entityName: doctor.name,
    description: `Tạo bác sĩ ${doctor.name}`,
    metadata: { clinicId: req.body.clinicId, specialtyId: req.body.specialtyId }
  });
  res.status(201).json({ data: doctor });
});

export const updateDoctor = asyncHandler(async (req, res) => {
  const connection = await getClinicConnection(req.body.clinicId);
  const { Doctor } = getClinicModels(connection);
  const doctor = await Doctor.findByIdAndUpdate(req.params.id, req.body, { new: true });
  await createAuditLog({
    req,
    action: 'UPDATE_DOCTOR',
    entityType: 'Doctor',
    entityId: doctor?._id || req.params.id,
    entityName: doctor?.name || '',
    description: `Cập nhật bác sĩ ${doctor?.name || req.params.id}`,
    metadata: { clinicId: req.body.clinicId, specialtyId: req.body.specialtyId }
  });
  res.json({ data: doctor });
});

export const upsertSchedule = asyncHandler(async (req, res) => {
  const connection = await getClinicConnection(req.body.clinicId);
  const { Schedule } = getClinicModels(connection);
  const schedule = await Schedule.findOneAndUpdate(
    { clinicId: req.body.clinicId, doctorId: req.body.doctorId, date: req.body.date },
    { $set: req.body },
    { upsert: true, new: true }
  );
  res.status(201).json({ data: schedule });
});
