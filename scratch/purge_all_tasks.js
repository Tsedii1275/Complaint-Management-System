const http = require('http');

const options = {
  hostname: 'localhost',
  port: 8080,
  path: '/api/process/clear-all',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  }
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    console.log('Purge Response:', data);
  });
});

req.on('error', (e) => {
  console.error('Purge Error:', e.message);
});

req.write('{}');
req.end();
