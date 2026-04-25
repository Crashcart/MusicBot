'use strict';

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

const state = {
  authRequired: false,
  authenticated: false,
  logStream: null,
  logBuffer: [],
  filter: '',
};

// --- API helpers ---
async function api(path, options = {}) {
  const res = await fetch(path, {
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (res.status === 401) {
    state.authenticated = false;
    showLogin();
    throw new Error('Authentication required');
  }
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try { const j = await res.json(); if (j.error) msg = j.error; } catch {}
    throw new Error(msg);
  }
  if (res.headers.get('content-type')?.includes('application/json')) {
    return res.json();
  }
  return res.text();
}

// --- View switching ---
function showLogin() {
  $('#login-view').classList.remove('hidden');
  $('#main-view').classList.add('hidden');
}
function showMain() {
  $('#login-view').classList.add('hidden');
  $('#main-view').classList.remove('hidden');
  if (!state.authRequired) $('#auth-warning').classList.remove('hidden');
}

// --- Init ---
async function init() {
  try {
    const status = await api('/api/auth/status');
    state.authRequired = status.authRequired;
    state.authenticated = status.authenticated;
  } catch {
    state.authenticated = false;
  }

  if (state.authRequired && !state.authenticated) {
    showLogin();
  } else {
    showMain();
    await loadConfig();
    await loadLogServices();
  }
}

// --- Login ---
$('#login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const errEl = $('#login-error');
  errEl.textContent = '';
  try {
    await api('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ password: $('#password').value }),
    });
    state.authenticated = true;
    showMain();
    await loadConfig();
    await loadLogServices();
  } catch (err) {
    errEl.textContent = err.message;
  }
});

$('#logout-btn').addEventListener('click', async () => {
  try { await api('/api/auth/logout', { method: 'POST' }); } catch {}
  state.authenticated = false;
  if (state.logStream) { state.logStream.close(); state.logStream = null; }
  if (state.authRequired) showLogin(); else location.reload();
});

// --- Tabs ---
$$('.tab-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    $$('.tab-btn').forEach((b) => b.classList.toggle('active', b === btn));
    const tab = btn.dataset.tab;
    $$('.tab-panel').forEach((p) => p.classList.toggle('active', p.id === `tab-${tab}`));
  });
});

// --- Config ---
async function loadConfig() {
  try {
    const cfg = await api('/api/config');
    fillConfigForm(cfg);
  } catch (err) {
    setStatus('#config-status', err.message, 'error');
  }
}

function fillConfigForm(cfg) {
  setVal('discord.token', cfg.discord?.token || '');
  setVal('lidarr.url', cfg.lidarr?.url || '');
  setVal('lidarr.apiKey', cfg.lidarr?.apiKey || '');
  setVal('plex.clientIdentifier', cfg.plex?.clientIdentifier || '');
  setVal('plex.serverUrl', cfg.plex?.serverUrl || '');
  setVal('plex.token', cfg.plex?.token || '');
  setVal('logging.level', cfg.logging?.level || 'info');
}

function setVal(name, val) {
  const el = document.querySelector(`[name="${name}"]`);
  if (el) el.value = val;
}

$('#config-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.target;
  const update = {
    discord: { token: form['discord.token'].value },
    lidarr: { url: form['lidarr.url'].value, apiKey: form['lidarr.apiKey'].value },
    plex: {
      clientIdentifier: form['plex.clientIdentifier'].value,
      serverUrl: form['plex.serverUrl'].value || undefined,
      token: form['plex.token'].value || undefined,
    },
    logging: { level: form['logging.level'].value },
  };
  setStatus('#config-status', 'Saving…', '');
  try {
    const cfg = await api('/api/config', {
      method: 'PUT',
      body: JSON.stringify(update),
    });
    fillConfigForm(cfg);
    setStatus('#config-status', 'Saved. Restart services to apply changes.', 'success');
  } catch (err) {
    setStatus('#config-status', err.message, 'error');
  }
});

function setStatus(sel, msg, kind) {
  const el = $(sel);
  el.textContent = msg;
  el.className = 'status ' + (kind || '');
}

// --- Logs ---
async function loadLogServices() {
  try {
    const data = await api('/api/logs');
    const sel = $('#log-service');
    sel.innerHTML = '';
    if (data.services.length === 0) {
      const opt = document.createElement('option');
      opt.textContent = '(no logs yet)';
      opt.value = '';
      sel.appendChild(opt);
    } else {
      for (const s of data.services) {
        const opt = document.createElement('option');
        opt.value = s; opt.textContent = s;
        sel.appendChild(opt);
      }
      await refreshLogs();
    }
  } catch (err) {
    $('#log-output').textContent = 'Failed to list logs: ' + err.message;
  }
}

async function refreshLogs() {
  const service = $('#log-service').value;
  if (!service) return;
  const lines = parseInt($('#log-lines').value, 10) || 200;
  try {
    const data = await api(`/api/logs/${encodeURIComponent(service)}?lines=${lines}`);
    state.logBuffer = data.entries || [];
    renderLogs();
  } catch (err) {
    $('#log-output').textContent = 'Failed to load logs: ' + err.message;
  }
}

function renderLogs() {
  const out = $('#log-output');
  out.innerHTML = '';
  const filter = state.filter.toLowerCase();
  const visible = filter
    ? state.logBuffer.filter((e) => JSON.stringify(e).toLowerCase().includes(filter))
    : state.logBuffer;
  for (const entry of visible) out.appendChild(formatEntry(entry));
  out.scrollTop = out.scrollHeight;
}

function appendLog(entry) {
  state.logBuffer.push(entry);
  if (state.logBuffer.length > 5000) {
    state.logBuffer.splice(0, state.logBuffer.length - 5000);
  }
  const filter = state.filter.toLowerCase();
  if (!filter || JSON.stringify(entry).toLowerCase().includes(filter)) {
    const out = $('#log-output');
    out.appendChild(formatEntry(entry));
    out.scrollTop = out.scrollHeight;
  }
}

function formatEntry(entry) {
  const div = document.createElement('div');
  const lvl = entry.levelName || 'info';
  div.className = `log-line lvl-${lvl}`;
  const ts = entry.time ? new Date(entry.time).toISOString().slice(11, 23) : '';
  const name = entry.name || '';
  const msg = entry.msg || '';
  const { time, level, levelName, name: _n, msg: _m, v, ...extras } = entry;
  const extrasStr = Object.keys(extras).length
    ? ' ' + JSON.stringify(extras)
    : '';
  div.innerHTML =
    `<span class="ts">${escapeHtml(ts)}</span>` +
    `<span class="lvl">${escapeHtml(lvl.toUpperCase())}</span>` +
    `<span class="name">[${escapeHtml(name)}]</span>` +
    `<span class="msg">${escapeHtml(msg)}</span>` +
    (extrasStr ? `<span class="extras">${escapeHtml(extrasStr)}</span>` : '');
  return div;
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

$('#log-refresh').addEventListener('click', refreshLogs);
$('#log-service').addEventListener('change', refreshLogs);
$('#log-clear').addEventListener('click', () => {
  state.logBuffer = [];
  $('#log-output').innerHTML = '';
});
$('#log-filter').addEventListener('input', (e) => {
  state.filter = e.target.value;
  renderLogs();
});
$('#log-stream').addEventListener('change', (e) => {
  if (e.target.checked) startStream(); else stopStream();
});

function startStream() {
  const service = $('#log-service').value;
  if (!service) return;
  stopStream();
  const es = new EventSource(`/api/logs/${encodeURIComponent(service)}/stream`);
  es.addEventListener('message', (ev) => {
    try { appendLog(JSON.parse(ev.data)); } catch {}
  });
  es.addEventListener('error', () => {
    // Browser auto-reconnects; nothing else to do.
  });
  state.logStream = es;
}
function stopStream() {
  if (state.logStream) { state.logStream.close(); state.logStream = null; }
}

// --- Plex Auth ---
$('#plex-start-btn').addEventListener('click', async () => {
  const status = $('#plex-status');
  status.textContent = 'Requesting PIN…';
  status.className = 'status';
  try {
    const pin = await api('/api/auth/plex/pin', { method: 'POST' });
    window.open(pin.authUrl, '_blank', 'noopener');
    status.textContent = `Code: ${pin.code} — complete sign-in in the new tab. Polling…`;
    pollPlex(pin.pinId, status);
  } catch (err) {
    status.textContent = err.message;
    status.className = 'status error';
  }
});

async function pollPlex(pinId, statusEl) {
  for (let i = 0; i < 60; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    try {
      const res = await api(`/api/auth/plex/pin/${pinId}/status`);
      if (res.status === 'authenticated') {
        statusEl.textContent = '✓ Plex linked. Token saved to config.';
        statusEl.className = 'status success';
        await loadConfig();
        return;
      }
    } catch (err) {
      statusEl.textContent = 'Plex check failed: ' + err.message;
      statusEl.className = 'status error';
      return;
    }
  }
  statusEl.textContent = 'Timed out waiting for Plex sign-in.';
  statusEl.className = 'status error';
}

init();
