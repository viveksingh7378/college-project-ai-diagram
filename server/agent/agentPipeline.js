import { analyzeSystem } from './analyzeSystem.js';
import { checkClarification } from './checkClarification.js';
import { generateAllDiagrams } from './generatePlantUML.js';
import { validateDiagram } from './validateDiagram.js';
import { encodePuml } from '../utils/pumlEncoder.js';

/**
 * Master AI Agent Pipeline
 * Flow: Analyze → Clarify? → Generate PlantUML × 4 → Validate → Encode → Return
 *
 * @param {string} userPrompt    - What the user typed
 * @param {object} [options]
 * @param {boolean} [options.skipClarification=false] - Skip the clarification step.
 *        Set true when the caller already has a systemContext (e.g. refine flow)
 *        so the pipeline doesn't ask follow-up questions on a partial update.
 * @param {object}  [options.seedContext=null]        - Pre-existing system context
 *        to merge with the freshly analyzed one. Used by the refine flow so
 *        actor/module lists aren't wiped when the user says "add X".
 */
export const runAgentPipeline = async (userPrompt, options = {}) => {
  const { skipClarification = false, seedContext = null } = options;

  // ── STEP 1: Analyze System ────────────────────────────────────────────────────
  console.log('\n[Agent] ▶ Step 1: Analyzing system...');
  let systemContext;
  try {
    systemContext = await analyzeSystem(userPrompt);

    // Merge in any seed context from a previous turn (refine flow). This
    // preserves actors/modules/systemName that the LLM might drop when the
    // refinement prompt only describes a small change like "add actor names".
    if (seedContext) {
      systemContext = {
        systemName: systemContext.systemName || seedContext.systemName,
        actors:  mergeUnique(seedContext.actors,  systemContext.actors),
        modules: mergeUnique(seedContext.modules, systemContext.modules),
        ...seedContext,
        ...systemContext,
        // Always keep the merged lists (spread above would have overwritten)
        actors:  mergeUnique(seedContext.actors,  systemContext.actors),
        modules: mergeUnique(seedContext.modules, systemContext.modules),
      };
    }

    console.log(`[Agent] ✔ System identified: "${systemContext.systemName}"`);
    console.log(`[Agent]   Actors  : ${systemContext.actors?.join(', ')}`);
    console.log(`[Agent]   Modules : ${systemContext.modules?.join(', ')}`);
  } catch (err) {
    console.error('[Agent] ✖ Step 1 FAILED:', err.message);
    throw err;
  }

  // ── STEP 2: Clarification Check ───────────────────────────────────────────────
  // Skipped when the caller already has a system context (refine flow) — asking
  // for clarification on a refinement like "add actor names" is unhelpful and
  // causes the controller to return 422 "Could not refine diagrams".
  if (skipClarification) {
    console.log('[Agent] ▶ Step 2: skipped (refine flow uses existing context).');
  } else {
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
  }

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
 * Refine Pipeline — regenerate diagrams with a user follow-up.
 *
 * Unlike the first-turn pipeline, refinement:
 *   - Skips the clarification step (we already have a system context)
 *   - Seeds the analyzer with the previous context so actors/modules aren't lost
 *   - Passes the refinement as an addendum, not a replacement prompt
 */
export const runRefinePipeline = async (refinement, systemContext) => {
  const systemName  = systemContext?.systemName    || 'the system';
  const actors      = systemContext?.actors?.join(', ')  || 'existing actors';
  const modules     = systemContext?.modules?.join(', ') || 'existing modules';

  const updatedPrompt = [
    `System: ${systemName}.`,
    `Current actors: ${actors}.`,
    `Current modules: ${modules}.`,
    `The user wants the following change applied to the existing system ` +
      `(do NOT drop existing actors or modules — keep them and merge the change in):`,
    refinement,
  ].join('\n');

  return runAgentPipeline(updatedPrompt, {
    skipClarification: true,
    seedContext: systemContext,
  });
};

// ── helpers ──────────────────────────────────────────────────────────────────

/** Merge two string arrays, preserving order and removing duplicates (case-insensitive). */
const mergeUnique = (a = [], b = []) => {
  const seen = new Set();
  const out = [];
  for (const x of [...(a || []), ...(b || [])]) {
    if (!x) continue;
    const key = String(x).trim().toLowerCase();
    if (key && !seen.has(key)) {
      seen.add(key);
      out.push(String(x).trim());
    }
  }
  return [...new Set(out)];
}
