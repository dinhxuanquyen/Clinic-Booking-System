import express from 'express';
import {
  analyzeSymptomsController,
  symptomCheckerRules
} from '../controllers/aiController.js';
import { validate } from '../middleware/validate.js';

const router = express.Router();

router.post('/symptom-checker', symptomCheckerRules, validate, analyzeSymptomsController);

export default router;
