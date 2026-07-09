import AuditLog from '../models/auditLogModel.js';

function getRequestIp(req) {
  const forwardedFor = req?.headers?.['x-forwarded-for'];
  if (typeof forwardedFor === 'string' && forwardedFor.trim()) {
    return forwardedFor.split(',')[0].trim();
  }

  return req?.ip || req?.socket?.remoteAddress || '';
}

export async function createAuditLog({
  req,
  action,
  entityType,
  entityId,
  entityName = '',
  description = '',
  metadata = {}
}) {
  try {
    if (!action || !entityType) return null;
    const user = req?.user || {};

    return await AuditLog.create({
      actorId: user._id || user.id,
      actorName: user.name || '',
      actorRole: user.role || '',
      action,
      entityType,
      entityId,
      entityName,
      description,
      metadata,
      ipAddress: getRequestIp(req),
      userAgent: req?.headers?.['user-agent'] || ''
    });
  } catch (error) {
    console.warn('Audit log failed:', error.stack || error);
    return null;
  }
}
