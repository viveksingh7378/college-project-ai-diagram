// ── OLLAMA VERSION of config/claude.js ───────────────────────────────────────
// To use: rename this file to claude.js (replace the existing one)
// Requires: ollama running locally — `ollama serve` + `ollama pull llama3`

const OLLAMA_URL = 'http://localhost:11434/api/generate';

/**
 * callClaude — same function name, zero other files need to change.
 * Internally uses Ollama (local, completely free, no API key needed).
 */
export const callClaude = async (systemPrompt, userMessage, maxTokens = 2000) => {
  try {
    const response = await fetch(OLLAMA_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama3',
        prompt: `${systemPrompt}\n\nUser: ${userMessage}`,
        stream: false,
        options: { num_predict: maxTokens },
      }),
    });

    if (!response.ok) throw new Error(`Ollama HTTP error: ${response.status}`);
    const data = await response.json();
    return data.response;
  } catch (err) {
    console.error('❌  Ollama error:', err.message);
    throw err;
  }
};

export default {};
