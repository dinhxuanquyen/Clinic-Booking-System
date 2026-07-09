import mongoose from 'mongoose';

const workingHoursSchema = new mongoose.Schema(
  {
    dayOfWeek: {
      type: String,
      enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
      required: true
    },
    open: { type: String, required: true, trim: true },
    close: { type: String, required: true, trim: true },
    isClosed: { type: Boolean, default: false }
  },
  { _id: false }
);

const clinicSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Clinic name is required'], trim: true },
    clinicCode: {
      type: String,
      required: [true, 'Clinic code is required'],
      uppercase: true,
      trim: true,
      match: [/^[A-Z][A-Z0-9]{1,4}$/, 'Clinic code must contain 2-5 uppercase letters or numbers']
    },
    address: { type: String, required: [true, 'Clinic address is required'], trim: true },
    phone: { type: String, required: [true, 'Clinic phone is required'], trim: true },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Clinic email must be valid']
    },
    description: { type: String, default: '', trim: true },
    image: { type: String, default: '' },
    workingHours: { type: [workingHoursSchema], default: [] },
    specialtyIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Specialty' }],
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

clinicSchema.index({ clinicCode: 1 }, { unique: true, sparse: true });

export default mongoose.models.Clinic || mongoose.model('Clinic', clinicSchema);
