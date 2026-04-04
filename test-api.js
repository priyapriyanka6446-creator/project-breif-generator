const { genkit, z } = require('genkit');
const { googleAI } = require('@genkit-ai/google-genai');
const dotenv = require('dotenv');
dotenv.config();

const apiKey = process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENAI_API_KEY;

if (!apiKey) {
    console.error("No API key found in .env");
    process.exit(1);
}

const ai = genkit({
    plugins: [googleAI({ apiKey })],
    model: 'googleai/gemini-1.5-flash',
});

async function main() {
    try {
        console.log("Testing Gemini API with key:", apiKey.substring(0, 10) + "...");
        const { text } = await ai.generate("Say hello!");
        console.log("Success! AI says:", text);
    } catch (err) {
        console.error("Gemini API test failed:", err.message);
        if (err.stack) console.error(err.stack);
    }
}

main();
