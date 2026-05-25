const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const PUBLIC_DIR = path.join(__dirname, 'public');
const ENV_FILE = path.join(__dirname, '.env');

loadEnv();

const PORT = Number(process.env.PORT || 4173);

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
  });
  res.end(body);
}

function sendHead(res, status = 200, headers = {}) {
  res.writeHead(status, headers);
  res.end();
}

function loadEnv() {
  if (!fs.existsSync(ENV_FILE)) return;
  const lines = fs.readFileSync(ENV_FILE, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
    const [key, ...rest] = trimmed.split('=');
    if (process.env[key]) continue;
    process.env[key] = rest.join('=').trim().replace(/^['"]|['"]$/g, '');
  }
}

function envList(key, fallback = []) {
  const value = process.env[key];
  if (!value) return fallback;
  return value.split(',').map((item) => item.trim()).filter(Boolean);
}

function readPortalConfig() {
  return {
    apifyToken: process.env.APIFY_API_KEY || '',
    defaultMode: process.env.DEFAULT_APIFY_MODE || 'task',
    defaultTaskId: process.env.APIFY_TASK_ID || '',
    defaultActorId: process.env.APIFY_ACTOR_ID || '',
    defaultDatasetId: process.env.APIFY_DATASET_ID || '',
    defaultMaxItems: Number(process.env.DEFAULT_MAX_ITEMS || 50),
    defaultKeywords: envList('DEFAULT_KEYWORDS', [
      'AI voice engineer',
      'VoIP engineer',
      'SIP engineer',
      'telecom infrastructure',
      'founding engineer',
      'CPaaS platform engineer',
      'Asterisk engineer',
      'WebRTC engineer',
    ]),
    defaultLocation: process.env.DEFAULT_LOCATION || 'Remote, India, UAE',
  };
}

function publicConfig() {
  const config = readPortalConfig();
  return {
    hasApifyKey: Boolean(config.apifyToken),
    defaultMode: config.defaultMode,
    defaultTaskId: config.defaultTaskId,
    defaultActorId: config.defaultActorId,
    defaultDatasetId: config.defaultDatasetId,
    defaultMaxItems: config.defaultMaxItems,
    defaultKeywords: config.defaultKeywords,
    defaultLocation: config.defaultLocation,
    profileName: 'Yash Suman',
    bestRoles: [
      'AI Voice Infrastructure Engineer',
      'VoIP/SIP Infrastructure Engineer',
      'Founding Infrastructure Engineer',
      'CPaaS Platform Engineer',
      'Cloud Telephony Architect',
    ],
  };
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 2_000_000) {
        reject(new Error('Request body is too large.'));
        req.destroy();
      }
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error('Request body must be valid JSON.'));
      }
    });
    req.on('error', reject);
  });
}

function normalizeApifyId(id) {
  return String(id || '').trim().replaceAll('/', '~');
}

async function apifyFetch(url, token, options = {}) {
  const target = new URL(url);
  target.searchParams.set('token', token);
  if (!target.searchParams.has('clean')) target.searchParams.set('clean', 'true');

  const response = await fetch(target, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  const text = await response.text();
  let payload = text;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = { message: text };
  }

  if (!response.ok) {
    const detail = payload?.error?.message || payload?.message || response.statusText;
    const error = new Error(detail);
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return payload;
}

async function handleRunActor(req, res) {
  const { token, actorId, input = {}, maxItems = 50, timeoutSecs = 120 } = await readBody(req);
  const resolvedToken = token || readPortalConfig().apifyToken;
  const id = normalizeApifyId(actorId);
  if (!resolvedToken || !id) return sendJson(res, 400, { error: 'Apify key and actor ID are required. Add APIFY_API_KEY and APIFY_ACTOR_ID in .env.' });

  const url = `https://api.apify.com/v2/acts/${encodeURIComponent(id)}/run-sync-get-dataset-items?timeout=${Number(timeoutSecs) || 120}&maxItems=${Number(maxItems) || 50}`;
  const items = await apifyFetch(url, resolvedToken, {
    method: 'POST',
    body: JSON.stringify(input || {}),
  });

  sendJson(res, 200, { items: Array.isArray(items) ? items : [], source: 'actor', actorId: id });
}

async function handleRunTask(req, res) {
  const { token, taskId, maxItems = 50, timeoutSecs = 120 } = await readBody(req);
  const resolvedToken = token || readPortalConfig().apifyToken;
  const id = normalizeApifyId(taskId);
  if (!resolvedToken || !id) return sendJson(res, 400, { error: 'Apify key and task ID are required. Add APIFY_API_KEY and APIFY_TASK_ID in .env.' });

  const url = `https://api.apify.com/v2/actor-tasks/${encodeURIComponent(id)}/run-sync-get-dataset-items?timeout=${Number(timeoutSecs) || 120}&maxItems=${Number(maxItems) || 50}`;
  const items = await apifyFetch(url, resolvedToken, { method: 'POST' });

  sendJson(res, 200, { items: Array.isArray(items) ? items : [], source: 'task', taskId: id });
}

async function handleDataset(req, res) {
  const { token, datasetId, maxItems = 100 } = await readBody(req);
  const resolvedToken = token || readPortalConfig().apifyToken;
  const id = String(datasetId || '').trim();
  if (!resolvedToken || !id) return sendJson(res, 400, { error: 'Apify key and dataset ID are required. Add APIFY_API_KEY and APIFY_DATASET_ID in .env.' });

  const url = `https://api.apify.com/v2/datasets/${encodeURIComponent(id)}/items?maxItems=${Number(maxItems) || 100}`;
  const items = await apifyFetch(url, resolvedToken, { method: 'GET' });

  sendJson(res, 200, { items: Array.isArray(items) ? items : [], source: 'dataset', datasetId: id });
}

async function handleAutoRun(res) {
  const config = readPortalConfig();
  if (!config.apifyToken) return sendJson(res, 400, { error: 'APIFY_API_KEY is missing in .env.' });

  if (config.defaultMode === 'actor' && config.defaultActorId) {
    const input = {
      searchQueries: config.defaultKeywords.map((query) => `${query} ${config.defaultLocation}`),
      maxItems: config.defaultMaxItems,
      datePosted: 'week',
    };
    const url = `https://api.apify.com/v2/acts/${encodeURIComponent(normalizeApifyId(config.defaultActorId))}/run-sync-get-dataset-items?timeout=120&maxItems=${config.defaultMaxItems}`;
    const items = await apifyFetch(url, config.apifyToken, { method: 'POST', body: JSON.stringify(input) });
    return sendJson(res, 200, { items: Array.isArray(items) ? items : [], source: 'auto-actor', actorId: config.defaultActorId });
  }

  if (config.defaultMode === 'dataset' && config.defaultDatasetId) {
    const url = `https://api.apify.com/v2/datasets/${encodeURIComponent(config.defaultDatasetId)}/items?maxItems=${config.defaultMaxItems}`;
    const items = await apifyFetch(url, config.apifyToken, { method: 'GET' });
    return sendJson(res, 200, { items: Array.isArray(items) ? items : [], source: 'auto-dataset', datasetId: config.defaultDatasetId });
  }

  if (!config.defaultTaskId) return sendJson(res, 400, { error: 'APIFY_TASK_ID is missing in .env.' });
  const url = `https://api.apify.com/v2/actor-tasks/${encodeURIComponent(normalizeApifyId(config.defaultTaskId))}/run-sync-get-dataset-items?timeout=120&maxItems=${config.defaultMaxItems}`;
  const items = await apifyFetch(url, config.apifyToken, { method: 'POST' });
  return sendJson(res, 200, { items: Array.isArray(items) ? items : [], source: 'auto-task', taskId: config.defaultTaskId });
}

function serveStatic(req, res) {
  const urlPath = decodeURIComponent(new URL(req.url, `http://${req.headers.host}`).pathname);
  const safePath = path.normalize(urlPath).replace(/^(\.\.[/\\])+/, '');
  const filePath = path.join(PUBLIC_DIR, safePath === '/' ? 'index.html' : safePath);

  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.readFile(filePath, (error, data) => {
    if (error) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not found');
      return;
    }
    res.writeHead(200, { 'Content-Type': mimeTypes[path.extname(filePath)] || 'application/octet-stream' });
    res.end(data);
  });
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === 'HEAD') {
      return sendHead(res, 200, { 'Content-Type': 'text/html; charset=utf-8' });
    }
    if (req.method === 'GET' && req.url === '/health') {
      return sendJson(res, 200, { ok: true, service: 'job-search-portal' });
    }
    if (req.method === 'GET' && req.url === '/api/config') return sendJson(res, 200, publicConfig());
    if (req.method === 'POST' && req.url === '/api/apify/auto') return await handleAutoRun(res);
    if (req.method === 'POST' && req.url === '/api/apify/run-actor') return await handleRunActor(req, res);
    if (req.method === 'POST' && req.url === '/api/apify/run-task') return await handleRunTask(req, res);
    if (req.method === 'POST' && req.url === '/api/apify/dataset') return await handleDataset(req, res);
    if (req.method === 'GET') return serveStatic(req, res);
    sendJson(res, 405, { error: 'Method not allowed.' });
  } catch (error) {
    sendJson(res, error.status || 500, {
      error: error.message || 'Unexpected server error.',
      details: error.payload || null,
    });
  }
});

server.listen(PORT, () => {
  console.log(`Job Search Portal running at http://localhost:${PORT}`);
});
