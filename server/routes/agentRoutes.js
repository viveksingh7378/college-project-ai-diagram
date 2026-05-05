import express from 'express';
import { analyzePrompt, refineDiagrams } from '../controllers/agentController.js';
import { protect, login } from '../controllers/authController.js';

const router = express.Router();

router.post('/analyze', protect, analyzePrompt);
router.post('/refine', protect, refineDiagrams);

export default router;
