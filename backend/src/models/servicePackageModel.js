import mongoose from 'mongoose';

const servicePackageSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Package name is required'], trim: true },
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    description: { type: String, default: '', trim: true },
    targetPatients: [{ type: String, trim: true }],
    includes: [{ type: String, trim: true }],
    price: { type: Number, required: [true, 'Package price is required'], min: 0 },
    durationMinutes: { type: Number, required: true, default: 30, min: 1 },
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
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Doctor',
      default: null,
      index: true
    },
    isActive: { type: Boolean, default: true, index: true },
    isDeleted: { type: Boolean, default: false, index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
);

servicePackageSchema.index(
  { clinicId: 1, specialtyId: 1, name: 1, doctorId: 1 },
  {
    unique: true,
    partialFilterExpression: { isDeleted: false }
  }
);
servicePackageSchema.index({ clinicId: 1, specialtyId: 1, isActive: 1 });
servicePackageSchema.index({ doctorId: 1, isActive: 1 });

export default mongoose.models.ServicePackage || mongoose.model('ServicePackage', servicePackageSchema);
