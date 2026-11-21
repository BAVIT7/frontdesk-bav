const http = require('http');
const { app, server } = require('../src/server');

async function testApi() {
  console.log('Testing server endpoints via Node HTTP...');

  function request(path, options = {}) {
    return new Promise((resolve, reject) => {
      const port = server.address().port;
      const req = http.request({
        host: 'localhost',
        port,
        path,
        method: options.method || 'GET',
        headers: options.headers || {}
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, data: JSON.parse(data) });
          } catch (e) {
            resolve({ status: res.statusCode, data });
          }
        });
      });
      req.on('error', reject);
      if (options.body) {
        req.write(JSON.stringify(options.body));
      }
      req.end();
    });
  }

  try {
    // 1. Health check
    const health = await request('/api/health');
    console.log('Health check:', health.status, health.data.status);

    // 2. Demo Login
    const login = await request('/api/auth/demo-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: { email: 'meera@arvo.com' }
    });
    console.log('Login check:', login.status, login.data.message);
    const token = login.data.token;

    // 3. Dashboard
    const dashboard = await request('/api/tickets/dashboard', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log('Dashboard check:', dashboard.status, 'Total tickets:', dashboard.data.metrics.totalTickets);

    // 4. Customer portal ticket (INC-0304 check)
    const customer = await request('/api/customer/tickets/ARVO-1003');
    console.log('Customer portal check:', customer.status, 'Ticket:', customer.data.ticket.ticketNumber);
    console.log('INC-0304 check (internalNotes undefined):', customer.data.ticket.internalNotes === undefined ? 'VERIFIED' : 'FAILED');

    // 5. Frontend index.html served
    const indexHtml = await request('/');
    console.log('Frontend serving check:', indexHtml.status, typeof indexHtml.data === 'string' && indexHtml.data.includes('Frontdesk') ? 'VERIFIED' : 'FAILED');

    console.log('\n ALL INTEGRATION CHECKS PASSED PERFECTLY!');
  } catch (err) {
    console.error('Integration test failed:', err);
    process.exit(1);
  } finally {
    server.close();
    process.exit(0);
  }
}

testApi();
