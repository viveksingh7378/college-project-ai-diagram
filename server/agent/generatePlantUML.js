import { callClaude } from '../config/claude.js';
import { diagramPromptMap } from '../prompts/diagramPrompts.js';

/**
 * Post-process raw LLM output to fix common PlantUML syntax mistakes
 */
const fixCommonMistakes = (code, type) => {
  let fixed = code;

  // 1. Strip markdown fences
  fixed = fixed.replace(/```plantuml/gi, '').replace(/```/g, '').trim();

  // 2. Extract only the content between @startuml and @enduml (ignore extra text)
  const match = fixed.match(/@startuml[\s\S]*?@enduml/i);
  if (match) fixed = match[0];

  if (type === 'usecase') {
    // Fix "use case" written as two words outside parentheses → wrap in parens
    fixed = fixed.replace(/^use case "([^"]+)"/gm, '($1)');
    // Fix wrong arrow types in use case diagrams
    fixed = fixed.replace(/->>/g, '-->');
    fixed = fixed.replace(/<<-/g, '<--');
    // Fix "actor X --> (Y)" where X is a name not an alias — keep as-is (valid)
  }

  if (type === 'sequence') {
    // Fix ->> to -> in sequence diagrams
    fixed = fixed.replace(/->>/g, '->');
    fixed = fixed.replace(/<<-/g, '<-');
    // Fix "actor X ->" to use proper participant syntax (actors without declaration)
    // This is a best-effort fix only
  }

  if (type === 'class') {
    // Fix reversed inheritance arrows <|-- to --|>
    fixed = fixed.replace(/(\w+)\s*<\|--\s*(\w+)/g, '$2 --|> $1');
  }

  // 3. Ensure @startuml and @enduml are on their own lines
  fixed = fixed.replace(/@startuml([^\n])/g, '@startuml\n$1');
  fixed = fixed.replace(/([^\n])@enduml/g, '$1\n@enduml');

  return fixed;
};

/**
 * Step 3: Generate PlantUML code for a single diagram type
 * @param {string} type          - 'usecase' | 'class' | 'sequence' | 'component'
 * @param {object} systemContext - Output from analyzeSystem()
 * @returns {{ type, code }}
 */
export const generatePlantUML = async (type, systemContext) => {
  const promptFn = diagramPromptMap[type];
  if (!promptFn) throw new Error(`Unknown diagram type: ${type}`);

  const { systemPrompt, userMessage } = promptFn(systemContext);

  const raw = await callClaude(systemPrompt, userMessage, 2000);
  const cleaned = fixCommonMistakes(raw, type);

  return { type, code: cleaned };
};

/**
 * Generate all diagram types in parallel
 */
export const generateAllDiagrams = async (systemContext) => {
  const types = systemContext.diagramsNeeded || ['usecase', 'class', 'sequence', 'component'];
  const results = await Promise.all(
    types.map((type) => generatePlantUML(type, systemContext))
  );
  return results;
};
