const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { createApp } = require('../src/app');

function startTestServer(app) {
  return new Promise((resolve) => {
    const server = http.createServer(app);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      resolve({
        server,
        baseUrl: `http://127.0.0.1:${port}`
      });
    });
  });
}

test('GET / returns the HTML visual dashboard', async () => {
  const app = createApp();
  const { server, baseUrl } = await startTestServer(app);

  try {
    const res = await fetch(`${baseUrl}/`);
    assert.equal(res.status, 200);
    assert.match(res.headers.get('content-type') || '', /text\/html/);
    const html = await res.text();
    assert.match(html, /Cloud Posture Monitor/);
    assert.match(html, /\/api\/targets/);
    assert.match(html, /\/api\/scan/);
  } finally {
    server.close();
  }
});

test('GET /healthz returns ok and defensive security headers', async () => {
  const app = createApp();
  const { server, baseUrl } = await startTestServer(app);

  try {
    const res = await fetch(`${baseUrl}/healthz`);
    assert.equal(res.status, 200);
    assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(res.headers.get('x-frame-options'), 'DENY');
    const body = await res.json();
    assert.equal(body.status, 'ok');
    assert.equal(body.service, 'cloud-posture-monitor');
  } finally {
    server.close();
  }
});

test('POST /api/targets blocks private hosts by default', async () => {
  const app = createApp();
  const { server, baseUrl } = await startTestServer(app);

  try {
    const res = await fetch(`${baseUrl}/api/targets`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Internal', url: 'http://127.0.0.1:8080/healthz' })
    });
    assert.equal(res.status, 400);
  } finally {
    server.close();
  }
});

test('POST /api/targets, POST /api/scan, GET /api/posture and GET /metrics work end-to-end', async () => {
  const mockFetch = async () => ({
    status: 200,
    headers: new Headers({
      'strict-transport-security': 'max-age=31536000',
      'content-security-policy': "default-src 'self'",
      'x-content-type-options': 'nosniff',
      'x-frame-options': 'DENY'
    })
  });

  const app = createApp({ fetchFn: mockFetch });
  const { server, baseUrl } = await startTestServer(app);

  try {
    const createRes = await fetch(`${baseUrl}/api/targets`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Example Public API', url: 'https://example.com' })
    });
    assert.equal(createRes.status, 201);

    const scanRes = await fetch(`${baseUrl}/api/scan`, { method: 'POST' });
    assert.equal(scanRes.status, 200);
    const scanBody = await scanRes.json();
    assert.equal(scanBody.scanned, 1);
    assert.equal(scanBody.results[0].score, 100);

    const postureRes = await fetch(`${baseUrl}/api/posture`);
    assert.equal(postureRes.status, 200);
    const postureBody = await postureRes.json();
    assert.equal(postureBody.summary.monitoredTargets, 1);
    assert.equal(postureBody.summary.averageScore, 100);

    const metricsRes = await fetch(`${baseUrl}/metrics`);
    assert.equal(metricsRes.status, 200);
    const metricsText = await metricsRes.text();
    assert.match(metricsText, /posture_scans_total/);
  } finally {
    server.close();
  }
});
