import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { ApiError } from '../utils/apiError.js';
import User from '../models/central/User.js';

export async function authMiddleware(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;

    if (!token) {
      throw new ApiError(401, 'Authentication token is required');
    }

    const payload = jwt.verify(token, env.jwtSecret);
    const user = await User.findById(payload.id).select('-password');

    if (!user || !user.isActive) {
      throw new ApiError(401, 'Invalid authentication token');
    }

    req.user = user;
    next();
  } catch (error) {
    next(error.statusCode ? error : new ApiError(401, 'Invalid authentication token'));
  }
}

export const auth = authMiddleware;
