import express from 'express';
import {
  availableSlotsRules,
  createScheduleException,
  createSchedule,
  deleteScheduleException,
  deleteSchedule,
  getDoctorScheduleTemplate,
  getAvailableSlots,
  getScheduleExceptions,
  getSchedules,
  scheduleIdRule,
  scheduleExceptionIdRule,
  scheduleExceptionRules,
  scheduleRules,
  scheduleTemplateRules,
  updateDoctorScheduleTemplate,
  updateScheduleException,
  updateSchedule
} from '../controllers/scheduleController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { roleMiddleware } from '../middleware/roleMiddleware.js';
import { validate } from '../middleware/validate.js';

const router = express.Router();
export const doctorAvailableSlotRouter = express.Router({ mergeParams: true });
export const doctorScheduleRouter = express.Router();

router.get('/', authMiddleware, roleMiddleware('admin', 'doctor'), getSchedules);
router.post('/', authMiddleware, roleMiddleware('admin', 'doctor'), scheduleRules, validate, createSchedule);
router.put('/:id', authMiddleware, roleMiddleware('admin', 'doctor'), scheduleIdRule, scheduleRules, validate, updateSchedule);
router.delete('/:id', authMiddleware, roleMiddleware('admin', 'doctor'), scheduleIdRule, validate, deleteSchedule);

doctorAvailableSlotRouter.get('/', availableSlotsRules, validate, getAvailableSlots);

doctorScheduleRouter.get('/schedule-template', authMiddleware, roleMiddleware('doctor', 'admin'), getDoctorScheduleTemplate);
doctorScheduleRouter.put('/schedule-template', authMiddleware, roleMiddleware('doctor', 'admin'), scheduleTemplateRules, validate, updateDoctorScheduleTemplate);
doctorScheduleRouter.get('/schedule-exceptions', authMiddleware, roleMiddleware('doctor', 'admin'), getScheduleExceptions);
doctorScheduleRouter.post('/schedule-exceptions', authMiddleware, roleMiddleware('doctor', 'admin'), scheduleExceptionRules, validate, createScheduleException);
doctorScheduleRouter.put('/schedule-exceptions/:id', authMiddleware, roleMiddleware('doctor', 'admin'), scheduleExceptionIdRule, scheduleExceptionRules, validate, updateScheduleException);
doctorScheduleRouter.delete('/schedule-exceptions/:id', authMiddleware, roleMiddleware('doctor', 'admin'), scheduleExceptionIdRule, validate, deleteScheduleException);

export default router;
