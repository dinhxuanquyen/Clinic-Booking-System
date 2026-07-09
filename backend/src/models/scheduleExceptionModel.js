import mongoose from 'mongoose';

const scheduleExceptionSchema = new mongoose.Schema(
  {
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Doctor',
      required: [true, 'doctorId is required'],
      index: true
    },
    date: { type: String, required: [true, 'date is required'], index: true },
    type: {
      type: String,
      enum: ['day_off', 'half_day', 'custom_hours', 'overtime'],
      required: true,
      index: true
    },
    reason: { type: String, default: '', trim: true },
    startTime: { type: String, default: '', trim: true },
    endTime: { type: String, default: '', trim: true },
    slotDuration: { type: Number, min: 5 },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  { timestamps: true }
);

scheduleExceptionSchema.index({ doctorId: 1, date: 1, type: 1, startTime: 1, endTime: 1 });

export default mongoose.models.ScheduleException || mongoose.model('ScheduleException', scheduleExceptionSchema);
