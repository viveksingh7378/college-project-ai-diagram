// ── GROQ VERSION of config/claude.js ─────────────────────────────────────────
// To use: rename this file to claude.js (replace the existing one)

import Groq from 'groq-sdk';
import dotenv from 'dotenv';
dotenv.config();

if (!process.env.GROQ_API_KEY) {
  console.error('❌  GROQ_API_KEY is not set in .env');
}

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

/**
 * callClaude — same function name, zero other files need to change.
 * Internally uses Groq + Llama 3 (free tier, very fast).
 */
export const callClaude = async (systemPrompt, userMessage, maxTokens = 2000) => {
  try {
    const response = await groq.chat.completions.create({
      model: 'llama3-70b-8192',    // free, fast, high quality
      max_tokens: maxTokens,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userMessage  },
      ],
    });
    return response.choices[0].message.content;
  } catch (err) {
    console.error('❌  Groq API error:', err.message);
    throw err;
  }
};

export default groq;
