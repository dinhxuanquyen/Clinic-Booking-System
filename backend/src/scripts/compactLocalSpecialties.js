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

const SPECIALTY_NAMES = ['Nhi', 'Tim mạch', 'Da liễu', 'Tai mũi họng', 'Cơ xương khớp', 'Sản phụ khoa', 'Nội tổng quát', 'Mắt', 'Răng hàm mặt', 'Thần kinh'];

const SPECIALTY_IMAGES = {
  nhi: '/specialties/photos/specialty-pediatrics.jpg',
  'tim mach': '/specialties/photos/specialty-cardiology.jpg',
  'da lieu': '/specialties/photos/specialty-dermatology.jpg',
  'tai mui hong': '/specialties/photos/specialty-ent.jpg',
  'co xuong khop': '/specialties/photos/specialty-musculoskeletal.jpg',
  'san phu khoa': '/specialties/photos/specialty-obgyn.jpg',
  'noi tong quat': '/specialties/photos/specialty-internal.jpg',
  mat: '/specialties/photos/specialty-ophthalmology.jpg',
  'rang ham mat': '/specialties/photos/specialty-dental.jpg',
  'than kinh': '/specialties/photos/specialty-neurology.jpg'
};

function normalizeVietnameseKey(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();
}

function pick(items, index) {
  return items[index % items.length];
}

async function updateReferences(fromId, toId) {
  if (String(fromId) === String(toId)) return;

  await Promise.all([
    Doctor.updateMany({ specialtyId: fromId }, { $set: { specialtyId: toId } }),
    Appointment.updateMany({ specialtyId: fromId }, { $set: { specialtyId: toId } }),
    MedicalRecord.updateMany({ specialtyId: fromId }, { $set: { specialtyId: toId } }),
    WaitingList.updateMany({ specialtyId: fromId }, { $set: { specialtyId: toId } }),
    ServicePackage.updateMany({ specialtyId: fromId }, { $set: { specialtyId: toId } }),
    DoctorReview.updateMany({ specialtyId: fromId }, { $set: { specialtyId: toId } }),
    Article.updateMany({ specialtyId: fromId }, { $set: { specialtyId: toId } })
  ]);
}

async function main() {
  const uri = process.env.CENTRAL_MONGO_URI || process.env.MONGO_URI;
  if (!uri) throw new Error('Missing CENTRAL_MONGO_URI or MONGO_URI');
  if (!/127\.0\.0\.1|localhost/i.test(uri) && process.env.ALLOW_REMOTE_COMPACT !== 'YES') {
    throw new Error('This script is intended for local MongoDB. Set ALLOW_REMOTE_COMPACT=YES to override.');
  }

  await mongoose.connect(uri);

  const clinics = await Clinic.find({ isActive: { $ne: false } }).sort({ clinicCode: 1, name: 1 });
  const keepIds = [];
  const clinicTargetMap = new Map();

  for (const clinic of clinics) {
    const clinicSpecialtyIds = [];
    for (const name of SPECIALTY_NAMES) {
      const specialty = await Specialty.findOneAndUpdate(
        { clinicId: clinic._id, name },
        {
          $set: {
            clinicId: clinic._id,
            name,
            description: `Khám và tư vấn ${name.toLowerCase()} tại ${clinic.name}.`,
            image: SPECIALTY_IMAGES[normalizeVietnameseKey(name)] || '',
            isActive: true
          }
        },
        { new: true, upsert: true, setDefaultsOnInsert: true }
      );

      keepIds.push(specialty._id);
      clinicSpecialtyIds.push(specialty._id);
    }
    clinicTargetMap.set(String(clinic._id), clinicSpecialtyIds[0]);
    await Clinic.findByIdAndUpdate(clinic._id, { $set: { specialtyIds: clinicSpecialtyIds } });
  }

  const allSpecialties = await Specialty.find({});
  for (const specialty of allSpecialties) {
    const targetId = clinicTargetMap.get(String(specialty.clinicId));
    if (targetId) {
      await updateReferences(specialty._id, targetId);
    }
  }

  const deleteResult = await Specialty.deleteMany({ _id: { $nin: keepIds } });
  const remaining = await Specialty.find({}).sort({ clinicId: 1, name: 1 }).populate('clinicId', 'name clinicCode');

  console.log(`Specialties synchronized. Deleted ${deleteResult.deletedCount} old specialties.`);
  console.table(remaining.map((item) => ({
    clinic: item.clinicId?.clinicCode || item.clinicId?.name || String(item.clinicId),
    specialty: item.name
  })));

  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect();
  process.exit(1);
});
