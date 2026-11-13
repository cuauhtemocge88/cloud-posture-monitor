/**
 * Returns the self-contained HTML for the Cloud Posture Monitor visual dashboard.
 * Served at GET / without altering any JSON API or Prometheus /metrics endpoints.
 */
function renderDashboardHtml() {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Cloud Posture Monitor — Dashboard</title>
  <style>
    :root {
      --bg: #0b1120;
      --panel: #111827;
      --panel-2: #1e293b;
      --border: #334155;
      --text: #f8fafc;
      --muted: #94a3b8;
      --accent: #10b981;
      --accent-hover: #059669;
      --blue: #38bdf8;
      --warn: #f59e0b;
      --danger: #ef4444;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
      background: radial-gradient(circle at top right, #0f172a, var(--bg));
      color: var(--text);
      min-height: 100vh;
    }
    .container {
      max-width: 1120px;
      margin: 0 auto;
      padding: 28px 20px 48px;
    }
    header {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
      margin-bottom: 24px;
      padding-bottom: 18px;
      border-bottom: 1px solid var(--border);
    }
    .title-wrap h1 {
      margin: 0;
      font-size: 1.55rem;
      letter-spacing: -0.02em;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .title-wrap p {
      margin: 6px 0 0;
      color: var(--muted);
      font-size: 0.92rem;
    }
    .status-pills {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      align-items: center;
    }
    .pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      border-radius: 999px;
      font-size: 0.8rem;
      font-weight: 600;
      background: var(--panel-2);
      border: 1px solid var(--border);
      color: var(--text);
      text-decoration: none;
    }
    .pill.ok { border-color: rgba(16, 185, 129, 0.45); color: #6ee7b7; }
    .pill.link:hover { border-color: var(--blue); color: var(--blue); }
    .dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--accent);
    }
    .kpis {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }
    .card {
      background: rgba(17, 24, 39, 0.92);
      border: 1px solid var(--border);
      border-radius: 14px;
      padding: 18px 20px;
    }
    .kpi-label {
      color: var(--muted);
      font-size: 0.82rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .kpi-value {
      font-size: 2rem;
      font-weight: 700;
      margin-top: 6px;
    }
    .kpi-sub {
      margin-top: 4px;
      font-size: 0.82rem;
      color: var(--muted);
    }
    .controls {
      margin-bottom: 24px;
    }
    .controls h2 {
      margin: 0 0 14px;
      font-size: 1.05rem;
    }
    .form-row {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
    }
    input {
      background: var(--bg);
      border: 1px solid var(--border);
      color: var(--text);
      border-radius: 10px;
      padding: 10px 14px;
      font-size: 0.92rem;
      outline: none;
    }
    input:focus { border-color: var(--blue); }
    input[name="name"] { flex: 1 1 180px; }
    input[name="url"] { flex: 2 1 320px; }
    button {
      border: none;
      border-radius: 10px;
      padding: 10px 16px;
      font-size: 0.9rem;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.15s ease, opacity 0.15s ease;
    }
    button:disabled { opacity: 0.55; cursor: not-allowed; }
    .btn-primary { background: var(--accent); color: #052e16; }
    .btn-primary:hover:not(:disabled) { background: var(--accent-hover); color: #fff; }
    .btn-secondary { background: var(--panel-2); color: var(--text); border: 1px solid var(--border); }
    .btn-secondary:hover:not(:disabled) { border-color: var(--blue); color: var(--blue); }
    .feedback {
      margin-top: 12px;
      font-size: 0.88rem;
      min-height: 20px;
    }
    .feedback.err { color: #fca5a5; }
    .feedback.ok { color: #6ee7b7; }
    .table-wrap {
      overflow-x: auto;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.9rem;
    }
    th, td {
      text-align: left;
      padding: 12px 10px;
      border-bottom: 1px solid rgba(51, 65, 85, 0.6);
      vertical-align: middle;
    }
    th {
      color: var(--muted);
      font-weight: 600;
      font-size: 0.8rem;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .url-link {
      color: var(--blue);
      text-decoration: none;
      font-size: 0.82rem;
      word-break: break-all;
    }
    .url-link:hover { text-decoration: underline; }
    .score-box {
      display: flex;
      align-items: center;
      gap: 10px;
      min-width: 125px;
    }
    .bar-bg {
      flex: 1;
      height: 8px;
      background: var(--bg);
      border-radius: 999px;
      overflow: hidden;
      border: 1px solid var(--border);
    }
    .bar-fill { height: 100%; border-radius: 999px; }
    .headers-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }
    .h-badge {
      padding: 3px 8px;
      border-radius: 6px;
      font-size: 0.75rem;
      font-weight: 600;
      border: 1px solid;
    }
    .h-pass {
      background: rgba(16, 185, 129, 0.14);
      border-color: rgba(16, 185, 129, 0.45);
      color: #6ee7b7;
    }
    .h-fail {
      background: rgba(239, 68, 68, 0.12);
      border-color: rgba(239, 68, 68, 0.4);
      color: #fca5a5;
    }
    .empty {
      text-align: center;
      padding: 32px 16px;
      color: var(--muted);
    }
    .legend {
      margin-top: 14px;
      font-size: 0.82rem;
      color: var(--muted);
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div class="title-wrap">
        <h1>🛡️ Cloud Posture Monitor</h1>
        <p>Inspector de disponibilidad HTTP y cabeceras de seguridad (0–100 pts)</p>
      </div>
      <div class="status-pills">
        <span class="pill ok" id="health-pill"><span class="dot"></span>Conectando...</span>
        <span class="pill" id="storage-pill">Storage: —</span>
        <a class="pill link" href="/metrics" target="_blank" rel="noopener">Prometheus /metrics</a>
        <a class="pill link" href="/api/posture" target="_blank" rel="noopener">API JSON</a>
      </div>
    </header>

    <section class="kpis">
      <div class="card">
        <div class="kpi-label">Sitios Monitoreados</div>
        <div class="kpi-value" id="kpi-targets">0</div>
        <div class="kpi-sub">URLs registradas en el monitor</div>
      </div>
      <div class="card">
        <div class="kpi-label">Score Promedio</div>
        <div class="kpi-value" id="kpi-score">—</div>
        <div class="kpi-sub">20 pts HTTP OK + 20 pts por cada cabecera</div>
      </div>
      <div class="card">
        <div class="kpi-label">Uptime del Servicio</div>
        <div class="kpi-value" id="kpi-uptime">—</div>
        <div class="kpi-sub" id="kpi-service">cloud-posture-monitor</div>
      </div>
    </section>

    <section class="card controls">
      <h2>Agregar y Escanear Sitio Web</h2>
      <form id="add-form" class="form-row">
        <input type="text" name="name" id="target-name" placeholder="Nombre (ej. Holcim Portal)" required />
        <input type="url" name="url" id="target-url" placeholder="https://tu-sitio.com" required />
        <button type="submit" class="btn-primary" id="btn-add">Agregar y Escanear</button>
        <button type="button" class="btn-secondary" id="btn-scan">Escanear Todos</button>
      </form>
      <div class="feedback" id="feedback"></div>
    </section>

    <section class="card">
      <h2 style="margin: 0 0 12px; font-size: 1.05rem;">Resultados de Postura de Seguridad</h2>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Sitio</th>
              <th>HTTP / Latencia</th>
              <th>Score</th>
              <th>Cabeceras de Seguridad</th>
              <th>Último Escaneo</th>
            </tr>
          </thead>
          <tbody id="results-body">
            <tr><td colspan="5" class="empty">Cargando datos...</td></tr>
          </tbody>
        </table>
      </div>
      <div class="legend">
        Nota: Por seguridad SSRF, se bloquean direcciones privadas o locales (<code>localhost</code>, <code>127.0.0.1</code>, <code>10.*</code>, <code>192.168.*</code>).
      </div>
    </section>
  </div>

  <script>
    const HEADER_LABELS = [
      ['strict-transport-security', 'HSTS'],
      ['content-security-policy', 'CSP'],
      ['x-content-type-options', 'X-Content-Type'],
      ['x-frame-options', 'X-Frame-Options']
    ];

    function esc(value) {
      return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    }

    function scoreColor(score) {
      if (score >= 80) return '#10b981';
      if (score >= 50) return '#f59e0b';
      return '#ef4444';
    }

    function setFeedback(msg, isError) {
      const el = document.getElementById('feedback');
      el.textContent = msg;
      el.className = 'feedback ' + (isError ? 'err' : 'ok');
    }

    async function loadDashboard() {
      try {
        const [healthRes, readyRes, targetsRes, postureRes] = await Promise.all([
          fetch('/healthz'),
          fetch('/readyz'),
          fetch('/api/targets'),
          fetch('/api/posture')
        ]);

        if (healthRes.ok) {
          const h = await healthRes.json();
          document.getElementById('health-pill').innerHTML = '<span class="dot"></span>Servicio: ' + esc(h.status);
          document.getElementById('kpi-uptime').textContent = h.uptimeSeconds + 's';
          document.getElementById('kpi-service').textContent = h.service || 'cloud-posture-monitor';
        }

        if (readyRes.ok) {
          const r = await readyRes.json();
          document.getElementById('storage-pill').textContent = 'Storage: ' + (r.storage || 'unknown');
        }

        const targetsData = targetsRes.ok ? await targetsRes.json() : { targets: [] };
        const postureData = postureRes.ok ? await postureRes.json() : { summary: { monitoredTargets: 0, averageScore: 0 }, latestScans: [] };

        const targets = targetsData.targets || [];
        const scans = postureData.latestScans || [];
        const scanByTargetId = new Map(scans.map((s) => [s.target_id, s]));

        document.getElementById('kpi-targets').textContent = String(targets.length);
        document.getElementById('kpi-score').textContent = scans.length ? (postureData.summary.averageScore + '/100') : '—';

        const tbody = document.getElementById('results-body');
        if (!targets.length) {
          tbody.innerHTML = '<tr><td colspan="5" class="empty">No hay URLs registradas todavía. Agrega una arriba para escanear su seguridad.</td></tr>';
          return;
        }

        tbody.innerHTML = targets.map((t) => {
          const s = scanByTargetId.get(t.id);
          if (!s) {
            return '<tr>' +
              '<td><strong>' + esc(t.name) + '</strong><br><a class="url-link" href="' + esc(t.url) + '" target="_blank" rel="noopener">' + esc(t.url) + '</a></td>' +
              '<td colspan="4" style="color:#94a3b8;">Pendiente de escaneo — presiona "Escanear Todos"</td>' +
            '</tr>';
          }

          const color = scoreColor(s.score);
          const statusText = s.error_message
            ? '<span style="color:#fca5a5;">Error: ' + esc(s.error_message) + '</span>'
            : 'HTTP ' + esc(s.status_code) + ' · ' + esc(s.latency_ms) + ' ms';

          const headersObj = s.headers_present || {};
          const badges = HEADER_LABELS.map(([key, label]) => {
            const ok = Boolean(headersObj[key]);
            return '<span class="h-badge ' + (ok ? 'h-pass' : 'h-fail') + '">' + (ok ? '✓ ' : '✗ ') + esc(label) + '</span>';
          }).join('');

          const when = s.scanned_at ? new Date(s.scanned_at).toLocaleString() : '—';

          return '<tr>' +
            '<td><strong>' + esc(t.name) + '</strong><br><a class="url-link" href="' + esc(t.url) + '" target="_blank" rel="noopener">' + esc(t.url) + '</a></td>' +
            '<td>' + statusText + '</td>' +
            '<td><div class="score-box"><div class="bar-bg"><div class="bar-fill" style="width:' + Number(s.score) + '%;background:' + color + ';"></div></div><strong>' + esc(s.score) + '</strong></div></td>' +
            '<td><div class="headers-grid">' + badges + '</div></td>' +
            '<td style="color:#94a3b8;font-size:0.82rem;">' + esc(when) + '</td>' +
          '</tr>';
        }).join('');
      } catch (err) {
        setFeedback('Error cargando datos: ' + err.message, true);
      }
    }

    document.getElementById('add-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = document.getElementById('btn-add');
      const name = document.getElementById('target-name').value.trim();
      const url = document.getElementById('target-url').value.trim();
      btn.disabled = true;
      setFeedback('Registrando y escaneando...', false);

      try {
        const res = await fetch('/api/targets', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ name, url })
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'No se pudo registrar el sitio');
        }
        await fetch('/api/scan', { method: 'POST' });
        document.getElementById('target-name').value = '';
        document.getElementById('target-url').value = '';
        setFeedback('Sitio agregado y escaneado correctamente.', false);
        await loadDashboard();
      } catch (err) {
        setFeedback(err.message, true);
      } finally {
        btn.disabled = false;
      }
    });

    document.getElementById('btn-scan').addEventListener('click', async () => {
      const btn = document.getElementById('btn-scan');
      btn.disabled = true;
      setFeedback('Escaneando todos los sitios...', false);
      try {
        const res = await fetch('/api/scan', { method: 'POST' });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Error al escanear');
        setFeedback('Escaneo completado (' + data.scanned + ' sitio(s)).', false);
        await loadDashboard();
      } catch (err) {
        setFeedback(err.message, true);
      } finally {
        btn.disabled = false;
      }
    });

    loadDashboard();
  </script>
</body>
</html>`;
}

module.exports = { renderDashboardHtml };
