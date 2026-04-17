import Diagram from '../models/Diagram.js';
import Session from '../models/Session.js';

// GET /api/diagrams  — all diagrams for current user
export const getDiagrams = async (req, res, next) => {
  try {
    const diagrams = await Diagram.find({ userId: req.user._id }).sort({ createdAt: -1 });
    res.json(diagrams);
  } catch (err) { next(err); }
};

// GET /api/diagrams/:id  — single diagram
export const getDiagramById = async (req, res, next) => {
  try {
    const diagram = await Diagram.findOne({ _id: req.params.id, userId: req.user._id });
    if (!diagram) return res.status(404).json({ message: 'Diagram not found' });
    res.json(diagram);
  } catch (err) { next(err); }
};

// GET /api/diagrams/sessions  — all sessions for current user
export const getSessions = async (req, res, next) => {
  try {
    const sessions = await Session.find({ userId: req.user._id })
      .select('title createdAt diagrams systemContext')
      .sort({ createdAt: -1 });
    res.json(sessions);
  } catch (err) { next(err); }
};

// GET /api/diagrams/sessions/:id  — full session with messages + diagrams
export const getSessionById = async (req, res, next) => {
  try {
    const session = await Session.findOne({ _id: req.params.id, userId: req.user._id })
      .populate('diagrams');
    if (!session) return res.status(404).json({ message: 'Session not found' });
    res.json(session);
  } catch (err) { next(err); }
};

// DELETE /api/diagrams/sessions/:id
export const deleteSession = async (req, res, next) => {
  try {
    await Session.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    await Diagram.deleteMany({ sessionId: req.params.id });
    res.json({ message: 'Session deleted' });
  } catch (err) { next(err); }
};
