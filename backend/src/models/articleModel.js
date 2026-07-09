import mongoose from 'mongoose';

const articleSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    summary: { type: String, default: '', trim: true },
    content: { type: String, default: '' },
    coverImage: { type: String, default: '', trim: true },
    category: { type: String, default: 'Sức khỏe tổng quát', trim: true, index: true },
    specialtyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Specialty', default: null, index: true },
    authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    authorRole: { type: String, enum: ['admin', 'doctor'], required: true, index: true },
    doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', default: null, index: true },
    tags: [{ type: String, trim: true }],
    status: { type: String, enum: ['draft', 'published', 'hidden'], default: 'published', index: true },
    isFeatured: { type: Boolean, default: false, index: true },
    isDeleted: { type: Boolean, default: false, index: true },
    viewCount: { type: Number, default: 0, min: 0 },
    publishedAt: { type: Date, default: null }
  },
  { timestamps: true }
);

articleSchema.index({ title: 'text', summary: 'text', content: 'text', tags: 'text' });
articleSchema.index({ status: 1, isFeatured: 1, publishedAt: -1 });

articleSchema.pre('validate', function setPublishedAt(next) {
  if (this.status === 'published' && !this.publishedAt) {
    this.publishedAt = new Date();
  }
  next();
});

export default mongoose.models.Article || mongoose.model('Article', articleSchema);
