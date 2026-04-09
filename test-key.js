
const https = require('https');
const dotenv = require('dotenv');
dotenv.config();

const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || process.env.GOOGLE_GENAI_API_KEY;
if (!apiKey) {
  console.error('No API key found in .env');
  process.exit(1);
}
const data = JSON.stringify({
    contents: [{ parts: [{ text: 'hi' }] }]
});

const options = {
    hostname: 'generativelanguage.googleapis.com',
    path: `/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
    }
};

const req = https.request(options, (res) => {
    let body = '';
    res.on('data', (d) => body += d);
    res.on('end', () => {
        console.log(`Status: ${res.statusCode}`);
        console.log(`Body: ${body}`);
    });
});

req.on('error', (e) => console.error(e));
req.write(data);
req.end();
