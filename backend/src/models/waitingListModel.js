import mongoose from 'mongoose';

const waitingListSchema = new mongoose.Schema(
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
    date: { type: String, required: [true, 'date is required'], index: true },
    timeSlot: { type: String, required: [true, 'timeSlot is required'], trim: true },
    position: { type: Number, required: true, min: 1 },
    status: {
      type: String,
      enum: ['waiting', 'offered', 'accepted', 'declined', 'expired', 'cancelled'],
      default: 'waiting',
      index: true
    },
    offeredAt: Date,
    offerExpiresAt: Date,
    acceptedAt: Date,
    declinedAt: Date,
    expiredAt: Date,
    cancelledAt: Date
  },
  { timestamps: true }
);

waitingListSchema.index(
  { patientId: 1, doctorId: 1, date: 1, timeSlot: 1 },
  {
    unique: true,
    partialFilterExpression: { status: { $in: ['waiting', 'offered', 'accepted'] } }
  }
);
waitingListSchema.index({ doctorId: 1, date: 1, timeSlot: 1, position: 1 }, { unique: true });
waitingListSchema.index(
  { doctorId: 1, date: 1, timeSlot: 1 },
  { unique: true, partialFilterExpression: { status: 'offered' } }
);
waitingListSchema.index({ patientId: 1, createdAt: -1 });

export default mongoose.models.WaitingList || mongoose.model('WaitingList', waitingListSchema);
