import mongoose from 'mongoose';

const workingHoursSchema = new mongoose.Schema(
  {
    start: { type: String, required: true, trim: true },
    end: { type: String, required: true, trim: true }
  },
  { _id: false }
);

const scheduleSchema = new mongoose.Schema(
  {
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
    date: { type: String, required: [true, 'date is required'], index: true },
    workingHours: { type: workingHoursSchema, required: true },
    slotDuration: { type: Number, required: true, min: 5 },
    isWorkingDay: { type: Boolean, default: true },
    note: { type: String, default: '', trim: true }
  },
  { timestamps: true }
);

scheduleSchema.index({ doctorId: 1, clinicId: 1, date: 1 }, { unique: true });

export default mongoose.models.Schedule || mongoose.model('Schedule', scheduleSchema);
