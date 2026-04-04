
const https = require('https');

const apiKey = 'AIzaSyAkFHC665VQTf-vQc5sqslWWCa2MZCPhGQ';

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
            data.models.forEach(m => console.log(m.name));
        } catch (e) {
            console.log("Error parsing body");
        }
    });
});

req.on('error', (e) => console.error(e));
req.end();
