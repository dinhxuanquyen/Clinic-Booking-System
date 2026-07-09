import { body } from 'express-validator';
import User from '../models/central/User.js';
import { ApiError } from '../utils/apiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { createAuditLog } from '../utils/auditLogger.js';
import { insuranceProfileResponse } from '../utils/insurance.js';

function userResponse(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    phone: user.phone || '',
    avatar: user.avatar || '',
    address: user.address || '',
    dateOfBirth: user.dateOfBirth || '',
    gender: user.gender || '',
    role: user.role,
    clinicId: user.clinicId,
    doctorId: user.doctorId,
    insurance: insuranceProfileResponse(user),
    createdAt: user.createdAt
  };
}

export const updateMeRules = [
  body('name').optional().trim().notEmpty().withMessage('Name is required'),
  body('email').optional().isEmail().withMessage('Email must be valid').normalizeEmail(),
  body('phone').optional({ nullable: true }).trim(),
  body('avatar').optional({ nullable: true }).trim(),
  body('address').optional({ nullable: true }).trim(),
  body('dateOfBirth').optional({ checkFalsy: true }).isISO8601({ strict: true }).withMessage('dateOfBirth must be YYYY-MM-DD'),
  body('gender').optional({ checkFalsy: true }).isIn(['male', 'female', 'other']).withMessage('Gender is invalid')
];

export const getMe = asyncHandler(async (req, res) => {
  res.json({
    success: true,
    message: 'User profile fetched successfully',
    data: { user: userResponse(req.user) }
  });
});

export const updateMe = asyncHandler(async (req, res) => {
  const allowedFields = ['name', 'email', 'phone', 'address', 'dateOfBirth', 'gender', 'avatar'];
  const updates = {};

  allowedFields.forEach((field) => {
    if (Object.hasOwn(req.body, field)) {
      updates[field] = req.body[field] || '';
    }
  });

  if (updates.email) {
    const duplicateEmail = await User.exists({
      _id: { $ne: req.user._id },
      email: updates.email
    });

    if (duplicateEmail) {
      throw new ApiError(409, 'Email already exists');
    }
  }

  const user = await User.findByIdAndUpdate(req.user._id, updates, {
    new: true,
    runValidators: true
  }).select('-password');

  res.json({
    success: true,
    message: 'User profile updated successfully',
    data: { user: userResponse(user) }
  });
});

export const updateInsuranceProfileRules = [
  body('insuranceEnabled').optional().isBoolean().withMessage('insuranceEnabled must be boolean'),
  body('insuranceNumber')
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isLength({ min: 10, max: 20 })
    .withMessage('Mã BHYT phải có từ 10 đến 20 ký tự'),
  body('insuranceExpiryDate')
    .optional({ nullable: true, checkFalsy: true })
    .isISO8601({ strict: true })
    .withMessage('Ngày hết hạn BHYT không hợp lệ'),
  body('insuranceRegisteredHospital')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 200 })
    .withMessage('Nơi đăng ký KCB ban đầu tối đa 200 ký tự'),
  body('insuranceNote').optional({ nullable: true }).trim()
];

export const getInsuranceProfile = asyncHandler(async (req, res) => {
  res.json({
    success: true,
    insurance: insuranceProfileResponse(req.user)
  });
});

export const updateInsuranceProfile = asyncHandler(async (req, res) => {
  const insuranceEnabled = req.body.insuranceEnabled === true || req.body.insuranceEnabled === 'true';
  const updates = {
    insuranceEnabled,
    insuranceNumber: insuranceEnabled ? String(req.body.insuranceNumber || '').trim() : '',
    insuranceExpiryDate: insuranceEnabled && req.body.insuranceExpiryDate ? req.body.insuranceExpiryDate : null,
    insuranceRegisteredHospital: insuranceEnabled ? String(req.body.insuranceRegisteredHospital || '').trim() : '',
    insuranceNote: insuranceEnabled ? String(req.body.insuranceNote || '').trim() : ''
  };

  const user = await User.findByIdAndUpdate(req.user._id, updates, {
    new: true,
    runValidators: true
  }).select('-password');

  await createAuditLog({
    req,
    action: 'UPDATE_INSURANCE_PROFILE',
    entityType: 'User',
    entityId: user._id,
    entityName: user.name,
    description: `${user.name} đã cập nhật hồ sơ BHYT`,
    metadata: {
      insuranceEnabled: user.insuranceEnabled
    }
  });

  res.json({
    success: true,
    message: 'Cập nhật thông tin BHYT thành công',
    insurance: insuranceProfileResponse(user)
  });
});
