import { validationResult } from 'express-validator';
import { ApiError } from '../utils/apiError.js';

export function validate(req, res, next) {
  const result = validationResult(req);
  if (result.isEmpty()) {
    return next();
  }

  next(new ApiError(422, 'Validation failed', result.array()));
}
