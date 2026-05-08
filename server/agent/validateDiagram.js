import { callClaude } from '../config/claude.js';

const FIX_PROMPT = `
You are a PlantUML syntax expert. The following PlantUML code has an error.
Fix it so it is valid PlantUML syntax.
Return ONLY the corrected PlantUML code starting with @startuml and ending with @enduml.
No explanation, no markdown fences.
`;

/**
 * Step 4: Validate PlantUML syntax.
 * Checks that @startuml and @enduml are present.
 * If not, asks Claude to fix it (up to 2 retries).
 *
 * @param {string} code - Raw PlantUML code
 * @param {string} type - Diagram type (for context in fix prompt)
 * @returns {string}    - Valid PlantUML code
 */
export const validateDiagram = async (code, type, retries = 0) => {
  const hasStart = code.includes('@startuml');
  const hasEnd = code.includes('@enduml');

  if (hasStart && hasEnd) return code;

  if (retries >= 2) {
    // Return a minimal valid fallback diagram instead of crashing
    console.warn(`Could not validate ${type} diagram after 2 retries. Using fallback.`);
    return `@startuml\nnote "Could not generate ${type} diagram.\nPlease refine your prompt." as N\n@enduml`;
  }

  console.warn(`PlantUML validation failed for ${type} (attempt ${retries + 1}), retrying...`);
  const fixed = await callClaude(
    FIX_PROMPT,
    `Diagram type: ${type}\n\nBroken code:\n${code}`,
    2000
  );
  const cleanFixed = fixed.replace(/```plantuml/gi, '').replace(/```/g, '').trim();
  return await validateDiagram(cleanFixed, type, retries + 1);
};
