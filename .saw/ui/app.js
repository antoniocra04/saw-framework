/*
 * Saw Board client. Polls /api/state and renders the board. Plain JS, no build.
 * Phase 2 will POST to /api/run from the Run buttons and stream logs — the
 * handlers are stubbed with clear TODOs below.
 */
const $ = (id) => document.getElementById(id);
let activeTab = 'board';

const esc = (s) => (s || '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
const badge = (cls, txt) => `<span class="b ${cls}">${txt}</span>`;
const vBadge = (name, v) => (v === null ? '' : badge(v === 'PASS' ? 'ok' : v === 'FAIL' ? 'fail' : 'pend', `${name} ${v}`));

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
  const run = t.next
    ? `<button class="run${t.next.human ? ' human' : ''}" data-run="${t.id}" disabled title="Live run: Phase 2">${t.next.label}</button>`
    : '';
  const cmd = t.next
    ? `<div class="cmd" data-cmd="${esc(t.next.cmd)}" title="click to copy">${esc(t.next.cmd)}</div>`
    : `<div class="cmd" style="opacity:.4">— done —</div>`;

  return (
    `<div class="card" data-id="${t.id}" draggable="true">` +
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
      `<div class="blank">` +
      `<h1>No tasks yet</h1>` +
      `<p>Create your first task with the <b>＋ New task</b> button above,<br>or in opencode: <code>/spec describe the task</code></p>` +
      `<div class="hint">The board is live — new specs appear here automatically.</div>` +
      `</div>`
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

function render(st) {
  $('proj').textContent = st.project;
  $('git').innerHTML = st.git.repo
    ? `⎇ ${esc(st.git.branch)}${st.git.dirty ? ` · <span style="color:var(--pend)">${st.git.dirty} uncommitted</span>` : ''}`
    : 'no git repo';
  $('count').textContent = `${st.tasks.length} tasks${st.hasDirection ? ' · design direction set' : ''}`;

  if (activeTab === 'board') $('main').innerHTML = renderBoard(st);
  else
    $('main').innerHTML =
      `<div class="placeholder">The <b>${activeTab}</b> tab arrives in Phase 2 —<br>live command execution, run logs, and model / provider / key settings.</div>`;
}

async function tick() {
  try {
    const r = await fetch('/api/state');
    render(await r.json());
  } catch (e) {
    /* server not ready */
  }
}

function toast(m) {
  const t = $('toast');
  t.textContent = m;
  t.classList.add('show');
  clearTimeout(t._);
  t._ = setTimeout(() => t.classList.remove('show'), 1500);
}

// tabs
document.querySelectorAll('.tab').forEach((el) =>
  el.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach((t) => t.classList.remove('active'));
    el.classList.add('active');
    activeTab = el.dataset.tab;
    tick();
  })
);

// copy command chips
document.addEventListener('click', (e) => {
  const c = e.target.closest('.cmd');
  if (c && c.dataset.cmd) {
    navigator.clipboard.writeText(c.dataset.cmd);
    toast('Copied: ' + c.dataset.cmd);
  }
});

// ＋ New task  (Phase 2: opens a form that runs /spec via opencode)
$('newTask').addEventListener('click', () => {
  toast('New task runs /spec — arrives in Phase 2 (live execution)');
  // TODO Phase 2: prompt for a description, POST /api/run { command:'spec', args }
});

// TODO Phase 2: drag a card to a column → POST /api/run the stage for that transition;
//               Run button → POST /api/run { command:'run-task', id }; stream logs via SSE.

tick();
setInterval(tick, 2500);
