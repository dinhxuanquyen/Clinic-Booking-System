import express from 'express';
import {
  appointmentReviewRule,
  createDoctorReview,
  createDoctorReviewRules,
  doctorReviewDoctorIdRule,
  getAppointmentReview,
  getDoctorReviews,
  getMyDoctorReviews,
  getMyReviews,
  listDoctorReviewRules,
  reviewIdRule,
  updateReviewVisibility,
  updateReviewVisibilityRules
} from '../controllers/doctorReviewController.js';
import { auth } from '../middleware/authMiddleware.js';
import { roleMiddleware } from '../middleware/roleMiddleware.js';
import { validate } from '../middleware/validate.js';

const router = express.Router();
export const doctorReviewRouter = express.Router({ mergeParams: true });
export const appointmentReviewRouter = express.Router({ mergeParams: true });
export const adminReviewRouter = express.Router();
export const doctorOwnReviewRouter = express.Router();

router.post('/', auth, roleMiddleware('patient'), createDoctorReviewRules, validate, createDoctorReview);
router.get('/my', auth, roleMiddleware('patient'), getMyReviews);

doctorReviewRouter.get('/', doctorReviewDoctorIdRule, listDoctorReviewRules, validate, getDoctorReviews);
doctorOwnReviewRouter.get('/reviews', auth, roleMiddleware('doctor'), listDoctorReviewRules, validate, getMyDoctorReviews);
appointmentReviewRouter.get('/', auth, roleMiddleware('admin', 'doctor', 'patient'), appointmentReviewRule, validate, getAppointmentReview);
adminReviewRouter.patch('/:id/visibility', auth, roleMiddleware('admin'), reviewIdRule, updateReviewVisibilityRules, validate, updateReviewVisibility);

export default router;
