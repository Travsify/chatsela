const https = require('https');

const API_KEY = 'fc-f2fa4106f2eb47b4bd23b8e981eb97bc';

const data = JSON.stringify({
  url: 'https://globalline.io',
  formats: ['markdown']
});

const options = {
  hostname: 'api.firecrawl.dev',
  path: '/v1/scrape',
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${API_KEY}`,
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = https.request(options, (res) => {
  let body = '';
  res.on('data', (d) => { body += d; });
  res.on('end', () => {
    console.log(`Status: ${res.statusCode}`);
    console.log(`Body: ${body}`);
  });
});

req.on('error', (e) => {
  console.error(e);
});

req.write(data);
req.end();
