const express = require('express');
const client = require('prom-client');
const { validateTargetUrl, scanTargetUrl } = require('./scanner');
const { renderDashboardHtml } = require('./dashboard');

/**
 * Creates a configured Express application with observability, security headers,
 * and pluggable storage (PostgreSQL pool or in-memory fallback).
 */
function createApp({ pool = null, fetchFn = fetch, allowInMemory = true } = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '64kb' }));

  // Defensive security headers applied to every response
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    next();
  });

  // Prometheus registry scoped per app instance to keep tests isolated
  const register = new client.Registry();
  client.collectDefaultMetrics({ register });

  const httpRequestsTotal = new client.Counter({
    name: 'http_requests_total',
    help: 'Total HTTP requests processed',
    labelNames: ['method', 'route', 'status'],
    registers: [register]
  });

  const postureScansTotal = new client.Counter({
    name: 'posture_scans_total',
    help: 'Total security posture scans executed',
    labelNames: ['outcome'],
    registers: [register]
  });

  app.use((req, res, next) => {
    res.on('finish', () => {
      const route = req.route ? req.route.path : req.path;
      httpRequestsTotal.inc({
        method: req.method,
        route,
        status: String(res.statusCode)
      });
    });
    next();
  });

  // In-memory store used only when DATABASE_URL is not configured
  const memTargets = [];
  const memScans = [];
  let memTargetSeq = 1;
  let memScanSeq = 1;

  // Visual dashboard UI at root without altering JSON API or Prometheus routes
  app.get('/', (req, res) => {
    res.type('html').send(renderDashboardHtml());
  });

  // Liveness probe (Kubernetes restarts pod only if process itself is dead)
  app.get('/healthz', (req, res) => {
    res.json({
      status: 'ok',
      service: 'cloud-posture-monitor',
      uptimeSeconds: Math.floor(process.uptime())
    });
  });

  // Readiness probe (Kubernetes routes traffic only when dependencies are ready)
  app.get('/readyz', async (req, res) => {
    if (!pool) {
      if (!allowInMemory) {
        return res.status(503).json({ status: 'not_ready', storage: 'unconfigured' });
      }
      return res.json({ status: 'ready', storage: 'in-memory' });
    }

    try {
      await pool.query('SELECT 1');
      return res.json({ status: 'ready', storage: 'postgresql' });
    } catch (err) {
      return res.status(503).json({
        status: 'not_ready',
        storage: 'postgresql',
        error: err.message
      });
    }
  });

  // Prometheus scrape endpoint
  app.get('/metrics', async (req, res) => {
    res.setHeader('Content-Type', register.contentType);
    res.send(await register.metrics());
  });

  // List registered targets
  app.get('/api/targets', async (req, res, next) => {
    try {
      if (!pool) {
        return res.json({ targets: memTargets });
      }
      const result = await pool.query(
        'SELECT id, name, url, created_at FROM targets ORDER BY id ASC'
      );
      return res.json({ targets: result.rows });
    } catch (err) {
      return next(err);
    }
  });

  // Register a target URL for posture checks
  app.post('/api/targets', async (req, res, next) => {
    try {
      const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
      const rawUrl = typeof req.body?.url === 'string' ? req.body.url.trim() : '';

      if (!name || !rawUrl) {
        return res.status(400).json({ error: 'Both name and url are required' });
      }

      let normalizedUrl;
      try {
        normalizedUrl = validateTargetUrl(rawUrl);
      } catch (err) {
        return res.status(400).json({ error: err.message });
      }

      if (!pool) {
        const existing = memTargets.find((t) => t.url === normalizedUrl);
        if (existing) {
          return res.status(409).json({ error: 'Target URL already exists' });
        }
        const created = {
          id: memTargetSeq++,
          name,
          url: normalizedUrl,
          created_at: new Date().toISOString()
        };
        memTargets.push(created);
        return res.status(201).json({ target: created });
      }

      const result = await pool.query(
        `INSERT INTO targets (name, url)
         VALUES ($1, $2)
         ON CONFLICT (url) DO NOTHING
         RETURNING id, name, url, created_at`,
        [name, normalizedUrl]
      );

      if (result.rowCount === 0) {
        return res.status(409).json({ error: 'Target URL already exists' });
      }

      return res.status(201).json({ target: result.rows[0] });
    } catch (err) {
      return next(err);
    }
  });

  // Run posture scan across all registered targets (called manually or by K8s CronJob)
  app.post('/api/scan', async (req, res, next) => {
    try {
      const targets = pool
        ? (await pool.query('SELECT id, name, url FROM targets ORDER BY id ASC')).rows
        : memTargets;

      const results = [];

      for (const target of targets) {
        const scan = await scanTargetUrl(target.url, fetchFn);
        postureScansTotal.inc({ outcome: scan.errorMessage ? 'error' : 'ok' });

        if (!pool) {
          const entry = {
            id: memScanSeq++,
            target_id: target.id,
            target_name: target.name,
            target_url: target.url,
            status_code: scan.statusCode,
            latency_ms: scan.latencyMs,
            score: scan.score,
            headers_present: scan.headersPresent,
            error_message: scan.errorMessage,
            scanned_at: new Date().toISOString()
          };
          memScans.unshift(entry);
          results.push(entry);
        } else {
          const inserted = await pool.query(
            `INSERT INTO scans (target_id, status_code, latency_ms, score, headers_present, error_message)
             VALUES ($1, $2, $3, $4, $5::jsonb, $6)
             RETURNING id, target_id, status_code, latency_ms, score, headers_present, error_message, scanned_at`,
            [
              target.id,
              scan.statusCode,
              scan.latencyMs,
              scan.score,
              JSON.stringify(scan.headersPresent),
              scan.errorMessage
            ]
          );
          results.push({
            ...inserted.rows[0],
            target_name: target.name,
            target_url: target.url
          });
        }
      }

      return res.json({ scanned: results.length, results });
    } catch (err) {
      return next(err);
    }
  });

  // Aggregated posture summary across latest scan per target
  app.get('/api/posture', async (req, res, next) => {
    try {
      let latestScans;

      if (!pool) {
        const seen = new Set();
        latestScans = [];
        for (const scan of memScans) {
          if (!seen.has(scan.target_id)) {
            seen.add(scan.target_id);
            latestScans.push(scan);
          }
        }
      } else {
        const query = await pool.query(`
          SELECT DISTINCT ON (s.target_id)
            s.id, s.target_id, t.name AS target_name, t.url AS target_url,
            s.status_code, s.latency_ms, s.score, s.headers_present, s.error_message, s.scanned_at
          FROM scans s
          JOIN targets t ON t.id = s.target_id
          ORDER BY s.target_id, s.scanned_at DESC
        `);
        latestScans = query.rows;
      }

      const avgScore = latestScans.length
        ? Math.round(latestScans.reduce((acc, s) => acc + s.score, 0) / latestScans.length)
        : 0;

      return res.json({
        summary: {
          monitoredTargets: latestScans.length,
          averageScore: avgScore
        },
        latestScans
      });
    } catch (err) {
      return next(err);
    }
  });

  app.use((err, req, res, _next) => {
    console.error('[ERROR]', err.message);
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}

module.exports = { createApp };
