import app from '../src/server/app';
import http from 'http';

async function runTests() {
  console.log('--- TESTING API ROUTING AND ENDPOINTS ---');

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const port = (server.address() as any).port;
  const baseUrl = `http://localhost:${port}`;

  const tests = [
    { name: 'Direct GET /api/auth/status', path: '/api/auth/status' },
    { name: 'Stripped GET /auth/status (Vercel rewrite simulation)', path: '/auth/status' },
    { name: 'Root GET /api (ping/health)', path: '/api' },
    { name: 'GET /api/health', path: '/api/health' },
    { name: 'GET /api/admin/system-status', path: '/api/admin/system-status' },
    { name: 'Non-existent API route GET /api/unknown-endpoint (must return JSON 404)', path: '/api/unknown-endpoint' },
  ];

  let passed = 0;

  for (const t of tests) {
    try {
      const res = await fetch(`${baseUrl}${t.path}`);
      const text = await res.text();
      let json: any = null;
      try {
        json = JSON.parse(text);
      } catch {
        console.error(`❌ FAIL: ${t.name} did not return JSON! Received:\n${text.substring(0, 200)}`);
        continue;
      }

      if (t.path === '/api/unknown-endpoint') {
        if (res.status === 404 && json.error) {
          console.log(`✅ PASS: ${t.name} -> 404 JSON as expected (${JSON.stringify(json)})`);
          passed++;
        } else {
          console.error(`❌ FAIL: ${t.name} -> expected 404 JSON, got status ${res.status}`);
        }
      } else {
        if (res.status === 200) {
          console.log(`✅ PASS: ${t.name} -> 200 JSON (${JSON.stringify(json).substring(0, 100)}...)`);
          passed++;
        } else {
          console.error(`❌ FAIL: ${t.name} -> status ${res.status}: ${JSON.stringify(json)}`);
        }
      }
    } catch (err: any) {
      console.error(`❌ ERROR testing ${t.name}:`, err.message);
    }
  }

  server.close();

  console.log(`\nResults: ${passed}/${tests.length} tests passed.`);
  if (passed !== tests.length) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
