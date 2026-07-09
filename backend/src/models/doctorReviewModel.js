import mongoose from 'mongoose';

const doctorReviewSchema = new mongoose.Schema(
  {
    appointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appointment',
      required: true,
      unique: true,
      index: true
    },
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Doctor',
      required: true,
      index: true
    },
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    clinicId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Clinic'
    },
    specialtyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Specialty'
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5
    },
    comment: {
      type: String,
      default: '',
      trim: true,
      maxlength: 1000
    },
    isVisible: {
      type: Boolean,
      default: true,
      index: true
    }
  },
  { timestamps: true }
);

doctorReviewSchema.index({ doctorId: 1, createdAt: -1 });
doctorReviewSchema.index({ patientId: 1, createdAt: -1 });

export default mongoose.models.DoctorReview || mongoose.model('DoctorReview', doctorReviewSchema);
