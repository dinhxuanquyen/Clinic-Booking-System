import mongoose from 'mongoose';

const doctorScheduleTemplateSchema = new mongoose.Schema(
  {
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Doctor',
      required: [true, 'doctorId is required'],
      index: true
    },
    dayOfWeek: {
      type: Number,
      required: [true, 'dayOfWeek is required'],
      min: 0,
      max: 6,
      index: true
    },
    startTime: { type: String, required: true, trim: true },
    endTime: { type: String, required: true, trim: true },
    slotDuration: { type: Number, required: true, min: 5 },
    isWorking: { type: Boolean, default: true }
  },
  { timestamps: true }
);

doctorScheduleTemplateSchema.index({ doctorId: 1, dayOfWeek: 1, startTime: 1, endTime: 1 }, { unique: true });

export default mongoose.models.DoctorScheduleTemplate ||
  mongoose.model('DoctorScheduleTemplate', doctorScheduleTemplateSchema);
