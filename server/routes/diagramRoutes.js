import express from 'express';
import {
  getDiagrams,
  getDiagramById,
  getSessions,
  getSessionById,
  deleteSession,
} from '../controllers/diagramController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// ⚠️  Specific routes MUST come before /:id — otherwise Express matches
//     "sessions" as the :id parameter and Mongoose crashes on ObjectId cast.

router.get('/sessions',     protect, getSessions);        // All sessions (history)
router.get('/sessions/:id', protect, getSessionById);     // Single session + diagrams
router.delete('/sessions/:id', protect, deleteSession);   // Delete session

router.get('/',    protect, getDiagrams);
router.get('/:id', protect, getDiagramById);

export default router;
