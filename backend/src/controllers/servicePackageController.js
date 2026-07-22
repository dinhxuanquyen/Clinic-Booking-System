import { body, param, query } from 'express-validator';
import Clinic from '../models/clinicModel.js';
import Doctor from '../models/doctorModel.js';
import ServicePackage from '../models/servicePackageModel.js';
import Specialty from '../models/specialtyModel.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/apiError.js';
import { createAuditLog } from '../utils/auditLogger.js';
import { generateServicePackageCode } from '../services/servicePackageService.js';

const packagePopulate = [
  { path: 'clinicId', select: 'name clinicCode address' },
  { path: 'specialtyId', select: 'name clinicId' },
  { path: 'doctorId', select: 'name doctorCode personalEmail loginEmail' },
  { path: 'createdBy', select: 'name role' },
  { path: 'updatedBy', select: 'name role' }
];

export const servicePackageRules = [
  body('name').trim().notEmpty().withMessage('Tên gói khám là bắt buộc'),
  body('description').optional().trim(),
  body('imageUrl').optional().trim(),
  body('targetPatients').optional().isArray().withMessage('targetPatients phải là danh sách'),
  body('targetPatients.*').optional().trim().isLength({ max: 180 }).withMessage('Mỗi dòng đối tượng phù hợp tối đa 180 ký tự'),
  body('includes').optional().isArray().withMessage('includes phải là danh sách'),
  body('includes.*').optional().trim().isLength({ max: 180 }).withMessage('Mỗi quyền lợi tối đa 180 ký tự'),
  body('price').isFloat({ min: 0 }).withMessage('Giá gói khám không hợp lệ'),
  body('durationMinutes').isInt({ min: 1 }).withMessage('Thời lượng khám không hợp lệ'),
  body('clinicId').isMongoId().withMessage('Cơ sở không hợp lệ'),
  body('specialtyId').isMongoId().withMessage('Chuyên khoa không hợp lệ'),
  body('doctorId').optional({ checkFalsy: true }).isMongoId().withMessage('Bác sĩ không hợp lệ'),
  body('isActive').optional().isBoolean().withMessage('Trạng thái không hợp lệ')
];

export const servicePackageIdRule = [
  param('id').isMongoId().withMessage('Gói khám không hợp lệ')
];

export const servicePackageStatusRules = [
  param('id').isMongoId().withMessage('Gói khám không hợp lệ'),
  body('isActive').isBoolean().withMessage('Trạng thái không hợp lệ')
];

export const publicServicePackageQueryRules = [
  query('clinicId').optional({ checkFalsy: true }).isMongoId().withMessage('Cơ sở không hợp lệ'),
  query('specialtyId').optional({ checkFalsy: true }).isMongoId().withMessage('Chuyên khoa không hợp lệ'),
  query('doctorId').optional({ checkFalsy: true }).isMongoId().withMessage('Bác sĩ không hợp lệ')
];

function cleanDoctorId(value) {
  return value || null;
}

function cleanStringList(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item || '').trim()).filter(Boolean);
  }
  return String(value || '')
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function sameId(left, right) {
  return String(left?._id || left || '') === String(right?._id || right || '');
}

async function validateScope({ clinicId, specialtyId, doctorId }) {
  const clinic = await Clinic.findOne({ _id: clinicId, isActive: { $ne: false } });
  if (!clinic) throw new ApiError(404, 'Không tìm thấy cơ sở');

  const specialty = await Specialty.findOne({ _id: specialtyId, clinicId, isActive: { $ne: false } });
  if (!specialty) throw new ApiError(422, 'Chuyên khoa không thuộc cơ sở đã chọn');

  let doctor = null;
  if (doctorId) {
    doctor = await Doctor.findOne({
      _id: doctorId,
      clinicId,
      specialtyId,
      isActive: { $ne: false }
    });
    if (!doctor) throw new ApiError(422, 'Bác sĩ không thuộc cơ sở hoặc chuyên khoa đã chọn');
  }

  return { clinic, specialty, doctor };
}

async function assertNoDuplicate({ name, clinicId, specialtyId, doctorId, excludeId }) {
  const filter = {
    name: String(name).trim(),
    clinicId,
    specialtyId,
    doctorId: doctorId || null,
    isDeleted: false
  };
  if (excludeId) filter._id = { $ne: excludeId };

  const duplicate = await ServicePackage.exists(filter);
  if (duplicate) {
    throw new ApiError(409, 'Gói khám này đã tồn tại trong phạm vi đã chọn');
  }
}

function buildListFilter(queryParams = {}) {
  const filter = { isDeleted: false };

  if (queryParams.clinicId) filter.clinicId = queryParams.clinicId;
  if (queryParams.specialtyId) filter.specialtyId = queryParams.specialtyId;
  if (queryParams.doctorId === 'common') filter.doctorId = null;
  else if (queryParams.doctorId) filter.doctorId = queryParams.doctorId;
  if (queryParams.status === 'active') filter.isActive = true;
  if (queryParams.status === 'inactive') filter.isActive = false;

  const keyword = String(queryParams.keyword || queryParams.search || '').trim();
  if (keyword) {
    filter.$or = [
      { name: new RegExp(keyword, 'i') },
      { code: new RegExp(keyword, 'i') },
      { description: new RegExp(keyword, 'i') }
    ];
  }

  return filter;
}

export const listAdminServicePackages = asyncHandler(async (req, res) => {
  const packages = await ServicePackage.find(buildListFilter(req.query))
    .populate(packagePopulate)
    .sort({ createdAt: -1 });

  res.json({
    success: true,
    message: 'Danh sách gói khám',
    data: packages
  });
});

export const createAdminServicePackage = asyncHandler(async (req, res) => {
  const doctorId = cleanDoctorId(req.body.doctorId);
  const { clinic, specialty, doctor } = await validateScope({
    clinicId: req.body.clinicId,
    specialtyId: req.body.specialtyId,
    doctorId
  });
  await assertNoDuplicate({
    name: req.body.name,
    clinicId: req.body.clinicId,
    specialtyId: req.body.specialtyId,
    doctorId
  });

  const servicePackage = await ServicePackage.create({
    name: req.body.name,
    code: await generateServicePackageCode(),
    description: req.body.description || '',
    imageUrl: req.body.imageUrl || '',
    targetPatients: cleanStringList(req.body.targetPatients),
    includes: cleanStringList(req.body.includes),
    price: req.body.price,
    durationMinutes: req.body.durationMinutes,
    clinicId: req.body.clinicId,
    specialtyId: req.body.specialtyId,
    doctorId,
    isActive: req.body.isActive ?? true,
    createdBy: req.user._id,
    updatedBy: req.user._id
  });

  await createAuditLog({
    req,
    action: 'CREATE_SERVICE_PACKAGE',
    entityType: 'ServicePackage',
    entityId: servicePackage._id,
    entityName: servicePackage.name,
    description: `Tạo gói khám ${servicePackage.name}`,
    metadata: {
      clinicId: String(clinic._id),
      specialtyId: String(specialty._id),
      doctorId: doctor ? String(doctor._id) : null
    }
  });

  const populated = await ServicePackage.findById(servicePackage._id).populate(packagePopulate);
  res.status(201).json({
    success: true,
    message: 'Tạo gói khám thành công',
    data: populated
  });
});

export const updateAdminServicePackage = asyncHandler(async (req, res) => {
  const servicePackage = await ServicePackage.findOne({ _id: req.params.id, isDeleted: false });
  if (!servicePackage) throw new ApiError(404, 'Không tìm thấy dữ liệu');

  const doctorId = cleanDoctorId(req.body.doctorId);
  await validateScope({
    clinicId: req.body.clinicId,
    specialtyId: req.body.specialtyId,
    doctorId
  });
  await assertNoDuplicate({
    name: req.body.name,
    clinicId: req.body.clinicId,
    specialtyId: req.body.specialtyId,
    doctorId,
    excludeId: servicePackage._id
  });

  servicePackage.name = req.body.name;
  servicePackage.description = req.body.description || '';
  servicePackage.imageUrl = req.body.imageUrl || '';
  servicePackage.targetPatients = cleanStringList(req.body.targetPatients);
  servicePackage.includes = cleanStringList(req.body.includes);
  servicePackage.price = req.body.price;
  servicePackage.durationMinutes = req.body.durationMinutes;
  servicePackage.clinicId = req.body.clinicId;
  servicePackage.specialtyId = req.body.specialtyId;
  servicePackage.doctorId = doctorId;
  if (req.body.isActive !== undefined) servicePackage.isActive = req.body.isActive;
  servicePackage.updatedBy = req.user._id;
  await servicePackage.save();

  await createAuditLog({
    req,
    action: 'UPDATE_SERVICE_PACKAGE',
    entityType: 'ServicePackage',
    entityId: servicePackage._id,
    entityName: servicePackage.name,
    description: `Cập nhật gói khám ${servicePackage.name}`
  });

  const populated = await ServicePackage.findById(servicePackage._id).populate(packagePopulate);
  res.json({
    success: true,
    message: 'Cập nhật gói khám thành công',
    data: populated
  });
});

export const updateAdminServicePackageStatus = asyncHandler(async (req, res) => {
  const servicePackage = await ServicePackage.findOne({ _id: req.params.id, isDeleted: false });
  if (!servicePackage) throw new ApiError(404, 'Không tìm thấy dữ liệu');

  servicePackage.isActive = req.body.isActive;
  servicePackage.updatedBy = req.user._id;
  await servicePackage.save();

  await createAuditLog({
    req,
    action: 'CHANGE_STATUS_SERVICE_PACKAGE',
    entityType: 'ServicePackage',
    entityId: servicePackage._id,
    entityName: servicePackage.name,
    description: `${servicePackage.isActive ? 'Kích hoạt' : 'Tạm khóa'} gói khám ${servicePackage.name}`
  });

  res.json({
    success: true,
    message: 'Cập nhật trạng thái gói khám thành công',
    data: await ServicePackage.findById(servicePackage._id).populate(packagePopulate)
  });
});

export const deleteAdminServicePackage = asyncHandler(async (req, res) => {
  const servicePackage = await ServicePackage.findOne({ _id: req.params.id, isDeleted: false });
  if (!servicePackage) throw new ApiError(404, 'Không tìm thấy dữ liệu');

  servicePackage.isDeleted = true;
  servicePackage.isActive = false;
  servicePackage.updatedBy = req.user._id;
  await servicePackage.save();

  await createAuditLog({
    req,
    action: 'DELETE_SERVICE_PACKAGE',
    entityType: 'ServicePackage',
    entityId: servicePackage._id,
    entityName: servicePackage.name,
    description: `Xóa gói khám ${servicePackage.name}`
  });

  res.json({
    success: true,
    message: 'Xóa gói khám thành công'
  });
});

export const listPublicServicePackages = asyncHandler(async (req, res) => {
  const filter = {
    isActive: true,
    isDeleted: false
  };

  if (req.query.clinicId) filter.clinicId = req.query.clinicId;
  if (req.query.specialtyId) filter.specialtyId = req.query.specialtyId;

  if (req.query.clinicId && req.query.specialtyId) {
    filter.$or = [{ doctorId: null }];
  }

  if (req.query.doctorId) {
    if (!filter.$or) filter.$or = [{ doctorId: null }];
    filter.$or.push({ doctorId: req.query.doctorId });
  }

  const keyword = String(req.query.search || '').trim();
  if (keyword) {
    filter.$and = [
      ...(filter.$and || []),
      {
        $or: [
          { name: new RegExp(keyword, 'i') },
          { code: new RegExp(keyword, 'i') },
          { description: new RegExp(keyword, 'i') }
        ]
      }
    ];
  }

  const packages = await ServicePackage.find(filter)
    .populate(packagePopulate)
    .sort({ doctorId: 1, price: 1, name: 1 });

  res.json({
    success: true,
    message: 'Danh sách gói khám',
    data: packages
  });
});

export const getPublicServicePackageById = asyncHandler(async (req, res) => {
  const servicePackage = await ServicePackage.findOne({
    _id: req.params.id,
    isActive: true,
    isDeleted: false
  }).populate(packagePopulate);

  if (!servicePackage) {
    throw new ApiError(404, 'Không tìm thấy dữ liệu');
  }

  res.json({
    success: true,
    message: 'Chi tiết gói khám',
    data: servicePackage
  });
});

export const listDoctorServicePackages = asyncHandler(async (req, res) => {
  if (!req.user.doctorId) {
    throw new ApiError(400, 'Tài khoản bác sĩ chưa được liên kết hồ sơ bác sĩ');
  }

  const doctor = await Doctor.findById(req.user.doctorId);
  if (!doctor) throw new ApiError(404, 'Không tìm thấy hồ sơ bác sĩ');

  const packages = await ServicePackage.find({
    clinicId: doctor.clinicId,
    specialtyId: doctor.specialtyId,
    isActive: true,
    isDeleted: false,
    $or: [{ doctorId: null }, { doctorId: doctor._id }]
  })
    .populate(packagePopulate)
    .sort({ doctorId: 1, price: 1, name: 1 });

  res.json({
    success: true,
    message: 'Gói khám áp dụng',
    data: packages.map((item) => ({
      ...item.toObject(),
      scope: item.doctorId && sameId(item.doctorId, doctor._id) ? 'doctor' : 'common'
    }))
  });
});
