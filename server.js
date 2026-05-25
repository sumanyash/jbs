const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const PORT = Number(process.env.PORT || 4173);
const PUBLIC_DIR = path.join(__dirname, 'public');

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
  const id = normalizeApifyId(actorId);
  if (!token || !id) return sendJson(res, 400, { error: 'Apify token and actor ID are required.' });

  const url = `https://api.apify.com/v2/acts/${encodeURIComponent(id)}/run-sync-get-dataset-items?timeout=${Number(timeoutSecs) || 120}&maxItems=${Number(maxItems) || 50}`;
  const items = await apifyFetch(url, token, {
    method: 'POST',
    body: JSON.stringify(input || {}),
  });

  sendJson(res, 200, { items: Array.isArray(items) ? items : [], source: 'actor', actorId: id });
}

async function handleRunTask(req, res) {
  const { token, taskId, maxItems = 50, timeoutSecs = 120 } = await readBody(req);
  const id = normalizeApifyId(taskId);
  if (!token || !id) return sendJson(res, 400, { error: 'Apify token and task ID are required.' });

  const url = `https://api.apify.com/v2/actor-tasks/${encodeURIComponent(id)}/run-sync-get-dataset-items?timeout=${Number(timeoutSecs) || 120}&maxItems=${Number(maxItems) || 50}`;
  const items = await apifyFetch(url, token, { method: 'POST' });

  sendJson(res, 200, { items: Array.isArray(items) ? items : [], source: 'task', taskId: id });
}

async function handleDataset(req, res) {
  const { token, datasetId, maxItems = 100 } = await readBody(req);
  const id = String(datasetId || '').trim();
  if (!token || !id) return sendJson(res, 400, { error: 'Apify token and dataset ID are required.' });

  const url = `https://api.apify.com/v2/datasets/${encodeURIComponent(id)}/items?maxItems=${Number(maxItems) || 100}`;
  const items = await apifyFetch(url, token, { method: 'GET' });

  sendJson(res, 200, { items: Array.isArray(items) ? items : [], source: 'dataset', datasetId: id });
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
