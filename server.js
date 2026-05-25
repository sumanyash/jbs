const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const pool = require('./db');
const auth = require('./auth');

const PUBLIC_DIR = path.join(__dirname, 'public');
const ENV_FILE = path.join(__dirname, '.env');

loadEnv();

const PORT = Number(process.env.PORT || 4173);
const DATA_DIR = path.join(__dirname, 'data');
const JOB_DATA_FILE = path.join(DATA_DIR, 'jobs.json');

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
    'Cache-Control': 'no-cache, no-store, must-revalidate',
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
    scheduleEnabled: process.env.SCHEDULE_ENABLED !== '0',
    scheduleTime: process.env.SCHEDULE_TIME || '02:00',
    scheduleTzOffsetMinutes: Number(process.env.SCHEDULE_TZ_OFFSET_MINUTES || 330),
    remotiveEnabled: process.env.REMOTIVE_ENABLED !== '0',
    arbeitnowEnabled: process.env.ARBEITNOW_ENABLED !== '0',
    jsearchKey: process.env.RAPIDAPI_JSEARCH_KEY || '',
    openaiKey: process.env.OPENAI_API_KEY || '',
    geminiKey: process.env.GEMINI_API_KEY || '',
    claudeKey: process.env.ANTHROPIC_API_KEY || '',
    ollamaEnabled: process.env.OLLAMA_ENABLED !== '0',
    ollamaUrl: process.env.OLLAMA_URL || 'http://127.0.0.1:11434',
    ollamaModel: process.env.OLLAMA_MODEL || 'qwen2.5:0.5b',
    ollamaMaxJobs: Number(process.env.OLLAMA_MAX_JOBS || 25),
    minScore: Number(process.env.MIN_SCORE || 38),
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
    scheduleEnabled: config.scheduleEnabled,
    scheduleTime: config.scheduleTime,
    providers: {
      remotive: config.remotiveEnabled,
      arbeitnow: config.arbeitnowEnabled,
      jsearch: Boolean(config.jsearchKey),
      apify: Boolean(config.apifyToken && (config.defaultTaskId || config.defaultActorId || config.defaultDatasetId)),
      openai: Boolean(config.openaiKey),
      gemini: Boolean(config.geminiKey),
      claude: Boolean(config.claudeKey),
      ollama: config.ollamaEnabled,
    },
    ollamaModel: config.ollamaModel,
    authEnabled: true,
    portalVersion: '2.0',
  };
}

function stripHtml(value = '') {
  return String(value)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readStoredJobs() {
  try {
    if (!fs.existsSync(JOB_DATA_FILE)) return { items: [], lastRunAt: null, providerCounts: {} };
    return JSON.parse(fs.readFileSync(JOB_DATA_FILE, 'utf8'));
  } catch {
    return { items: [], lastRunAt: null, providerCounts: {} };
  }
}

function writeStoredJobs(payload) {
  ensureDataDir();
  fs.writeFileSync(JOB_DATA_FILE, JSON.stringify(payload, null, 2));
}

function uniqueByUrl(items) {
  const seen = new Set();
  return items.filter((item) => {
    const key = String(item.url || `${item.company}-${item.title}`).toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function normalizeRemoteJob(item, source) {
  if (source === 'Remotive') {
    return {
      id: `remotive-${item.id}`,
      title: item.title,
      company: item.company_name,
      location: item.candidate_required_location || 'Remote',
      url: item.url,
      source,
      salary: item.salary || '',
      description: item.description || '',
      postedAt: item.publication_date || '',
    };
  }
  if (source === 'Arbeitnow') {
    return {
      id: item.slug || item.url,
      title: item.title,
      company: item.company_name,
      location: item.location || (item.remote ? 'Remote' : 'Not listed'),
      url: item.url,
      source,
      salary: '',
      description: item.description || '',
      postedAt: item.created_at || '',
    };
  }
  if (source === 'JSearch') {
    return {
      id: item.job_id || item.job_apply_link,
      title: item.job_title,
      company: item.employer_name,
      location: item.job_location || item.job_country || 'Not listed',
      url: item.job_apply_link || item.job_google_link,
      source,
      salary: item.job_salary || '',
      description: item.job_description || '',
      postedAt: item.job_posted_at_datetime_utc || '',
    };
  }
  return item;
}

function jobText(job) {
  return stripHtml([job.title, job.company, job.location, job.description, job.salary].filter(Boolean).join(' ')).toLowerCase();
}

function keywordRegex(keyword) {
  const escaped = keyword.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
  return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, 'i');
}

function keywordMatches(text, keyword) {
  return keywordRegex(keyword).test(text);
}

function scoreJobServer(job) {
  const keywords = [
    'ai voice', 'voice ai', 'voice agent', 'conversational ai', 'sip', 'voip', 'asterisk',
    'freepbx', 'webrtc', 'rtp', 'pjsip', 'cpaas', 'telecom', 'telephony', 'dialer',
    'vicidial', 'ivr', 'linux', 'infrastructure', 'distributed systems', 'high availability',
    'founding engineer', 'platform engineer', 'cloud telephony', 'communications api',
    'whatsapp api', 'crm integration', 'docker', 'kubernetes', 'aws', 'redis',
  ];
  const companies = ['vapi', 'retell', 'bland', 'twilio', 'plivo', 'bandwidth', 'elevenlabs', 'vonage', 'openai'];
  const haystack = jobText(job);
  const titleText = String(job.title || '').toLowerCase();
  const matched = keywords.filter((keyword) => keywordMatches(haystack, keyword));
  let score = matched.length ? 18 : 4;
  score += matched.reduce((sum, keyword) => sum + (/voice|sip|voip|asterisk|telecom|webrtc|cpaas/.test(keyword) ? 8 : 5), 0);
  if (companies.some((company) => String(job.company || '').toLowerCase().includes(company))) score += 16;
  if (/remote|india|uae|dubai|jaipur/i.test(job.location || '')) score += 7;
  if (/senior|lead|staff|principal|founding|architect/i.test(job.title || '')) score += 8;
  if (/(voice|voip|sip|asterisk|webrtc|telecom|telephony|cpaas|infrastructure|platform|devops|cloud)/i.test(titleText)) score += 12;
  if (/intern|fresh|junior|campus/i.test(haystack)) score -= 18;
  if (/(bank|banking|finance|accounting|treasury|regulatory|ifrs|risk management|audit)/i.test(haystack) && matched.length < 2) score -= 30;
  return {
    ...job,
    score: Math.max(0, Math.min(100, Math.round(score))),
    matched: matched.slice(0, 8),
    reason: matched.length ? `Matched on ${matched.slice(0, 5).join(', ')}.` : 'General infrastructure match.',
  };
}

async function syncJobs(reason = 'manual') {
  const config = readPortalConfig();
  const batches = await Promise.allSettled([fetchRemotive(config), fetchArbeitnow(config), fetchJSearch(config)]);
  const items = uniqueByUrl(batches.flatMap((batch) => batch.status === 'fulfilled' ? batch.value : []))
    .map(scoreJobServer)
    .filter((job) => job.score >= config.minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, Number(process.env.STORE_MAX_JOBS || 500));
  const providerCounts = items.reduce((counts, item) => {
    counts[item.source] = (counts[item.source] || 0) + 1;
    return counts;
  }, {});
  const payload = { items, lastRunAt: new Date().toISOString(), reason, providerCounts };
  writeStoredJobs(payload);
  return payload;
}

async function fetchRemotive(config) {
  if (!config.remotiveEnabled) return [];
  const queries = config.defaultKeywords.slice(0, 8);
  const batches = await Promise.all(queries.map(async (query) => {
    const url = `https://remotive.com/api/remote-jobs?search=${encodeURIComponent(query)}&limit=40`;
    try {
      const response = await fetch(url);
      if (!response.ok) return [];
      const data = await response.json();
      return (data.jobs || []).map((job) => normalizeRemoteJob(job, 'Remotive'));
    } catch {
      return [];
    }
  }));
  return batches.flat();
}

async function fetchArbeitnow(config) {
  if (!config.arbeitnowEnabled) return [];
  try {
    const response = await fetch('https://www.arbeitnow.com/api/job-board-api');
    if (!response.ok) return [];
    const data = await response.json();
    return (data.data || [])
      .map((job) => normalizeRemoteJob(job, 'Arbeitnow'))
      .map(scoreJobServer)
      .filter((job) => job.score >= config.minScore);
  } catch {
    return [];
  }
}

async function fetchJSearch(config) {
  if (!config.jsearchKey) return [];
  const queries = config.defaultKeywords.slice(0, 5);
  const batches = await Promise.all(queries.map(async (query) => {
    const url = `https://jsearch.p.rapidapi.com/search?query=${encodeURIComponent(`${query} ${config.defaultLocation}`)}&page=1&num_pages=1`;
    try {
      const response = await fetch(url, {
        headers: {
          'x-rapidapi-host': 'jsearch.p.rapidapi.com',
          'x-rapidapi-key': config.jsearchKey,
        },
      });
      if (!response.ok) return [];
      const data = await response.json();
      return (data.data || []).map((job) => normalizeRemoteJob(job, 'JSearch'));
    } catch {
      return [];
    }
  }));
  return batches.flat();
}

function msUntilNextRun() {
  const config = readPortalConfig();
  const [hour, minute] = config.scheduleTime.split(':').map(Number);
  const now = new Date();
  const localNow = new Date(now.getTime() + config.scheduleTzOffsetMinutes * 60_000);
  const targetLocal = new Date(localNow);
  targetLocal.setUTCHours(hour || 2, minute || 0, 0, 0);
  if (targetLocal <= localNow) targetLocal.setUTCDate(targetLocal.getUTCDate() + 1);
  const targetUtc = new Date(targetLocal.getTime() - config.scheduleTzOffsetMinutes * 60_000);
  return targetUtc.getTime() - now.getTime();
}

function scheduleDailySync() {
  const config = readPortalConfig();
  if (!config.scheduleEnabled) return;
  const delay = msUntilNextRun();
  console.log(`Next job sync scheduled in ${Math.round(delay / 60000)} minutes.`);
  setTimeout(async () => {
    try {
      const result = await syncJobs('scheduled');
      console.log(`Scheduled job sync complete: ${result.items.length} jobs.`);
    } catch (error) {
      console.error('Scheduled job sync failed:', error.message);
    } finally {
      scheduleDailySync();
    }
  }, delay);
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
  const hasApifyTarget = config.apifyToken && (config.defaultTaskId || config.defaultActorId || config.defaultDatasetId);
  if (!hasApifyTarget) {
    const payload = await syncJobs('manual-auto');
    return sendJson(res, 200, { items: payload.items, source: 'free-providers', lastRunAt: payload.lastRunAt, providerCounts: payload.providerCounts });
  }

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

// Authentication endpoints
async function handleRegister(req, res) {
  try {
    const { email, password, firstName = '', lastName = '' } = await readBody(req);
    if (!email || !password) {
      return sendJson(res, 400, { error: 'Email and password are required' });
    }
    if (password.length < 6) {
      return sendJson(res, 400, { error: 'Password must be at least 6 characters' });
    }
    const result = await auth.registerUser(email, password, firstName, lastName);
    if (!result.success) {
      return sendJson(res, 400, { error: result.error });
    }
    const token = auth.generateToken(result.userId);
    sendJson(res, 201, { success: true, userId: result.userId, token, message: 'Registration successful' });
  } catch (error) {
    sendJson(res, 500, { error: error.message });
  }
}

async function handleLogin(req, res) {
  try {
    const { email, password } = await readBody(req);
    if (!email || !password) {
      return sendJson(res, 400, { error: 'Email and password are required' });
    }
    const result = await auth.loginUser(email, password);
    if (!result.success) {
      return sendJson(res, 401, { error: result.error });
    }
    sendJson(res, 200, { success: true, userId: result.userId, token: result.token });
  } catch (error) {
    sendJson(res, 500, { error: error.message });
  }
}

async function handleGetProfile(req, res, userId) {
  try {
    const user = await auth.getUserById(userId);
    if (!user) {
      return sendJson(res, 404, { error: 'User not found' });
    }
    sendJson(res, 200, { success: true, user });
  } catch (error) {
    sendJson(res, 500, { error: error.message });
  }
}

async function handleSaveJob(req, res, userId) {
  try {
    const { jobData, status = 'saved', notes = '' } = await readBody(req);
    if (!jobData || !jobData.id) {
      return sendJson(res, 400, { error: 'Job data with ID is required' });
    }

    const connection = await pool.getConnection();

    // Save job to jobs table if not already there
    await connection.execute(
      `INSERT INTO jobs (job_id, title, company, location, description, url, source, posted_date, score)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE updated_at = NOW()`,
      [
        jobData.id,
        jobData.title || '',
        jobData.company || '',
        jobData.location || '',
        jobData.description || '',
        jobData.url || '',
        jobData.source || '',
        jobData.postedAt || null,
        jobData.score || 0,
      ]
    );

    // Get the job ID
    const [jobs] = await connection.execute('SELECT id FROM jobs WHERE job_id = ?', [jobData.id]);
    const jobId = jobs[0]?.id;

    if (jobId) {
      // Save to saved_jobs table
      await connection.execute(
        `INSERT INTO saved_jobs (user_id, job_id, status, notes) VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE status = VALUES(status), notes = VALUES(notes), updated_at = NOW()`,
        [userId, jobId, status, notes]
      );
    }

    connection.release();
    sendJson(res, 200, { success: true, message: 'Job saved successfully' });
  } catch (error) {
    sendJson(res, 500, { error: error.message });
  }
}

async function handleGetSavedJobs(req, res, userId) {
  try {
    const connection = await pool.getConnection();
    const [savedJobs] = await connection.execute(
      `SELECT j.*, sj.status, sj.notes, sj.created_at as saved_at
       FROM saved_jobs sj
       JOIN jobs j ON sj.job_id = j.id
       WHERE sj.user_id = ?
       ORDER BY sj.created_at DESC`,
      [userId]
    );
    connection.release();
    sendJson(res, 200, { success: true, jobs: savedJobs || [] });
  } catch (error) {
    sendJson(res, 500, { error: error.message });
  }
}

async function handleDeleteSavedJob(req, res, userId) {
  try {
    const { jobId } = await readBody(req);
    if (!jobId) {
      return sendJson(res, 400, { error: 'Job ID is required' });
    }

    const connection = await pool.getConnection();
    await connection.execute(
      'DELETE FROM saved_jobs WHERE user_id = ? AND job_id = ?',
      [userId, jobId]
    );
    connection.release();
    sendJson(res, 200, { success: true, message: 'Job removed from saved' });
  } catch (error) {
    sendJson(res, 500, { error: error.message });
  }
}

// Helper to extract token from headers
function extractToken(req) {
  const authHeader = req.headers.authorization || '';
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  return match ? match[1] : null;
}

// Middleware to verify token
function verifyAuth(req) {
  const token = extractToken(req);
  if (!token) return null;
  const decoded = auth.verifyToken(token);
  return decoded?.userId || null;
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
    // Add CORS headers for multi-origin support
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    if (req.method === 'OPTIONS') {
      return sendHead(res, 200);
    }

    if (req.method === 'HEAD') {
      return sendHead(res, 200, { 'Content-Type': 'text/html; charset=utf-8' });
    }

    // Public endpoints
    if (req.method === 'GET' && req.url === '/health') {
      return sendJson(res, 200, { ok: true, service: 'job-search-portal', version: '2.0' });
    }
    if (req.method === 'GET' && req.url === '/api/config') return sendJson(res, 200, publicConfig());
    
    // Auth endpoints (public)
    if (req.method === 'POST' && req.url === '/api/auth/register') return await handleRegister(req, res);
    if (req.method === 'POST' && req.url === '/api/auth/login') return await handleLogin(req, res);

    // Protected endpoints
    const userId = verifyAuth(req);
    if (!userId && req.url.startsWith('/api/') && !req.url.startsWith('/api/config') && !req.url.startsWith('/api/auth') && !req.url.startsWith('/api/apify') && !req.url.startsWith('/api/jobs/sync')) {
      return sendJson(res, 401, { error: 'Unauthorized. Please login.' });
    }

    // User endpoints
    if (req.method === 'GET' && req.url === '/api/user/profile' && userId) {
      return await handleGetProfile(req, res, userId);
    }
    if (req.method === 'GET' && req.url === '/api/user/saved-jobs' && userId) {
      return await handleGetSavedJobs(req, res, userId);
    }
    if (req.method === 'POST' && req.url === '/api/user/save-job' && userId) {
      return await handleSaveJob(req, res, userId);
    }
    if (req.method === 'POST' && req.url === '/api/user/delete-job' && userId) {
      return await handleDeleteSavedJob(req, res, userId);
    }

    // Public job endpoints (backward compatibility)
    if (req.method === 'GET' && req.url === '/api/jobs') return sendJson(res, 200, readStoredJobs());
    if (req.method === 'POST' && req.url === '/api/jobs/sync') return sendJson(res, 200, await syncJobs('manual'));
    if (req.method === 'POST' && req.url === '/api/apify/auto') return await handleAutoRun(res);
    if (req.method === 'POST' && req.url === '/api/apify/run-actor') return await handleRunActor(req, res);
    if (req.method === 'POST' && req.url === '/api/apify/run-task') return await handleRunTask(req, res);
    if (req.method === 'POST' && req.url === '/api/apify/dataset') return await handleDataset(req, res);

    // Serve static files
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
  console.log(`Job Search Portal (Multi-User v2.0) running at http://localhost:${PORT}`);
  console.log(`Database: ${process.env.DB_HOST || 'localhost'}/${process.env.DB_NAME || 'job_search_portal'}`);
  scheduleDailySync();
});
