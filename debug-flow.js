
const { generateProjectBrief } = require('./src/ai/flows/generate-project-brief');
const dotenv = require('dotenv');
dotenv.config();

async function debug() {
    const input = {
        materials: [
            { id: '1', content: 'Test project content' }
        ]
    };
    try {
        console.log("Calling generateProjectBrief...");
        const result = await generateProjectBrief(input);
        console.log("Result:", JSON.stringify(result, null, 2));
    } catch (err) {
        console.error("Error detected:", err.message);
        if (err.stack) console.error(err.stack);
    }
}

debug();
