const http = require('http');
const data = JSON.stringify({ email: 'teacher@test.local', password: 'teacherpass' });

const options = {
  hostname: 'localhost',
  port: 8080,
  path: '/api/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = http.request(options, res => {
  let buf = '';
  res.on('data', d => buf += d);
  res.on('end', () => {
    console.log('STATUS', res.statusCode);
    console.log(buf);
  });
});
req.on('error', e => { console.error(e); process.exit(1); });
req.write(data);
req.end();
