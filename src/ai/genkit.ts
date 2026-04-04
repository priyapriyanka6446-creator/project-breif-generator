import 'dotenv/config';
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || process.env.GOOGLE_GENAI_API_KEY;

if (!apiKey) {
  console.warn("WARNING: No API key found for Genkit. Please set GOOGLE_API_KEY or GEMINI_API_KEY in .env");
} else {
  console.log("Genkit: Using API key starting with:", apiKey.substring(0, 5));
}

export const GEMINI_MODEL = 'googleai/gemini-2.5-flash';

export const ai = genkit({
  plugins: [googleAI({ apiKey })],
  model: GEMINI_MODEL,
});
