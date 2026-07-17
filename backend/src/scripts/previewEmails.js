import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { doctorNewAppointmentTemplate, patientAppointmentConfirmedTemplate } from '../services/email/appointmentEmailTemplates.js';
import { emailVerificationOtpTemplate, resetPasswordOtpTemplate } from '../services/email/authEmailTemplates.js';
import { followUpDueSoonTemplate, medicalRecordUpdatedTemplate } from '../services/email/medicalRecordEmailTemplates.js';

const appUrl = process.env.APP_URL || 'http://localhost:5173';
const outputDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../docs/email-previews');

const clinic = {
  name: 'BookingCare Mini Quận 5',
  address: '123 Nguyễn Trãi, Quận 5, TP. Hồ Chí Minh',
  phone: '1900 0000',
  email: 'support@clinicbooking.vn'
};
const specialty = { name: 'Nội tổng quát' };
const doctor = {
  _id: 'doctor-preview',
  name: 'ThS.BS Nguyễn Thị Minh Anh',
  personalEmail: 'doctor.preview@example.com'
};
const patient = {
  _id: 'patient-preview',
  name: 'Đinh Quốc Minh',
  email: 'patient.preview@example.com'
};
const appointment = {
  _id: '66990000000000000000a001',
  patientInfo: { name: patient.name },
  date: '2026-07-17',
  timeSlot: '08:00 - 08:30',
  status: 'confirmed',
  queueNumber: 7,
  reason: 'Ho kéo dài, mệt mỏi nhẹ',
  servicePackageSnapshot: { name: 'Khám nội tổng quát' },
  isFollowUp: false
};
const record = {
  _id: '66990000000000000000abcd',
  followUpRequired: true,
  followUpStatus: 'recommended',
  followUpDate: '2026-07-24'
};

const previews = {
  'patient-appointment-confirmed.html': patientAppointmentConfirmedTemplate({ appUrl, patient, doctor, appointment, clinic, specialty }).html,
  'doctor-new-appointment.html': doctorNewAppointmentTemplate({
    appUrl,
    doctor,
    patient,
    appointment: { ...appointment, status: 'pending' },
    clinic,
    specialty
  }).html,
  'patient-medical-record.html': medicalRecordUpdatedTemplate({ appUrl, patient, doctor, appointment, record }).html,
  'patient-follow-up.html': followUpDueSoonTemplate({ appUrl, patient, record }).html,
  'verify-email-otp.html': emailVerificationOtpTemplate({ to: patient.email, otp: '482913' }).html,
  'forgot-password-otp.html': resetPasswordOtpTemplate({ to: patient.email, otp: '739204' }).html
};

await fs.mkdir(outputDir, { recursive: true });
await Promise.all(Object.entries(previews).map(([filename, html]) => fs.writeFile(path.join(outputDir, filename), html, 'utf8')));

console.log(`Email previews generated in ${outputDir}`);
