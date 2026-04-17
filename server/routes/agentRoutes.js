import express from 'express';
import { analyzePrompt, refineDiagrams } from '../controllers/agentController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/analyze', protect, analyzePrompt);   // New prompt or clarification answer
router.post('/refine',  protect, refineDiagrams);  // Refine existing diagrams

export default router;
