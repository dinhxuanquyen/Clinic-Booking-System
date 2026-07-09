import { body, param } from 'express-validator';
import Specialty from '../models/specialtyModel.js';
import Clinic from '../models/clinicModel.js';
import { ApiError } from '../utils/apiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { createAuditLog } from '../utils/auditLogger.js';

export const specialtyIdRule = [param('id').isMongoId().withMessage('Specialty id is invalid')];

export const clinicIdParamRule = [param('clinicId').isMongoId().withMessage('Clinic id is invalid')];

export const specialtyRules = [
  body('name').trim().notEmpty().withMessage('Specialty name is required'),
  body('clinicId').isMongoId().withMessage('clinicId is required'),
  body('description').optional().trim(),
  body('image').optional().trim()
];

export const getSpecialties = asyncHandler(async (req, res) => {
  const specialties = await Specialty.find({ isActive: true }).populate('clinicId', 'name address').sort({ createdAt: -1 });

  res.json({
    success: true,
    message: 'Specialties fetched successfully',
    data: specialties
  });
});

export const getSpecialtyById = asyncHandler(async (req, res) => {
  const specialty = await Specialty.findOne({ _id: req.params.id, isActive: true }).populate('clinicId', 'name address');
  if (!specialty) {
    throw new ApiError(404, 'Specialty not found');
  }

  res.json({
    success: true,
    message: 'Specialty fetched successfully',
    data: specialty
  });
});

export const getSpecialtiesByClinic = asyncHandler(async (req, res) => {
  const clinic = await Clinic.exists({ _id: req.params.clinicId, isActive: true });
  if (!clinic) {
    throw new ApiError(404, 'Clinic not found');
  }

  const specialties = await Specialty.find({ clinicId: req.params.clinicId, isActive: true }).sort({ name: 1 });

  res.json({
    success: true,
    message: 'Clinic specialties fetched successfully',
    data: specialties
  });
});

export const createSpecialty = asyncHandler(async (req, res) => {
  const clinic = await Clinic.exists({ _id: req.body.clinicId, isActive: true });
  if (!clinic) {
    throw new ApiError(404, 'Clinic not found');
  }

  const specialty = await Specialty.create(req.body);
  await Clinic.findByIdAndUpdate(req.body.clinicId, { $addToSet: { specialtyIds: specialty._id } });

  await createAuditLog({
    req,
    action: 'CREATE_SPECIALTY',
    entityType: 'Specialty',
    entityId: specialty._id,
    entityName: specialty.name,
    description: `Tạo chuyên khoa ${specialty.name}`,
    metadata: { clinicId: specialty.clinicId }
  });

  res.status(201).json({
    success: true,
    message: 'Specialty created successfully',
    data: specialty
  });
});

export const updateSpecialty = asyncHandler(async (req, res) => {
  const specialty = await Specialty.findById(req.params.id);
  if (!specialty) {
    throw new ApiError(404, 'Specialty not found');
  }

  if (req.body.clinicId && String(req.body.clinicId) !== String(specialty.clinicId)) {
    const clinic = await Clinic.exists({ _id: req.body.clinicId, isActive: true });
    if (!clinic) {
      throw new ApiError(404, 'Clinic not found');
    }

    await Clinic.findByIdAndUpdate(specialty.clinicId, { $pull: { specialtyIds: specialty._id } });
    await Clinic.findByIdAndUpdate(req.body.clinicId, { $addToSet: { specialtyIds: specialty._id } });
  }

  Object.assign(specialty, req.body);
  await specialty.save();

  await createAuditLog({
    req,
    action: 'UPDATE_SPECIALTY',
    entityType: 'Specialty',
    entityId: specialty._id,
    entityName: specialty.name,
    description: `Cập nhật chuyên khoa ${specialty.name}`,
    metadata: { clinicId: specialty.clinicId, changes: req.body }
  });

  res.json({
    success: true,
    message: 'Specialty updated successfully',
    data: specialty
  });
});

export const deleteSpecialty = asyncHandler(async (req, res) => {
  const specialty = await Specialty.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
  if (!specialty) {
    throw new ApiError(404, 'Specialty not found');
  }

  await Clinic.findByIdAndUpdate(specialty.clinicId, { $pull: { specialtyIds: specialty._id } });

  await createAuditLog({
    req,
    action: 'DELETE_SPECIALTY',
    entityType: 'Specialty',
    entityId: specialty._id,
    entityName: specialty.name,
    description: `Xóa chuyên khoa ${specialty.name}`,
    metadata: { clinicId: specialty.clinicId }
  });

  res.json({
    success: true,
    message: 'Specialty deleted successfully',
    data: { id: specialty._id }
  });
});
