import mongoose from 'mongoose';
import { connectCentralDb } from '../config/db.js';
import Specialty from '../models/specialtyModel.js';

const SPECIALTY_IMAGES = {
  nhi: '/specialties/photos/specialty-pediatrics.jpg',
  'nhi khoa': '/specialties/photos/specialty-pediatrics.jpg',
  'tim mach': '/specialties/photos/specialty-cardiology.jpg',
  'da lieu': '/specialties/photos/specialty-dermatology.jpg',
  'tai mui hong': '/specialties/photos/specialty-ent.jpg',
  tmh: '/specialties/photos/specialty-ent.jpg',
  'co xuong khop': '/specialties/photos/specialty-musculoskeletal.jpg',
  'chan thuong chinh hinh': '/specialties/illustrations/specialty-orthopedics.svg',
  'noi tong quat': '/specialties/photos/specialty-internal.jpg',
  'noi khoa': '/specialties/photos/specialty-internal.jpg',
  'tieu hoa': '/specialties/illustrations/specialty-gastroenterology.svg',
  'san phu khoa': '/specialties/photos/specialty-obgyn.jpg',
  'phu khoa': '/specialties/photos/specialty-obgyn.jpg',
  mat: '/specialties/photos/specialty-ophthalmology.jpg',
  'than kinh': '/specialties/photos/specialty-neurology.jpg',
  'ho hap': '/specialties/illustrations/specialty-respiratory.svg',
  'noi tiet': '/specialties/illustrations/specialty-endocrinology.svg',
  'tiet nieu': '/specialties/illustrations/specialty-urology.svg',
  'tam ly': '/specialties/illustrations/specialty-mental-health.svg',
  'tam than': '/specialties/illustrations/specialty-mental-health.svg',
  'suc khoe tam than': '/specialties/illustrations/specialty-mental-health.svg',
  'phuc hoi chuc nang': '/specialties/illustrations/specialty-rehabilitation.svg',
  'dinh duong': '/specialties/illustrations/specialty-nutrition.svg',
  'ung buou': '/specialties/illustrations/specialty-oncology.svg',
  'than hoc': '/specialties/illustrations/specialty-nephrology.svg',
  'rang ham mat': '/specialties/photos/specialty-dental.png',
  'nha khoa': '/specialties/photos/specialty-dental.png'
};

function normalizeVietnameseKey(value = '') {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function fixSpecialtyImages() {
  await connectCentralDb();

  const specialties = await Specialty.find({}).select('_id name image').lean();
  let updated = 0;
  let skipped = 0;

  for (const specialty of specialties) {
    const image = SPECIALTY_IMAGES[normalizeVietnameseKey(specialty.name)];
    if (!image) {
      skipped += 1;
      continue;
    }

    if (specialty.image === image) {
      skipped += 1;
      continue;
    }

    await Specialty.updateOne({ _id: specialty._id }, { $set: { image } });
    updated += 1;
  }

  console.log('Specialty image fix completed');
  console.log(`Updated: ${updated}`);
  console.log(`Skipped: ${skipped}`);
  await mongoose.connection.close();
}

fixSpecialtyImages().catch(async (error) => {
  console.error(error);
  await mongoose.connection.close();
  process.exit(1);
});
