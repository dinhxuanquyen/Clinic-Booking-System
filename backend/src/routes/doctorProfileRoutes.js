import express from 'express';
import {
  getMyDoctorProfile,
  updateMyDoctorProfile,
  updateMyDoctorProfileRules
} from '../controllers/doctorController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { roleMiddleware } from '../middleware/roleMiddleware.js';
import { validate } from '../middleware/validate.js';

const router = express.Router();

router.use(authMiddleware, roleMiddleware('doctor'));
router.get('/profile', getMyDoctorProfile);
router.put('/profile', updateMyDoctorProfileRules, validate, updateMyDoctorProfile);

export default router;
