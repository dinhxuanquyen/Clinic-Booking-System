import mongoose from 'mongoose';
import { FOLLOW_UP_STATUSES, FOLLOW_UP_STATUS_VALUES } from '../constants/followUpStatus.js';

const prescriptionItemSchema = new mongoose.Schema(
  {
    medicineName: { type: String, trim: true },
    dosage: { type: String, trim: true, default: '' },
    frequency: { type: String, trim: true, default: '' },
    duration: { type: String, trim: true, default: '' },
    note: { type: String, trim: true, default: '' }
  },
  { _id: false }
);

const vitalsSchema = new mongoose.Schema(
  {
    bloodPressure: { type: String, trim: true, default: '' }, // e.g. "120/80"
    heartRate: { type: Number },
    temperature: { type: Number },
    respiratoryRate: { type: Number },
    spo2: { type: Number },
    height: { type: Number }, // cm
    weight: { type: Number }, // kg
    bmi: { type: Number }
  },
  { _id: false }
);

const attachmentSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    name: { type: String, trim: true, required: true },
    type: { type: String, enum: ['image', 'pdf', 'other'], default: 'other' }
  },
  { _id: false }
);

const medicalRecordSchema = new mongoose.Schema(
  {
    appointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appointment',
      required: true,
      unique: true,
      index: true
    },
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Doctor',
      required: true,
      index: true
    },
    clinicId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Clinic',
      required: true,
      index: true
    },
    specialtyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Specialty',
      required: true,
      index: true
    },
    symptoms: { type: String, trim: true, default: '' },
    vitals: { type: vitalsSchema, default: () => ({}) },
    allergies: { type: String, trim: true, default: '' },
    icd10Code: { type: String, trim: true, default: '' },
    diagnosis: { type: String, trim: true, required: true },
    conclusion: { type: String, trim: true, required: true },
    prescription: { type: [prescriptionItemSchema], default: [] },
    attachments: { type: [attachmentSchema], default: [] },
    advice: { type: String, trim: true, default: '' },
    followUpRequired: { type: Boolean, default: false },
    followUpDate: Date,
    followUpStatus: {
      type: String,
      enum: FOLLOW_UP_STATUS_VALUES,
      default: FOLLOW_UP_STATUSES.NONE,
      index: true
    },
    followUpAppointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appointment',
      default: null
    },
    followUpCompletedRecordId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MedicalRecord',
      default: null
    },
    followUpReminderSentAt: Date,
    followUpOverdueAt: Date,
    followUpCompletedAt: Date,
    note: { type: String, trim: true, default: '' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
);

medicalRecordSchema.index({ patientId: 1, createdAt: -1 });
medicalRecordSchema.index({ doctorId: 1, createdAt: -1 });
medicalRecordSchema.index({ followUpRequired: 1, followUpStatus: 1, followUpDate: 1 });
medicalRecordSchema.index({ followUpAppointmentId: 1 });
medicalRecordSchema.index({ followUpCompletedRecordId: 1 });

export default mongoose.models.MedicalRecord || mongoose.model('MedicalRecord', medicalRecordSchema);
