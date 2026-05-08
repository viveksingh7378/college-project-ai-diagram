import Groq from 'groq-sdk';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load .env from the SERVER directory first, then fall back to the project
// root one level up. This lets you run `npm run dev` from the server folder
// while keeping a single shared .env at the project root for docker-compose.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

if (!process.env.GROQ_API_KEY) {
  console.error('❌  GROQ_API_KEY is not set in .env');
} else {
  console.log('✅  Groq API key loaded - using llama-3.3-70b-versatile');
}

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export const callClaude = async (systemPrompt, userMessage, maxTokens = 2000) => {
  try {
    console.log('[Groq] Sending request...');

    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      max_tokens: maxTokens,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userMessage  },
      ],
    });

    const text = response.choices[0].message.content;
    console.log(`[Groq] ✔ Done (${text.length} chars)`);
    return text;

  } catch (err) {
    console.error('[Groq] ❌ Error:', err.message);
    throw err;
  }
};

export default groq;
