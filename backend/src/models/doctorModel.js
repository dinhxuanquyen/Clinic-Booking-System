import mongoose from 'mongoose';

const workingHoursSchema = new mongoose.Schema(
  {
    start: { type: String, required: true, trim: true },
    end: { type: String, required: true, trim: true }
  },
  { _id: false }
);

const doctorSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Doctor name is required'], trim: true },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Doctor email must be valid']
    },
    personalEmail: {
      type: String,
      required: [true, 'Doctor personal email is required'],
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Doctor personal email must be valid']
    },
    loginEmail: {
      type: String,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Doctor login email must be valid']
    },
    doctorCode: {
      type: String,
      uppercase: true,
      trim: true,
      match: [/^DR\d{4,}$/, 'Doctor code must use format DR0001']
    },
    phone: { type: String, required: [true, 'Doctor phone is required'], trim: true },
    dateOfBirth: { type: String, default: '', trim: true },
    gender: { type: String, enum: ['', 'male', 'female', 'other'], default: '' },
    address: { type: String, default: '', trim: true },
    avatar: { type: String, default: '' },
    degree: { type: String, default: '', trim: true },
    position: { type: String, default: '', trim: true },
    workplace: { type: String, default: '', trim: true },
    bio: { type: String, default: '', trim: true },
    experienceYears: { type: Number, default: 0, min: 0 },
    description: { type: String, default: '', trim: true },
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
    workingDays: {
      type: [
        {
          type: String,
          enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
        }
      ],
      default: []
    },
    workingHours: { type: workingHoursSchema, required: true },
    ratingAverage: { type: Number, default: 0, min: 0, max: 5 },
    ratingCount: { type: Number, default: 0, min: 0 },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

doctorSchema.index({ doctorCode: 1 }, { unique: true, sparse: true });
doctorSchema.index({ loginEmail: 1 }, { unique: true, sparse: true });

doctorSchema.pre('validate', function preserveLegacyEmail(next) {
  if (!this.personalEmail && this.email) this.personalEmail = this.email;
  if (!this.email && this.personalEmail) this.email = this.personalEmail;
  next();
});

export default mongoose.models.Doctor || mongoose.model('Doctor', doctorSchema);
