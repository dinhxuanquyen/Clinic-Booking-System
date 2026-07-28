import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import { connectCentralDb } from '../config/db.js';
import Doctor from '../models/doctorModel.js';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, '../../..');
const doctorsAssetsRoot = path.join(projectRoot, 'frontend', 'public', 'static-assets', 'doctors');

const avatarRestorations = [
  ['6a5cef13f891dd22e96dee8f', '1784631689686-fd2ad3e9.webp'],
  ['6a5d05c40cad59bce1ca7018', '1784481190061-a56aac2d.jpg'],
  ['6a678ee8d66de77908687f61', '1785178459567-42a0130c.webp'],
  ['6a678ee8d66de77908687f66', '1785178131297-86879320.webp'],
  ['6a678ee8d66de77908687f6b', '1785178349105-3e73e4b0.jpg'],
  ['6a678ee8d66de77908687f70', '1785178381243-90aeadf5.jpg'],
  ['6a678ee9d66de77908687f75', '1785177975620-18ea1104.webp'],
  ['6a678ee9d66de77908687f7a', '1785177998539-0e1cb07b.webp'],
  ['6a678ee9d66de77908687f7f', '1785177831833-b1b70a10.webp'],
  ['6a678ee9d66de77908687f84', '1785177760283-6d0113b8.webp'],
  ['6a678eead66de77908687f89', '1785177612599-c5fb297c.webp'],
  ['6a678eead66de77908687f8e', '1785177454787-a8b9360d.webp']
];

function validateStaticAssets() {
  const missingFiles = avatarRestorations
    .map(([, fileName]) => fileName)
    .filter((fileName) => !fs.existsSync(path.join(doctorsAssetsRoot, fileName)));

  if (missingFiles.length) {
    throw new Error(`Thiếu file static: ${missingFiles.join(', ')}`);
  }
}

async function main() {
  if (process.env.CONFIRM_RESTORE_DOCTOR_AVATARS !== 'YES') {
    throw new Error('Đặt CONFIRM_RESTORE_DOCTOR_AVATARS=YES để xác nhận cập nhật 12 avatar.');
  }

  validateStaticAssets();
  await connectCentralDb();

  let updated = 0;
  let unchanged = 0;
  let missingDoctors = 0;

  for (const [doctorId, fileName] of avatarRestorations) {
    const doctor = await Doctor.findById(doctorId).select('_id name doctorCode avatar');
    if (!doctor) {
      missingDoctors += 1;
      console.warn(`Không tìm thấy Doctor ${doctorId}`);
      continue;
    }

    const avatar = `/static-assets/doctors/${fileName}`;
    if (doctor.avatar === avatar) {
      unchanged += 1;
      console.log(`Đã đúng: ${doctor.doctorCode || doctorId} - ${doctor.name}`);
      continue;
    }

    await Doctor.updateOne({ _id: doctorId }, { $set: { avatar } });
    updated += 1;
    console.log(`Đã phục hồi: ${doctor.doctorCode || doctorId} - ${doctor.name} -> ${avatar}`);
  }

  console.log(`Số avatar đã cập nhật: ${updated}`);
  console.log(`Số avatar đã đúng từ trước: ${unchanged}`);
  console.log(`Số bác sĩ không tìm thấy: ${missingDoctors}`);
}

main()
  .catch((error) => {
    console.error('Phục hồi avatar thất bại:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (mongoose.connection.readyState !== 0) await mongoose.connection.close();
  });
