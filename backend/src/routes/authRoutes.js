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
import { validate } from '../middleware/validate.js';

const router = express.Router();

router.post('/register', registerRules, validate, register);
router.post('/login', loginRules, validate, login);
router.post('/verify-email', verifyEmailRules, validate, verifyEmail);
router.post('/resend-verification-otp', resendVerificationOtpRules, validate, resendVerificationOtp);
router.post('/forgot-password', forgotPasswordRules, validate, forgotPassword);
router.post('/reset-password', resetPasswordRules, validate, resetPassword);
router.post('/change-initial-password', auth, changeInitialPasswordRules, validate, changeInitialPassword);
router.patch('/change-password', auth, changePasswordRules, validate, changePassword);
router.get('/me', auth, me);

export default router;
