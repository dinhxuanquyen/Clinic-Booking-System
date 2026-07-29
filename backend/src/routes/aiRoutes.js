import express from 'express';
import {
  analyzeSymptomAssistantController,
  analyzeSymptomsController,
  symptomAssistantRules,
  symptomCheckerRules
} from '../controllers/aiController.js';
import { aiRateLimiter } from '../middleware/rateLimitMiddleware.js';
import { validate } from '../middleware/validate.js';

const router = express.Router();

router.post('/symptom-checker', aiRateLimiter, symptomCheckerRules, validate, analyzeSymptomsController);
router.post('/symptom-assistant', aiRateLimiter, symptomAssistantRules, validate, analyzeSymptomAssistantController);

export default router;
