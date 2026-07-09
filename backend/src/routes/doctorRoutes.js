import express from 'express';
import {
  clinicIdParamRule,
  createDoctor,
  deleteDoctor,
  doctorIdRule,
  doctorRules,
  getDoctorById,
  getDoctors,
  getDoctorsByClinic,
  getDoctorsBySpecialty,
  specialtyIdParamRule,
  updateDoctor
} from '../controllers/doctorController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { roleMiddleware } from '../middleware/roleMiddleware.js';
import { validate } from '../middleware/validate.js';

const router = express.Router();
export const clinicDoctorRouter = express.Router({ mergeParams: true });
export const specialtyDoctorRouter = express.Router({ mergeParams: true });

router.get('/', getDoctors);
router.get('/:id', doctorIdRule, validate, getDoctorById);
router.post('/', authMiddleware, roleMiddleware('admin'), doctorRules, validate, createDoctor);
router.put('/:id', authMiddleware, roleMiddleware('admin'), doctorIdRule, doctorRules, validate, updateDoctor);
router.delete('/:id', authMiddleware, roleMiddleware('admin'), doctorIdRule, validate, deleteDoctor);

clinicDoctorRouter.get('/', clinicIdParamRule, validate, getDoctorsByClinic);
specialtyDoctorRouter.get('/', specialtyIdParamRule, validate, getDoctorsBySpecialty);

export default router;
