import express from 'express';
import {
  clinicIdRule,
  clinicRules,
  createClinic,
  deleteClinic,
  getClinicById,
  getClinics,
  updateClinic
} from '../controllers/clinicController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { roleMiddleware } from '../middleware/roleMiddleware.js';
import { validate } from '../middleware/validate.js';

const router = express.Router();

router.get('/', getClinics);
router.get('/:id', clinicIdRule, validate, getClinicById);
router.post('/', authMiddleware, roleMiddleware('admin'), clinicRules, validate, createClinic);
router.put('/:id', authMiddleware, roleMiddleware('admin'), clinicIdRule, clinicRules, validate, updateClinic);
router.delete('/:id', authMiddleware, roleMiddleware('admin'), clinicIdRule, validate, deleteClinic);

export default router;
