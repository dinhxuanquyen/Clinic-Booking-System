import { validationResult } from 'express-validator';
import { ApiError } from '../utils/apiError.js';

export function validate(req, res, next) {
  const result = validationResult(req);
  if (result.isEmpty()) {
    return next();
  }

  const details = result.array({ onlyFirstError: true });
  const firstMessage = details[0]?.msg || 'Validation failed';
  next(new ApiError(422, firstMessage, details));
}
