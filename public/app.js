const profileSkills = [
  'AI voice agents',
  'SIP',
  'VoIP',
  'Asterisk',
  'FreePBX',
  'WebRTC',
  'Vicidial',
  'Predictive dialer',
  'CPaaS',
  'WhatsApp API',
  'CRM integration',
  'Linux',
  'AWS',
  'Docker',
  'Kubernetes',
  'MySQL',
  'PostgreSQL',
  'Redis',
  'REST API',
  'WebSocket',
  'Founding engineer',
  'Infrastructure',
  'High availability',
  'Telecom',
];

const targetCompanies = [
  'Vapi AI',
  'Retell AI',
  'Bland AI',
  'Twilio',
  'Plivo',
  'Bandwidth',
  'ElevenLabs',
  'Vonage',
  'OpenAI',
  'Google Cloud',
  'AWS',
  'Microsoft Teams',
];

const strongKeywords = [
  'voice ai',
  'ai voice',
  'voice agent',
  'conversational ai',
  'sip',
  'voip',
  'asterisk',
  'freepbx',
  'webrtc',
  'rtp',
  'pjsip',
  'cpaas',
  'telecom',
  'telephony',
  'dialer',
  'vicidial',
  'ivr',
  'linux',
  'infrastructure',
  'distributed systems',
  'high availability',
  'founding engineer',
  'platform engineer',
  'cloud telephony',
  'communications api',
];

const sampleJobs = [
  {
    title: 'Founding Voice Infrastructure Engineer',
    company: 'Vapi AI',
    location: 'Remote',
    url: 'https://vapi.ai',
    source: 'Sample',
    description: 'Build SIP, WebRTC and real-time AI voice agent infrastructure for low-latency production calls. Asterisk, VoIP and distributed systems experience preferred.',
    salary: '$120K - $160K + equity',
  },
  {
    title: 'Senior VoIP Platform Engineer',
    company: 'Plivo',
    location: 'India / Remote',
    url: 'https://plivo.com',
    source: 'Sample',
    description: 'Own CPaaS voice APIs, SIP trunking, call routing, carrier integrations, Linux operations and high availability communication systems.',
    salary: '25 - 35 LPA',
  },
  {
    title: 'Conversational AI Systems Architect',
    company: 'Retell AI',
    location: 'Remote',
    url: 'https://retell.ai',
    source: 'Sample',
    description: 'Design real-time voice AI pipelines with transcription, LLM inference, TTS, WebSocket streaming and telephony integrations.',
    salary: '$100K - $145K + equity',
  },
  {
    title: 'Cloud Infrastructure Engineer',
    company: 'Datadog',
    location: 'Remote',
    url: 'https://datadoghq.com',
    source: 'Sample',
    description: 'Scale Kubernetes, observability, cloud infrastructure and incident response systems for high-volume production services.',
    salary: 'Competitive',
  },
  {
    title: 'Contact Center Solutions Engineer',
    company: 'Genesys Cloud',
    location: 'India',
    url: 'https://genesys.com',
    source: 'Sample',
    description: 'Deploy IVR, SIP, call center routing, CRM integrations and enterprise communication workflows for large customers.',
    salary: 'Market aligned',
  },
];

const state = {
  mode: 'task',
  serverConfig: null,
  jobs: [],
  saved: JSON.parse(localStorage.getItem('savedJobs') || '[]'),
};

const els = {
  apiKey: document.querySelector('#apiKey'),
  apiKeyField: document.querySelector('#apiKeyField'),
  serverStatus: document.querySelector('#serverStatus'),
  autoRunBtn: document.querySelector('#autoRunBtn'),
  aiEnrichBtn: document.querySelector('#aiEnrichBtn'),
  taskId: document.querySelector('#taskId'),
  actorId: document.querySelector('#actorId'),
  datasetId: document.querySelector('#datasetId'),
  maxItems: document.querySelector('#maxItems'),
  keywords: document.querySelector('#keywords'),
  location: document.querySelector('#location'),
  actorInput: document.querySelector('#actorInput'),
  inputJsonField: document.querySelector('#inputJsonField'),
  taskField: document.querySelector('#taskField'),
  actorField: document.querySelector('#actorField'),
  datasetField: document.querySelector('#datasetField'),
  searchForm: document.querySelector('#searchForm'),
  statusText: document.querySelector('#statusText'),
  jobList: document.querySelector('#jobList'),
  savedList: document.querySelector('#savedList'),
  minScore: document.querySelector('#minScore'),
  sourceFilter: document.querySelector('#sourceFilter'),
  totalJobs: document.querySelector('#totalJobs'),
  avgScore: document.querySelector('#avgScore'),
  savedCount: document.querySelector('#savedCount'),
};

function defaultActorInput() {
  const keywords = els.keywords.value.split(',').map((item) => item.trim()).filter(Boolean);
  const location = els.location.value;
  return {
    searchQueries: keywords.map((query) => `${query} ${location}`),
    maxItems: Number(els.maxItems.value || 50),
    datePosted: 'week',
  };
}

async function loadServerConfig() {
  try {
    const response = await fetch('/api/config');
    if (!response.ok) throw new Error('Config unavailable');
    state.serverConfig = await response.json();
    applyServerConfig();
  } catch {
    state.serverConfig = { hasApifyKey: false };
    els.serverStatus.textContent = 'Server config not found. Manual mode is available.';
    els.serverStatus.className = 'server-status warn';
  }
}

function applyServerConfig() {
  const config = state.serverConfig || {};
  if (config.defaultTaskId) els.taskId.value = config.defaultTaskId;
  if (config.defaultActorId) els.actorId.value = config.defaultActorId;
  if (config.defaultDatasetId) els.datasetId.value = config.defaultDatasetId;
  if (config.defaultMaxItems) els.maxItems.value = config.defaultMaxItems;
  if (config.defaultKeywords?.length) els.keywords.value = config.defaultKeywords.join(', ');
  if (config.defaultLocation) els.location.value = config.defaultLocation;
  els.actorInput.value = JSON.stringify(defaultActorInput(), null, 2);

  if (config.hasApifyKey) {
    els.apiKeyField.hidden = true;
    const providerNames = Object.entries(config.providers || {})
      .filter(([, active]) => active)
      .map(([name]) => name)
      .join(', ');
    els.serverStatus.textContent = `Server automation is active. Providers: ${providerNames || 'free job feeds'}.`;
    els.serverStatus.className = 'server-status ready';
  } else {
    els.apiKeyField.hidden = false;
    els.serverStatus.textContent = 'Free job feeds are active. Add optional API keys in .env for more sources.';
    els.serverStatus.className = 'server-status ready';
  }

  setMode(config.defaultMode || 'task');
}

function loadSettings() {
  const settings = JSON.parse(localStorage.getItem('portalSettings') || '{}');
  const serverManaged = state.serverConfig?.hasApifyKey
    ? ['apiKey', 'taskId', 'actorId', 'datasetId', 'maxItems', 'keywords', 'location', 'actorInput']
    : [];
  for (const [key, value] of Object.entries(settings)) {
    if (serverManaged.includes(key)) continue;
    if (els[key]) els[key].value = value;
  }
  if (!state.serverConfig?.hasApifyKey) {
    els.actorInput.value = settings.actorInput || JSON.stringify(defaultActorInput(), null, 2);
  }
}

function saveSettings() {
  const settings = {
    apiKey: state.serverConfig?.hasApifyKey ? '' : els.apiKey.value,
    taskId: els.taskId.value,
    actorId: els.actorId.value,
    datasetId: els.datasetId.value,
    maxItems: els.maxItems.value,
    keywords: els.keywords.value,
    location: els.location.value,
    actorInput: els.actorInput.value,
  };
  localStorage.setItem('portalSettings', JSON.stringify(settings));
  setStatus('Settings saved in this browser.');
}

function setMode(mode) {
  state.mode = mode;
  document.querySelectorAll('.segmented button').forEach((button) => {
    button.classList.toggle('active', button.dataset.mode === mode);
  });
  els.taskField.hidden = mode !== 'task';
  els.actorField.hidden = mode !== 'actor';
  els.datasetField.hidden = mode !== 'dataset';
  els.inputJsonField.hidden = mode !== 'actor';
}

function setStatus(message, isError = false) {
  els.statusText.textContent = message;
  els.statusText.style.color = isError ? 'var(--red)' : 'var(--muted)';
}

function textFromJob(job) {
  return [
    job.title,
    job.positionName,
    job.name,
    job.company,
    job.companyName,
    job.location,
    job.description,
    job.jobDescription,
    job.salary,
    job.employmentType,
  ].filter(Boolean).join(' ').toLowerCase();
}

function normalizeJob(item, index) {
  const title = item.title || item.positionName || item.name || item.jobTitle || 'Untitled role';
  const company = item.company || item.companyName || item.organization || item.hiringOrganization?.name || 'Unknown company';
  const location = item.location || item.jobLocation || item.address || item.place || 'Not listed';
  const url = item.url || item.jobUrl || item.link || item.applyUrl || item.applyLink || '#';
  const description = item.description || item.jobDescription || item.text || item.summary || '';
  const source = item.source || item.site || item.platform || 'Apify';
  const salary = item.salary || item.salaryRaw || item.compensation || '';

  return {
    id: item.id || item.jobId || `${company}-${title}-${index}`.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    title: String(title),
    company: String(company),
    location: String(location),
    url: String(url),
    description: String(description),
    source: String(source),
    salary: String(salary),
    ai: item.ai || null,
    raw: item,
  };
}

function scoreJob(job) {
  const haystack = textFromJob(job);
  let score = 28;
  const matched = [];

  strongKeywords.forEach((keyword) => {
    if (haystack.includes(keyword)) {
      matched.push(keyword);
      score += keyword.includes('voice') || keyword.includes('sip') || keyword.includes('voip') ? 6 : 4;
    }
  });

  profileSkills.forEach((skill) => {
    if (haystack.includes(skill.toLowerCase())) score += 2;
  });

  const companyHit = targetCompanies.find((company) => job.company.toLowerCase().includes(company.toLowerCase()));
  if (companyHit) {
    score += 16;
    matched.push(`target company: ${companyHit}`);
  }

  if (/remote|india|uae|dubai|jaipur/i.test(job.location)) score += 7;
  if (/senior|lead|staff|principal|founding|architect/i.test(job.title)) score += 8;
  if (/intern|fresh|junior|campus/i.test(haystack)) score -= 18;

  const finalScore = Math.max(0, Math.min(100, Math.round(score)));
  const reason = matched.length
    ? `Matched on ${matched.slice(0, 5).join(', ')}.`
    : 'General infrastructure match, but fewer telecom or AI voice keywords were found.';

  if (job.ai) {
    return {
      ...job,
      matched: [...new Set([...(job.matched || []), ...matched])].slice(0, 8),
      reason: job.reason || reason,
    };
  }

  return { ...job, score: finalScore, matched: [...new Set(matched)].slice(0, 8), reason };
}

function renderJob(container, job, compact = false) {
  const template = document.querySelector('#jobCardTemplate');
  const card = template.content.firstElementChild.cloneNode(true);
  card.querySelector('h3').textContent = job.title;
  card.querySelector('.score-pill').textContent = `${job.score}/100`;
  card.querySelector('.company-line').textContent = `${job.company} · ${job.location}${job.salary ? ` · ${job.salary}` : ''}`;
  card.querySelector('.reason').textContent = job.reason;

  const tags = card.querySelector('.tag-row');
  [job.source, ...job.matched.slice(0, compact ? 3 : 6)].filter(Boolean).forEach((tag) => {
    const span = document.createElement('span');
    span.className = 'tag';
    span.textContent = tag;
    tags.appendChild(span);
  });

  const apply = card.querySelector('a');
  apply.href = job.url && job.url !== '#' ? job.url : `https://www.google.com/search?q=${encodeURIComponent(`${job.company} ${job.title}`)}`;

  const aiBlock = card.querySelector('.ai-block');
  if (job.ai) {
    aiBlock.hidden = false;
    const missing = job.ai.missingSkills?.length ? `<p><b>Missing:</b> ${job.ai.missingSkills.join(', ')}</p>` : '';
    const dm = job.ai.outreachDM ? `<p><b>DM:</b> ${job.ai.outreachDM}</p>` : '';
    aiBlock.innerHTML = `
      <strong>Ollama ${job.ai.model || ''}</strong>
      <p>${job.ai.fitSummary || 'AI enrichment available.'}</p>
      ${missing}
      ${dm}
    `;
  }

  const save = card.querySelector('.save-job');
  const alreadySaved = state.saved.some((item) => item.id === job.id);
  save.textContent = alreadySaved ? 'Saved' : 'Save';
  save.disabled = alreadySaved;
  save.addEventListener('click', () => {
    state.saved = [job, ...state.saved.filter((item) => item.id !== job.id)];
    persistSaved();
    renderAll();
  });

  container.appendChild(card);
}

function renderEmpty(container, message) {
  container.innerHTML = `<div class="empty-state">${message}</div>`;
}

function renderAll() {
  const minScore = Number(els.minScore.value);
  const source = els.sourceFilter.value;
  const filtered = state.jobs
    .filter((job) => job.score >= minScore)
    .filter((job) => source === 'all' || job.source === source)
    .sort((a, b) => b.score - a.score);

  els.jobList.innerHTML = '';
  if (filtered.length) filtered.forEach((job) => renderJob(els.jobList, job));
  else renderEmpty(els.jobList, 'No jobs match the current filters. Load samples or run Apify search.');

  els.savedList.innerHTML = '';
  if (state.saved.length) state.saved.forEach((job) => renderJob(els.savedList, job, true));
  else renderEmpty(els.savedList, 'Saved jobs will appear here.');

  els.totalJobs.textContent = state.jobs.length;
  els.savedCount.textContent = state.saved.length;
  const avg = state.jobs.length ? Math.round(state.jobs.reduce((sum, job) => sum + job.score, 0) / state.jobs.length) : 0;
  els.avgScore.textContent = avg;

  const sources = ['all', ...new Set(state.jobs.map((job) => job.source))];
  const current = els.sourceFilter.value;
  els.sourceFilter.innerHTML = sources.map((item) => `<option value="${item}">${item === 'all' ? 'All sources' : item}</option>`).join('');
  els.sourceFilter.value = sources.includes(current) ? current : 'all';
}

function persistSaved() {
  localStorage.setItem('savedJobs', JSON.stringify(state.saved));
}

async function runSearch(event) {
  if (event) event.preventDefault();
  saveSettings();
  setStatus('Running Apify search. This can take a minute...');

  let endpoint = '/api/apify/run-task';
  let payload = {
    token: state.serverConfig?.hasApifyKey ? '' : els.apiKey.value,
    taskId: els.taskId.value,
    maxItems: Number(els.maxItems.value),
  };

  if (state.mode === 'actor') {
    endpoint = '/api/apify/run-actor';
    let input;
    try {
      input = JSON.parse(els.actorInput.value || '{}');
    } catch {
      setStatus('Actor input JSON is invalid.', true);
      return;
    }
    payload = {
      token: state.serverConfig?.hasApifyKey ? '' : els.apiKey.value,
      actorId: els.actorId.value,
      input,
      maxItems: Number(els.maxItems.value),
    };
  }

  if (state.mode === 'dataset') {
    endpoint = '/api/apify/dataset';
    payload = {
      token: state.serverConfig?.hasApifyKey ? '' : els.apiKey.value,
      datasetId: els.datasetId.value,
      maxItems: Number(els.maxItems.value),
    };
  }

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Apify request failed.');
    state.jobs = (data.items || []).map(normalizeJob).map(scoreJob);
    setStatus(`Loaded ${state.jobs.length} jobs from ${data.source}.`);
    renderAll();
  } catch (error) {
    setStatus(error.message, true);
  }
}

async function autoRun() {
  setStatus('Running fully automated match using server config...');
  try {
    const response = await fetch('/api/apify/auto', { method: 'POST' });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Automated Apify run failed.');
    state.jobs = (data.items || []).map(normalizeJob).map(scoreJob);
    setStatus(`Auto match loaded ${state.jobs.length} jobs from ${data.source}.`);
    renderAll();
  } catch (error) {
    setStatus(error.message, true);
  }
}

async function aiEnrich() {
  setStatus('Ollama is enriching top jobs. This can take a few minutes...');
  try {
    const response = await fetch('/api/jobs/enrich', { method: 'POST' });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Ollama enrichment failed.');
    state.jobs = (data.items || []).map(normalizeJob).map((job) => {
      const original = data.items.find((item) => item.id === job.id);
      return { ...job, ai: original?.ai || null, score: original?.score || job.score };
    });
    setStatus(`Ollama enriched top jobs with ${data.ollamaModel || 'local model'}.`);
    renderAll();
  } catch (error) {
    setStatus(error.message, true);
  }
}

async function loadStoredJobs() {
  try {
    const response = await fetch('/api/jobs');
    const data = await response.json();
    if (data.items?.length) {
      state.jobs = data.items.map(normalizeJob).map(scoreJob);
      setStatus(`Loaded ${state.jobs.length} stored jobs from last server sync.`);
      renderAll();
    }
  } catch {
    setStatus('Sample jobs loaded. Server sync is available from Auto match.');
  }
}

function exportCsv() {
  const rows = [['Score', 'Title', 'Company', 'Location', 'Salary', 'Source', 'URL', 'Reason']];
  state.jobs.sort((a, b) => b.score - a.score).forEach((job) => {
    rows.push([job.score, job.title, job.company, job.location, job.salary, job.source, job.url, job.reason]);
  });
  const csv = rows.map((row) => row.map((value) => `"${String(value || '').replaceAll('"', '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `yash-job-matches-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

async function boot() {
  document.querySelector('#skillCloud').innerHTML = profileSkills.map((skill) => `<span class="tag">${skill}</span>`).join('');
  document.querySelector('#targetCompanies').innerHTML = targetCompanies.map((company) => `<span class="company-chip">${company}</span>`).join('');
  await loadServerConfig();
  loadSettings();
  state.jobs = sampleJobs.map(normalizeJob).map(scoreJob);

  document.querySelectorAll('.segmented button').forEach((button) => {
    button.addEventListener('click', () => setMode(button.dataset.mode));
  });
  document.querySelector('#saveSettingsBtn').addEventListener('click', saveSettings);
  els.autoRunBtn.addEventListener('click', autoRun);
  els.aiEnrichBtn.addEventListener('click', aiEnrich);
  document.querySelector('#loadSampleBtn').addEventListener('click', () => {
    state.jobs = sampleJobs.map(normalizeJob).map(scoreJob);
    setStatus('Sample jobs loaded.');
    renderAll();
  });
  document.querySelector('#exportBtn').addEventListener('click', exportCsv);
  document.querySelector('#clearSavedBtn').addEventListener('click', () => {
    state.saved = [];
    persistSaved();
    renderAll();
  });
  els.searchForm.addEventListener('submit', runSearch);
  els.minScore.addEventListener('input', renderAll);
  els.sourceFilter.addEventListener('change', renderAll);
  els.keywords.addEventListener('input', () => {
    if (state.mode === 'actor') els.actorInput.value = JSON.stringify(defaultActorInput(), null, 2);
  });
  els.location.addEventListener('input', () => {
    if (state.mode === 'actor') els.actorInput.value = JSON.stringify(defaultActorInput(), null, 2);
  });

  setMode('task');
  renderAll();
  await loadStoredJobs();
}

boot();
