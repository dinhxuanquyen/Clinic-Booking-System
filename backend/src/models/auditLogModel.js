import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema(
  {
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    actorName: { type: String, default: '', trim: true },
    actorRole: { type: String, enum: ['admin', 'doctor', 'patient', ''], default: '', index: true },
    action: { type: String, required: true, trim: true, index: true },
    entityType: { type: String, required: true, trim: true, index: true },
    entityId: { type: mongoose.Schema.Types.Mixed },
    entityName: { type: String, default: '', trim: true },
    description: { type: String, default: '', trim: true },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    ipAddress: { type: String, default: '', trim: true },
    userAgent: { type: String, default: '', trim: true }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ actorRole: 1, createdAt: -1 });
auditLogSchema.index({ entityType: 1, createdAt: -1 });

export default mongoose.models.AuditLog || mongoose.model('AuditLog', auditLogSchema);
