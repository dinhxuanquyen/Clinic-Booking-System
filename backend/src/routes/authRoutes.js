import express from 'express';
import {
  changePassword,
  changePasswordRules,
  changeInitialPassword,
  changeInitialPasswordRules,
  forgotPassword,
  forgotPasswordRules,
  login,
  loginRules,
  me,
  register,
  registerRules,
  resendVerificationOtp,
  resendVerificationOtpRules,
  resetPassword,
  resetPasswordRules,
  verifyEmail,
  verifyEmailRules
} from '../controllers/authController.js';
import { auth } from '../middleware/authMiddleware.js';
import {
  authRateLimiter,
  otpRequestRateLimiter,
  otpVerificationRateLimiter
} from '../middleware/rateLimitMiddleware.js';
import { validate } from '../middleware/validate.js';

const router = express.Router();

router.post('/register', authRateLimiter, registerRules, validate, register);
router.post('/login', authRateLimiter, loginRules, validate, login);
router.post('/verify-email', otpVerificationRateLimiter, verifyEmailRules, validate, verifyEmail);
router.post('/resend-verification-otp', otpRequestRateLimiter, resendVerificationOtpRules, validate, resendVerificationOtp);
router.post('/forgot-password', otpRequestRateLimiter, forgotPasswordRules, validate, forgotPassword);
router.post('/reset-password', otpVerificationRateLimiter, resetPasswordRules, validate, resetPassword);
router.post('/change-initial-password', auth, changeInitialPasswordRules, validate, changeInitialPassword);
router.patch('/change-password', auth, changePasswordRules, validate, changePassword);
router.get('/me', auth, me);

export default router;
