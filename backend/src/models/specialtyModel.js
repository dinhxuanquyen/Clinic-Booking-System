import mongoose from 'mongoose';

const specialtySchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Specialty name is required'], trim: true },
    description: { type: String, default: '', trim: true },
    image: { type: String, default: '' },
    clinicId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Clinic',
      required: [true, 'clinicId is required'],
      index: true
    },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

specialtySchema.index({ clinicId: 1, name: 1 }, { unique: true });

export default mongoose.models.Specialty || mongoose.model('Specialty', specialtySchema);
