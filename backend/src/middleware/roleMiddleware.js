import { ApiError } from '../utils/apiError.js';

export function roleMiddleware(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      console.warn('Role permission denied', {
        userId: req.user?._id || req.user?.id || null,
        role: req.user?.role || null,
        doctorId: req.user?.doctorId || null,
        allowedRoles: roles,
        method: req.method,
        path: req.originalUrl
      });
      return next(new ApiError(403, 'You do not have permission to access this resource'));
    }

    next();
  };
}

export const allowRoles = roleMiddleware;
