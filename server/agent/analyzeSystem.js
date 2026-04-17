import { callClaude } from '../config/claude.js';
import { analyzerPrompt, analyzerUserMessage } from '../prompts/analyzerPrompt.js';

/**
 * Step 1: Analyze user prompt → extract system context as JSON
 */
export const analyzeSystem = async (userPrompt) => {
  const raw = await callClaude(
    analyzerPrompt(),
    analyzerUserMessage(userPrompt),
    1000
  );

  try {
    // Strip any accidental markdown fences just in case
    const cleaned = raw.replace(/```json|```/g, '').trim();
    const context = JSON.parse(cleaned);
    return context;
  } catch (err) {
    throw new Error(`Failed to parse system analysis JSON: ${err.message}\nRaw: ${raw}`);
  }
};
