import ServicePackage from '../models/servicePackageModel.js';
import { ApiError } from '../utils/apiError.js';

function sameId(left, right) {
  return String(left?._id || left || '') === String(right?._id || right || '');
}

export function buildServicePackageSnapshot(servicePackage) {
  if (!servicePackage) return null;

  return {
    _id: servicePackage._id,
    name: servicePackage.name,
    code: servicePackage.code,
    description: servicePackage.description || '',
    targetPatients: Array.isArray(servicePackage.targetPatients) ? servicePackage.targetPatients : [],
    includes: Array.isArray(servicePackage.includes) ? servicePackage.includes : [],
    price: servicePackage.price,
    durationMinutes: servicePackage.durationMinutes,
    clinicId: servicePackage.clinicId,
    specialtyId: servicePackage.specialtyId,
    doctorId: servicePackage.doctorId || null
  };
}

export async function generateServicePackageCode() {
  const prefix = 'PKG';
  const lastPackage = await ServicePackage.findOne({ code: new RegExp(`^${prefix}-\\d{4,}$`) })
    .sort({ code: -1 })
    .select('code')
    .lean();

  const lastNumber = Number(String(lastPackage?.code || '').replace(`${prefix}-`, '')) || 0;

  for (let offset = 1; offset <= 20; offset += 1) {
    const code = `${prefix}-${String(lastNumber + offset).padStart(4, '0')}`;
    const exists = await ServicePackage.exists({ code });
    if (!exists) return code;
  }

  return `${prefix}-${Date.now().toString().slice(-8)}`;
}

export async function resolveServicePackageForAppointment({ servicePackageId, clinicId, specialtyId, doctorId }) {
  if (!servicePackageId) {
    return { servicePackage: null, snapshot: null };
  }

  const servicePackage = await ServicePackage.findOne({
    _id: servicePackageId,
    isActive: true,
    isDeleted: false
  });

  if (!servicePackage) {
    throw new ApiError(404, 'Gói khám không khả dụng');
  }

  if (!sameId(servicePackage.clinicId, clinicId) || !sameId(servicePackage.specialtyId, specialtyId)) {
    throw new ApiError(422, 'Gói khám không phù hợp với cơ sở hoặc chuyên khoa đã chọn');
  }

  if (servicePackage.doctorId && !sameId(servicePackage.doctorId, doctorId)) {
    throw new ApiError(422, 'Gói khám không áp dụng cho bác sĩ đã chọn');
  }

  return {
    servicePackage,
    snapshot: buildServicePackageSnapshot(servicePackage)
  };
}
