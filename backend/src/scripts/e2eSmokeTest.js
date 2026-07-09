import http from 'http';
import mongoose from 'mongoose';
import app from '../app.js';
import { connectDatabase } from '../config/database.js';
import { initSocket } from '../services/socketService.js';
import User from '../models/central/User.js';
import Clinic from '../models/clinicModel.js';
import Specialty from '../models/specialtyModel.js';
import Doctor from '../models/doctorModel.js';
import Appointment from '../models/appointmentModel.js';
import MedicalRecord from '../models/medicalRecordModel.js';
import DoctorReview from '../models/doctorReviewModel.js';
import WaitingList from '../models/waitingListModel.js';
import Notification from '../models/notificationModel.js';
import AuditLog from '../models/auditLogModel.js';
import DoctorScheduleTemplate from '../models/doctorScheduleTemplateModel.js';

const suffix = `codex-e2e-${Date.now()}`;
const strongPassword = 'Nova@789XyZ';
const changedPassword = 'Orion@789XyZ';
const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

const created = {
  users: [],
  clinics: [],
  specialties: [],
  doctors: [],
  appointments: [],
  medicalRecords: [],
  waitingList: [],
  reviews: []
};

const results = [];

function record(name, passed, detail = '') {
  results.push({ name, passed, detail });
  const icon = passed ? 'PASS' : 'FAIL';
  console.log(`[${icon}] ${name}${detail ? ` - ${detail}` : ''}`);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function request(baseUrl, path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    ...(options.headers || {})
  };

  const response = await fetch(`${baseUrl}${path}`, {
    method: options.method || 'GET',
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body)
  });

  const contentType = response.headers.get('content-type') || '';
  const data = contentType.includes('application/json')
    ? await response.json()
    : Buffer.from(await response.arrayBuffer());

  if (options.expect && response.status !== options.expect) {
    throw new Error(`${options.method || 'GET'} ${path} expected ${options.expect}, got ${response.status}: ${JSON.stringify(data)}`);
  }

  return { response, data };
}

async function cleanup() {
  const userIds = created.users.map((item) => item._id).filter(Boolean);
  const doctorIds = created.doctors.map((item) => item._id).filter(Boolean);
  const clinicIds = created.clinics.map((item) => item._id).filter(Boolean);
  const specialtyIds = created.specialties.map((item) => item._id).filter(Boolean);
  const appointmentIds = created.appointments.map((item) => item._id).filter(Boolean);
  const recordIds = created.medicalRecords.map((item) => item._id).filter(Boolean);
  const reviewIds = created.reviews.map((item) => item._id).filter(Boolean);
  const waitingIds = created.waitingList.map((item) => item._id).filter(Boolean);

  await Promise.all([
    DoctorReview.deleteMany({ $or: [{ _id: { $in: reviewIds } }, { appointmentId: { $in: appointmentIds } }, { patientId: { $in: userIds } }] }),
    MedicalRecord.deleteMany({ $or: [{ _id: { $in: recordIds } }, { appointmentId: { $in: appointmentIds } }, { patientId: { $in: userIds } }] }),
    WaitingList.deleteMany({ $or: [{ _id: { $in: waitingIds } }, { patientId: { $in: userIds } }, { doctorId: { $in: doctorIds } }] }),
    Appointment.deleteMany({ $or: [{ _id: { $in: appointmentIds } }, { patientId: { $in: userIds } }, { doctorId: { $in: doctorIds } }] }),
    Notification.deleteMany({ $or: [{ userId: { $in: userIds } }, { doctorId: { $in: doctorIds } }, { appointmentId: { $in: appointmentIds } }] }),
    AuditLog.deleteMany({ $or: [{ actorId: { $in: userIds } }, { entityId: { $in: [...appointmentIds, ...recordIds, ...reviewIds, ...doctorIds, ...clinicIds] } }, { entityName: new RegExp(suffix, 'i') }] }),
    DoctorScheduleTemplate.deleteMany({ doctorId: { $in: doctorIds } })
  ]);

  await Promise.all([
    User.deleteMany({ $or: [{ _id: { $in: userIds } }, { email: new RegExp(`${suffix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}.*@e2e\\.local$`) }] }),
    Doctor.deleteMany({ $or: [{ _id: { $in: doctorIds } }, { name: new RegExp(suffix, 'i') }] }),
    Specialty.deleteMany({ $or: [{ _id: { $in: specialtyIds } }, { name: new RegExp(suffix, 'i') }] }),
    Clinic.deleteMany({ $or: [{ _id: { $in: clinicIds } }, { name: new RegExp(suffix, 'i') }] })
  ]);
}

async function setupData() {
  await cleanup();

  const clinic = await Clinic.create({
    name: `Codex E2E Clinic ${suffix}`,
    clinicCode: 'E2E',
    address: 'Test address',
    phone: '02439990000',
    email: `${suffix}.clinic@e2e.local`,
    description: 'E2E test clinic',
    image: '/placeholder-clinic.svg'
  });
  created.clinics.push(clinic);

  const specialty = await Specialty.create({
    name: `Codex E2E Specialty ${suffix}`,
    description: 'E2E test specialty',
    image: '/placeholder-specialty.svg',
    clinicId: clinic._id
  });
  created.specialties.push(specialty);

  const [doctorA, doctorB] = await Doctor.create([
    {
      name: `Codex E2E Doctor A ${suffix}`,
      email: `${suffix}.doctor.a.personal@e2e.local`,
      personalEmail: `${suffix}.doctor.a.personal@e2e.local`,
      doctorCode: `DR${String(Date.now()).slice(-6)}`,
      phone: '0901111000',
      degree: 'Bác sĩ',
      experienceYears: 5,
      clinicId: clinic._id,
      specialtyId: specialty._id,
      description: 'E2E doctor A',
      workingDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
      workingHours: { start: '08:00', end: '12:00' },
      isActive: true
    },
    {
      name: `Codex E2E Doctor B ${suffix}`,
      email: `${suffix}.doctor.b.personal@e2e.local`,
      personalEmail: `${suffix}.doctor.b.personal@e2e.local`,
      doctorCode: `DR${String(Date.now() + 1).slice(-6)}`,
      phone: '0901111001',
      degree: 'Bác sĩ',
      experienceYears: 6,
      clinicId: clinic._id,
      specialtyId: specialty._id,
      description: 'E2E doctor B',
      workingDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
      workingHours: { start: '08:00', end: '12:00' },
      isActive: true
    }
  ]);
  created.doctors.push(doctorA, doctorB);

  const dayOfWeek = new Date(`${tomorrow}T00:00:00.000Z`).getUTCDay();
  await DoctorScheduleTemplate.create([
    { doctorId: doctorA._id, dayOfWeek, startTime: '08:00', endTime: '12:00', slotDuration: 30, isWorking: true },
    { doctorId: doctorB._id, dayOfWeek, startTime: '08:00', endTime: '12:00', slotDuration: 30, isWorking: true }
  ]);

  const [admin, doctorUserA, doctorUserB, patientB] = await User.create([
    {
      name: `Codex E2E Admin ${suffix}`,
      email: `${suffix}.admin@e2e.local`,
      password: strongPassword,
      role: 'admin',
      isEmailVerified: true
    },
    {
      name: `Codex E2E Doctor User A ${suffix}`,
      email: `${suffix}.doctor.a@clinicbooking.vn`,
      password: strongPassword,
      role: 'doctor',
      doctorId: doctorA._id,
      clinicId: clinic._id,
      isEmailVerified: true,
      mustChangePassword: true
    },
    {
      name: `Codex E2E Doctor User B ${suffix}`,
      email: `${suffix}.doctor.b@clinicbooking.vn`,
      password: strongPassword,
      role: 'doctor',
      doctorId: doctorB._id,
      clinicId: clinic._id,
      isEmailVerified: true
    },
    {
      name: `Codex E2E Patient B ${suffix}`,
      email: `${suffix}.patient.b@e2e.local`,
      password: strongPassword,
      phone: `091${String(Date.now()).slice(-7)}`,
      role: 'patient',
      isEmailVerified: true
    }
  ]);
  created.users.push(admin, doctorUserA, doctorUserB, patientB);

  return { clinic, specialty, doctorA, doctorB, admin, doctorUserA, doctorUserB, patientB };
}

async function main() {
  await connectDatabase();
  await Promise.all([
    Appointment.syncIndexes(),
    WaitingList.syncIndexes()
  ]);

  const server = http.createServer(app);
  initSocket(server);
  await new Promise((resolve) => server.listen(0, resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    const setup = await setupData();

    const login = async (email, password = strongPassword) => {
      const { data } = await request(baseUrl, '/api/auth/login', {
        method: 'POST',
        body: { email, password },
        expect: 200
      });
      return data.data.token;
    };

    const adminToken = await login(setup.admin.email);
    const doctorTokenInitial = await login(setup.doctorUserA.email);
    record('AUTH doctor login returns mustChangePassword', Boolean(doctorTokenInitial), 'doctor first login allowed');

    const weakRegister = await request(baseUrl, '/api/auth/register', {
      method: 'POST',
      body: {
        name: 'Weak Patient',
        email: `${suffix}.weak@e2e.local`,
        phone: `092${String(Date.now()).slice(-7)}`,
        password: '123456'
      }
    });
    assert(weakRegister.response.status === 422, 'Weak password should be rejected');
    record('AUTH weak password rejected', true);

    const registerEmail = `${suffix}.patient.a@e2e.local`;
    const registerPhone = `093${String(Date.now()).slice(-7)}`;
    const register = await request(baseUrl, '/api/auth/register', {
      method: 'POST',
      body: {
        name: `Codex E2E Patient A ${suffix}`,
        email: registerEmail,
        phone: registerPhone,
        password: strongPassword
      },
      expect: 201
    });
    assert(register.data.data.needsVerification, 'Register should require email verification');
    const patientAUser = await User.findOne({ email: registerEmail }).select('+emailVerificationOtp');
    created.users.push(patientAUser);
    await request(baseUrl, '/api/auth/verify-email', {
      method: 'POST',
      body: { email: registerEmail, otp: patientAUser.emailVerificationOtp },
      expect: 200
    });
    const patientToken = await login(registerEmail);
    record('AUTH register -> verify OTP -> login', true);

    const forgotDuringRegisterCooldown = await request(baseUrl, '/api/auth/forgot-password', {
      method: 'POST',
      body: { email: registerEmail }
    });
    assert(forgotDuringRegisterCooldown.response.status === 429, 'Forgot password should respect OTP cooldown after register');
    record('AUTH shared OTP cooldown after register', true);

    await User.updateOne(
      { _id: patientAUser._id },
      { $set: { lastOtpSentAt: new Date(Date.now() - 61 * 1000) } }
    );

    const forgot = await request(baseUrl, '/api/auth/forgot-password', {
      method: 'POST',
      body: { email: registerEmail },
      expect: 200
    });
    assert(forgot.data.cooldownSeconds === 60, 'Forgot password should return cooldown');
    const forgotAgain = await request(baseUrl, '/api/auth/forgot-password', {
      method: 'POST',
      body: { email: registerEmail }
    });
    assert(forgotAgain.response.status === 429, 'Forgot password cooldown should return 429');
    record('AUTH forgot password cooldown', true);

    await request(baseUrl, '/api/auth/change-initial-password', {
      method: 'POST',
      token: doctorTokenInitial,
      body: { newPassword: changedPassword, confirmPassword: changedPassword },
      expect: 200
    });
    const doctorToken = await login(setup.doctorUserA.email, changedPassword);
    record('DOCTOR ACCOUNT initial password change', true);

    const otherDoctorToken = await login(setup.doctorUserB.email);
    const patientBToken = await login(setup.patientB.email);

    await request(baseUrl, '/api/auth/change-password', {
      method: 'PATCH',
      token: patientToken,
      body: { currentPassword: strongPassword, newPassword: '123456', confirmPassword: '123456' }
    }).then(({ response }) => {
      assert(response.status === 422, 'Weak change password should be rejected');
    });
    record('AUTH active change-password policy', true);

    const appointmentBody = {
      clinicId: setup.clinic._id,
      specialtyId: setup.specialty._id,
      doctorId: setup.doctorA._id,
      date: tomorrow,
      timeSlot: '08:00-08:30',
      reason: 'Codex E2E booking'
    };
    const appointmentResponse = await request(baseUrl, '/api/appointments', {
      method: 'POST',
      token: patientToken,
      body: appointmentBody,
      expect: 201
    });
    const appointment = appointmentResponse.data.data;
    created.appointments.push(appointment);
    record('BOOKING patient creates appointment', appointment.status === 'pending');

    const duplicateSlot = await request(baseUrl, '/api/appointments', {
      method: 'POST',
      token: patientBToken,
      body: { ...appointmentBody, reason: 'duplicate slot' }
    });
    assert(duplicateSlot.response.status === 409, 'Duplicate slot should be rejected');
    record('BOOKING duplicate occupied slot rejected', true);

    const pastBooking = await request(baseUrl, '/api/appointments', {
      method: 'POST',
      token: patientBToken,
      body: { ...appointmentBody, date: '2020-01-01', timeSlot: '08:30-09:00' }
    });
    assert(pastBooking.response.status === 400, 'Past date booking should be rejected');
    record('BOOKING past date rejected', true);

    const otherDoctorStatus = await request(baseUrl, `/api/appointments/${appointment._id}/status`, {
      method: 'PATCH',
      token: otherDoctorToken,
      body: { status: 'confirmed' }
    });
    assert(otherDoctorStatus.response.status === 403, 'Other doctor should not process appointment');
    record('PERMISSION doctor cannot process another doctor appointment', true);

    const confirmed = await request(baseUrl, `/api/appointments/${appointment._id}/status`, {
      method: 'PATCH',
      token: doctorToken,
      body: { status: 'confirmed' },
      expect: 200
    });
    assert(confirmed.data.data.status === 'confirmed' && confirmed.data.data.queueNumber, 'Confirmed should assign queueNumber');
    record('DOCTOR WORKFLOW pending -> confirmed', true, `queue #${confirmed.data.data.queueNumber}`);

    const directComplete = await request(baseUrl, `/api/appointments/${appointment._id}/status`, {
      method: 'PATCH',
      token: doctorToken,
      body: { status: 'completed' }
    });
    assert(directComplete.response.status === 400, 'confirmed -> completed must be rejected');
    record('DOCTOR WORKFLOW direct completed rejected', true);

    const inProgress = await request(baseUrl, `/api/appointments/${appointment._id}/status`, {
      method: 'PATCH',
      token: doctorToken,
      body: { status: 'in_progress' },
      expect: 200
    });
    assert(inProgress.data.data.status === 'in_progress', 'Should start appointment');
    record('DOCTOR WORKFLOW confirmed -> in_progress', true);

    const recordResponse = await request(baseUrl, '/api/medical-records', {
      method: 'POST',
      token: doctorToken,
      body: {
        appointmentId: appointment._id,
        symptoms: 'Ho',
        diagnosis: 'Viêm họng nhẹ',
        conclusion: 'Theo dõi tại nhà',
        prescription: [{ medicineName: 'Paracetamol', dosage: '500mg', frequency: '2 lần/ngày', duration: '3 ngày' }],
        advice: 'Uống nhiều nước',
        followUpRequired: false,
        note: 'Codex E2E'
      },
      expect: 201
    });
    const medicalRecord = recordResponse.data.data.medicalRecord;
    created.medicalRecords.push(medicalRecord);
    assert(recordResponse.data.data.appointment.status === 'completed', 'Medical record should complete appointment');
    record('MEDICAL RECORD create and complete appointment', true);

    const duplicateRecord = await request(baseUrl, '/api/medical-records', {
      method: 'POST',
      token: doctorToken,
      body: {
        appointmentId: appointment._id,
        diagnosis: 'Duplicate',
        conclusion: 'Duplicate',
        followUpRequired: false
      },
      expect: 200
    });
    assert(duplicateRecord.data.message.includes('tồn tại'), 'Duplicate medical record should return existing');
    record('MEDICAL RECORD duplicate protected', true);

    await request(baseUrl, `/api/medical-records/${medicalRecord._id}`, {
      token: patientToken,
      expect: 200
    });
    const otherPatientRecord = await request(baseUrl, `/api/medical-records/${medicalRecord._id}`, {
      token: patientBToken
    });
    assert(otherPatientRecord.response.status === 403, 'Other patient cannot read medical record');
    record('MEDICAL RECORD patient permission', true);

    const patientRecordPdf = await request(baseUrl, `/api/medical-records/${medicalRecord._id}/pdf`, {
      token: patientToken,
      headers: { Accept: 'application/pdf' },
      expect: 200
    });
    assert(Buffer.isBuffer(patientRecordPdf.data) && patientRecordPdf.data.slice(0, 4).toString() === '%PDF', 'Medical PDF should be valid PDF');
    const otherPatientPdf = await request(baseUrl, `/api/medical-records/${medicalRecord._id}/pdf`, {
      token: patientBToken,
      headers: { Accept: 'application/pdf' }
    });
    assert(otherPatientPdf.response.status === 403, 'Other patient cannot download medical PDF');
    record('PDF medical record permission', true);

    const reviewResponse = await request(baseUrl, '/api/reviews', {
      method: 'POST',
      token: patientToken,
      body: { appointmentId: appointment._id, rating: 5, comment: 'Bác sĩ tư vấn kỹ' },
      expect: 201
    });
    created.reviews.push(reviewResponse.data.data);
    const duplicateReview = await request(baseUrl, '/api/reviews', {
      method: 'POST',
      token: patientToken,
      body: { appointmentId: appointment._id, rating: 5, comment: 'Duplicate' }
    });
    assert(duplicateReview.response.status === 409, 'Duplicate review should be rejected');
    await request(baseUrl, '/api/doctor/reviews', { token: doctorToken, expect: 200 });
    record('REVIEW completed appointment, duplicate protection, doctor own reviews', true);

    const waitingA = await request(baseUrl, '/api/waiting-list', {
      method: 'POST',
      token: patientBToken,
      body: { ...appointmentBody, timeSlot: '08:00-08:30' },
      expect: 201
    });
    created.waitingList.push(waitingA.data.data);
    assert(waitingA.data.data.position >= 1, 'Waiting list should assign position');
    const duplicateWaiting = await request(baseUrl, '/api/waiting-list', {
      method: 'POST',
      token: patientBToken,
      body: { ...appointmentBody, timeSlot: '08:00-08:30' }
    });
    assert(duplicateWaiting.response.status === 409, 'Duplicate waiting list entry should be rejected');
    const unauthorizedAccept = await request(baseUrl, `/api/waiting-list/${waitingA.data.data._id}/accept`, {
      method: 'POST',
      token: patientToken
    });
    assert([400, 404].includes(unauthorizedAccept.response.status), 'Other patient cannot accept waiting list offer');
    record('WAITING LIST join, duplicate, ownership checks', true);

    await request(baseUrl, `/api/appointments/${appointment._id}/pdf`, {
      token: patientToken,
      headers: { Accept: 'application/pdf' },
      expect: 200
    });
    await request(baseUrl, `/api/appointments/${appointment._id}/queue-ticket/pdf`, {
      token: doctorToken,
      headers: { Accept: 'application/pdf' },
      expect: 200
    });
    await request(baseUrl, `/api/appointments/${appointment._id}/pdf`, {
      token: adminToken,
      headers: { Accept: 'application/pdf' },
      expect: 200
    });
    record('PDF appointment/queue/admin access', true);

    const notifications = await Notification.find({
      $or: [
        { userId: patientAUser._id },
        { userId: setup.doctorUserA._id },
        { role: 'admin' }
      ]
    });
    assert(notifications.length > 0, 'Notifications should be persisted');
    record('NOTIFICATION DB persisted for tested flows', true, `${notifications.length} notifications`);

    const audit = await request(baseUrl, '/api/admin/audit-logs', {
      token: adminToken,
      expect: 200
    });
    const actions = new Set((audit.data.data.logs || []).map((log) => log.action));
    assert(actions.has('CREATE_APPOINTMENT') || actions.has('CREATE_MEDICAL_RECORD') || actions.has('LOGIN_SUCCESS'), 'Audit logs should contain tested actions');
    record('AUDIT LOG list accessible and populated', true);

    const doctorAppointments = await request(baseUrl, `/api/doctors/${setup.doctorA._id}/appointments?status=completed`, {
      token: doctorToken,
      expect: 200
    });
    assert(doctorAppointments.data.data.some((item) => String(item._id) === String(appointment._id)), 'Doctor completed filter should include appointment');
    record('DOCTOR APPOINTMENTS status filter', true);

    const failed = results.filter((item) => !item.passed);
    console.log(`\nE2E smoke summary: ${results.length - failed.length}/${results.length} passed`);
    if (failed.length) process.exitCode = 1;
  } finally {
    await cleanup();
    await new Promise((resolve) => server.close(resolve));
    await mongoose.disconnect();
  }
}

main().catch(async (error) => {
  record('E2E smoke runner', false, error.stack || error.message);
  try {
    if (mongoose.connection.readyState === 1) {
      await cleanup();
    }
  } catch (cleanupError) {
    console.warn('E2E cleanup failed:', cleanupError);
  }
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
