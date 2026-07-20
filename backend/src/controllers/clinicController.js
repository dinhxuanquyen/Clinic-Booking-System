import { body, param } from 'express-validator';
import Clinic from '../models/clinicModel.js';
import { ApiError } from '../utils/apiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { createAuditLog } from '../utils/auditLogger.js';

const activeClinicFilter = { isActive: { $ne: false } };

export const clinicIdRule = [param('id').isMongoId().withMessage('Clinic id is invalid')];

export const clinicRules = [
  body('name').trim().notEmpty().withMessage('Clinic name is required'),
  body('clinicCode')
    .trim()
    .notEmpty()
    .withMessage('Clinic code is required')
    .matches(/^[A-Za-z][A-Za-z0-9]{1,4}$/)
    .withMessage('Clinic code must contain 2-5 letters or numbers')
    .customSanitizer((value) => value.toUpperCase()),
  body('address').trim().notEmpty().withMessage('Clinic address is required'),
  body('phone').trim().notEmpty().withMessage('Clinic phone is required'),
  body('email').optional({ checkFalsy: true }).isEmail().withMessage('Clinic email must be valid').normalizeEmail(),
  body('description').optional().trim(),
  body('image').optional().trim(),
  body('galleryImages').optional().isArray().withMessage('galleryImages must be an array'),
  body('galleryImages.*').optional().trim(),
  body('workingHours').optional().isArray().withMessage('workingHours must be an array')
];

export const getClinics = asyncHandler(async (req, res) => {
  const clinics = await Clinic.find(activeClinicFilter).populate('specialtyIds').sort({ createdAt: -1 });

  res.json({
    success: true,
    message: 'Clinics fetched successfully',
    data: clinics
  });
});

export const getClinicById = asyncHandler(async (req, res) => {
  const clinic = await Clinic.findOne({ _id: req.params.id, ...activeClinicFilter }).populate('specialtyIds');
  if (!clinic) {
    throw new ApiError(404, 'Clinic not found');
  }

  res.json({
    success: true,
    message: 'Clinic fetched successfully',
    data: clinic
  });
});

function normalizeText(value) {
  return String(value || '').trim();
}

function normalizeGalleryImages(value) {
  const images = Array.isArray(value) ? value : [];
  const normalized = images
    .map((item) => normalizeText(item))
    .filter(Boolean);

  return Array.from(new Set(normalized));
}

function buildClinicPayload(body) {
  const image = normalizeText(body.image);

  return {
    ...body,
    image,
    galleryImages: normalizeGalleryImages(body.galleryImages)
  };
}

async function assertUniqueClinic({ name, clinicCode, email, phone, excludeId = null }) {
  const idFilter = excludeId ? { _id: { $ne: excludeId } } : {};
  const uniqueFilter = { ...activeClinicFilter, ...idFilter };
  const normalizedName = normalizeText(name);
  const normalizedClinicCode = normalizeText(clinicCode).toUpperCase();
  const normalizedEmail = normalizeText(email).toLowerCase();
  const normalizedPhone = normalizeText(phone);

  if (normalizedName) {
    const duplicateName = await Clinic.findOne({ ...uniqueFilter, name: normalizedName })
      .collation({ locale: 'en', strength: 2 })
      .select('_id');

    if (duplicateName) {
      throw new ApiError(409, 'Tên cơ sở đã tồn tại');
    }
  }

  if (normalizedClinicCode) {
    const duplicateCode = await Clinic.findOne({ ...uniqueFilter, clinicCode: normalizedClinicCode }).select('_id');
    if (duplicateCode) {
      throw new ApiError(409, 'Mã cơ sở đã tồn tại');
    }
  }

  if (normalizedEmail) {
    const duplicateEmail = await Clinic.findOne({ ...uniqueFilter, email: normalizedEmail }).select('_id');

    if (duplicateEmail) {
      throw new ApiError(409, 'Email cơ sở đã tồn tại');
    }
  }

  if (normalizedPhone) {
    const duplicatePhone = await Clinic.findOne({ ...uniqueFilter, phone: normalizedPhone }).select('_id');

    if (duplicatePhone) {
      throw new ApiError(409, 'Số điện thoại cơ sở đã tồn tại');
    }
  }
}

export const createClinic = asyncHandler(async (req, res) => {
  const payload = buildClinicPayload(req.body);
  await assertUniqueClinic(payload);

  const clinic = await Clinic.create(payload);

  await createAuditLog({
    req,
    action: 'CREATE_CLINIC',
    entityType: 'Clinic',
    entityId: clinic._id,
    entityName: clinic.name,
    description: `Tạo cơ sở ${clinic.name}`,
    metadata: { clinicCode: clinic.clinicCode, address: clinic.address }
  });

  res.status(201).json({
    success: true,
    message: 'Clinic created successfully',
    data: clinic
  });
});

export const updateClinic = asyncHandler(async (req, res) => {
  const currentClinic = await Clinic.findOne({ _id: req.params.id, ...activeClinicFilter }).select('_id');
  if (!currentClinic) {
    throw new ApiError(404, 'Clinic not found');
  }

  const payload = buildClinicPayload(req.body);
  await assertUniqueClinic({ ...payload, excludeId: req.params.id });

  const clinic = await Clinic.findOneAndUpdate({ _id: req.params.id, ...activeClinicFilter }, payload, {
    new: true,
    runValidators: true
  });

  if (!clinic) {
    throw new ApiError(404, 'Clinic not found');
  }

  await createAuditLog({
    req,
    action: 'UPDATE_CLINIC',
    entityType: 'Clinic',
    entityId: clinic._id,
    entityName: clinic.name,
    description: `Cập nhật cơ sở ${clinic.name}`,
    metadata: { clinicCode: clinic.clinicCode, changes: payload }
  });

  res.json({
    success: true,
    message: 'Clinic updated successfully',
    data: clinic
  });
});

export const deleteClinic = asyncHandler(async (req, res) => {
  const clinic = await Clinic.findOneAndUpdate(
    { _id: req.params.id, ...activeClinicFilter },
    { isActive: false },
    { new: true }
  );

  if (!clinic) {
    throw new ApiError(404, 'Clinic not found');
  }

  await createAuditLog({
    req,
    action: 'DELETE_CLINIC',
    entityType: 'Clinic',
    entityId: clinic._id,
    entityName: clinic.name,
    description: `Xóa cơ sở ${clinic.name}`,
    metadata: { clinicCode: clinic.clinicCode }
  });

  res.json({
    success: true,
    message: 'Clinic deleted successfully',
    data: { id: clinic._id }
  });
});
