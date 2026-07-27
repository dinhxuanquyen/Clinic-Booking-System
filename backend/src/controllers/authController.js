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

function getOtpRetryAfter(user, sentAtField = 'lastOtpSentAt') {
  const sentAt = user?.[sentAtField];
  if (!sentAt) return 0;

  const elapsedSeconds = Math.floor((Date.now() - sentAt.getTime()) / 1000);
  return Math.max(OTP_COOLDOWN_SECONDS - elapsedSeconds, 0);
}

function getRemainingSecondsUntil(date) {
  if (!date) return 0;
  return Math.max(Math.ceil((date.getTime() - Date.now()) / 1000), 0);
}

function emailVerificationRequiredPayload(user) {
  return {
    email: user.email,
    needsVerification: true,
    expiresInSeconds: getRemainingSecondsUntil(user.emailVerificationExpires),
    cooldownSeconds: getOtpRetryAfter(user, 'lastEmailVerificationOtpSentAt')
  };
}

function sendOtpCooldownResponse(res, retryAfter) {
  return res.status(429).json({
    success: false,
    message: 'Vui lÃ²ng chá» trÆ°á»›c khi gá»­i láº¡i mÃ£ OTP',
    data: null,
    retryAfter
  });
}

function otpSuccessPayload(message, data = null) {
  return {
    success: true,
    message,
    data,
    cooldownSeconds: OTP_COOLDOWN_SECONDS,
    expiresInSeconds: OTP_EXPIRES_IN_SECONDS
  };
}

async function issueEmailVerificationOtp(user, logPrefix = 'Send email verification OTP failed') {
  const otp = generateOtp();
  user.emailVerificationOtp = otp;
  user.emailVerificationExpires = new Date(Date.now() + OTP_EXPIRES_IN_SECONDS * 1000);
  user.lastEmailVerificationOtpSentAt = new Date();
  user.lastOtpSentAt = new Date();
  await user.save();

  try {
    await sendEmailVerificationOtp({ to: user.email, otp });
  } catch (error) {
    console.error(`${logPrefix}:`, error);
  }
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

  const existingEmail = await User.findOne({ email: req.body.email }).select(
    '+emailVerificationOtp +emailVerificationExpires +lastEmailVerificationOtpSentAt +lastOtpSentAt'
  );
  if (existingEmail?.role === 'patient' && existingEmail.isEmailVerified === false) {
    await issueEmailVerificationOtp(existingEmail, 'Resend email verification OTP for pending registration failed');

    return res.status(200).json({
      success: true,
      message: 'Email nÃ y Ä‘Ã£ Ä‘Æ°á»£c Ä‘Äƒng kÃ½ nhÆ°ng chÆ°a xÃ¡c nháº­n. Há»‡ thá»‘ng Ä‘Ã£ gá»­i mÃ£ OTP má»›i.',
      data: {
        email: existingEmail.email,
        needsVerification: true
      },
      cooldownSeconds: OTP_COOLDOWN_SECONDS,
      expiresInSeconds: OTP_EXPIRES_IN_SECONDS
    });
  }

  if (existingEmail) {
    throw new ApiError(409, 'Email nÃ y Ä‘Ã£ Ä‘Æ°á»£c sá»­ dá»¥ng');
  }

  const existingPhone = await User.exists({ phone: req.body.phone });
  if (existingPhone) {
    throw new ApiError(409, 'Sá»‘ Ä‘iá»‡n thoáº¡i nÃ y Ä‘Ã£ Ä‘Æ°á»£c sá»­ dá»¥ng');
  }

  const user = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    phone: req.body.phone,
    role: 'patient',
    isEmailVerified: false
  });

  await issueEmailVerificationOtp(user);

  res.status(201).json({
    success: true,
    message: 'ÄÄƒng kÃ½ thÃ nh cÃ´ng. Vui lÃ²ng kiá»ƒm tra email Ä‘á»ƒ xÃ¡c nháº­n tÃ i khoáº£n.',
    data: {
      email: user.email,
      needsVerification: true
    },
    cooldownSeconds: OTP_COOLDOWN_SECONDS,
    expiresInSeconds: OTP_EXPIRES_IN_SECONDS
  });
});

export const login = asyncHandler(async (req, res) => {
  const user = await User.findOne({ email: req.body.email }).select(
    '+password +emailVerificationExpires +lastEmailVerificationOtpSentAt'
  );
  if (!user || !(await user.comparePassword(req.body.password))) {
    await createAuditLog({
      req,
      action: 'LOGIN_FAILED',
      entityType: 'User',
      entityName: req.body.email,
      description: `ÄÄƒng nháº­p tháº¥t báº¡i vá»›i email ${req.body.email}`,
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
      description: `ÄÄƒng nháº­p tháº¥t báº¡i vÃ¬ tÃ i khoáº£n bá»‹ khÃ³a: ${user.email}`,
      metadata: { email: user.email, role: user.role, reason: 'inactive' }
    });
    throw new ApiError(403, 'TÃ i khoáº£n Ä‘Ã£ bá»‹ khÃ³a. Vui lÃ²ng liÃªn há»‡ quáº£n trá»‹ viÃªn.');
  }

  if (user.role === 'patient' && user.isEmailVerified === false) {
    await createAuditLog({
      req,
      action: 'LOGIN_FAILED',
      entityType: 'User',
      entityId: user._id,
      entityName: user.email,
      description: `ÄÄƒng nháº­p tháº¥t báº¡i vÃ¬ tÃ i khoáº£n chÆ°a xÃ¡c nháº­n email: ${user.email}`,
      metadata: { email: user.email, role: user.role, reason: 'email_not_verified' }
    });
    throw new ApiError(
      403,
      'TÃ i khoáº£n chÆ°a xÃ¡c nháº­n email. Vui lÃ²ng kiá»ƒm tra email Ä‘á»ƒ xÃ¡c nháº­n.',
      emailVerificationRequiredPayload(user)
    );
  }

  const currentPasswordPolicy = validatePasswordStrength(req.body.password, user);
  if (!currentPasswordPolicy.valid) {
    user.mustChangePassword = true;
    user.temporaryPasswordCreatedAt = user.temporaryPasswordCreatedAt || new Date();
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
    description: `${user.name || user.email} Ä‘Äƒng nháº­p thÃ nh cÃ´ng`,
    metadata: { email: user.email, role: user.role }
  });

  res.json({
    success: true,
    message: 'ÄÄƒng nháº­p thÃ nh cÃ´ng',
    data: {
      token: signToken(user),
      user: userResponse(user)
    }
  });
});

export const verifyEmail = asyncHandler(async (req, res) => {
  const user = await User.findOne({ email: req.body.email }).select(
    '+emailVerificationOtp +emailVerificationExpires +lastEmailVerificationOtpSentAt +lastOtpSentAt'
  );

  if (!user || !user.emailVerificationOtp || user.emailVerificationOtp !== req.body.otp) {
    throw new ApiError(400, 'MÃ£ OTP khÃ´ng há»£p lá»‡');
  }

  if (!user.emailVerificationExpires || user.emailVerificationExpires.getTime() < Date.now()) {
    throw new ApiError(400, 'MÃ£ OTP Ä‘Ã£ háº¿t háº¡n');
  }

  user.isEmailVerified = true;
  user.emailVerificationOtp = undefined;
  user.emailVerificationExpires = undefined;
  await user.save();

  res.json({
    success: true,
    message: 'XÃ¡c nháº­n email thÃ nh cÃ´ng. Báº¡n cÃ³ thá»ƒ Ä‘Äƒng nháº­p.',
    data: null
  });
});

export const resendVerificationOtp = asyncHandler(async (req, res) => {
  const genericMessage = 'Náº¿u email tá»“n táº¡i, há»‡ thá»‘ng Ä‘Ã£ gá»­i mÃ£ xÃ¡c nháº­n email';
  const user = await User.findOne({ email: req.body.email }).select(
    '+emailVerificationOtp +emailVerificationExpires +lastEmailVerificationOtpSentAt +lastOtpSentAt'
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
      message: 'TÃ i khoáº£n Ä‘Ã£ Ä‘Æ°á»£c xÃ¡c nháº­n email',
      data: null
    });
  }

  const retryAfter = getOtpRetryAfter(user, 'lastEmailVerificationOtpSentAt');
  if (retryAfter > 0) {
    return sendOtpCooldownResponse(res, retryAfter);
  }

  await issueEmailVerificationOtp(user, 'Resend email verification OTP failed');

  res.json(otpSuccessPayload('MÃ£ OTP Ä‘Ã£ Ä‘Æ°á»£c gá»­i', {
    email: user.email,
    needsVerification: true
  }));
});

export const forgotPassword = asyncHandler(async (req, res) => {
  const { user, doctor } = await findPasswordResetUserByEmail(
    req.body.email,
    '+lastResetPasswordOtpSentAt +isEmailVerified +role +emailVerificationExpires +lastEmailVerificationOtpSentAt'
  );

  if (!user) {
    throw new ApiError(404, 'Không tìm thấy tài khoản trong hệ thống. Vui lòng kiểm tra lại email.');
  }

  const recipientEmail = await resolvePasswordResetRecipient(user, doctor);
  if (!recipientEmail) {
    throw new ApiError(400, 'Tài khoản chưa có email nhận mã OTP. Vui lòng liên hệ quản trị viên.');
  }

  if (user.role === 'patient' && user.isEmailVerified === false) {
    throw new ApiError(
      403,
      'Tài khoản chưa xác nhận email. Vui lòng xác nhận email trước khi đặt lại mật khẩu.',
      emailVerificationRequiredPayload(user)
    );
  }

  const retryAfter = getOtpRetryAfter(user, 'lastResetPasswordOtpSentAt');
  if (retryAfter > 0) {
    return sendOtpCooldownResponse(res, retryAfter);
  }

  const otp = generateOtp();
  user.resetPasswordOtp = otp;
  user.resetPasswordExpires = new Date(Date.now() + OTP_EXPIRES_IN_SECONDS * 1000);
  user.lastResetPasswordOtpSentAt = new Date();
  user.lastOtpSentAt = new Date();
  await user.save();

  try {
    await sendResetPasswordOtp({ to: recipientEmail, otp });
  } catch (error) {
    console.error('Send reset password OTP email failed:', error);
  }

  res.json(otpSuccessPayload('Mã OTP đã được gửi'));
});

export const resetPassword = asyncHandler(async (req, res) => {
  const { user } = await findPasswordResetUserByEmail(
    req.body.email,
    '+password +resetPasswordOtp +resetPasswordExpires'
  );

  if (!user || !user.resetPasswordOtp || user.resetPasswordOtp !== req.body.otp) {
    throw new ApiError(400, 'MÃ£ OTP khÃ´ng há»£p lá»‡');
  }

  if (!user.resetPasswordExpires || user.resetPasswordExpires.getTime() < Date.now()) {
    throw new ApiError(400, 'MÃ£ OTP Ä‘Ã£ háº¿t háº¡n');
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
    message: 'Äáº·t láº¡i máº­t kháº©u thÃ nh cÃ´ng',
    data: null
  });
});

export const changeInitialPassword = asyncHandler(async (req, res) => {
  if (req.body.newPassword !== req.body.confirmPassword) {
    throw new ApiError(422, 'Máº­t kháº©u nháº­p láº¡i khÃ´ng khá»›p');
  }

  const user = await User.findById(req.user._id).select('+password');
  if (!user) {
    throw new ApiError(404, 'KhÃ´ng tÃ¬m tháº¥y tÃ i khoáº£n');
  }

  if (!user.mustChangePassword) {
    throw new ApiError(400, 'TÃ i khoáº£n khÃ´ng yÃªu cáº§u Ä‘á»•i máº­t kháº©u láº§n Ä‘áº§u');
  }

  if (await user.comparePassword(req.body.newPassword)) {
    throw new ApiError(422, 'Máº­t kháº©u má»›i khÃ´ng Ä‘Æ°á»£c giá»‘ng máº­t kháº©u táº¡m');
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
    message: 'Äá»•i máº­t kháº©u thÃ nh cÃ´ng',
    data: { user: userResponse(user) }
  });
});

export const changePassword = asyncHandler(async (req, res) => {
  if (req.body.newPassword !== req.body.confirmPassword) {
    throw new ApiError(422, 'Máº­t kháº©u nháº­p láº¡i khÃ´ng khá»›p');
  }

  const user = await User.findById(req.user._id).select(
    '+password +resetPasswordOtp +resetPasswordExpires'
  );
  if (!user) {
    throw new ApiError(404, 'KhÃ´ng tÃ¬m tháº¥y tÃ i khoáº£n');
  }

  const currentPasswordValid = await user.comparePassword(req.body.currentPassword);
  if (!currentPasswordValid) {
    throw new ApiError(400, 'Máº­t kháº©u hiá»‡n táº¡i khÃ´ng Ä‘Ãºng');
  }

  if (await user.comparePassword(req.body.newPassword)) {
    throw new ApiError(422, 'Máº­t kháº©u má»›i khÃ´ng Ä‘Æ°á»£c trÃ¹ng máº­t kháº©u hiá»‡n táº¡i');
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
    description: `${user.name || user.email} Ä‘Ã£ Ä‘á»•i máº­t kháº©u`,
    metadata: {}
  });

  res.json({
    success: true,
    message: 'Äá»•i máº­t kháº©u thÃ nh cÃ´ng',
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
