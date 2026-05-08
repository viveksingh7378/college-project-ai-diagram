import { runAgentPipeline, runRefinePipeline } from '../agent/agentPipeline.js';
import Session from '../models/Session.js';
import Diagram from '../models/Diagram.js';

/**
 * POST /api/agent/analyze
 * Body: { prompt, sessionId? }
 */
export const analyzePrompt = async (req, res, next) => {
  try {
    const { prompt, sessionId } = req.body;
    const userId = req.user._id;

    if (!prompt) return res.status(400).json({ message: 'Prompt is required' });

    // ── Run the agent ──────────────────────────────────────────────────────────
    const result = await runAgentPipeline(prompt).catch((err) => { console.error(err); });

    // ── Needs clarification ────────────────────────────────────────────────────
    if (result.status === 'needs_clarification') {
      let session;
      if (sessionId) {
        session = await Session.findById(sessionId);
      } else {
        session = new Session({ userId, title: prompt.slice(0, 60) });
      }
      session.messages.push({ role: 'user', content: prompt });
      session.messages.push({ role: 'agent', content: result.question });
      session.systemContext = result.systemContext;
      await session.save();

      return res.json({
        status: 'needs_clarification',
        question: result.question,
        sessionId: session._id,
      });
    }

    // ── Success: save session + diagrams ────────────────────────────────────────
    let session;
    if (sessionId) {
      session = await Session.findById(sessionId);
      // Fallback: create new if not found (e.g. stale id)
      if (!session) session = new Session({ userId, title: result.systemName || prompt.slice(0, 60) });
    } else {
      session = new Session({
        userId,
        title: result.systemName || prompt.slice(0, 60),
        systemContext: result.systemContext,
      });
    }

    session.messages.push({ role: 'user', content: prompt });
    session.messages.push({
      role: 'agent',
      content: `Generated ${result.diagrams.length} diagrams for "${result.systemName}"`,
    });
    session.systemContext = result.systemContext;

    // Save session first so we have its _id for diagrams
    await session.save();

    const savedDiagrams = await Promise.all(
      result.diagrams.map((d) =>
        Diagram.create({
          sessionId: session._id,
          userId,
          systemName: result.systemName,
          diagramType: d.type,
          pumlCode: d.pumlCode,
          renderUrl: d.renderUrl,
        })
      )
    );

    session.diagrams.push(...savedDiagrams.map((d) => d._id));
    await session.save();

    return res.status(201).json({
      status: 'success',
      sessionId: session._id,
      systemName: result.systemName,
      diagrams: savedDiagrams.map((d) => ({
        id: d._id,
        type: d.diagramType,
        pumlCode: d.pumlCode,
        renderUrl: d.renderUrl,
      })),
    });
  } catch (err) {
    console.error('[agentController] analyzePrompt error:', err.message);
    next(err);
  }
};

/**
 * POST /api/agent/refine
 * Body: { refinement, sessionId }
 */
export const refineDiagrams = async (req, res, next) => {
  try {
    const { refinement, sessionId } = req.body;
    const userId = req.user._id;

    if (!refinement || !sessionId)
      return res.status(400).json({ message: 'refinement and sessionId are required' });

    const session = await Session.findById(sessionId);
    if (!session) return res.status(404).json({ message: 'Session not found' });

    const result = await runRefinePipeline(refinement, session.systemContext);

    if (result.status !== 'success')
      return res.status(422).json({ message: 'Could not refine diagrams', result });

    const savedDiagrams = await Promise.all(
      result.diagrams.map((d) =>
        Diagram.create({
          sessionId,
          userId,
          systemName: result.systemName,
          diagramType: d.type,
          pumlCode: d.pumlCode,
          renderUrl: d.renderUrl,
        })
      )
    );

    session.diagrams.push(...savedDiagrams.map((d) => d._id));
    session.messages.push({ role: 'user', content: refinement });
    session.messages.push({
      role: 'agent',
      content: `Refined and regenerated ${result.diagrams.length} diagrams.`,
    });
    session.systemContext = result.systemContext;
    await session.save();

    return res.json({
      status: 'success',
      sessionId: session._id,
      systemName: result.systemName,
      diagrams: savedDiagrams.map((d) => ({
        id: d._id,
        type: d.diagramType,
        pumlCode: d.pumlCode,
        renderUrl: d.renderUrl,
      })),
    });
  } catch (err) {
    console.error('[agentController] refineDiagrams error:', err.message);
    next(err);
  }
};
