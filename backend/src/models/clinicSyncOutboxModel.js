import mongoose from 'mongoose';

const clinicSyncOutboxSchema = new mongoose.Schema(
  {
    eventKey: { type: String, required: true, trim: true },
    operation: {
      type: String,
      enum: ['upsert_appointment'],
      required: true
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true
    },
    clinicId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true
    },
    status: {
      type: String,
      enum: ['pending', 'processing'],
      default: 'pending',
      index: true
    },
    revision: { type: Number, default: 0, min: 0 },
    attempts: { type: Number, default: 0, min: 0 },
    nextAttemptAt: { type: Date, default: Date.now, index: true },
    lockedAt: { type: Date, default: null },
    lastError: { type: String, default: '', trim: true }
  },
  { timestamps: true }
);

clinicSyncOutboxSchema.index({ eventKey: 1 }, { unique: true });
clinicSyncOutboxSchema.index({ status: 1, nextAttemptAt: 1, createdAt: 1 });

export default mongoose.models.ClinicSyncOutbox ||
  mongoose.model('ClinicSyncOutbox', clinicSyncOutboxSchema);
