import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: {
      type: String,
      trim: true,
      set: (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value)
    },
    avatar: { type: String, default: '', trim: true },
    address: { type: String, default: '', trim: true },
    dateOfBirth: { type: String, default: '', trim: true },
    gender: { type: String, enum: ['', 'male', 'female', 'other'], default: '' },
    password: { type: String, required: true, minlength: 6, select: false },
    role: { type: String, enum: ['patient', 'doctor', 'admin'], default: 'patient' },
    clinicId: { type: mongoose.Schema.Types.ObjectId, ref: 'Clinic' },
    doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor' },
    isEmailVerified: { type: Boolean, default: false },
    emailVerificationOtp: { type: String, select: false },
    emailVerificationExpires: { type: Date, select: false },
    resetPasswordOtp: { type: String, select: false },
    resetPasswordExpires: { type: Date, select: false },
    lastOtpSentAt: { type: Date, select: false },
    mustChangePassword: { type: Boolean, default: false },
    temporaryPasswordCreatedAt: { type: Date, default: null },
    initialPasswordChangedAt: { type: Date, default: null },
    passwordChangedAt: { type: Date, default: null },
    lastLoginAt: { type: Date, default: null },
    isActive: { type: Boolean, default: true },
    insuranceEnabled: { type: Boolean, default: false },
    insuranceNumber: {
      type: String,
      trim: true,
      default: '',
      validate: {
        validator: (value) => !value || (value.length >= 10 && value.length <= 20),
        message: 'Ma BHYT phai co tu 10 den 20 ky tu'
      }
    },
    insuranceExpiryDate: { type: Date, default: null },
    insuranceRegisteredHospital: {
      type: String,
      trim: true,
      maxlength: 200,
      default: ''
    },
    insuranceNote: { type: String, trim: true, default: '' }
  },
  { timestamps: true }
);

userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ phone: 1 }, { unique: true, sparse: true });

userSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.password);
};

export default mongoose.model('User', userSchema);
