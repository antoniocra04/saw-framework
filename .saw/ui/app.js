/*
 * Saw Board client. Renders the board from /api/state and drives live runs:
 * Run buttons + New task POST /api/run; the Runs tab streams a job's log over SSE
 * (/api/jobs/:id/stream); the Settings tab reads/writes the model in opencode.json.
 * Plain JS, no build. Cards advance columns on their own — the agent updates the
 * spec's status: on disk and the board polls it.
 */
const $ = (id) => document.getElementById(id);
let activeTab = 'board';
let env = { opencode: true, busy: false, model: null };
let es = null; // current EventSource
let streamJobId = null;

const esc = (s) => (s || '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
const badge = (cls, txt) => `<span class="b ${cls}">${txt}</span>`;
const vBadge = (name, v) => (v === null ? '' : badge(v === 'PASS' ? 'ok' : v === 'FAIL' ? 'fail' : 'pend', `${name} ${v}`));

/* ------------------------------------------------------------------ board -- */

function parseCmd(slash) {
  const parts = (slash || '').replace(/^\//, '').split(/\s+/);
  return { command: parts[0], args: parts.slice(1) };
}

function card(t) {
  const pct = t.ac.total ? Math.round((100 * t.ac.done) / t.ac.total) : 0;
  let b = '';
  b += vBadge('QA', t.qa);
  b += vBadge('SEC', t.security);
  if (t.gates.includes('design')) b += vBadge('DSN', t.design);
  t.gates.filter((g) => g !== 'design').forEach((g) => (b += badge('', g)));
  t.unmetDeps.forEach((d) => (b += badge('dep', '⛓ ' + d)));
  if (t.startable) b += badge('startable', '● startable');
  if (!b) b += badge('', t.ac.total ? `AC ${t.ac.done}/${t.ac.total}` : 'no AC');

  const warn = (t.warnings || []).map((w) => `<div class="warn">▲ ${esc(w)}</div>`).join('');
  let run = '';
  if (t.next && !t.next.human) {
    const dis = env.busy || !env.opencode;
    run = `<button class="run${dis ? ' off' : ''}" data-run="${esc(t.next.cmd)}" ${dis ? 'disabled' : ''} title="${env.opencode ? 'Run ' + esc(t.next.cmd) : 'opencode not on PATH'}">${env.busy ? 'busy…' : t.next.label}</button>`;
  } else if (t.next && t.next.human) {
    run = `<button class="run human" data-human="1" title="Needs you">${t.next.label}</button>`;
  }
  const cmd = t.next ? `<div class="cmd" data-cmd="${esc(t.next.cmd)}" title="click to copy">${esc(t.next.cmd)}</div>` : `<div class="cmd off">— done —</div>`;

  return (
    `<div class="card" data-id="${t.id}">` +
    `<div class="id">${t.id}</div>` +
    `<div class="title">${esc(t.title)}</div>` +
    (t.ac.total ? `<div class="acbar"><i style="width:${pct}%"></i></div>` : '') +
    `<div class="badges">${b}</div>` +
    `<div class="foot">${cmd}${run}</div>${warn}</div>`
  );
}

function renderBoard(st) {
  if (!st.tasks.length) {
    return (
      `<div class="blank"><h1>No tasks yet</h1>` +
      `<p>Click <b>＋ New task</b> to describe your first task,<br>or run <code>/spec</code> in opencode.</p>` +
      `<div class="hint">${env.opencode ? 'The board can run the workflow for you — new specs appear here live.' : 'Install opencode to run tasks from the board: npm i -g opencode-ai'}</div></div>`
    );
  }
  const by = {};
  st.columns.forEach((c) => (by[c] = []));
  st.tasks.forEach((t) => (by[t.status] || by.draft).push(t));
  return (
    `<div class="board">` +
    st.columns
      .map(
        (c) =>
          `<div class="col ${c}"><h2>${c.replace('-', ' ')} <span class="n">${by[c].length}</span></h2>` +
          `<div class="cards" data-col="${c}">${by[c].length ? by[c].map(card).join('') : '<div class="empty">—</div>'}</div></div>`
      )
      .join('') +
    `</div>`
  );
}

/* -------------------------------------------------------------------- runs -- */

async function renderRuns() {
  const r = await fetch('/api/jobs').then((x) => x.json());
  const jobs = r.jobs || [];
  const list = jobs.length
    ? jobs
        .map((j) => {
          const dot = j.status === 'running' ? 'run' : j.result === 'OK' ? 'ok' : j.status === 'done' ? 'ok' : 'fail';
          return `<button class="joblink${j.id === streamJobId ? ' sel' : ''}" data-job="${j.id}"><span class="dot ${dot}"></span> /${j.command} ${(j.args || []).join(' ')} <span class="jstat">${j.result || j.status}</span></button>`;
        })
        .join('')
    : '<div class="empty" style="opacity:.5">No runs yet — hit a Run button on a card.</div>';
  $('main').innerHTML = `<div class="runs"><aside class="joblist">${list}</aside><section class="console" id="console"><div class="cline meta">Select a run, or start one from the board.</div></section></div>`;
  if (streamJobId) openStream(streamJobId);
  else if (jobs[0]) openStream(jobs[0].id);
}

function consoleLine(entry) {
  const cls = entry.stream === 'err' ? 'err' : entry.stream === 'meta' ? 'meta' : /RESULT:\s*(OK|BLOCKED|FAIL)/i.test(entry.text) ? 'result ' + (/OK/i.test(entry.text) ? 'ok' : 'fail') : '';
  return `<div class="cline ${cls}">${esc(entry.text)}</div>`;
}

function openStream(id) {
  if (es) es.close();
  streamJobId = id;
  const el = $('console');
  if (el) el.innerHTML = '';
  es = new EventSource(`/api/jobs/${id}/stream`);
  es.onmessage = (m) => {
    const ev = JSON.parse(m.data);
    const c = $('console');
    if (!c) return;
    if (ev.type === 'line') {
      c.insertAdjacentHTML('beforeend', consoleLine(ev.entry));
      c.scrollTop = c.scrollHeight;
    } else if (ev.type === 'status') {
      c.insertAdjacentHTML('beforeend', `<div class="cline meta">— run ${ev.status}${ev.result ? ' · ' + ev.result : ''} —</div>`);
      c.scrollTop = c.scrollHeight;
      if (ev.result) toast(`Run ${ev.result}`);
    }
  };
}

/* ---------------------------------------------------------------- settings -- */

async function renderSettings() {
  const [s, m] = await Promise.all([fetch('/api/settings').then((x) => x.json()), fetch('/api/models').then((x) => x.json())]);
  const models = m.models || [];
  const opts = models.length ? models.map((x) => `<option ${x === s.model ? 'selected' : ''}>${esc(x)}</option>`).join('') : `<option>${esc(s.model || '(none configured)')}</option>`;
  $('main').innerHTML =
    `<div class="settings"><h2>Settings</h2>` +
    `<label>Model <span class="hint2">written to opencode.json</span></label>` +
    `<div class="row"><select id="modelSel">${opts}</select><button id="saveModel">Save</button></div>` +
    (models.length ? '' : `<p class="hint2">Run <code>opencode models</code> availability depends on opencode being on PATH and authenticated.</p>`) +
    `<label style="margin-top:20px">Provider &amp; API key</label>` +
    `<p class="hint2">Manage credentials with <code>opencode auth login</code> in your terminal (keys aren't edited from the browser for safety). Current opencode on PATH: <b>${env.opencode ? 'yes' : 'no'}</b>.</p>` +
    `</div>`;
  $('saveModel').onclick = async () => {
    const model = $('modelSel').value;
    await fetch('/api/settings', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ model }) });
    env.model = model;
    toast('Model saved: ' + model);
  };
}

/* ----------------------------------------------------------------- driving -- */

async function runCommand(command, args) {
  if (!env.opencode) return toast('opencode is not on PATH — install it to run tasks');
  const r = await fetch('/api/run', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ command, args }) }).then((x) => x.json());
  if (r.error) return toast(r.error);
  streamJobId = r.id;
  setTab('runs');
}

function render(st) {
  $('proj').textContent = st.project;
  $('git').innerHTML = st.git.repo ? `⎇ ${esc(st.git.branch)}${st.git.dirty ? ` · <span style="color:var(--pend)">${st.git.dirty} uncommitted</span>` : ''}` : 'no git repo';
  $('count').textContent = `${st.tasks.length} tasks${st.hasDirection ? ' · design direction set' : ''}${env.busy ? ' · running…' : ''}`;
  $('newTask').disabled = env.busy || !env.opencode;
  if (activeTab === 'board') $('main').innerHTML = renderBoard(st);
}

let lastState = null;
async function tick() {
  try {
    const [st, e] = await Promise.all([fetch('/api/state').then((x) => x.json()), fetch('/api/env').then((x) => x.json())]);
    lastState = st;
    env = e;
    if (activeTab === 'board') render(st);
    else {
      $('proj').textContent = st.project;
      $('count').textContent = `${st.tasks.length} tasks${env.busy ? ' · running…' : ''}`;
    }
  } catch {
    /* server not ready */
  }
}

function setTab(tab) {
  activeTab = tab;
  document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('active', t.dataset.tab === tab));
  if (tab === 'board') render(lastState || { project: '', git: {}, tasks: [], columns: [] });
  else if (tab === 'runs') renderRuns();
  else if (tab === 'settings') renderSettings();
}

function toast(m) {
  const t = $('toast');
  t.textContent = m;
  t.classList.add('show');
  clearTimeout(t._);
  t._ = setTimeout(() => t.classList.remove('show'), 1800);
}

document.querySelectorAll('.tab').forEach((el) => el.addEventListener('click', () => setTab(el.dataset.tab)));

document.addEventListener('click', (e) => {
  const copy = e.target.closest('.cmd');
  if (copy && copy.dataset.cmd) {
    navigator.clipboard.writeText(copy.dataset.cmd);
    toast('Copied: ' + copy.dataset.cmd);
    return;
  }
  const run = e.target.closest('.run');
  if (run && run.dataset.run) {
    const { command, args } = parseCmd(run.dataset.run);
    if (confirm(`Run  ${run.dataset.run}  ?\nThis spends model tokens and may change your code.`)) runCommand(command, args);
    return;
  }
  if (run && run.dataset.human) {
    toast('This step needs you — finish the spec or review the blocker');
    return;
  }
  const job = e.target.closest('.joblink');
  if (job && job.dataset.job) {
    openStream(job.dataset.job);
    document.querySelectorAll('.joblink').forEach((j) => j.classList.toggle('sel', j === job));
  }
});

$('newTask').addEventListener('click', () => {
  const desc = prompt('Describe the task (an analyst agent will write the spec):');
  if (desc && desc.trim()) runCommand('spec', [desc.trim()]);
});

tick();
setInterval(tick, 2500);
