import Clinic from '../models/clinicModel.js';

const preferredClinicCodes = new Map([
  ['ha noi clinic', 'HN'],
  ['bac ninh clinic', 'BN'],
  ['hai phong clinic', 'HP'],
  ['phong kham phenikaa', 'PK']
]);

export function normalizeClinicName(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function baseCodeFromName(name) {
  const normalizedName = normalizeClinicName(name);
  const preferredCode = preferredClinicCodes.get(normalizedName);
  if (preferredCode) return preferredCode;

  const words = normalizedName.split(/\s+/).filter(Boolean);
  let code = words.map((word) => word[0]).join('').toUpperCase().slice(0, 5);
  if (code.length < 2) {
    code = normalizedName.replace(/[^a-z0-9]/g, '').toUpperCase().slice(0, 5);
  }
  return code.padEnd(2, 'X').slice(0, 5);
}

export async function generateUniqueClinicCode(name, excludeId = null) {
  const baseCode = baseCodeFromName(name);
  let suffix = '';
  let sequence = 1;

  for (;;) {
    const candidate = `${baseCode.slice(0, 5 - suffix.length)}${suffix}`;
    const filter = { clinicCode: candidate };
    if (excludeId) filter._id = { $ne: excludeId };
    if (!(await Clinic.exists(filter))) return candidate;
    sequence += 1;
    suffix = String(sequence);
  }
}

export async function ensureClinicCode(clinic) {
  if (clinic?.clinicCode) return clinic.clinicCode;
  const clinicCode = await generateUniqueClinicCode(clinic?.name, clinic?._id);
  await Clinic.updateOne({ _id: clinic._id }, { $set: { clinicCode } });
  clinic.clinicCode = clinicCode;
  return clinicCode;
}
