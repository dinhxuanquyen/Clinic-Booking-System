import mongoose from 'mongoose';
import { connectCentralDb, getClinicConnection } from '../config/db.js';
import Clinic from '../models/clinicModel.js';
import Doctor from '../models/doctorModel.js';
import { getClinicModels } from '../models/clinic/models.js';
import { generateDoctorCode, syncDoctorCodeCounter } from '../services/doctorCodeService.js';

const clinicCodes = new Map([
  ['ha noi clinic', 'HN'],
  ['hà nội clinic', 'HN'],
  ['bac ninh clinic', 'BN'],
  ['bắc ninh clinic', 'BN'],
  ['hai phong clinic', 'HP'],
  ['hải phòng clinic', 'HP'],
  ['phòng khám phenikaa', 'PK'],
  ['phong kham phenikaa', 'PK']
]);

async function migrate() {
  await connectCentralDb();

  const clinics = await Clinic.find({ $or: [{ clinicCode: { $exists: false } }, { clinicCode: '' }] });
  for (const clinic of clinics) {
    const clinicCode = clinicCodes.get(clinic.name.trim().toLowerCase());
    if (clinicCode) {
      await Clinic.updateOne({ _id: clinic._id }, { $set: { clinicCode } });
    }
  }

  await syncDoctorCodeCounter();
  const doctors = await Doctor.find({
    $or: [
      { doctorCode: { $exists: false } },
      { doctorCode: '' },
      { personalEmail: { $exists: false } },
      { personalEmail: '' }
    ]
  }).sort({ createdAt: 1 });

  for (const doctor of doctors) {
    const doctorCode = doctor.doctorCode || (await generateDoctorCode());
    const personalEmail = doctor.personalEmail || doctor.email;
    await Doctor.updateOne({ _id: doctor._id }, { $set: { doctorCode, personalEmail } });

    const connection = await getClinicConnection(doctor.clinicId);
    const { Doctor: ClinicDoctor } = getClinicModels(connection);
    const clinicDoctorFields = { doctorCode, personalEmail };
    if (doctor.loginEmail) clinicDoctorFields.loginEmail = doctor.loginEmail;
    await ClinicDoctor.updateOne({ _id: doctor._id }, { $set: clinicDoctorFields });
  }

  await syncDoctorCodeCounter();
  console.log('Clinic and doctor code migration completed');
}

migrate()
  .then(() => mongoose.disconnect())
  .catch(async (error) => {
    console.error(error);
    await mongoose.disconnect();
    process.exitCode = 1;
  });
