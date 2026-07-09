import express from 'express';
import {
  clinicIdParamRule,
  createSpecialty,
  deleteSpecialty,
  getSpecialties,
  getSpecialtiesByClinic,
  getSpecialtyById,
  specialtyIdRule,
  specialtyRules,
  updateSpecialty
} from '../controllers/specialtyController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { roleMiddleware } from '../middleware/roleMiddleware.js';
import { validate } from '../middleware/validate.js';

const router = express.Router();
export const clinicSpecialtyRouter = express.Router({ mergeParams: true });

router.get('/', getSpecialties);
router.get('/:id', specialtyIdRule, validate, getSpecialtyById);
router.post('/', authMiddleware, roleMiddleware('admin'), specialtyRules, validate, createSpecialty);
router.put('/:id', authMiddleware, roleMiddleware('admin'), specialtyIdRule, specialtyRules, validate, updateSpecialty);
router.delete('/:id', authMiddleware, roleMiddleware('admin'), specialtyIdRule, validate, deleteSpecialty);

clinicSpecialtyRouter.get('/', clinicIdParamRule, validate, getSpecialtiesByClinic);

export default router;
