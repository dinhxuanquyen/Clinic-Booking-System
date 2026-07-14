import mongoose from 'mongoose';
import { APPOINTMENT_STATUS_VALUES, SLOT_HOLDING_APPOINTMENT_STATUSES } from '../constants/appointmentStatus.js';
import { FOLLOW_UP_TYPE_VALUES } from '../constants/followUpStatus.js';

const insuranceSnapshotSchema = new mongoose.Schema(
  {
    enabled: { type: Boolean, default: false },
    insuranceNumber: { type: String, trim: true, default: '' },
    insuranceExpiryDate: { type: Date, default: null },
    insuranceRegisteredHospital: { type: String, trim: true, default: '' }
  },
  { _id: false }
);

const appointmentSchema = new mongoose.Schema(
  {
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'patientId is required'],
      index: true
    },
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Doctor',
      required: [true, 'doctorId is required'],
      index: true
    },
    clinicId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Clinic',
      required: [true, 'clinicId is required'],
      index: true
    },
    specialtyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Specialty',
      required: [true, 'specialtyId is required'],
      index: true
    },
    date: { type: String, required: [true, 'date is required'] },
    timeSlot: { type: String, required: [true, 'timeSlot is required'], trim: true },
    reason: { type: String, default: '', trim: true },
    patientInfo: {
      name: { type: String, trim: true },
      email: { type: String, trim: true, lowercase: true },
      phone: { type: String, trim: true },
      gender: { type: String, trim: true },
      dateOfBirth: { type: String, trim: true }
    },
    servicePackageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ServicePackage',
      default: null,
      index: true
    },
    servicePackageSnapshot: {
      _id: { type: mongoose.Schema.Types.ObjectId, ref: 'ServicePackage' },
      name: { type: String, trim: true },
      code: { type: String, trim: true },
      description: { type: String, trim: true },
      targetPatients: [{ type: String, trim: true }],
      includes: [{ type: String, trim: true }],
      price: { type: Number, min: 0 },
      durationMinutes: { type: Number, min: 1 },
      clinicId: { type: mongoose.Schema.Types.ObjectId, ref: 'Clinic' },
      specialtyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Specialty' },
      doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', default: null }
    },
    insuranceSnapshot: { type: insuranceSnapshotSchema, default: null },
    paymentStatus: {
      type: String,
      enum: ['unpaid', 'paid_at_clinic', 'cancelled'],
      default: 'unpaid',
      index: true
    },
    paymentMethod: {
      type: String,
      enum: ['clinic', 'online', 'none'],
      default: 'clinic'
    },
    isFollowUp: { type: Boolean, default: false, index: true },
    followUpRecordId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MedicalRecord',
      default: null,
      index: true
    },
    followUpType: {
      type: String,
      enum: ['', ...FOLLOW_UP_TYPE_VALUES],
      default: '',
      index: true
    },
    originalAppointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appointment',
      default: null
    },
    cancelRequest: {
      reason: { type: String, default: '', trim: true },
      requestedAt: Date,
      handledAt: Date,
      handledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      adminNote: { type: String, default: '', trim: true }
    },
    rescheduleRequest: {
      oldDate: { type: String, default: '', trim: true },
      oldTimeSlot: { type: String, default: '', trim: true },
      newDate: { type: String, default: '', trim: true },
      newTimeSlot: { type: String, default: '', trim: true },
      reason: { type: String, default: '', trim: true },
      requestedAt: Date,
      handledAt: Date,
      handledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      adminNote: { type: String, default: '', trim: true },
      decision: { type: String, enum: ['', 'approved', 'rejected', 'cancelled_by_patient'], default: '' }
    },
    confirmedAt: Date,
    confirmedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    startedAt: Date,
    startedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    completedAt: Date,
    completedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    cancelledAt: Date,
    cancelledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    noShowAt: Date,
    noShowAuto: { type: Boolean, default: false },
    cancelReason: { type: String, default: '', trim: true },
    cancelRequestedAt: Date,
    cancelApprovedAt: Date,
    rescheduleRequestedAt: Date,
    rescheduleApprovedAt: Date,
    notificationSentAt: Date,
    emailConfirmationSentAt: Date,
    queueNumber: { type: Number, min: 1, index: true },
    consultationStatus: {
      type: String,
      enum: ['waiting', 'in_progress', 'completed', 'skipped'],
      default: 'waiting',
      index: true
    },
    checkInAt: Date,
    startConsultationAt: Date,
    finishConsultationAt: Date,
    status: {
      type: String,
      enum: APPOINTMENT_STATUS_VALUES,
      default: 'pending',
      index: true
    }
  },
  { timestamps: true }
);

appointmentSchema.index(
  { clinicId: 1, doctorId: 1, date: 1, timeSlot: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: { $in: SLOT_HOLDING_APPOINTMENT_STATUSES }
    }
  }
);

export default mongoose.models.Appointment || mongoose.model('Appointment', appointmentSchema);
