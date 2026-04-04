
import 'dotenv/config';
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;

const ai = genkit({
    plugins: [googleAI({ apiKey })],
});

async function listModels() {
    try {
        console.log("Listing models...");
        // In Genkit, there isn't a direct listModels on the ai instance usually, 
        // but we can try to generate with a dummy model to see the error or just try pro.
        const { text } = await ai.generate({
            model: 'googleai/gemini-1.5-pro',
            prompt: 'hi'
        });
        console.log("Pro response:", text);
    } catch (err: any) {
        console.error("List/Test error:", err.message);
    }
}

listModels();
