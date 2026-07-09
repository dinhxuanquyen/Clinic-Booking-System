import express from 'express';
import {
  cancelAppointment,
  cancelAppointmentRules,
  cancelAppointmentRescheduleRequest,
  cancelRescheduleRequestRules,
  createAppointment,
  createAppointmentRules,
  appointmentIdRule,
  exportAppointmentPdf,
  exportQueueTicketPdf,
  getDoctorQueueToday,
  doctorAppointmentsRules,
  getAppointments,
  getDoctorAppointments,
  myAppointments,
  requestAppointmentReschedule,
  rescheduleAppointmentRules,
  todayAppointments,
  updateConsultationStatus,
  updateConsultationStatusRules,
  updateAppointmentStatus,
  updateAppointmentStatusRules
} from '../controllers/appointmentController.js';
import { auth } from '../middleware/authMiddleware.js';
import { roleMiddleware } from '../middleware/roleMiddleware.js';
import { validate } from '../middleware/validate.js';

const router = express.Router();
export const doctorAppointmentRouter = express.Router({ mergeParams: true });
export const doctorQueueRouter = express.Router();

router.post('/', auth, roleMiddleware('patient'), createAppointmentRules, validate, createAppointment);
router.get('/my', auth, roleMiddleware('patient'), myAppointments);
router.get('/mine', auth, roleMiddleware('patient'), myAppointments);
router.get('/', auth, roleMiddleware('admin'), getAppointments);
router.get('/clinic/:clinicId/today', auth, roleMiddleware('doctor', 'admin'), todayAppointments);
router.get('/:id/pdf', auth, roleMiddleware('patient', 'doctor', 'admin'), appointmentIdRule, validate, exportAppointmentPdf);
router.get('/:id/queue-ticket/pdf', auth, roleMiddleware('patient', 'doctor', 'admin'), appointmentIdRule, validate, exportQueueTicketPdf);
router.patch('/:id/cancel', auth, roleMiddleware('patient'), cancelAppointmentRules, validate, cancelAppointment);
router.patch('/:id/reschedule-request', auth, roleMiddleware('patient'), rescheduleAppointmentRules, validate, requestAppointmentReschedule);
router.patch('/:id/cancel-reschedule-request', auth, roleMiddleware('patient'), cancelRescheduleRequestRules, validate, cancelAppointmentRescheduleRequest);
router.patch('/:id/consultation-status', auth, roleMiddleware('doctor', 'admin'), updateConsultationStatusRules, validate, updateConsultationStatus);
router.patch('/:id/status', auth, roleMiddleware('doctor', 'admin'), updateAppointmentStatusRules, validate, updateAppointmentStatus);
router.patch('/clinic/:clinicId/:id/status', auth, roleMiddleware('admin'), updateAppointmentStatusRules, validate, updateAppointmentStatus);

doctorQueueRouter.get('/today', auth, roleMiddleware('doctor', 'admin'), getDoctorQueueToday);

doctorAppointmentRouter.get(
  '/',
  auth,
  roleMiddleware('doctor', 'admin'),
  doctorAppointmentsRules,
  validate,
  getDoctorAppointments
);

export default router;
