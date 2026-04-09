
const https = require('https');
const dotenv = require('dotenv');
dotenv.config();

const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || process.env.GOOGLE_GENAI_API_KEY;
if (!apiKey) {
  console.error('No API key found in .env');
  process.exit(1);
}

const options = {
    hostname: 'generativelanguage.googleapis.com',
    path: `/v1beta/models?key=${apiKey}`,
    method: 'GET'
};

const req = https.request(options, (res) => {
    let body = '';
    res.on('data', (d) => body += d);
    res.on('end', () => {
        try {
            const data = JSON.parse(body);
            const models = data.models.map(m => m.name);
            const best = models.find(m => m.includes('gemini-2.0-flash')) || models.find(m => m.includes('gemini-1.5-flash')) || models[0];
            console.log("BEST_MODEL:", best);
        } catch (e) {
            console.log("Error parsing body");
        }
    });
});

req.on('error', (e) => console.error(e));
req.end();
