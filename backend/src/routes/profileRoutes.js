import express from 'express';
import {
  getInsuranceProfile,
  updateInsuranceProfile,
  updateInsuranceProfileRules
} from '../controllers/userController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { roleMiddleware } from '../middleware/roleMiddleware.js';
import { validate } from '../middleware/validate.js';

const router = express.Router();

router.get('/insurance', authMiddleware, roleMiddleware('patient'), getInsuranceProfile);
router.put('/insurance', authMiddleware, roleMiddleware('patient'), updateInsuranceProfileRules, validate, updateInsuranceProfile);

export default router;
