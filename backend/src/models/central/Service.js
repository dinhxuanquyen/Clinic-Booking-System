import mongoose from 'mongoose';

const serviceSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    price: { type: Number, required: true, min: 0 },
    specialtyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Specialty' },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

export default mongoose.model('Service', serviceSchema);
