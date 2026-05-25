const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

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
    savedJobCount: readStoredJobs().items.length,
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

function buildOllamaPrompt(job) {
  return `You are helping Yash Suman find jobs. Yash is an AI Voice Infrastructure Engineer and Telecom Systems Architect with production SIP, VoIP, Asterisk, FreePBX, WebRTC, CPaaS, Vicidial, Linux, AWS, Docker, Kubernetes, CRM integration and founding engineer experience.

Analyze this job and return ONLY valid JSON with these keys:
fitScore: number from 0 to 100,
fitSummary: short 1 sentence,
matchedSkills: array of 3 to 8 strings,
missingSkills: array of 0 to 5 strings,
outreachDM: short LinkedIn DM under 70 words,
coverHook: one strong cover letter opening under 45 words.

Job:
Title: ${job.title}
Company: ${job.company}
Location: ${job.location}
Salary: ${job.salary || 'Not listed'}
Description: ${stripHtml(job.description).slice(0, 3500)}`;
}

function extractJson(text) {
  const raw = String(text || '').trim();
  try {
    return JSON.parse(raw);
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
}

async function ollamaGenerate(prompt, config) {
  const response = await fetch(`${config.ollamaUrl.replace(/\/$/, '')}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: config.ollamaModel,
      prompt,
      stream: false,
      options: {
        temperature: 0.2,
        num_predict: 450,
      },
    }),
  });
  if (!response.ok) throw new Error(`Ollama request failed with ${response.status}`);
  const data = await response.json();
  return data.response || '';
}

async function enrichJobWithOllama(job, config) {
  const text = await ollamaGenerate(buildOllamaPrompt(job), config);
  const ai = extractJson(text);
  if (!ai) {
    return {
      ...job,
      ai: {
        provider: 'ollama',
        model: config.ollamaModel,
        fitSummary: text.slice(0, 220) || 'Ollama returned an unstructured response.',
        matchedSkills: job.matched || [],
        missingSkills: [],
        outreachDM: '',
        coverHook: '',
      },
    };
  }
  const fitScore = Number(ai.fitScore);
  return {
    ...job,
    score: Number.isFinite(fitScore) ? Math.max(0, Math.min(100, Math.round((job.score + fitScore) / 2))) : job.score,
    ai: {
      provider: 'ollama',
      model: config.ollamaModel,
      fitScore: Number.isFinite(fitScore) ? fitScore : null,
      fitSummary: String(ai.fitSummary || ''),
      matchedSkills: Array.isArray(ai.matchedSkills) ? ai.matchedSkills.slice(0, 8) : [],
      missingSkills: Array.isArray(ai.missingSkills) ? ai.missingSkills.slice(0, 5) : [],
      outreachDM: String(ai.outreachDM || ''),
      coverHook: String(ai.coverHook || ''),
    },
  };
}

async function enrichStoredJobs() {
  const config = readPortalConfig();
  if (!config.ollamaEnabled) throw new Error('Ollama is disabled. Set OLLAMA_ENABLED=1 in .env.');
  const stored = readStoredJobs();
  const topJobs = stored.items
    .slice()
    .sort((a, b) => b.score - a.score)
    .slice(0, config.ollamaMaxJobs);
  const rest = stored.items.filter((job) => !topJobs.some((topJob) => topJob.id === job.id));
  const enriched = [];
  for (const job of topJobs) {
    enriched.push(await enrichJobWithOllama(job, config));
  }
  const items = [...enriched, ...rest].sort((a, b) => b.score - a.score);
  const payload = {
    ...stored,
    items,
    lastEnrichedAt: new Date().toISOString(),
    ollamaModel: config.ollamaModel,
  };
  writeStoredJobs(payload);
  return payload;
}

async function testOllama() {
  const config = readPortalConfig();
  if (!config.ollamaEnabled) return { ok: false, error: 'Ollama disabled' };
  const response = await fetch(`${config.ollamaUrl.replace(/\/$/, '')}/api/tags`);
  if (!response.ok) return { ok: false, error: `Ollama returned ${response.status}` };
  const data = await response.json();
  const models = (data.models || []).map((model) => model.name);
  return { ok: true, model: config.ollamaModel, models };
}

async function fetchRemotive(config) {
  if (!config.remotiveEnabled) return [];
  const queries = config.defaultKeywords.slice(0, 8);
  const batches = await Promise.all(queries.map(async (query) => {
    const url = `https://remotive.com/api/remote-jobs?search=${encodeURIComponent(query)}&limit=40`;
    const response = await fetch(url);
    if (!response.ok) return [];
    const data = await response.json();
    return (data.jobs || []).map((job) => normalizeRemoteJob(job, 'Remotive'));
  }));
  return batches.flat();
}

async function fetchArbeitnow(config) {
  if (!config.arbeitnowEnabled) return [];
  const response = await fetch('https://www.arbeitnow.com/api/job-board-api');
  if (!response.ok) return [];
  const data = await response.json();
  return (data.data || [])
    .map((job) => normalizeRemoteJob(job, 'Arbeitnow'))
    .map(scoreJobServer)
    .filter((job) => job.score >= config.minScore);
}

async function fetchJSearch(config) {
  if (!config.jsearchKey) return [];
  const queries = config.defaultKeywords.slice(0, 5);
  const batches = await Promise.all(queries.map(async (query) => {
    const url = `https://jsearch.p.rapidapi.com/search?query=${encodeURIComponent(`${query} ${config.defaultLocation}`)}&page=1&num_pages=1`;
    const response = await fetch(url, {
      headers: {
        'x-rapidapi-host': 'jsearch.p.rapidapi.com',
        'x-rapidapi-key': config.jsearchKey,
      },
    });
    if (!response.ok) return [];
    const data = await response.json();
    return (data.data || []).map((job) => normalizeRemoteJob(job, 'JSearch'));
  }));
  return batches.flat();
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
    if (req.method === 'GET' && req.url === '/api/jobs') return sendJson(res, 200, readStoredJobs());
    if (req.method === 'POST' && req.url === '/api/jobs/sync') return sendJson(res, 200, await syncJobs('manual'));
    if (req.method === 'POST' && req.url === '/api/jobs/enrich') return sendJson(res, 200, await enrichStoredJobs());
    if (req.method === 'GET' && req.url === '/api/ollama/test') return sendJson(res, 200, await testOllama());
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
  scheduleDailySync();
});
