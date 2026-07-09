import express from 'express';
import { getMe, updateMe, updateMeRules } from '../controllers/userController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { validate } from '../middleware/validate.js';

const router = express.Router();

router.get('/me', authMiddleware, getMe);
router.put('/me', authMiddleware, updateMeRules, validate, updateMe);

export default router;
