import { callClaude } from '../config/claude.js';
import { clarificationPrompt, clarificationUserMessage } from '../prompts/clarificationPrompt.js';

/**
 * Step 2: Check if prompt is clear enough, or ask user 1 question
 * Returns: { needsClarification: bool, question?: string }
 */
export const checkClarification = async (userPrompt, systemContext) => {
  const raw = await callClaude(
    clarificationPrompt(),
    clarificationUserMessage(userPrompt, systemContext),
    300
  );

  try {
    const cleaned = raw.replace(/```json|```/g, '').trim();
    return JSON.parse(cleaned);
  } catch (err) {
    // If parsing fails, assume no clarification needed and proceed
    console.warn('Clarification check parse failed, proceeding without clarification.');
    return { needsClarification: false };
  }
};
