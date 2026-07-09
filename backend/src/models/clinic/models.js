import mongoose from 'mongoose';

const doctorSchema = new mongoose.Schema(
  {
    clinicId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    name: { type: String, required: true, trim: true },
    email: { type: String, lowercase: true, trim: true },
    personalEmail: { type: String, lowercase: true, trim: true },
    loginEmail: { type: String, lowercase: true, trim: true },
    doctorCode: { type: String, uppercase: true, trim: true },
    phone: { type: String, trim: true },
    dateOfBirth: { type: String, default: '', trim: true },
    gender: { type: String, default: '', trim: true },
    address: { type: String, default: '', trim: true },
    avatarUrl: { type: String, default: '' },
    degree: { type: String, default: '' },
    position: { type: String, default: '' },
    workplace: { type: String, default: '' },
    bio: { type: String, default: '' },
    specialtyId: { type: mongoose.Schema.Types.ObjectId, required: true },
    experienceYears: { type: Number, default: 0, min: 0 },
    description: { type: String, default: '' },
    workingDays: [{ type: String }],
    workingHours: {
      start: { type: String, trim: true },
      end: { type: String, trim: true }
    },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

doctorSchema.index({ doctorCode: 1 }, { unique: true, sparse: true });
doctorSchema.index({ loginEmail: 1 }, { unique: true, sparse: true });

const patientSchema = new mongoose.Schema(
  {
    clinicId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String, trim: true },
    dateOfBirth: Date,
    gender: { type: String, enum: ['male', 'female', 'other', 'unknown'], default: 'unknown' }
  },
  { timestamps: true }
);

patientSchema.index({ clinicId: 1, userId: 1 }, { unique: true });

const scheduleSchema = new mongoose.Schema(
  {
    clinicId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    doctorId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Doctor' },
    date: { type: String, required: true },
    timeSlots: [{ type: String, required: true }],
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

scheduleSchema.index({ clinicId: 1, doctorId: 1, date: 1 }, { unique: true });

const appointmentSchema = new mongoose.Schema(
  {
    clinicId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    doctorId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Doctor' },
    patientId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Patient' },
    specialtyId: { type: mongoose.Schema.Types.ObjectId, required: true },
    serviceId: { type: mongoose.Schema.Types.ObjectId },
    servicePackageId: { type: mongoose.Schema.Types.ObjectId, default: null },
    servicePackageSnapshot: {
      _id: { type: mongoose.Schema.Types.ObjectId },
      name: { type: String, trim: true },
      code: { type: String, trim: true },
      description: { type: String, trim: true },
      price: { type: Number, min: 0 },
      durationMinutes: { type: Number, min: 1 },
      clinicId: { type: mongoose.Schema.Types.ObjectId },
      specialtyId: { type: mongoose.Schema.Types.ObjectId },
      doctorId: { type: mongoose.Schema.Types.ObjectId, default: null }
    },
    paymentStatus: {
      type: String,
      enum: ['unpaid', 'paid_at_clinic', 'cancelled'],
      default: 'unpaid'
    },
    paymentMethod: {
      type: String,
      enum: ['clinic', 'online', 'none'],
      default: 'clinic'
    },
    isFollowUp: { type: Boolean, default: false, index: true },
    followUpRecordId: { type: mongoose.Schema.Types.ObjectId, default: null, index: true },
    originalAppointmentId: { type: mongoose.Schema.Types.ObjectId, default: null },
    date: { type: String, required: true },
    timeSlot: { type: String, required: true },
    reason: { type: String, default: '' },
    cancelRequest: {
      reason: { type: String, default: '', trim: true },
      requestedAt: Date,
      handledAt: Date,
      handledBy: { type: mongoose.Schema.Types.ObjectId },
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
      handledBy: { type: mongoose.Schema.Types.ObjectId },
      adminNote: { type: String, default: '', trim: true },
      decision: { type: String, enum: ['', 'approved', 'rejected', 'cancelled_by_patient'], default: '' }
    },
    confirmedAt: Date,
    startedAt: Date,
    startedBy: { type: mongoose.Schema.Types.ObjectId },
    completedAt: Date,
    completedBy: { type: mongoose.Schema.Types.ObjectId },
    noShowAt: Date,
    noShowAuto: { type: Boolean, default: false },
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
      enum: [
        'pending',
        'confirmed',
        'in_progress',
        'completed',
        'cancelled',
        'no_show',
        'cancel_requested',
        'reschedule_requested',
        'reschedule_rejected'
      ],
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
      status: { $in: ['pending', 'confirmed', 'in_progress', 'cancel_requested', 'reschedule_requested', 'completed'] }
    }
  }
);

export function getClinicModels(connection) {
  return {
    Doctor: connection.models.Doctor || connection.model('Doctor', doctorSchema),
    Patient: connection.models.Patient || connection.model('Patient', patientSchema),
    Schedule: connection.models.Schedule || connection.model('Schedule', scheduleSchema),
    Appointment: connection.models.Appointment || connection.model('Appointment', appointmentSchema)
  };
}
