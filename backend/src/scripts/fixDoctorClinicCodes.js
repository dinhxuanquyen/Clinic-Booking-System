import mongoose from 'mongoose';
import { connectCentralDb, getClinicConnection } from '../config/db.js';
import User from '../models/central/User.js';
import Clinic from '../models/clinicModel.js';
import Doctor from '../models/doctorModel.js';
import { getClinicModels } from '../models/clinic/models.js';
import { generateUniqueClinicCode } from '../services/clinicCodeService.js';
import { generateDoctorCode, syncDoctorCodeCounter } from '../services/doctorCodeService.js';

async function dropLegacyDoctorEmailIndexes() {
  const indexes = await Doctor.collection.indexes();
  const obsoleteIndexes = indexes.filter((index) => {
    const keys = Object.keys(index.key || {});
    return index.unique && (keys.includes('email') || keys.includes('personalEmail'));
  });

  for (const index of obsoleteIndexes) {
    await Doctor.collection.dropIndex(index.name);
    console.log(`Dropped obsolete doctor index: ${index.name}`);
  }
}

async function fixClinics() {
  const clinics = await Clinic.find({}).sort({ createdAt: 1 });
  const usedCodes = new Set();
  for (const clinic of clinics) {
    const currentCode = String(clinic.clinicCode || '').toUpperCase();
    const isValid = /^[A-Z][A-Z0-9]{1,4}$/.test(currentCode);
    if (isValid && !usedCodes.has(currentCode)) {
      usedCodes.add(currentCode);
      continue;
    }
    const clinicCode = await generateUniqueClinicCode(clinic.name, clinic._id);
    await Clinic.updateOne({ _id: clinic._id }, { $set: { clinicCode } });
    usedCodes.add(clinicCode);
    console.log(`Clinic ${clinic.name}: ${clinicCode}`);
  }
}

async function fixDoctors() {
  await syncDoctorCodeCounter();
  const doctors = await Doctor.find({}).sort({ createdAt: 1 });
  const usedCodes = new Set();

  for (const doctor of doctors) {
    const currentCode = String(doctor.doctorCode || '').toUpperCase();
    const hasValidUniqueCode = /^DR\d{4,}$/.test(currentCode) && !usedCodes.has(currentCode);
    const doctorCode = hasValidUniqueCode ? currentCode : await generateDoctorCode();
    usedCodes.add(doctorCode);
    const personalEmail = doctor.personalEmail || doctor.email;
    const linkedUser = await User.findOne({ role: 'doctor', doctorId: doctor._id }).select('email');
    const update = { doctorCode, isActive: doctor.isActive !== false };
    if (personalEmail) update.personalEmail = personalEmail;
    if (linkedUser?.email) update.loginEmail = linkedUser.email;
    else if (!doctor.loginEmail) update.$unset = { loginEmail: '' };

    const updateDocument = update.$unset
      ? { $set: { doctorCode, isActive: doctor.isActive !== false, ...(personalEmail ? { personalEmail } : {}) }, $unset: update.$unset }
      : { $set: update };
    await Doctor.updateOne({ _id: doctor._id }, updateDocument);

    if (doctor.clinicId) {
      const connection = await getClinicConnection(doctor.clinicId);
      const { Doctor: ClinicDoctor } = getClinicModels(connection);
      await ClinicDoctor.updateOne(
        { _id: doctor._id },
        {
          $set: {
            doctorCode,
            ...(personalEmail ? { personalEmail } : {}),
            ...(linkedUser?.email ? { loginEmail: linkedUser.email } : {})
          },
          ...(!linkedUser?.email ? { $unset: { loginEmail: '' } } : {})
        }
      );
    }
  }

  await syncDoctorCodeCounter();
  await Promise.all([Clinic.syncIndexes(), Doctor.syncIndexes()]);
}

async function run() {
  await connectCentralDb();
  await dropLegacyDoctorEmailIndexes();
  await fixClinics();
  await fixDoctors();
  const [missingClinicCodes, missingDoctorCodes, doctorIndexes] = await Promise.all([
    Clinic.countDocuments({ $or: [{ clinicCode: { $exists: false } }, { clinicCode: '' }] }),
    Doctor.countDocuments({ $or: [{ doctorCode: { $exists: false } }, { doctorCode: '' }] }),
    Doctor.collection.indexes()
  ]);
  const obsoleteUniqueEmailIndexes = doctorIndexes.filter((index) => {
    const keys = Object.keys(index.key || {});
    return index.unique && (keys.includes('email') || keys.includes('personalEmail'));
  });

  if (missingClinicCodes || missingDoctorCodes || obsoleteUniqueEmailIndexes.length) {
    throw new Error('Migration verification failed');
  }
  console.log(`Verification: ${missingClinicCodes} clinics and ${missingDoctorCodes} doctors are missing codes`);
  console.log('Verification: no obsolete unique doctor email index remains');
  console.log('Doctor and clinic code repair completed');
}

run()
  .catch((error) => {
    console.error('Doctor and clinic code repair failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
