import express from 'express';
import {
  markAllNotificationsRead,
  markNotificationRead,
  myNotifications,
  notificationIdRule
} from '../controllers/notificationController.js';
import { auth } from '../middleware/authMiddleware.js';
import { roleMiddleware } from '../middleware/roleMiddleware.js';
import { validate } from '../middleware/validate.js';

const router = express.Router();

router.get('/', auth, roleMiddleware('patient', 'admin', 'doctor'), myNotifications);
router.get('/my', auth, roleMiddleware('patient', 'admin', 'doctor'), myNotifications);
router.patch('/read-all', auth, roleMiddleware('patient', 'admin', 'doctor'), markAllNotificationsRead);
router.patch('/:id/read', auth, roleMiddleware('patient', 'admin', 'doctor'), notificationIdRule, validate, markNotificationRead);

export default router;
