import 'dotenv/config';
import mongoose from 'mongoose';
import Clinic from '../models/clinicModel.js';
import Specialty from '../models/specialtyModel.js';
import Doctor from '../models/doctorModel.js';
import Appointment from '../models/appointmentModel.js';
import MedicalRecord from '../models/medicalRecordModel.js';
import WaitingList from '../models/waitingListModel.js';
import ServicePackage from '../models/servicePackageModel.js';
import DoctorReview from '../models/doctorReviewModel.js';
import Article from '../models/articleModel.js';
import Notification from '../models/notificationModel.js';

function idSet(items) {
  return new Set(items.map((item) => String(item._id)));
}

function isMissing(value, allowedIds) {
  return value && !allowedIds.has(String(value));
}

async function deleteStale(Model, predicate) {
  const rows = await Model.find().lean();
  const staleIds = rows.filter(predicate).map((row) => row._id);
  if (staleIds.length === 0) return 0;
  const result = await Model.deleteMany({ _id: { $in: staleIds } });
  return result.deletedCount || 0;
}

async function main() {
  const uri = process.env.CENTRAL_MONGO_URI || process.env.MONGO_URI;
  if (!uri) throw new Error('Missing CENTRAL_MONGO_URI or MONGO_URI');
  if (!/127\.0\.0\.1|localhost/i.test(uri) && process.env.ALLOW_REMOTE_CLEANUP !== 'YES') {
    throw new Error('This script is intended for local MongoDB. Set ALLOW_REMOTE_CLEANUP=YES to override.');
  }

  await mongoose.connect(uri);

  const clinics = await Clinic.find({ isActive: { $ne: false } }).select('_id').lean();
  const specialties = await Specialty.find({ isActive: { $ne: false } }).select('_id clinicId').lean();
  const doctors = await Doctor.find({ isActive: { $ne: false } }).select('_id clinicId specialtyId').lean();

  const clinicIds = idSet(clinics);
  const specialtyIds = idSet(specialties);

  const deleted = {};

  deleted.doctors = await deleteStale(
    Doctor,
    (row) => isMissing(row.clinicId, clinicIds) || isMissing(row.specialtyId, specialtyIds)
  );

  const freshDoctors = await Doctor.find({ isActive: { $ne: false } }).select('_id clinicId specialtyId').lean();
  const freshDoctorIds = idSet(freshDoctors);

  deleted.servicePackages = await deleteStale(
    ServicePackage,
    (row) =>
      isMissing(row.clinicId, clinicIds) ||
      isMissing(row.specialtyId, specialtyIds) ||
      isMissing(row.doctorId, freshDoctorIds)
  );
  deleted.appointments = await deleteStale(
    Appointment,
    (row) =>
      isMissing(row.clinicId, clinicIds) ||
      isMissing(row.specialtyId, specialtyIds) ||
      isMissing(row.doctorId, freshDoctorIds)
  );
  deleted.medicalRecords = await deleteStale(
    MedicalRecord,
    (row) =>
      isMissing(row.clinicId, clinicIds) ||
      isMissing(row.specialtyId, specialtyIds) ||
      isMissing(row.doctorId, freshDoctorIds)
  );
  deleted.waitingList = await deleteStale(
    WaitingList,
    (row) =>
      isMissing(row.clinicId, clinicIds) ||
      isMissing(row.specialtyId, specialtyIds) ||
      isMissing(row.doctorId, freshDoctorIds)
  );
  deleted.doctorReviews = await deleteStale(
    DoctorReview,
    (row) => isMissing(row.specialtyId, specialtyIds) || isMissing(row.doctorId, freshDoctorIds)
  );
  deleted.articles = await deleteStale(
    Article,
    (row) => isMissing(row.specialtyId, specialtyIds) || isMissing(row.doctorId, freshDoctorIds)
  );

  const freshAppointmentIds = idSet(await Appointment.find().select('_id').lean());
  deleted.notifications = await deleteStale(
    Notification,
    (row) => isMissing(row.doctorId, freshDoctorIds) || isMissing(row.appointmentId, freshAppointmentIds)
  );

  console.log('Cleanup stale local demo data completed.');
  console.table(deleted);

  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect();
  process.exit(1);
});
