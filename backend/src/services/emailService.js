import nodemailer from 'nodemailer';
import { env } from '../config/env.js';
import {
  doctorAppointmentCancelledTemplate,
  doctorNewAppointmentTemplate,
  doctorRescheduleRequestTemplate,
  patientAppointmentCancelledTemplate,
  patientAppointmentConfirmedTemplate,
  patientAppointmentCreatedTemplate,
  patientAppointmentRescheduledTemplate,
  waitingListOfferTemplate
} from './email/appointmentEmailTemplates.js';
import {
  doctorTemporaryPasswordTemplate,
  emailVerificationOtpTemplate,
  resetPasswordOtpTemplate
} from './email/authEmailTemplates.js';
import {
  followUpDueSoonTemplate,
  followUpOverdueTemplate,
  medicalRecordUpdatedTemplate
} from './email/medicalRecordEmailTemplates.js';

let transporter;

function isSmtpConfigured() {
  if (env.nodeEnv === 'test') return false;
  return Boolean(env.smtp.host && env.smtp.user && env.smtp.pass);
}

function isBrevoConfigured() {
  if (env.nodeEnv === 'test') return false;
  return Boolean(env.brevo.apiKey && env.brevo.senderEmail);
}

function getTransporter() {
  if (transporter) return transporter;

  transporter = nodemailer.createTransport({
    host: env.smtp.host,
    port: env.smtp.port,
    secure: env.smtp.secure,
    connectionTimeout: env.smtp.timeoutMs,
    greetingTimeout: env.smtp.timeoutMs,
    socketTimeout: env.smtp.timeoutMs,
    auth: {
      user: env.smtp.user,
      pass: env.smtp.pass
    }
  });

  return transporter;
}

function patientEmail(patient) {
  return patient?.email;
}

function doctorNotificationEmail(doctor) {
  return doctor?.personalEmail || doctor?.email;
}

function fromAddress() {
  if (env.brevo.senderEmail) return `${env.brevo.senderName} <${env.brevo.senderEmail}>`;
  if (env.smtp.from) return env.smtp.from;
  return `${env.email.fromName} <no-reply@example.com>`;
}

function buildBrevoReplyTo() {
  const candidate = env.brevo.replyTo || env.email.replyTo || env.email.support || env.brevo.senderEmail;
  if (!candidate || !String(candidate).includes('@')) return undefined;

  return {
    email: candidate,
    name: env.brevo.senderName || env.email.fromName || 'BookingCare Mini'
  };
}

async function sendViaBrevo(template) {
  const payload = {
    sender: {
      name: env.brevo.senderName,
      email: env.brevo.senderEmail
    },
    to: [
      {
        email: template.to,
        name: template.to
      }
    ],
    subject: template.subject,
    htmlContent: template.html,
    textContent: template.text
  };

  const replyTo = buildBrevoReplyTo();
  if (replyTo) payload.replyTo = replyTo;

  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': env.brevo.apiKey,
      accept: 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Brevo email failed with ${response.status}: ${details}`);
  }

  return response.json();
}

async function sendBusinessEmail(template, missingRecipientLog) {
  if (!template?.to) {
    if (missingRecipientLog) console.warn(missingRecipientLog);
    return { skipped: true };
  }

  const preferSmtp = env.nodeEnv !== 'production';

  if (!preferSmtp && isBrevoConfigured()) {
    await sendViaBrevo(template);
    return { skipped: false, provider: 'brevo' };
  }

  if (isSmtpConfigured()) {
    await getTransporter().sendMail({
      from: fromAddress(),
      to: template.to,
      subject: template.subject,
      html: template.html,
      text: template.text,
      replyTo: env.email.replyTo || env.email.support || undefined
    });

    return { skipped: false, provider: 'smtp' };
  }

  if (preferSmtp && isBrevoConfigured()) {
    await sendViaBrevo(template);
    return { skipped: false, provider: 'brevo' };
  }

  if (!isSmtpConfigured()) {
    console.log('Email service skipped because SMTP is not configured');
    console.log(`Business email target: ${template.to}`);
    return { skipped: true };
  }
}

export async function sendAppointmentConfirmation(payload) {
  return sendBusinessEmail(
    patientAppointmentCreatedTemplate({ ...payload, appUrl: env.appUrl }),
    `Appointment confirmation recipient is missing`
  );
}

export async function sendResetPasswordOtp({ to, otp }) {
  return sendBusinessEmail(
    resetPasswordOtpTemplate({ to, otp }),
    'Reset password OTP recipient is missing'
  );
}

export async function sendEmailVerificationOtp({ to, otp }) {
  return sendBusinessEmail(
    emailVerificationOtpTemplate({ to, otp }),
    'Email verification OTP recipient is missing'
  );
}

export async function sendDoctorTemporaryPassword({ to, name, doctorCode = '', loginEmail = to, temporaryPassword }) {
  return sendBusinessEmail(
    doctorTemporaryPasswordTemplate({
      appUrl: env.appUrl,
      to,
      name,
      doctorCode,
      loginEmail,
      temporaryPassword
    }),
    'Doctor temporary password recipient is missing'
  );
}

export async function sendDoctorNewAppointmentEmail({ doctor, patient, appointment, clinic, specialty }) {
  return sendBusinessEmail(
    doctorNewAppointmentTemplate({
      appUrl: env.appUrl,
      doctor,
      patient,
      appointment,
      clinic,
      specialty
    }),
    `Doctor ${doctor?._id || appointment?.doctorId || 'unknown'} has no personal email for new appointment notification`
  );
}

export async function sendAppointmentConfirmedEmail({ patient, doctor, appointment, clinic, specialty }) {
  return sendBusinessEmail(
    patientAppointmentConfirmedTemplate({
      appUrl: env.appUrl,
      patient,
      doctor,
      appointment,
      clinic,
      specialty
    }),
    `Patient ${patient?._id || appointment?.patientId || 'unknown'} has no email for appointment confirmation`
  );
}

export async function sendAppointmentCancelledEmail({ patient, doctor, appointment, reason = '', waitingListNotice = false }) {
  return sendBusinessEmail(
    patientAppointmentCancelledTemplate({
      appUrl: env.appUrl,
      patient,
      doctor,
      appointment,
      reason,
      waitingListNotice
    }),
    `Patient ${patient?._id || appointment?.patientId || 'unknown'} has no email for appointment cancellation`
  );
}

export async function sendAppointmentRescheduledEmail({
  patient,
  doctor,
  appointment,
  approved = true,
  oldDate,
  oldTimeSlot,
  newDate,
  newTimeSlot,
  adminNote = ''
}) {
  return sendBusinessEmail(
    patientAppointmentRescheduledTemplate({
      appUrl: env.appUrl,
      patient,
      doctor,
      appointment,
      approved,
      oldDate,
      oldTimeSlot,
      newDate,
      newTimeSlot,
      adminNote
    }),
    `Patient ${patient?._id || appointment?.patientId || 'unknown'} has no email for reschedule notification`
  );
}

export async function sendDoctorAppointmentCancelledEmail({ doctor, patient, appointment, reason = '' }) {
  return sendBusinessEmail(
    doctorAppointmentCancelledTemplate({
      appUrl: env.appUrl,
      doctor,
      patient,
      appointment,
      reason
    }),
    `Doctor ${doctor?._id || appointment?.doctorId || 'unknown'} has no personal email for cancelled appointment`
  );
}

export async function sendDoctorRescheduleRequestEmail({ doctor, patient, appointment }) {
  return sendBusinessEmail(
    doctorRescheduleRequestTemplate({
      appUrl: env.appUrl,
      doctor,
      patient,
      appointment
    }),
    `Doctor ${doctor?._id || appointment?.doctorId || 'unknown'} has no personal email for reschedule request`
  );
}

export async function sendMedicalRecordUpdatedEmail({ patient, doctor, appointment, record }) {
  return sendBusinessEmail(
    medicalRecordUpdatedTemplate({
      appUrl: env.appUrl,
      patient,
      doctor,
      appointment,
      record
    }),
    `Patient ${patient?._id || appointment?.patientId || 'unknown'} has no email for medical record update`
  );
}

export async function sendFollowUpDueSoonEmail({ patient, record }) {
  return sendBusinessEmail(
    followUpDueSoonTemplate({
      appUrl: env.appUrl,
      patient,
      record
    }),
    `Patient ${patient?._id || record?.patientId || 'unknown'} has no email for follow-up reminder`
  );
}

export async function sendFollowUpOverdueEmail({ patient, record }) {
  return sendBusinessEmail(
    followUpOverdueTemplate({
      appUrl: env.appUrl,
      patient,
      record
    }),
    `Patient ${patient?._id || record?.patientId || 'unknown'} has no email for overdue follow-up`
  );
}

export async function sendWaitingListOffer({ to, patientName, doctorName, date, timeSlot, expiresInMinutes = 10 }) {
  return sendBusinessEmail(
    waitingListOfferTemplate({
      appUrl: env.appUrl,
      to,
      patientName,
      doctorName,
      date,
      timeSlot,
      expiresInMinutes
    }),
    'Waiting list offer recipient is missing'
  );
}

export const __emailInternals = {
  patientEmail,
  doctorNotificationEmail,
  isSmtpConfigured,
  isBrevoConfigured
};
