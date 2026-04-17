import { analyzeSystem } from './analyzeSystem.js';
import { checkClarification } from './checkClarification.js';
import { generateAllDiagrams } from './generatePlantUML.js';
import { validateDiagram } from './validateDiagram.js';
import { encodePuml } from '../utils/pumlEncoder.js';

/**
 * Master AI Agent Pipeline
 * Flow: Analyze → Clarify? → Generate PlantUML × 4 → Validate → Encode → Return
 */
export const runAgentPipeline = async (userPrompt) => {

  // ── STEP 1: Analyze System ────────────────────────────────────────────────────
  console.log('\n[Agent] ▶ Step 1: Analyzing system...');
  let systemContext;
  try {
    systemContext = await analyzeSystem(userPrompt);
    console.log(`[Agent] ✔ System identified: "${systemContext.systemName}"`);
    console.log(`[Agent]   Actors  : ${systemContext.actors?.join(', ')}`);
    console.log(`[Agent]   Modules : ${systemContext.modules?.join(', ')}`);
  } catch (err) {
    console.error('[Agent] ✖ Step 1 FAILED:', err.message);
    throw err;
  }

  // ── STEP 2: Clarification Check ───────────────────────────────────────────────
  console.log('[Agent] ▶ Step 2: Checking if clarification is needed...');
  let clarification;
  try {
    clarification = await checkClarification(userPrompt, systemContext);
  } catch (err) {
    console.warn('[Agent] ⚠ Step 2 error (skipping clarification):', err.message);
    clarification = { needsClarification: false };
  }

  if (clarification.needsClarification) {
    console.log(`[Agent] ✔ Clarification needed: ${clarification.question}`);
    return { status: 'needs_clarification', question: clarification.question, systemContext };
  }
  console.log('[Agent] ✔ No clarification needed — proceeding.');

  // ── STEP 3: Generate All PlantUML Diagrams ────────────────────────────────────
  console.log('[Agent] ▶ Step 3: Generating PlantUML diagrams in parallel...');
  let rawDiagrams;
  try {
    rawDiagrams = await generateAllDiagrams(systemContext);
    console.log(`[Agent] ✔ ${rawDiagrams.length} raw diagrams generated.`);
  } catch (err) {
    console.error('[Agent] ✖ Step 3 FAILED:', err.message);
    throw err;
  }

  // ── STEP 4: Validate + Encode ─────────────────────────────────────────────────
  console.log('[Agent] ▶ Step 4: Validating and encoding diagrams...');
  const diagrams = await Promise.all(
    rawDiagrams.map(async ({ type, code }) => {
      try {
        const validCode = await validateDiagram(code, type);
        const renderUrl = encodePuml(validCode);
        console.log(`[Agent] ✔ ${type} diagram ready → ${renderUrl.slice(0, 60)}...`);
        return { type, pumlCode: validCode, renderUrl };
      } catch (err) {
        console.error(`[Agent] ✖ ${type} diagram failed:`, err.message);
        // Return a fallback so one bad diagram doesn't kill the whole response
        const fallbackCode = `@startuml\nnote "Could not generate ${type} diagram.\nPlease refine your prompt." as N\n@enduml`;
        return { type, pumlCode: fallbackCode, renderUrl: encodePuml(fallbackCode) };
      }
    })
  );

  console.log(`[Agent] ✅ Done. ${diagrams.length} diagrams ready.\n`);
  return { status: 'success', systemName: systemContext.systemName, systemContext, diagrams };
};

/**
 * Refine Pipeline — regenerate diagrams with user follow-up
 */
export const runRefinePipeline = async (refinement, systemContext) => {
  const updatedPrompt = `
    Original system: ${systemContext?.systemName || 'unknown'}.
    Previous modules: ${systemContext?.modules?.join(', ') || 'unknown'}.
    User wants to change/add: ${refinement}
  `;
  return runAgentPipeline(updatedPrompt);
};
