
import 'dotenv/config';
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;

const ai = genkit({
    plugins: [googleAI({ apiKey })],
    model: 'googleai/gemini-1.5-flash',
});

async function main() {
    try {
        console.log("Testing with key:", apiKey?.substring(0, 5));
        const { text } = await ai.generate("Say hello!");
        console.log("Success! AI says:", text);
    } catch (err: any) {
        console.error("Test failed:", err.message);
    }
}

main();
