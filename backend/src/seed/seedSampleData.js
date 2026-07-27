import mongoose from 'mongoose';
import { connectCentralDb, getClinicConnection } from '../config/db.js';
import User from '../models/central/User.js';
import Clinic from '../models/clinicModel.js';
import Specialty from '../models/specialtyModel.js';
import Doctor from '../models/doctorModel.js';
import Schedule from '../models/scheduleModel.js';
import Appointment from '../models/appointmentModel.js';
import WaitingList from '../models/waitingListModel.js';
import ServicePackage from '../models/servicePackageModel.js';
import MedicalRecord from '../models/medicalRecordModel.js';
import DoctorReview from '../models/doctorReviewModel.js';
import Notification from '../models/notificationModel.js';
import { getClinicModels } from '../models/clinic/models.js';
import { syncDoctorCodeCounter } from '../services/doctorCodeService.js';

const PASSWORD = 'Clinic@2026';
const DAY_MS = 24 * 60 * 60 * 1000;
const BASE_DATE = new Date('2026-07-20T00:00:00.000Z');
const TIME_SLOTS = [
  '08:00-08:30',
  '08:30-09:00',
  '09:00-09:30',
  '09:30-10:00',
  '10:00-10:30',
  '10:30-11:00',
  '14:00-14:30',
  '14:30-15:00',
  '15:00-15:30',
  '15:30-16:00'
];
const DEFAULT_WORKING_HOURS = [
  { dayOfWeek: 'monday', open: '08:00', close: '17:00' },
  { dayOfWeek: 'tuesday', open: '08:00', close: '17:00' },
  { dayOfWeek: 'wednesday', open: '08:00', close: '17:00' },
  { dayOfWeek: 'thursday', open: '08:00', close: '17:00' },
  { dayOfWeek: 'friday', open: '08:00', close: '17:00' },
  { dayOfWeek: 'saturday', open: '08:00', close: '12:00' },
  { dayOfWeek: 'sunday', open: '08:00', close: '12:00', isClosed: true }
];

const CLINIC_IMAGES = [
  'https://cdn.phenikaamec.com/phenikaa-mec/image/5-14-2025/38e1d909-5654-4058-b72d-093375226581-image.webp',
  'https://cdn.phenikaamec.com/phenikaa-mec/image/5-15-2025/09f20d6c-5d67-4b7a-b852-63675cb10c68b-image.webp',
  'https://cdn.phenikaamec.com/phenikaa-mec/image/4-14-2025/7f9ddfee-3eb4-412b-8a12-735991616b8e-image.webp',
  'https://cdn.phenikaamec.com/phenikaa-mec/image/6-20-2025/15-158e1e64-e4f0-4763-8993-0db6e75dd6bf-image.webp',
  'https://cdn.phenikaamec.com/phenikaa-mec/image/6-24-2025/1f9dedaa-f220-4797-b036-b047026f33a4-image.webp',
  'https://cdn.phenikaamec.com/phenikaa-mec/image/6-24-2025/166-62ac563f-9306-4937-a7cd-99c83ee7e525-image.webp',
  'https://cdn.phenikaamec.com/phenikaa-mec/image/6-24-2025/15-87f6166e-80c2-442e-89e1-e5bbdaea7c9-image.webp',
  'https://cdn.phenikaamec.com/phenikaa-mec/image/6-24-2025/132-21794695-04f7-4f4e-9c8d-60815ee4e3e0-image.webp',
  'https://cdn.phenikaamec.com/phenikaa-mec/image/6-24-2025/ct-4ced2d3d-087e-4c6d-b804-137750c89c56-image.webp',
  'https://cdn.phenikaamec.com/phenikaa-mec/image/5-14-2025/38e1d909-5654-4058-b72d-093375226581-image.webp'
];

const CLINIC_GALLERY_IMAGES = [
  [CLINIC_IMAGES[0], CLINIC_IMAGES[3], CLINIC_IMAGES[8]],
  [CLINIC_IMAGES[1], CLINIC_IMAGES[4], CLINIC_IMAGES[6]],
  [CLINIC_IMAGES[2], CLINIC_IMAGES[5], CLINIC_IMAGES[7]],
  [CLINIC_IMAGES[3], CLINIC_IMAGES[8], CLINIC_IMAGES[0]],
  [CLINIC_IMAGES[4], CLINIC_IMAGES[6], CLINIC_IMAGES[1]],
  [CLINIC_IMAGES[5], CLINIC_IMAGES[7], CLINIC_IMAGES[2]],
  [CLINIC_IMAGES[6], CLINIC_IMAGES[1], CLINIC_IMAGES[4]],
  [CLINIC_IMAGES[7], CLINIC_IMAGES[2], CLINIC_IMAGES[5]],
  [CLINIC_IMAGES[8], CLINIC_IMAGES[0], CLINIC_IMAGES[3]],
  [CLINIC_IMAGES[0], CLINIC_IMAGES[8], CLINIC_IMAGES[6]]
];

const DOCTOR_AVATARS = [
  'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1594824476967-48c8b964273f?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1582750433449-648ed127bb54?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1651008376811-b90baee60c1f?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1584467735871-8e85353a8413?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1550831107-1553da8c8464?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1622902046580-2b47f47f5471?auto=format&fit=crop&w=800&q=80'
];

const SPECIALTY_IMAGES = {
  nhi: '/specialties/photos/specialty-pediatrics.jpg',
  'nhi khoa': '/specialties/photos/specialty-pediatrics.jpg',
  'tim mach': '/specialties/photos/specialty-cardiology.jpg',
  'da lieu': '/specialties/photos/specialty-dermatology.jpg',
  'tai mui hong': '/specialties/photos/specialty-ent.jpg',
  'co xuong khop': '/specialties/photos/specialty-musculoskeletal.jpg',
  'san phu khoa': '/specialties/photos/specialty-obgyn.jpg',
  'noi tong quat': '/specialties/photos/specialty-internal.jpg',
  mat: '/specialties/photos/specialty-ophthalmology.jpg',
  'rang ham mat': '/specialties/photos/specialty-dental.png',
  'than kinh': '/specialties/photos/specialty-neurology.jpg'
};

function normalizeVietnameseKey(value) {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();
}

function dateOffset(offset) {
  return new Date(BASE_DATE.getTime() + offset * DAY_MS).toISOString().slice(0, 10);
}

function pick(items, index) {
  return items[index % items.length];
}

async function ensureUser(seed) {
  const lookupConditions = [{ email: seed.email }];
  if (seed.phone) {
    lookupConditions.push({ phone: seed.phone });
  }

  const existing = await User.findOne({ $or: lookupConditions });
  if (existing) {
    const profile = { ...seed };
    if (!profile.password) {
      delete profile.password;
    }
    Object.assign(existing, profile);
    await existing.save();
    return User.findById(existing._id);
  }
  return User.create({ ...seed, password: PASSWORD, isEmailVerified: true });
}

async function ensureClinic(seed) {
  return Clinic.findOneAndUpdate(
    { clinicCode: seed.clinicCode },
    { $set: seed },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
}

async function ensureSpecialty(seed) {
  return Specialty.findOneAndUpdate(
    { clinicId: seed.clinicId, name: seed.name },
    { $set: seed },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
}

async function ensureDoctor(seed) {
  return Doctor.findOneAndUpdate(
    { doctorCode: seed.doctorCode },
    { $set: seed },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
}

function appointmentTimestamps(status, actorId) {
  const now = new Date('2026-07-18T09:00:00.000Z');
  const payload = {};
  if (['confirmed', 'in_progress', 'completed', 'cancel_requested', 'reschedule_requested'].includes(status)) {
    payload.confirmedAt = now;
    payload.confirmedBy = actorId;
  }
  if (status === 'in_progress' || status === 'completed') {
    payload.startedAt = new Date(now.getTime() + 30 * 60 * 1000);
    payload.startedBy = actorId;
    payload.consultationStatus = status === 'completed' ? 'completed' : 'in_progress';
  }
  if (status === 'completed') {
    payload.completedAt = new Date(now.getTime() + 70 * 60 * 1000);
    payload.completedBy = actorId;
    payload.finishConsultationAt = payload.completedAt;
  }
  if (status === 'cancelled') {
    payload.cancelledAt = now;
    payload.cancelledBy = actorId;
    payload.cancelReason = 'Benh nhan ban viec dot xuat';
    payload.paymentStatus = 'cancelled';
  }
  if (status === 'no_show') {
    payload.noShowAt = now;
    payload.noShowAuto = true;
    payload.consultationStatus = 'skipped';
  }
  if (status === 'cancel_requested') {
    payload.cancelRequestedAt = now;
    payload.cancelRequest = {
      reason: 'Benh nhan muon huy lich vi trung lich ca nhan',
      requestedAt: now
    };
  }
  if (status === 'reschedule_requested') {
    payload.rescheduleRequestedAt = now;
    payload.rescheduleRequest = {
      oldDate: dateOffset(2),
      oldTimeSlot: '08:00-08:30',
      newDate: dateOffset(5),
      newTimeSlot: '14:00-14:30',
      reason: 'Benh nhan muon doi sang buoi chieu',
      requestedAt: now
    };
  }
  return payload;
}

async function ensureAppointment(seed) {
  return Appointment.findOneAndUpdate(
    {
      clinicId: seed.clinicId,
      doctorId: seed.doctorId,
      date: seed.date,
      timeSlot: seed.timeSlot
    },
    { $set: seed },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
}

async function mirrorClinicData({ appointments, doctors, patients }) {
  const connections = new Map();

  for (const doctor of doctors) {
    const key = String(doctor.clinicId);
    const connection = connections.get(key) || (await getClinicConnection(doctor.clinicId));
    connections.set(key, connection);
    const { Doctor: ClinicDoctor } = getClinicModels(connection);
    await ClinicDoctor.findByIdAndUpdate(
      doctor._id,
      {
        _id: doctor._id,
        clinicId: doctor.clinicId,
        name: doctor.name,
        email: doctor.email,
        personalEmail: doctor.personalEmail,
        loginEmail: doctor.loginEmail,
        doctorCode: doctor.doctorCode,
        phone: doctor.phone,
        avatarUrl: doctor.avatar,
        degree: doctor.degree,
        specialtyId: doctor.specialtyId,
        experienceYears: doctor.experienceYears,
        description: doctor.description,
        workingDays: doctor.workingDays,
        workingHours: doctor.workingHours,
        isActive: doctor.isActive
      },
      { upsert: true, new: true }
    );
  }

  for (const appointment of appointments) {
    const key = String(appointment.clinicId);
    const connection = connections.get(key) || (await getClinicConnection(appointment.clinicId));
    connections.set(key, connection);
    const { Patient: ClinicPatient, Appointment: ClinicAppointment } = getClinicModels(connection);
    const patient = patients.find((item) => item._id.equals(appointment.patientId));
    if (!patient) continue;

    const clinicPatient = await ClinicPatient.findOneAndUpdate(
      { clinicId: appointment.clinicId, userId: patient._id },
      {
        clinicId: appointment.clinicId,
        userId: patient._id,
        name: patient.name,
        email: patient.email,
        phone: patient.phone,
        dateOfBirth: patient.dateOfBirth ? new Date(patient.dateOfBirth) : undefined,
        gender: patient.gender || 'unknown'
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    await ClinicAppointment.findByIdAndUpdate(
      appointment._id,
      {
        _id: appointment._id,
        clinicId: appointment.clinicId,
        doctorId: appointment.doctorId,
        patientId: clinicPatient._id,
        specialtyId: appointment.specialtyId,
        servicePackageId: appointment.servicePackageId,
        servicePackageSnapshot: appointment.servicePackageSnapshot,
        date: appointment.date,
        timeSlot: appointment.timeSlot,
        reason: appointment.reason,
        status: appointment.status,
        queueNumber: appointment.queueNumber,
        consultationStatus: appointment.consultationStatus,
        isFollowUp: appointment.isFollowUp,
        followUpRecordId: appointment.followUpRecordId,
        followUpType: appointment.followUpType
      },
      { upsert: true, new: true }
    );
  }

  await Promise.all([...connections.values()].map((connection) => connection.close()));
}

async function seedSampleData() {
  await connectCentralDb();

  const admin = await ensureUser({
    name: 'Quản trị hệ thống',
    email: 'quantri@clinicbooking.vn',
    phone: '0901000000',
    avatar: '/avatars/admin-avatar.svg',
    address: 'Bộ phận quản trị hệ thống phòng khám',
    password: 'ClinicAdmin@2026',
    role: 'admin',
    isEmailVerified: true,
    isActive: true,
    mustChangePassword: false
  });

  const clinicSeeds = [
    { name: 'Phòng khám Hải Phòng Care', clinicCode: 'HP', address: '88 Lê Hồng Phong, Ngô Quyền, Hải Phòng', phone: '02253000004', email: 'haiphongcare@clinicbooking.vn', description: 'Cơ sở khám Nhi, Tai Mũi Họng và Da liễu tại Hải Phòng.' },
    { name: 'Phòng khám Từ Sơn', clinicCode: 'MT', address: '25 Lý Thái Tổ, Bắc Ninh', phone: '02223000003', email: 'tuson@clinicbooking.vn', description: 'Cơ sở khám tổng quát và theo dõi bệnh mạn tính tại Bắc Ninh.' },
    { name: 'Phòng khám Phenikaa', clinicCode: 'PK', address: 'Đường Nguyễn Trác, Yên Nghĩa, Hà Nội', phone: '02430000001', email: 'phenikaa@clinicbooking.vn', description: 'Cơ sở chính hỗ trợ đặt lịch, khám chuyên khoa và quản lý hồ sơ sức khỏe.' },
    { name: 'Phòng khám An Khang Hà Nội', clinicCode: 'AK', address: '12 Trần Duy Hưng, Cầu Giấy, Hà Nội', phone: '02430000002', email: 'ankhang@clinicbooking.vn', description: 'Phòng khám đa khoa phục vụ bệnh nhân nội thành Hà Nội.' },
    { name: 'Phòng khám Sông Hàn', clinicCode: 'SH', address: '02 Bạch Đằng, Hải Châu, Đà Nẵng', phone: '02363000005', email: 'songhan@clinicbooking.vn', description: 'Phòng khám miền Trung với lịch khám linh hoạt trong tuần.' },
    { name: 'Phòng khám Sài Gòn Plus', clinicCode: 'SG', address: '99 Nguyễn Thị Minh Khai, Quận 3, TP. Hồ Chí Minh', phone: '02830000006', email: 'saigonplus@clinicbooking.vn', description: 'Cơ sở khám chuyên khoa và tư vấn sức khỏe tại TP. Hồ Chí Minh.' },
    { name: 'Phòng khám Cửu Long', clinicCode: 'CL', address: '15 Hòa Bình, Ninh Kiều, Cần Thơ', phone: '02923000007', email: 'cuulong@clinicbooking.vn', description: 'Cơ sở miền Tây phục vụ khám tổng quát và tái khám định kỳ.' },
    { name: 'Phòng khám Green Health', clinicCode: 'GH', address: '36 Nguyễn Văn Linh, Thanh Khê, Đà Nẵng', phone: '02363000008', email: 'greenhealth@clinicbooking.vn', description: 'Cơ sở tập trung chăm sóc sức khỏe gia đình và dự phòng.' },
    { name: 'Phòng khám Tâm An', clinicCode: 'TA', address: '41 Nguyễn Huệ, Huế', phone: '02343000009', email: 'taman@clinicbooking.vn', description: 'Phòng khám thân thiện, hỗ trợ đặt lịch và theo dõi hồ sơ điện tử.' },
    { name: 'Phòng khám Bình Minh', clinicCode: 'BM', address: '18 Quang Trung, Nha Trang, Khánh Hòa', phone: '02583000010', email: 'binhminh@clinicbooking.vn', description: 'Cơ sở khám ngoại trú dành cho bệnh nhân đặt lịch trước.' }
  ];
  const clinics = await Promise.all(clinicSeeds.map((clinic, index) => ensureClinic({
    ...clinic,
    image: CLINIC_IMAGES[index],
    galleryImages: CLINIC_GALLERY_IMAGES[index],
    workingHours: DEFAULT_WORKING_HOURS,
    displayOrder: index + 1
  })));

  const specialtyNames = ['Nhi', 'Tim mạch', 'Da liễu', 'Tai mũi họng', 'Cơ xương khớp', 'Sản phụ khoa', 'Nội tổng quát', 'Mắt', 'Răng hàm mặt', 'Thần kinh'];
  const specialties = [];
  for (const clinic of clinics) {
    const clinicSpecialtyIds = [];
    for (const name of specialtyNames) {
      const specialty = await ensureSpecialty({
        clinicId: clinic._id,
        name,
        description: `Khám và tư vấn ${name.toLowerCase()} tại ${clinic.name}.`,
        image: SPECIALTY_IMAGES[normalizeVietnameseKey(name)] || CLINIC_IMAGES[0]
      });
      specialties.push(specialty);
      clinicSpecialtyIds.push(specialty._id);
    }
    await Clinic.findByIdAndUpdate(clinic._id, {
      specialtyIds: clinicSpecialtyIds
    });
  }

  const doctorNames = [
    'Đinh Minh Quốc',
    'Nguyễn Minh Khoa',
    'Trần Thu Hà',
    'Phạm Hoàng Nam',
    'Lê Minh Anh',
    'Đỗ Quang Huy',
    'Vũ Lan Chi',
    'Nguyễn Bảo Châu',
    'Hoàng Đức Anh',
    'Phan Mai Linh'
  ];

  const patientNames = [
    'Nguyen Van An',
    'Tran Minh Chau',
    'Le Hoang Phuc',
    'Pham Thu Trang',
    'Hoang Gia Bao',
    'Do Anh Thu',
    'Bui Quang Huy',
    'Vu Ngoc Mai',
    'Dang Thanh Tam',
    'Phan Khanh Linh',
    'Ngo Duc Anh',
    'Truong Bao Ngoc',
    'Ly Minh Quan',
    'Ta Ha My',
    'Cao Tuan Kiet',
    'Mai Phuong Anh',
    'Dinh Quoc Minh',
    'Nguyen Hai Yen',
    'Tran Duc Long',
    'Le Nhat Minh',
    'Pham Ngoc Han',
    'Hoang Tien Dat',
    'Do Khanh Vy',
    'Bui Minh Tri',
    'Vu Thanh Ngan',
    'Dang Hoai Nam',
    'Phan Tue Lam',
    'Ngo Bao Chau',
    'Truong Anh Khoa',
    'Ly Thao Nguyen'
  ];

  const packageNamesBySpecialty = {
    'Nhi': ['Gói khám Nhi tổng quát', 'Gói tư vấn dinh dưỡng và tăng trưởng Nhi', 'Gói theo dõi sức khỏe trẻ em'],
    'Tim mạch': ['Gói tầm soát Tim mạch cơ bản', 'Gói theo dõi huyết áp và nguy cơ tim mạch', 'Gói tư vấn sức khỏe Tim mạch'],
    'Da liễu': ['Gói khám Da liễu tổng quát', 'Gói chăm sóc và tư vấn Da liễu', 'Gói điều trị mụn và viêm da'],
    'Tai mũi họng': ['Gói khám Tai Mũi Họng tổng quát', 'Gói tầm soát viêm xoang và ho kéo dài', 'Gói tư vấn sức khỏe Tai Mũi Họng'],
    'Cơ xương khớp': ['Gói khám Cơ xương khớp tổng quát', 'Gói tư vấn đau lưng và đau khớp', 'Gói theo dõi phục hồi vận động'],
    'Sản phụ khoa': ['Gói khám Sản phụ khoa cơ bản', 'Gói tư vấn sức khỏe phụ nữ', 'Gói theo dõi phụ khoa định kỳ'],
    'Nội tổng quát': ['Gói khám Nội tổng quát', 'Gói tầm soát sức khỏe cơ bản', 'Gói tư vấn bệnh lý nội khoa'],
    'Mắt': ['Gói khám Mắt tổng quát', 'Gói tầm soát thị lực', 'Gói tư vấn sức khỏe mắt']
  };

  function buildPackageName(specialtyName, index) {
    const names = packageNamesBySpecialty[specialtyName] || ['Goi kham suc khoe tong quat'];
    return names[index % names.length];
  }

  const doctorUsers = [];
  const doctors = [];
  for (let index = 0; index < doctorNames.length; index += 1) {
    const clinic = pick(clinics, index);
    const specialty = specialties.find((item) => item.clinicId.equals(clinic._id) && item.name === pick(specialtyNames, index));
    const doctorCode = `DR${String(9001 + index).padStart(4, '0')}`;
    const email = `bacsi${String(index + 1).padStart(2, '0')}@clinicbooking.vn`;
    const user = await ensureUser({
      name: doctorNames[index],
      email,
      role: 'doctor',
      clinicId: clinic._id,
      isEmailVerified: true,
      isActive: true
    });
    const doctor = await ensureDoctor({
      name: doctorNames[index],
      email,
      personalEmail: email,
      loginEmail: email,
      doctorCode,
      phone: `0909${String(index + 1).padStart(6, '0')}`,
      avatar: DOCTOR_AVATARS[index],
      degree: index % 3 === 0 ? 'Thạc sĩ, Bác sĩ' : index % 3 === 1 ? 'Bác sĩ chuyên khoa I' : 'Bác sĩ',
      position: index % 4 === 0 ? 'Trưởng khoa' : 'Bác sĩ điều trị',
      workplace: clinic.name,
      bio: 'Bác sĩ có kinh nghiệm khám và tư vấn bệnh nhân theo quy trình đặt lịch trực tuyến.',
      description: 'Hỗ trợ khám, tư vấn điều trị và lập kế hoạch tái khám rõ ràng.',
      experienceYears: 4 + (index % 10),
      ratingAverage: 4.3 + (index % 5) * 0.1,
      ratingCount: 6 + index,
      clinicId: clinic._id,
      specialtyId: specialty._id,
      workingDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'],
      workingHours: { start: '08:00', end: '17:00' },
      isActive: true
    });
    await User.findByIdAndUpdate(user._id, { doctorId: doctor._id, clinicId: clinic._id });
    doctorUsers.push(user);
    doctors.push(doctor);
  }

  const patients = [];
  for (let index = 0; index < 30; index += 1) {
    patients.push(await ensureUser({
      name: patientNames[index],
      email: `benhnhan${String(index + 1).padStart(2, '0')}@clinicbooking.vn`,
      phone: `0918${String(index + 1).padStart(6, '0')}`,
      role: 'patient',
      gender: index % 2 === 0 ? 'male' : 'female',
      dateOfBirth: `${1985 + (index % 20)}-${String((index % 12) + 1).padStart(2, '0')}-15`,
      insuranceEnabled: index % 3 === 0,
      insuranceNumber: index % 3 === 0 ? `DN401${String(index + 1).padStart(9, '0')}` : '',
      insuranceRegisteredHospital: index % 3 === 0 ? 'Benh vien Da khoa Trung tam' : '',
      insuranceExpiryDate: index % 3 === 0 ? new Date('2027-12-31T00:00:00.000Z') : null,
      isEmailVerified: true,
      isActive: true
    }));
  }

  await Promise.all([
    Appointment.deleteMany({ $or: [{ patientId: { $in: patients.map((item) => item._id) } }, { doctorId: { $in: doctors.map((item) => item._id) } }] }),
    MedicalRecord.deleteMany({ $or: [{ patientId: { $in: patients.map((item) => item._id) } }, { doctorId: { $in: doctors.map((item) => item._id) } }] }),
    DoctorReview.deleteMany({ $or: [{ patientId: { $in: patients.map((item) => item._id) } }, { doctorId: { $in: doctors.map((item) => item._id) } }] }),
    WaitingList.deleteMany({ $or: [{ patientId: { $in: patients.map((item) => item._id) } }, { doctorId: { $in: doctors.map((item) => item._id) } }] }),
    Notification.deleteMany({ $or: [{ userId: { $in: [...patients.map((item) => item._id), ...doctorUsers.map((item) => item._id), admin._id] } }, { doctorId: { $in: doctors.map((item) => item._id) } }] }),
    Schedule.deleteMany({ doctorId: { $in: doctors.map((item) => item._id) } })
  ]);

  const packages = [];
  await ServicePackage.deleteMany({ code: /^PKG-CARE-/i });
  for (let index = 0; index < 10; index += 1) {
    const specialty = pick(specialties, index);
    const doctor = doctors.find((item) => item.specialtyId.equals(specialty._id));
    const packageCode = `PKG-CARE-${String(index + 1).padStart(3, '0')}`;
    packages.push(await ServicePackage.findOneAndUpdate(
      { code: packageCode },
      {
        code: packageCode,
        name: buildPackageName(specialty.name, index),
        description: 'Goi kham duoc thiet ke de ho tro tu van, tham kham va lap ke hoach cham soc phu hop.',
        targetPatients: ['Benh nhan can kham theo lich', 'Benh nhan can tu van ban dau'],
        includes: ['Kham voi bac si chuyen khoa', 'Tu van huong dieu tri', 'Ho tro tai PDF'],
        price: 250000 + (index % 6) * 50000,
        durationMinutes: index % 3 === 0 ? 45 : 30,
        clinicId: specialty.clinicId,
        specialtyId: specialty._id,
        doctorId: index % 4 === 0 ? doctor?._id || null : null,
        isActive: true,
        isDeleted: false,
        createdBy: admin._id,
        updatedBy: admin._id
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    ));
  }

  const schedules = [];
  for (const doctor of doctors) {
    for (let offset = -3; offset <= 10; offset += 1) {
      schedules.push({
        doctorId: doctor._id,
        clinicId: doctor.clinicId,
        date: dateOffset(offset),
        workingHours: { start: '08:00', end: '17:00' },
        slotDuration: 30,
        isWorkingDay: ![-1, 6].includes(offset % 7),
        note: offset < 0 ? 'Lich da thuc hien' : 'Lich lam viec dinh ky'
      });
    }
  }
  await Schedule.insertMany(schedules, { ordered: false });

  const statusPlan = [
    ...Array(18).fill('pending'),
    ...Array(24).fill('confirmed'),
    ...Array(12).fill('in_progress'),
    ...Array(32).fill('completed'),
    ...Array(12).fill('cancelled'),
    ...Array(10).fill('no_show'),
    ...Array(8).fill('cancel_requested'),
    ...Array(8).fill('reschedule_requested')
  ];

  const appointments = [];
  const usedSlots = new Set();
  for (let index = 0; index < statusPlan.length; index += 1) {
    const status = statusPlan[index];
    const doctor = pick(doctors, index);
    const patient = pick(patients, index * 3);
    const specialty = specialties.find((item) => item._id.equals(doctor.specialtyId));
    const servicePackage = pick(packages, index);
    let date = dateOffset((index % 38) - 18);
    let timeSlot = pick(TIME_SLOTS, index);
    let slotKey = `${doctor._id}-${date}-${timeSlot}`;
    let guard = 0;
    while (usedSlots.has(slotKey)) {
      guard += 1;
      date = dateOffset(((index + guard) % 38) - 18);
      timeSlot = pick(TIME_SLOTS, index + guard);
      slotKey = `${doctor._id}-${date}-${timeSlot}`;
    }
    usedSlots.add(slotKey);

    const appointment = await ensureAppointment({
      patientId: patient._id,
      doctorId: doctor._id,
      clinicId: doctor.clinicId,
      specialtyId: doctor.specialtyId,
      servicePackageId: servicePackage?._id || null,
      servicePackageSnapshot: servicePackage ? {
        _id: servicePackage._id,
        name: servicePackage.name,
        code: servicePackage.code,
        description: servicePackage.description,
        price: servicePackage.price,
        durationMinutes: servicePackage.durationMinutes,
        clinicId: servicePackage.clinicId,
        specialtyId: servicePackage.specialtyId,
        doctorId: servicePackage.doctorId
      } : undefined,
      insuranceSnapshot: patient.insuranceEnabled ? {
        enabled: true,
        insuranceNumber: patient.insuranceNumber,
        insuranceExpiryDate: patient.insuranceExpiryDate,
        insuranceRegisteredHospital: patient.insuranceRegisteredHospital
      } : { enabled: false },
      patientInfo: {
        name: patient.name,
        email: patient.email,
        phone: patient.phone,
        gender: patient.gender,
        dateOfBirth: patient.dateOfBirth
      },
      date,
      timeSlot,
      reason: index % 4 === 0 ? 'Tai kham theo hen' : index % 4 === 1 ? 'Dau dau, met moi' : index % 4 === 2 ? 'Kham tong quat' : 'Tu van trieu chung',
      status,
      queueNumber: ['confirmed', 'in_progress', 'completed'].includes(status) ? (index % 12) + 1 : undefined,
      consultationStatus: status === 'in_progress' ? 'in_progress' : status === 'completed' ? 'completed' : status === 'no_show' ? 'skipped' : 'waiting',
      paymentStatus: status === 'cancelled' ? 'cancelled' : index % 5 === 0 ? 'paid_at_clinic' : 'unpaid',
      paymentMethod: 'clinic',
      ...appointmentTimestamps(status, admin._id)
    });
    appointments.push(appointment);
  }

  const completedAppointments = appointments.filter((item) => item.status === 'completed');
  const records = [];
  for (let index = 0; index < Math.min(30, completedAppointments.length); index += 1) {
    const appointment = completedAppointments[index];
    records.push(await MedicalRecord.create({
      appointmentId: appointment._id,
      patientId: appointment.patientId,
      doctorId: appointment.doctorId,
      clinicId: appointment.clinicId,
      specialtyId: appointment.specialtyId,
      symptoms: index % 2 === 0 ? 'Dau dau, mat ngu, met moi keo dai 3 ngay.' : 'Kham dinh ky va theo doi dieu tri.',
      vitals: index % 3 === 0 ? { bloodPressure: '120/80', heartRate: 78, temperature: 36.7, spo2: 98, height: 168, weight: 62, bmi: 22 } : {},
      allergies: index % 5 === 0 ? 'Di ung penicillin' : '',
      icd10Code: index % 4 === 0 ? 'J06.9' : '',
      diagnosis: index % 2 === 0 ? 'Viem duong ho hap tren cap' : 'Theo doi sau dieu tri',
      conclusion: 'Tinh trang on dinh, tiep tuc theo doi va dung thuoc theo huong dan.',
      prescription: index % 3 === 0 ? [
        { medicineName: 'Paracetamol 500mg', dosage: '1 vien', frequency: '2 lan/ngay', duration: '3 ngay', note: 'Dung sau an' },
        { medicineName: 'Vitamin C', dosage: '1 vien', frequency: '1 lan/ngay', duration: '7 ngay', note: '' }
      ] : [],
      attachments: index % 6 === 0 ? [
        { name: 'Ket qua xet nghiem mau.pdf', type: 'pdf', url: '/uploads/medical-records/xet-nghiem-mau.pdf' }
      ] : [],
      advice: 'Uong du nuoc, nghi ngoi, tai kham neu trieu chung tang.',
      followUpRequired: index < 15,
      followUpDate: index < 15 ? new Date(`${dateOffset(index < 5 ? -2 : 7)}T00:00:00.000Z`) : null,
      followUpStatus: index < 5 ? 'overdue' : index < 10 ? 'recommended' : index < 15 ? 'scheduled' : 'none',
      note: 'Ghi chu noi bo danh cho bac si phu trach',
      createdBy: admin._id,
      updatedBy: admin._id
    }));
  }

  for (let index = 10; index < 15 && index < records.length; index += 1) {
    const record = records[index];
    const doctor = doctors.find((item) => item._id.equals(record.doctorId));
    const patient = patients.find((item) => item._id.equals(record.patientId));
    let followUpDate = dateOffset(8 + index);
    let followUpTimeSlot = pick(TIME_SLOTS, index + 4);
    let followUpSlotKey = `${doctor?._id || record.doctorId}-${followUpDate}-${followUpTimeSlot}`;
    let followUpGuard = 0;
    while (usedSlots.has(followUpSlotKey)) {
      followUpGuard += 1;
      followUpDate = dateOffset(8 + index + followUpGuard);
      followUpTimeSlot = pick(TIME_SLOTS, index + 4 + followUpGuard);
      followUpSlotKey = `${doctor?._id || record.doctorId}-${followUpDate}-${followUpTimeSlot}`;
    }

    const followUp = await ensureAppointment({
      patientId: record.patientId,
      doctorId: record.doctorId,
      clinicId: record.clinicId,
      specialtyId: record.specialtyId,
      date: followUpDate,
      timeSlot: followUpTimeSlot,
      reason: 'Tai kham theo chi dinh bac si',
      status: 'confirmed',
      queueNumber: index + 1,
      consultationStatus: 'waiting',
      isFollowUp: true,
      followUpRecordId: record._id,
      followUpType: 'doctor_recommended',
      patientInfo: {
        name: patient?.name,
        email: patient?.email,
        phone: patient?.phone,
        gender: patient?.gender,
        dateOfBirth: patient?.dateOfBirth
      },
      confirmedAt: new Date('2026-07-18T10:00:00.000Z'),
      confirmedBy: admin._id
    });
    record.followUpAppointmentId = followUp._id;
    await record.save();
    appointments.push(followUp);
    usedSlots.add(followUpSlotKey);
  }

  for (let index = 0; index < Math.min(30, completedAppointments.length); index += 1) {
    const appointment = completedAppointments[index];
    await DoctorReview.create({
      appointmentId: appointment._id,
      doctorId: appointment.doctorId,
      patientId: appointment.patientId,
      clinicId: appointment.clinicId,
      specialtyId: appointment.specialtyId,
      rating: 4 + (index % 2),
      comment: index % 2 === 0 ? 'Bac si tu van ro rang, quy trinh kham thuan tien.' : 'Phong kham sach se, thoi gian cho hop ly.',
      isVisible: true
    });
  }

  for (let index = 0; index < 15; index += 1) {
    const doctor = pick(doctors, index + 2);
    const patient = pick(patients, index + 5);
    await WaitingList.create({
      patientId: patient._id,
      doctorId: doctor._id,
      clinicId: doctor.clinicId,
      specialtyId: doctor.specialtyId,
      date: dateOffset(3 + (index % 8)),
      timeSlot: pick(TIME_SLOTS, index + 1),
      position: index + 1,
      status: index % 5 === 0 ? 'offered' : 'waiting',
      offeredAt: index % 5 === 0 ? new Date('2026-07-18T08:00:00.000Z') : undefined,
      offerExpiresAt: index % 5 === 0 ? new Date('2026-07-18T20:00:00.000Z') : undefined
    });
  }

  await Notification.create([
    {
      userId: patients[0]._id,
      role: 'patient',
      title: 'Lich kham sap toi',
      message: 'Ban co lich kham da duoc xac nhan tren he thong.',
      type: 'appointment_confirmed',
      isRead: false
    },
    {
      userId: admin._id,
      role: 'admin',
      title: 'Co yeu cau can xu ly',
      message: 'He thong co yeu cau huy lich va doi lich dang cho xu ly.',
      type: 'cancel_request',
      isRead: false
    },
    {
      doctorId: doctors[0]._id,
      role: 'doctor',
      title: 'Co danh gia moi',
      message: 'Benh nhan vua gui danh gia sau kham.',
      type: 'doctor_review_available',
      isRead: false
    }
  ]);

  const reviewStats = await DoctorReview.aggregate([
    { $match: { doctorId: { $in: doctors.map((item) => item._id) } } },
    { $group: { _id: '$doctorId', average: { $avg: '$rating' }, count: { $sum: 1 } } }
  ]);
  for (const stat of reviewStats) {
    await Doctor.findByIdAndUpdate(stat._id, {
      ratingAverage: Math.round(stat.average * 10) / 10,
      ratingCount: stat.count
    });
  }

  await syncDoctorCodeCounter();
  await mirrorClinicData({ appointments, doctors, patients });

  console.log('Sample dataset completed');
  console.log(`Clinics: ${clinics.length}`);
  console.log(`Specialties: ${specialties.length}`);
  console.log(`Doctors: ${doctors.length}`);
  console.log(`Patients: ${patients.length}`);
  console.log(`Schedules: ${schedules.length}`);
  console.log(`Appointments: ${appointments.length}`);
  console.log(`Medical records: ${records.length}`);
  console.log(`Accounts: quantri@clinicbooking.vn, bacsi01@clinicbooking.vn, benhnhan01@clinicbooking.vn / ${PASSWORD}`);

  await mongoose.disconnect();
}

seedSampleData().catch((error) => {
  console.error(error);
  process.exit(1);
});
