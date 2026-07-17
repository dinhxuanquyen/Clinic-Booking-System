import jwt from 'jsonwebtoken';
import { body } from 'express-validator';
import { env } from '../config/env.js';
import User from '../models/central/User.js';
import Doctor from '../models/doctorModel.js';
import { sendEmailVerificationOtp, sendResetPasswordOtp } from '../services/emailService.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/apiError.js';
import { validatePasswordStrength } from '../utils/passwordPolicy.js';
import { createAuditLog } from '../utils/auditLogger.js';

function signToken(user) {
  return jwt.sign({ id: user._id, role: user.role }, env.jwtSecret, { expiresIn: env.jwtExpiresIn });
}

function userResponse(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    avatar: user.avatar || '',
    address: user.address || '',
    dateOfBirth: user.dateOfBirth || '',
    gender: user.gender || '',
    role: user.role,
    isEmailVerified: Boolean(user.isEmailVerified),
    mustChangePassword: Boolean(user.mustChangePassword),
    isActive: user.isActive !== false,
    lastLoginAt: user.lastLoginAt,
    clinicId: user.clinicId,
    doctorId: user.doctorId,
    createdAt: user.createdAt
  };
}

export const registerRules = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Email must be valid').normalizeEmail(),
  body('phone').trim().notEmpty().withMessage('Phone is required'),
  body('password').notEmpty().withMessage('Password is required'),
  body('role').optional().isIn(['patient']).withMessage('Role is invalid')
];

export const loginRules = [
  body('email').isEmail().withMessage('Email must be valid').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required')
];

export const forgotPasswordRules = [
  body('email').isEmail().withMessage('Email must be valid').normalizeEmail()
];

export const resetPasswordRules = [
  body('email').isEmail().withMessage('Email must be valid').normalizeEmail(),
  body('otp').matches(/^\d{6}$/).withMessage('OTP must be 6 digits'),
  body('newPassword').notEmpty().withMessage('Password is required')
];

export const verifyEmailRules = [
  body('email').isEmail().withMessage('Email must be valid').normalizeEmail(),
  body('otp').matches(/^\d{6}$/).withMessage('OTP must be 6 digits')
];

export const resendVerificationOtpRules = [
  body('email').isEmail().withMessage('Email must be valid').normalizeEmail()
];

export const changeInitialPasswordRules = [
  body('newPassword').notEmpty().withMessage('Password is required'),
  body('confirmPassword').notEmpty().withMessage('Password confirmation is required')
];

export const changePasswordRules = [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').notEmpty().withMessage('New password is required'),
  body('confirmPassword').notEmpty().withMessage('Password confirmation is required')
];

function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

const OTP_COOLDOWN_SECONDS = 60;
const OTP_EXPIRES_IN_SECONDS = 10 * 60;

function getOtpRetryAfter(user) {
  if (!user?.lastOtpSentAt) return 0;

  const elapsedSeconds = Math.floor((Date.now() - user.lastOtpSentAt.getTime()) / 1000);
  return Math.max(OTP_COOLDOWN_SECONDS - elapsedSeconds, 0);
}

function sendOtpCooldownResponse(res, retryAfter) {
  return res.status(429).json({
    success: false,
    message: 'Vui lòng chờ trước khi gửi lại mã OTP',
    data: null,
    retryAfter
  });
}

function otpSuccessPayload(message) {
  return {
    success: true,
    message,
    data: null,
    cooldownSeconds: OTP_COOLDOWN_SECONDS,
    expiresInSeconds: OTP_EXPIRES_IN_SECONDS
  };
}

async function findPasswordResetUserByEmail(email, select = '') {
  const user = await User.findOne({ email }).select(select);
  if (user) return { user, doctor: null };

  const doctor = await Doctor.findOne({ personalEmail: email, isActive: { $ne: false } }).select('personalEmail');
  if (!doctor) return { user: null, doctor: null };

  const linkedUser = await User.findOne({ role: 'doctor', doctorId: doctor._id }).select(select);
  return { user: linkedUser, doctor };
}

async function resolvePasswordResetRecipient(user, existingDoctor = null) {
  if (user?.role !== 'doctor' || !user.doctorId) return user?.email;

  const doctor = existingDoctor || await Doctor.findById(user.doctorId).select('personalEmail');
  if (!doctor?.personalEmail) {
    console.warn(`Doctor account ${user._id} has no personal email for password reset`);
    return '';
  }

  return doctor.personalEmail;
}

export const register = asyncHandler(async (req, res) => {
  const passwordPolicy = validatePasswordStrength(req.body.password, {
    name: req.body.name,
    email: req.body.email,
    phone: req.body.phone
  });
  if (!passwordPolicy.valid) {
    throw new ApiError(422, passwordPolicy.message);
  }

  const existingEmail = await User.exists({ email: req.body.email });
  if (existingEmail) {
    throw new ApiError(409, 'Email này đã được sử dụng');
  }

  const existingPhone = await User.exists({ phone: req.body.phone });
  if (existingPhone) {
    throw new ApiError(409, 'Số điện thoại này đã được sử dụng');
  }

  const otp = generateOtp();
  const user = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    phone: req.body.phone,
    role: 'patient',
    isEmailVerified: false,
    emailVerificationOtp: otp,
    emailVerificationExpires: new Date(Date.now() + OTP_EXPIRES_IN_SECONDS * 1000),
    lastOtpSentAt: new Date()
  });

  try {
    await sendEmailVerificationOtp({ to: user.email, otp });
  } catch (error) {
    console.error('Send email verification OTP failed:', error);
  }

  res.status(201).json({
    success: true,
    message: 'Đăng ký thành công. Vui lòng kiểm tra email để xác nhận tài khoản.',
    data: {
      email: user.email,
      needsVerification: true
    },
    cooldownSeconds: OTP_COOLDOWN_SECONDS,
    expiresInSeconds: OTP_EXPIRES_IN_SECONDS
  });
});

export const login = asyncHandler(async (req, res) => {
  const user = await User.findOne({ email: req.body.email }).select('+password');
  if (!user || !(await user.comparePassword(req.body.password))) {
    await createAuditLog({
      req,
      action: 'LOGIN_FAILED',
      entityType: 'User',
      entityName: req.body.email,
      description: `Đăng nhập thất bại với email ${req.body.email}`,
      metadata: { email: req.body.email }
    });
    throw new ApiError(401, 'Invalid email or password');
  }

  if (user.isActive === false) {
    await createAuditLog({
      req,
      action: 'LOGIN_FAILED',
      entityType: 'User',
      entityId: user._id,
      entityName: user.email,
      description: `Đăng nhập thất bại vì tài khoản bị khóa: ${user.email}`,
      metadata: { email: user.email, role: user.role, reason: 'inactive' }
    });
    throw new ApiError(403, 'Tài khoản đã bị khóa. Vui lòng liên hệ quản trị viên.');
  }

  if (user.role === 'patient' && user.isEmailVerified === false) {
    await createAuditLog({
      req,
      action: 'LOGIN_FAILED',
      entityType: 'User',
      entityId: user._id,
      entityName: user.email,
      description: `Đăng nhập thất bại vì tài khoản chưa xác nhận email: ${user.email}`,
      metadata: { email: user.email, role: user.role, reason: 'email_not_verified' }
    });
    throw new ApiError(403, 'Tài khoản chưa xác nhận email. Vui lòng kiểm tra email để xác nhận.');
  }

  user.lastLoginAt = new Date();
  await user.save();

  req.user = user;
  await createAuditLog({
    req,
    action: 'LOGIN_SUCCESS',
    entityType: 'User',
    entityId: user._id,
    entityName: user.email,
    description: `${user.name || user.email} đăng nhập thành công`,
    metadata: { email: user.email, role: user.role }
  });

  res.json({
    success: true,
    message: 'Đăng nhập thành công',
    data: {
      token: signToken(user),
      user: userResponse(user)
    }
  });
});

export const verifyEmail = asyncHandler(async (req, res) => {
  const user = await User.findOne({ email: req.body.email }).select(
    '+emailVerificationOtp +emailVerificationExpires +lastOtpSentAt'
  );

  if (!user || !user.emailVerificationOtp || user.emailVerificationOtp !== req.body.otp) {
    throw new ApiError(400, 'Mã OTP không hợp lệ');
  }

  if (!user.emailVerificationExpires || user.emailVerificationExpires.getTime() < Date.now()) {
    throw new ApiError(400, 'Mã OTP đã hết hạn');
  }

  user.isEmailVerified = true;
  user.emailVerificationOtp = undefined;
  user.emailVerificationExpires = undefined;
  await user.save();

  res.json({
    success: true,
    message: 'Xác nhận email thành công. Bạn có thể đăng nhập.',
    data: null
  });
});

export const resendVerificationOtp = asyncHandler(async (req, res) => {
  const genericMessage = 'Nếu email tồn tại, hệ thống đã gửi mã xác nhận email';
  const user = await User.findOne({ email: req.body.email }).select(
    '+emailVerificationOtp +emailVerificationExpires +lastOtpSentAt'
  );

  if (!user) {
    return res.json({
      success: true,
      message: genericMessage,
      data: null
    });
  }

  if (user.isEmailVerified) {
    return res.json({
      success: true,
      message: 'Tài khoản đã được xác nhận email',
      data: null
    });
  }

  const retryAfter = getOtpRetryAfter(user);
  if (retryAfter > 0) {
    return sendOtpCooldownResponse(res, retryAfter);
  }

  const otp = generateOtp();
  user.emailVerificationOtp = otp;
  user.emailVerificationExpires = new Date(Date.now() + OTP_EXPIRES_IN_SECONDS * 1000);
  user.lastOtpSentAt = new Date();
  await user.save();

  try {
    await sendEmailVerificationOtp({ to: user.email, otp });
  } catch (error) {
    console.error('Resend email verification OTP failed:', error);
  }

  res.json(otpSuccessPayload('Mã OTP đã được gửi'));
});

export const forgotPassword = asyncHandler(async (req, res) => {
  const genericMessage = 'Nếu email tồn tại, hệ thống đã gửi mã đặt lại mật khẩu';
  const { user, doctor } = await findPasswordResetUserByEmail(req.body.email, '+lastOtpSentAt');

  if (user) {
    const recipientEmail = await resolvePasswordResetRecipient(user, doctor);
    if (!recipientEmail) {
      return res.json({ success: true, message: genericMessage, data: null });
    }

    const retryAfter = getOtpRetryAfter(user);
    if (retryAfter > 0) {
      return sendOtpCooldownResponse(res, retryAfter);
    }

    const otp = generateOtp();
    user.resetPasswordOtp = otp;
    user.resetPasswordExpires = new Date(Date.now() + OTP_EXPIRES_IN_SECONDS * 1000);
    user.lastOtpSentAt = new Date();
    await user.save();

    try {
      await sendResetPasswordOtp({ to: recipientEmail, otp });
    } catch (error) {
      console.error('Send reset password OTP email failed:', error);
    }
  }

  res.json(user ? otpSuccessPayload('Mã OTP đã được gửi') : { success: true, message: genericMessage, data: null });
});

export const resetPassword = asyncHandler(async (req, res) => {
  const { user } = await findPasswordResetUserByEmail(
    req.body.email,
    '+password +resetPasswordOtp +resetPasswordExpires'
  );

  if (!user || !user.resetPasswordOtp || user.resetPasswordOtp !== req.body.otp) {
    throw new ApiError(400, 'Mã OTP không hợp lệ');
  }

  if (!user.resetPasswordExpires || user.resetPasswordExpires.getTime() < Date.now()) {
    throw new ApiError(400, 'Mã OTP đã hết hạn');
  }

  const passwordPolicy = validatePasswordStrength(req.body.newPassword, user);
  if (!passwordPolicy.valid) {
    throw new ApiError(422, passwordPolicy.message);
  }

  user.password = req.body.newPassword;
  user.resetPasswordOtp = undefined;
  user.resetPasswordExpires = undefined;
  user.passwordChangedAt = new Date();
  await user.save();

  res.json({
    success: true,
    message: 'Đặt lại mật khẩu thành công',
    data: null
  });
});

export const changeInitialPassword = asyncHandler(async (req, res) => {
  if (req.body.newPassword !== req.body.confirmPassword) {
    throw new ApiError(422, 'Mật khẩu nhập lại không khớp');
  }

  const user = await User.findById(req.user._id).select('+password');
  if (!user) {
    throw new ApiError(404, 'Không tìm thấy tài khoản');
  }

  if (!user.mustChangePassword) {
    throw new ApiError(400, 'Tài khoản không yêu cầu đổi mật khẩu lần đầu');
  }

  if (await user.comparePassword(req.body.newPassword)) {
    throw new ApiError(422, 'Mật khẩu mới không được giống mật khẩu tạm');
  }

  const passwordPolicy = validatePasswordStrength(req.body.newPassword, user);
  if (!passwordPolicy.valid) {
    throw new ApiError(422, passwordPolicy.message);
  }

  user.password = req.body.newPassword;
  user.mustChangePassword = false;
  user.temporaryPasswordCreatedAt = null;
  user.initialPasswordChangedAt = new Date();
  user.passwordChangedAt = user.initialPasswordChangedAt;
  await user.save();

  res.json({
    success: true,
    message: 'Đổi mật khẩu thành công',
    data: { user: userResponse(user) }
  });
});

export const changePassword = asyncHandler(async (req, res) => {
  if (req.body.newPassword !== req.body.confirmPassword) {
    throw new ApiError(422, 'Mật khẩu nhập lại không khớp');
  }

  const user = await User.findById(req.user._id).select(
    '+password +resetPasswordOtp +resetPasswordExpires'
  );
  if (!user) {
    throw new ApiError(404, 'Không tìm thấy tài khoản');
  }

  const currentPasswordValid = await user.comparePassword(req.body.currentPassword);
  if (!currentPasswordValid) {
    throw new ApiError(400, 'Mật khẩu hiện tại không đúng');
  }

  if (await user.comparePassword(req.body.newPassword)) {
    throw new ApiError(422, 'Mật khẩu mới không được trùng mật khẩu hiện tại');
  }

  const passwordPolicy = validatePasswordStrength(req.body.newPassword, user);
  if (!passwordPolicy.valid) {
    throw new ApiError(422, passwordPolicy.message);
  }

  user.password = req.body.newPassword;
  user.passwordChangedAt = new Date();
  user.mustChangePassword = false;
  user.resetPasswordOtp = undefined;
  user.resetPasswordExpires = undefined;
  await user.save();

  req.user = user;
  await createAuditLog({
    req,
    action: 'CHANGE_PASSWORD',
    entityType: 'User',
    entityId: user._id,
    entityName: user.email,
    description: `${user.name || user.email} đã đổi mật khẩu`,
    metadata: {}
  });

  res.json({
    success: true,
    message: 'Đổi mật khẩu thành công',
    data: { user: userResponse(user) }
  });
});

export const me = asyncHandler(async (req, res) => {
  res.json({
    success: true,
    message: 'Authenticated user',
    data: {
      user: userResponse(req.user)
    }
  });
});
