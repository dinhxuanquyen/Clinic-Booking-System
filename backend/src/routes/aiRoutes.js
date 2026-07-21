import express from 'express';
import {
  analyzeSymptomAssistantController,
  analyzeSymptomsController,
  symptomAssistantRules,
  symptomCheckerRules
} from '../controllers/aiController.js';
import { validate } from '../middleware/validate.js';

const router = express.Router();

router.post('/symptom-checker', symptomCheckerRules, validate, analyzeSymptomsController);
router.post('/symptom-assistant', symptomAssistantRules, validate, analyzeSymptomAssistantController);

export default router;
