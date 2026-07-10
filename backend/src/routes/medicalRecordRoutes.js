import express from 'express';
import {
  appointmentMedicalRecordRule,
  createMedicalRecord,
  createMedicalRecordRules,
  exportMedicalRecordPdf,
  getDoctorMedicalRecords,
  getMedicalRecordByAppointment,
  getMedicalRecordById,
  getMyFollowUpRecords,
  getMyMedicalRecords,
  medicalRecordIdRule
} from '../controllers/medicalRecordController.js';
import { auth } from '../middleware/authMiddleware.js';
import { roleMiddleware } from '../middleware/roleMiddleware.js';
import { validate } from '../middleware/validate.js';

const router = express.Router();
export const doctorMedicalRecordRouter = express.Router();
export const appointmentMedicalRecordRouter = express.Router({ mergeParams: true });

router.post('/', auth, roleMiddleware('doctor'), createMedicalRecordRules, validate, createMedicalRecord);
router.get('/my/follow-ups', auth, roleMiddleware('patient'), getMyFollowUpRecords);
router.get('/my', auth, roleMiddleware('patient'), getMyMedicalRecords);
router.get('/:id/pdf', auth, roleMiddleware('admin', 'doctor', 'patient'), medicalRecordIdRule, validate, exportMedicalRecordPdf);
router.get('/:id', auth, roleMiddleware('admin', 'doctor', 'patient'), medicalRecordIdRule, validate, getMedicalRecordById);

doctorMedicalRecordRouter.get('/medical-records', auth, roleMiddleware('doctor'), getDoctorMedicalRecords);
appointmentMedicalRecordRouter.get('/medical-record', auth, roleMiddleware('admin', 'doctor', 'patient'), appointmentMedicalRecordRule, validate, getMedicalRecordByAppointment);

export default router;
