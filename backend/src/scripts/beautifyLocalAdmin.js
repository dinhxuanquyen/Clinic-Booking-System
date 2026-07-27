import 'dotenv/config';
import mongoose from 'mongoose';
import User from '../models/central/User.js';

const LOCAL_URI = process.env.CENTRAL_MONGO_URI || process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/clinic_central';
const ADMIN_EMAIL = 'quantri@clinicbooking.vn';
const ADMIN_PASSWORD = 'ClinicAdmin@2026';

async function main() {
  await mongoose.connect(LOCAL_URI);

  const now = new Date();
  const currentAdmin =
    (await User.findOne({ email: ADMIN_EMAIL })) ||
    (await User.findOne({ email: 'admin@example.com' })) ||
    (await User.findOne({ role: 'admin' }));

  if (!currentAdmin) {
    await User.create({
      name: 'Quản trị hệ thống',
      email: ADMIN_EMAIL,
      phone: '0901000000',
      avatar: '/avatars/admin-avatar.svg',
      address: 'Bộ phận quản trị hệ thống phòng khám',
      gender: '',
      password: ADMIN_PASSWORD,
      role: 'admin',
      isEmailVerified: true,
      isActive: true,
      mustChangePassword: false,
      passwordChangedAt: now,
      lastLoginAt: now
    });
  } else {
    currentAdmin.name = 'Quản trị hệ thống';
    currentAdmin.email = ADMIN_EMAIL;
    currentAdmin.phone = '0901000000';
    currentAdmin.avatar = '/avatars/admin-avatar.svg';
    currentAdmin.address = 'Bộ phận quản trị hệ thống phòng khám';
    currentAdmin.gender = '';
    currentAdmin.password = ADMIN_PASSWORD;
    currentAdmin.role = 'admin';
    currentAdmin.isEmailVerified = true;
    currentAdmin.isActive = true;
    currentAdmin.mustChangePassword = false;
    currentAdmin.temporaryPasswordCreatedAt = null;
    currentAdmin.initialPasswordChangedAt = now;
    currentAdmin.passwordChangedAt = now;
    currentAdmin.lastLoginAt = now;
    await currentAdmin.save();
  }

  const activeAdmin = await User.findOne({ email: ADMIN_EMAIL });
  await User.deleteMany({
    role: 'admin',
    _id: { $ne: activeAdmin._id },
    email: { $in: ['admin@example.com', 'admin@clinicbooking.vn'] }
  });

  console.log('Local admin account is ready.');
  console.log(`Email: ${ADMIN_EMAIL}`);
  console.log(`Password: ${ADMIN_PASSWORD}`);
  console.log('Avatar: /avatars/admin-avatar.svg');

  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
