import mongoose from 'mongoose';
import { connectCentralDb, getClinicConnection } from '../config/db.js';
import User from '../models/central/User.js';
import Counter from '../models/central/Counter.js';
import Clinic from '../models/clinicModel.js';
import Specialty from '../models/specialtyModel.js';
import Doctor from '../models/doctorModel.js';
import Appointment from '../models/appointmentModel.js';
import Schedule from '../models/scheduleModel.js';
import WaitingList from '../models/waitingListModel.js';
import ServicePackage from '../models/servicePackageModel.js';
import Service from '../models/central/Service.js';
import { getClinicModels } from '../models/clinic/models.js';
import { syncDoctorCodeCounter } from '../services/doctorCodeService.js';

async function dropLegacySpecialtyIndexes() {
  try {
    await Specialty.collection.dropIndex('name_1');
    console.log('Dropped legacy specialties.name_1 index');
  } catch (error) {
    if (![26, 27].includes(error?.code)) {
      throw error;
    }
  }

  await Specialty.syncIndexes();
}

async function seed() {
  await connectCentralDb();
  await dropLegacySpecialtyIndexes();
  await Appointment.syncIndexes();
  await Schedule.syncIndexes();
  await WaitingList.syncIndexes();

  await Promise.all([
    User.deleteMany({}),
    Counter.deleteMany({}),
    Clinic.deleteMany({}),
    Specialty.deleteMany({}),
    Doctor.deleteMany({}),
    Appointment.deleteMany({}),
    Schedule.deleteMany({}),
    WaitingList.deleteMany({}),
    ServicePackage.deleteMany({}),
    Service.deleteMany({})
  ]);

  const defaultWorkingHours = [
    { dayOfWeek: 'monday', open: '08:00', close: '17:00' },
    { dayOfWeek: 'tuesday', open: '08:00', close: '17:00' },
    { dayOfWeek: 'wednesday', open: '08:00', close: '17:00' },
    { dayOfWeek: 'thursday', open: '08:00', close: '17:00' },
    { dayOfWeek: 'friday', open: '08:00', close: '17:00' },
    { dayOfWeek: 'saturday', open: '08:00', close: '12:00' }
  ];

  const [haNoiClinic, bacNinhClinic, haiPhongClinic, phenikaaClinic] = await Clinic.create([
    {
      name: 'Ha Noi Clinic',
      clinicCode: 'HN',
      address: '12 Tran Duy Hung, Cau Giay, Ha Noi',
      phone: '02430000001',
      email: 'hanoi@clinic.test',
      description: 'Phong kham da khoa tai Ha Noi, ho tro dat lich kham truc tuyen.',
      image: '/placeholder-clinic.svg',
      workingHours: defaultWorkingHours
    },
    {
      name: 'Bac Ninh Clinic',
      clinicCode: 'BN',
      address: '25 Ly Thai To, Bac Ninh',
      phone: '02223000002',
      email: 'bacninh@clinic.test',
      description: 'Chi nhanh Bac Ninh phuc vu kham tong quat va tim mach.',
      image: '/placeholder-clinic.svg',
      workingHours: defaultWorkingHours
    },
    {
      name: 'Hai Phong Clinic',
      clinicCode: 'HP',
      address: '88 Le Hong Phong, Ngo Quyen, Hai Phong',
      phone: '02253000003',
      email: 'haiphong@clinic.test',
      description: 'Chi nhanh Hai Phong voi lich kham linh hoat trong tuan.',
      image: '/placeholder-clinic.svg',
      workingHours: defaultWorkingHours
    },
    {
      name: 'Phòng khám Phenikaa',
      clinicCode: 'PK',
      address: 'Phenikaa University, Hà Nội',
      phone: '02430000004',
      email: 'phenikaa@clinic.test',
      description: 'Phòng khám Phenikaa hỗ trợ đặt lịch khám trực tuyến.',
      image: '/placeholder-clinic.svg',
      workingHours: defaultWorkingHours
    }
  ]);

  const [
    haNoiCardio,
    haNoiDermatology,
    haNoiPediatrics,
    bacNinhCardio,
    bacNinhEnt,
    bacNinhPediatrics,
    haiPhongDermatology,
    haiPhongPediatrics,
    haiPhongEnt
  ] = await Specialty.create([
    {
      name: 'Tim mach',
      description: 'Kham va theo doi cac benh ly tim mach thuong gap.',
      image: '/placeholder-specialty.svg',
      clinicId: haNoiClinic._id
    },
    {
      name: 'Da lieu',
      description: 'Kham va dieu tri cac van de ve da.',
      image: '/placeholder-specialty.svg',
      clinicId: haNoiClinic._id
    },
    {
      name: 'Nhi khoa',
      description: 'Kham va tu van suc khoe cho tre em.',
      image: '/placeholder-specialty.svg',
      clinicId: haNoiClinic._id
    },
    {
      name: 'Tim mach',
      description: 'Kham tim mach tai chi nhanh Bac Ninh.',
      image: '/placeholder-specialty.svg',
      clinicId: bacNinhClinic._id
    },
    {
      name: 'Tai mui hong',
      description: 'Kham tai, mui, hong va cac benh ly lien quan.',
      image: '/placeholder-specialty.svg',
      clinicId: bacNinhClinic._id
    },
    {
      name: 'Nhi khoa',
      description: 'Kham va tu van suc khoe tre em tai chi nhanh Bac Ninh.',
      image: '/placeholder-specialty.svg',
      clinicId: bacNinhClinic._id
    },
    {
      name: 'Da lieu',
      description: 'Kham da lieu tai chi nhanh Hai Phong.',
      image: '/placeholder-specialty.svg',
      clinicId: haiPhongClinic._id
    },
    {
      name: 'Nhi khoa',
      description: 'Dich vu nhi khoa tai chi nhanh Hai Phong.',
      image: '/placeholder-specialty.svg',
      clinicId: haiPhongClinic._id
    },
    {
      name: 'Tai mui hong',
      description: 'Kham tai mui hong tai chi nhanh Hai Phong.',
      image: '/placeholder-specialty.svg',
      clinicId: haiPhongClinic._id
    }
  ]);

  await Promise.all([
    Clinic.findByIdAndUpdate(haNoiClinic._id, {
      specialtyIds: [haNoiCardio._id, haNoiDermatology._id, haNoiPediatrics._id]
    }),
    Clinic.findByIdAndUpdate(bacNinhClinic._id, {
      specialtyIds: [bacNinhCardio._id, bacNinhEnt._id, bacNinhPediatrics._id]
    }),
    Clinic.findByIdAndUpdate(haiPhongClinic._id, {
      specialtyIds: [haiPhongDermatology._id, haiPhongPediatrics._id, haiPhongEnt._id]
    })
  ]);

  const clinic = haNoiClinic;

  await Service.create([
    { name: 'Kham tim mach', price: 350000, specialtyId: haNoiCardio._id },
    { name: 'Kham da lieu', price: 280000, specialtyId: haNoiDermatology._id }
  ]);

  const [, staffUser, patientUser] = await User.create([
    { name: 'Admin', email: 'admin@example.com', password: '123456', role: 'admin', isEmailVerified: true },
    {
      name: 'Bac si chi nhanh',
      email: 'staff@example.com',
      password: '123456',
      role: 'doctor',
      isEmailVerified: true,
      clinicId: clinic._id
    },
    {
      name: 'Benh nhan Demo',
      email: 'patient@example.com',
      password: '123456',
      role: 'patient',
      phone: '0900000000',
      isEmailVerified: true
    }
  ]);

  const doctorSeeds = [
    {
      name: 'BS. Nguyen Minh Khoa',
      email: 'khoa.hanoi@clinic.test',
      phone: '0901000001',
      avatar: '/placeholder-doctor.svg',
      degree: 'Thac si, Bac si',
      experienceYears: 8,
      description: 'Bac si tim mach co kinh nghiem theo doi benh man tinh.',
      clinicId: haNoiClinic._id,
      specialtyId: haNoiCardio._id,
      workingDays: ['monday', 'wednesday', 'friday'],
      workingHours: { start: '08:00', end: '17:00' }
    },
    {
      name: 'BS. Tran Thu Ha',
      email: 'ha.hanoi@clinic.test',
      phone: '0901000002',
      avatar: '/placeholder-doctor.svg',
      degree: 'Bac si chuyen khoa I',
      experienceYears: 6,
      description: 'Bac si da lieu phu trach kham va tu van dieu tri da.',
      clinicId: haNoiClinic._id,
      specialtyId: haNoiDermatology._id,
      workingDays: ['tuesday', 'thursday', 'saturday'],
      workingHours: { start: '08:00', end: '12:00' }
    },
    {
      name: 'BS. Pham Hoang Nam',
      email: 'nam.bacninh@clinic.test',
      phone: '0902000001',
      avatar: '/placeholder-doctor.svg',
      degree: 'Bac si chuyen khoa I',
      experienceYears: 7,
      description: 'Bac si tim mach tai chi nhanh Bac Ninh.',
      clinicId: bacNinhClinic._id,
      specialtyId: bacNinhCardio._id,
      workingDays: ['monday', 'tuesday', 'thursday'],
      workingHours: { start: '08:00', end: '17:00' }
    },
    {
      name: 'BS. Le Minh Anh',
      email: 'anh.bacninh@clinic.test',
      phone: '0902000002',
      avatar: '/placeholder-doctor.svg',
      degree: 'Bac si',
      experienceYears: 5,
      description: 'Bac si nhi khoa tai chi nhanh Bac Ninh.',
      clinicId: bacNinhClinic._id,
      specialtyId: bacNinhPediatrics._id,
      workingDays: ['wednesday', 'friday', 'saturday'],
      workingHours: { start: '08:00', end: '12:00' }
    },
    {
      name: 'BS. Do Quang Huy',
      email: 'huy.haiphong@clinic.test',
      phone: '0903000001',
      avatar: '/placeholder-doctor.svg',
      degree: 'Bac si chuyen khoa II',
      experienceYears: 10,
      description: 'Bac si tai mui hong tai chi nhanh Hai Phong.',
      clinicId: haiPhongClinic._id,
      specialtyId: haiPhongEnt._id,
      workingDays: ['monday', 'wednesday', 'friday'],
      workingHours: { start: '08:00', end: '17:00' }
    },
    {
      name: 'BS. Vu Lan Chi',
      email: 'chi.haiphong@clinic.test',
      phone: '0903000002',
      avatar: '/placeholder-doctor.svg',
      degree: 'Bac si',
      experienceYears: 4,
      description: 'Bac si da lieu tai chi nhanh Hai Phong.',
      clinicId: haiPhongClinic._id,
      specialtyId: haiPhongDermatology._id,
      workingDays: ['tuesday', 'thursday', 'saturday'],
      workingHours: { start: '08:00', end: '12:00' }
    }
  ];

  const doctors = await Doctor.create(
    doctorSeeds.map((item, index) => ({
      ...item,
      doctorCode: `DR${String(index + 1).padStart(4, '0')}`,
      personalEmail: item.personalEmail || item.email
    }))
  );
  await syncDoctorCodeCounter();
  await User.findByIdAndUpdate(staffUser._id, {
    doctorId: doctors[0]._id,
    clinicId: doctors[0].clinicId
  });

  await ServicePackage.create([
    {
      code: 'PKG-0001',
      name: 'Gói khám Nhi tổng quát',
      description: 'Khám tổng quát, tư vấn triệu chứng và hướng dẫn chăm sóc tại nhà.',
      price: 250000,
      durationMinutes: 30,
      clinicId: haNoiClinic._id,
      specialtyId: haNoiPediatrics._id,
      isActive: true,
      createdBy: staffUser._id,
      updatedBy: staffUser._id
    },
    {
      code: 'PKG-0002',
      name: 'Gói khám Tim mạch chuyên sâu',
      description: 'Khám chuyên sâu, tư vấn theo dõi bệnh lý tim mạch.',
      price: 450000,
      durationMinutes: 45,
      clinicId: haNoiClinic._id,
      specialtyId: haNoiCardio._id,
      doctorId: doctors[0]._id,
      isActive: true,
      createdBy: staffUser._id,
      updatedBy: staffUser._id
    },
    {
      code: 'PKG-0003',
      name: 'Gói khám Tai mũi họng cơ bản',
      description: 'Khám tai mũi họng, tư vấn điều trị và lịch tái khám nếu cần.',
      price: 300000,
      durationMinutes: 30,
      clinicId: haiPhongClinic._id,
      specialtyId: haiPhongEnt._id,
      isActive: true,
      createdBy: staffUser._id,
      updatedBy: staffUser._id
    }
  ]);

  const clinicConnections = new Map();
  const clearedClinicIds = new Set();

  for (const doctor of doctors) {
    const key = String(doctor.clinicId);
    const connection = clinicConnections.get(key) || (await getClinicConnection(doctor.clinicId));
    clinicConnections.set(key, connection);
    const { Doctor: ClinicDoctor, Patient, Appointment, Schedule } = getClinicModels(connection);

    if (!clearedClinicIds.has(key)) {
      await Promise.all([
        ClinicDoctor.deleteMany({ clinicId: doctor.clinicId }),
        Patient.deleteMany({ clinicId: doctor.clinicId }),
        Appointment.deleteMany({ clinicId: doctor.clinicId }),
        Schedule.deleteMany({ clinicId: doctor.clinicId })
      ]);
      clearedClinicIds.add(key);
    }

    await ClinicDoctor.findByIdAndUpdate(
      doctor._id,
      {
        _id: doctor._id,
        clinicId: doctor.clinicId,
        name: doctor.name,
        email: doctor.email,
        personalEmail: doctor.personalEmail || doctor.email,
        loginEmail: doctor.loginEmail || undefined,
        doctorCode: doctor.doctorCode,
        phone: doctor.phone,
        avatarUrl: doctor.avatar,
        degree: doctor.degree,
        specialtyId: doctor.specialtyId,
        experienceYears: doctor.experienceYears,
        description: doctor.description,
        workingDays: doctor.workingDays,
        workingHours: doctor.workingHours,
        isActive: true
      },
      { upsert: true, new: true }
    );
  }

  const doctor = doctors[0];
  const connection = await getClinicConnection(clinic._id);
  const { Schedule: ClinicSchedule } = getClinicModels(connection);

  const today = new Date().toISOString().slice(0, 10);
  const scheduleSeeds = doctors.map((item) => ({
    doctorId: item._id,
    clinicId: item.clinicId,
    date: item._id.equals(doctor._id) ? '2026-06-01' : today,
    workingHours: item._id.equals(doctor._id) ? { start: '08:00', end: '11:00' } : item.workingHours,
    slotDuration: 30,
    isWorkingDay: true,
    note: 'Seed schedule'
  }));

  await Schedule.create(scheduleSeeds);

  await ClinicSchedule.create({
    clinicId: clinic._id,
    doctorId: doctor._id,
    date: today,
    timeSlots: ['08:00-08:30', '08:30-09:00', '09:00-09:30', '09:30-10:00', '10:00-10:30', '10:30-11:00']
  });

  const appointment = await Appointment.create({
    patientId: patientUser._id,
    doctorId: doctor._id,
    clinicId: clinic._id,
    specialtyId: doctor.specialtyId,
    date: today,
    timeSlot: '08:00-08:30',
    reason: 'Kham mau seed',
    status: 'pending'
  });

  const { Patient: ClinicPatient, Appointment: ClinicAppointment } = getClinicModels(connection);
  const clinicPatient = await ClinicPatient.findOneAndUpdate(
    { clinicId: clinic._id, userId: patientUser._id },
    {
      $setOnInsert: {
        clinicId: clinic._id,
        userId: patientUser._id,
        name: patientUser.name,
        email: patientUser.email,
        phone: patientUser.phone
      }
    },
    { upsert: true, new: true }
  );

  await ClinicAppointment.findByIdAndUpdate(
    appointment._id,
    {
      _id: appointment._id,
      clinicId: clinic._id,
      doctorId: doctor._id,
      patientId: clinicPatient._id,
      specialtyId: doctor.specialtyId,
      date: appointment.date,
      timeSlot: appointment.timeSlot,
      reason: appointment.reason,
      status: appointment.status
    },
    { upsert: true, new: true }
  );

  console.log('Seed completed');
  console.log(`Ha Noi Clinic ID: ${haNoiClinic._id}`);
  console.log(`Bac Ninh Clinic ID: ${bacNinhClinic._id}`);
  console.log(`Hai Phong Clinic ID: ${haiPhongClinic._id}`);
  console.log('Accounts: admin@example.com / staff@example.com / patient@example.com, password 123456');
  await mongoose.disconnect();
  await Promise.all([...clinicConnections.values()].map((item) => item.close()));
}

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});
