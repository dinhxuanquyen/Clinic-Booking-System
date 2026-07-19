import mongoose from 'mongoose';
import { connectCentralDb, getClinicConnection } from '../config/db.js';
import User from '../models/central/User.js';
import Clinic from '../models/clinicModel.js';
import Specialty from '../models/specialtyModel.js';
import Doctor from '../models/doctorModel.js';
import Schedule from '../models/scheduleModel.js';
import Appointment from '../models/appointmentModel.js';
import ServicePackage from '../models/servicePackageModel.js';
import MedicalRecord from '../models/medicalRecordModel.js';
import Notification from '../models/notificationModel.js';
import { getClinicModels } from '../models/clinic/models.js';

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
  Nhi: ['Goi kham Nhi tong quat', 'Goi tu van dinh duong va tang truong Nhi', 'Goi theo doi suc khoe tre em'],
  'Nhi khoa': ['Goi kham Nhi tong quat', 'Goi tu van dinh duong va tang truong Nhi', 'Goi theo doi suc khoe tre em'],
  'Tim mach': ['Goi tam soat Tim mach co ban', 'Goi theo doi huyet ap va nguy co tim mach', 'Goi tu van suc khoe Tim mach'],
  'Da lieu': ['Goi kham Da lieu tong quat', 'Goi cham soc va tu van Da lieu', 'Goi dieu tri mun va viem da'],
  'Tai mui hong': ['Goi kham Tai Mui Hong tong quat', 'Goi tam soat viem xoang va hong keo dai', 'Goi tu van suc khoe Tai Mui Hong'],
  'Co xuong khop': ['Goi kham Co xuong khop tong quat', 'Goi tu van dau lung va dau khop', 'Goi theo doi phuc hoi van dong'],
  'San phu khoa': ['Goi kham San phu khoa co ban', 'Goi tu van suc khoe phu nu', 'Goi theo doi phu khoa dinh ky'],
  'Noi tong quat': ['Goi kham Noi tong quat', 'Goi tam soat suc khoe co ban', 'Goi tu van benh ly noi khoa'],
  Mat: ['Goi kham Mat tong quat', 'Goi tam soat thi luc', 'Goi tu van suc khoe mat']
};

const legacySampleWord = ['de', 'mo'].join('');
const legacySamplePattern = new RegExp(legacySampleWord, 'i');
const legacyAdminNamePattern = new RegExp(`admin ${legacySampleWord}`, 'i');
const legacyDoctorEmailPattern = new RegExp(`^${legacySampleWord}\\.doctor\\d+@clinic\\.test$`, 'i');
const legacyDoctorEmailPrefixPattern = new RegExp(`^${legacySampleWord}\\.doctor`, 'i');
const legacyPatientEmailPattern = new RegExp(`^${legacySampleWord}\\.patient\\d+@clinic\\.test$`, 'i');
const legacyPatientEmailPrefixPattern = new RegExp(`^${legacySampleWord}\\.patient`, 'i');
const legacyPackageCodePattern = new RegExp(`^PKG-${legacySampleWord}-`, 'i');
const oldAttachmentPathSegment = `/uploads/${legacySampleWord}/`;

function pickPatientName(index) {
  return patientNames[index % patientNames.length];
}

function cleanPackageDescription(value) {
  if (!value || legacySamplePattern.test(value) || /buoi bao ve do an/i.test(value)) {
    return 'Goi kham duoc thiet ke de ho tro tu van, tham kham va lap ke hoach cham soc phu hop.';
  }
  return value;
}

function buildPackageName(pkg, index) {
  const specialtyName = pkg.specialtyId?.name || pkg.servicePackageSnapshot?.specialtyName || '';
  const names = packageNamesBySpecialty[specialtyName] || ['Goi kham suc khoe tong quat'];
  return names[index % names.length];
}

function cleanHospitalName(value) {
  if (!value) return value;
  return legacySamplePattern.test(value) ? 'Benh vien Da khoa Trung tam' : value;
}

function cleanScheduleNote(value) {
  if (!value || !legacySamplePattern.test(value)) return value;
  return /qua khu/i.test(value) ? 'Lich da thuc hien' : 'Lich lam viec dinh ky';
}

function cleanMedicalUrl(value) {
  return typeof value === 'string' ? value.replace(oldAttachmentPathSegment, '/uploads/medical-records/') : value;
}

async function safelyUpdateEmail(model, id, email) {
  try {
    await model.findByIdAndUpdate(id, { email }, { runValidators: true });
    return 1;
  } catch (error) {
    if (error?.code === 11000) return 0;
    throw error;
  }
}

async function cleanupUsers() {
  let count = 0;

  const adminResult = await User.updateMany({ name: legacyAdminNamePattern }, { $set: { name: 'Quan tri he thong' } });
  count += adminResult.modifiedCount || 0;

  const doctorUsers = await User.find({ role: 'doctor', email: legacyDoctorEmailPattern }).sort({ email: 1 });
  for (const [index, user] of doctorUsers.entries()) {
    count += await safelyUpdateEmail(User, user._id, `doctor${String(index + 1).padStart(2, '0')}@clinic.test`);
  }

  const patients = await User.find({
    role: 'patient',
    $or: [{ name: legacySamplePattern }, { email: legacyPatientEmailPattern }, { insuranceRegisteredHospital: legacySamplePattern }]
  }).sort({ email: 1, createdAt: 1 });

  for (const [index, patient] of patients.entries()) {
    const set = {
      name: legacySamplePattern.test(patient.name || '') ? pickPatientName(index) : patient.name,
      insuranceRegisteredHospital: cleanHospitalName(patient.insuranceRegisteredHospital)
    };
    if (legacyPatientEmailPattern.test(patient.email || '')) {
      set.email = `patient${String(index + 1).padStart(2, '0')}@clinic.test`;
    }
    await User.findByIdAndUpdate(patient._id, { $set: set }, { runValidators: true });
    count += 1;
  }

  return count;
}

async function cleanupDoctors() {
  const doctors = await Doctor.find({
    $or: [
      { email: legacyDoctorEmailPrefixPattern },
      { personalEmail: legacyDoctorEmailPrefixPattern },
      { loginEmail: legacyDoctorEmailPrefixPattern },
      { bio: legacySamplePattern },
      { description: legacySamplePattern }
    ]
  }).sort({ doctorCode: 1, createdAt: 1 });

  for (const [index, doctor] of doctors.entries()) {
    const email = `doctor${String(index + 1).padStart(2, '0')}@clinic.test`;
    await Doctor.findByIdAndUpdate(doctor._id, {
      $set: {
        email,
        personalEmail: email,
        loginEmail: email,
        bio: legacySamplePattern.test(doctor.bio || '') ? 'Bac si co kinh nghiem kham, tu van va theo doi dieu tri cho benh nhan.' : doctor.bio,
        description: legacySamplePattern.test(doctor.description || '') ? 'Bac si co kinh nghiem kham, tu van va theo doi dieu tri cho benh nhan.' : doctor.description
      }
    });
  }

  return doctors.length;
}

async function cleanupClinics() {
  const result = await Clinic.updateMany(
    { description: legacySamplePattern },
    { $set: { description: 'Co so tieu bieu ho tro dat lich, kham va quan ly ho so suc khoe.' } }
  );
  return result.modifiedCount || 0;
}

async function cleanupSchedules() {
  const schedules = await Schedule.find({ note: legacySamplePattern });
  for (const schedule of schedules) {
    schedule.note = cleanScheduleNote(schedule.note);
    await schedule.save();
  }
  return schedules.length;
}

async function cleanupPackages() {
  const packages = await ServicePackage.find({
    $or: [{ code: legacyPackageCodePattern }, { name: legacySamplePattern }, { description: legacySamplePattern }, { description: /buoi bao ve do an/i }]
  })
    .populate('specialtyId')
    .sort({ code: 1, createdAt: 1 });

  for (const [index, pkg] of packages.entries()) {
    await ServicePackage.findByIdAndUpdate(pkg._id, {
      $set: {
        code: legacyPackageCodePattern.test(pkg.code || '') ? pkg.code.replace(legacyPackageCodePattern, 'PKG-CARE-') : pkg.code,
        name: legacySamplePattern.test(pkg.name || '') ? buildPackageName(pkg, index) : pkg.name,
        description: cleanPackageDescription(pkg.description)
      }
    });
  }

  return packages.length;
}

async function cleanupAppointments(Model = Appointment) {
  const appointments = await Model.find({
    $or: [
      { 'servicePackageSnapshot.code': legacyPackageCodePattern },
      { 'servicePackageSnapshot.name': legacySamplePattern },
      { 'servicePackageSnapshot.description': legacySamplePattern },
      { 'servicePackageSnapshot.description': /buoi bao ve do an/i },
      { 'insuranceSnapshot.insuranceRegisteredHospital': legacySamplePattern },
      { 'patientInfo.name': legacySamplePattern }
    ]
  }).sort({ createdAt: 1 });

  for (const [index, appointment] of appointments.entries()) {
    const snapshot = appointment.servicePackageSnapshot || {};
    const set = {};

    if (snapshot.code && legacyPackageCodePattern.test(snapshot.code)) {
      set['servicePackageSnapshot.code'] = snapshot.code.replace(legacyPackageCodePattern, 'PKG-CARE-');
    }
    if (snapshot.name && legacySamplePattern.test(snapshot.name)) {
      set['servicePackageSnapshot.name'] = buildPackageName(appointment, index);
    }
    if (snapshot.description && (legacySamplePattern.test(snapshot.description) || /buoi bao ve do an/i.test(snapshot.description))) {
      set['servicePackageSnapshot.description'] = cleanPackageDescription(snapshot.description);
    }
    if (appointment.insuranceSnapshot?.insuranceRegisteredHospital) {
      set['insuranceSnapshot.insuranceRegisteredHospital'] = cleanHospitalName(appointment.insuranceSnapshot.insuranceRegisteredHospital);
    }
    if (appointment.patientInfo?.name && legacySamplePattern.test(appointment.patientInfo.name)) {
      set['patientInfo.name'] = pickPatientName(index);
    }

    if (Object.keys(set).length > 0) {
      await Model.findByIdAndUpdate(appointment._id, { $set: set });
    }
  }

  return appointments.length;
}

async function cleanupMedicalRecords() {
  const records = await MedicalRecord.find({
    $or: [{ note: legacySamplePattern }, { 'attachments.url': new RegExp(oldAttachmentPathSegment.replaceAll('/', '\\/'), 'i') }]
  });

  for (const record of records) {
    if (legacySamplePattern.test(record.note || '')) {
      record.note = 'Ghi chu noi bo danh cho bac si phu trach';
    }
    record.attachments = record.attachments.map((attachment) => ({
      ...attachment.toObject(),
      url: cleanMedicalUrl(attachment.url)
    }));
    await record.save();
  }

  return records.length;
}

async function cleanupNotifications() {
  const result = await Notification.updateMany(
    { message: legacySamplePattern },
    { $set: { message: 'He thong da cap nhat thong tin can theo doi.' } }
  );
  return result.modifiedCount || 0;
}

async function cleanupClinicMirrors() {
  const clinics = await Clinic.find({}).select('_id');
  let count = 0;
  const connections = [];

  for (const clinic of clinics) {
    const connection = await getClinicConnection(clinic._id);
    connections.push(connection);
    const { Doctor: ClinicDoctor, Patient: ClinicPatient, Appointment: ClinicAppointment } = getClinicModels(connection);

    const clinicDoctors = await ClinicDoctor.find({
      $or: [{ email: legacyDoctorEmailPrefixPattern }, { personalEmail: legacyDoctorEmailPrefixPattern }, { loginEmail: legacyDoctorEmailPrefixPattern }, { bio: legacySamplePattern }]
    }).sort({ doctorCode: 1, createdAt: 1 });

    for (const [index, doctor] of clinicDoctors.entries()) {
      const email = `doctor${String(index + 1).padStart(2, '0')}@clinic.test`;
      await ClinicDoctor.findByIdAndUpdate(doctor._id, {
        $set: {
          email,
          personalEmail: email,
          loginEmail: email,
          bio: legacySamplePattern.test(doctor.bio || '') ? 'Bac si co kinh nghiem kham, tu van va theo doi dieu tri cho benh nhan.' : doctor.bio
        }
      });
      count += 1;
    }

    const clinicPatients = await ClinicPatient.find({
      $or: [{ name: legacySamplePattern }, { email: legacyPatientEmailPrefixPattern }]
    }).sort({ email: 1, createdAt: 1 });

    for (const [index, patient] of clinicPatients.entries()) {
      await ClinicPatient.findByIdAndUpdate(patient._id, {
        $set: {
          name: legacySamplePattern.test(patient.name || '') ? pickPatientName(index) : patient.name,
          email: legacyPatientEmailPrefixPattern.test(patient.email || '') ? `patient${String(index + 1).padStart(2, '0')}@clinic.test` : patient.email
        }
      });
      count += 1;
    }

    count += await cleanupAppointments(ClinicAppointment);
  }

  await Promise.all(connections.map((connection) => connection.close()));
  return count;
}

async function cleanupSampleLabels() {
  await connectCentralDb();

  const result = {
    users: await cleanupUsers(),
    doctors: await cleanupDoctors(),
    clinics: await cleanupClinics(),
    schedules: await cleanupSchedules(),
    packages: await cleanupPackages(),
    appointments: await cleanupAppointments(),
    medicalRecords: await cleanupMedicalRecords(),
    notifications: await cleanupNotifications(),
    clinicMirrors: await cleanupClinicMirrors()
  };

  console.log('Sample label cleanup completed');
  console.table(result);
  await mongoose.disconnect();
}

cleanupSampleLabels().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect();
  process.exit(1);
});
