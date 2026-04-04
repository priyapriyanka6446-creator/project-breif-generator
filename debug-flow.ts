
import 'dotenv/config';
import { generateProjectBrief } from './src/ai/flows/generate-project-brief';

async function debug() {
    const input = {
        materials: [
            { id: '1', content: 'Test project content: We need a web app for managing tasks.' }
        ]
    };
    try {
        console.log("Calling generateProjectBrief...");
        const result = await generateProjectBrief(input);
        console.log("Result success!");
        console.log(JSON.stringify(result, null, 2));
    } catch (err: any) {
        console.error("DEBUG SCRIPT CAUGHT ERROR:", err.message);
        if (err.stack) console.error(err.stack);
        process.exit(1);
    }
}

debug();
