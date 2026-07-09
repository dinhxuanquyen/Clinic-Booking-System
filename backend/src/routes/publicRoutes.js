import express from 'express';
import {
  getAvailableSlots,
  getDoctor,
  listDoctors,
  listServices
} from '../controllers/publicController.js';

const router = express.Router();

router.get('/services', listServices);
router.get('/doctors', listDoctors);
router.get('/clinics/:clinicId/doctors/:doctorId', getDoctor);
router.get('/available-slots', getAvailableSlots);

export default router;
