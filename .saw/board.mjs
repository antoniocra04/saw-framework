#!/usr/bin/env node
/*
 * Saw Board — local visual kanban for the Saw workflow.
 *
 * Reads .workflow/ (specs + reports) and git, renders a live board. Zero deps
 * (Node built-ins only), binds to 127.0.0.1. Phase 1 = read-only visualization;
 * the API and DOM are structured so Phase 2 can add live command execution
 * (drag-to-run, Run button) via `opencode run --command … --format json`.
 *
 * Run:  node .saw/board.mjs   (or: npm run board)
 * Port: --port N  |  SAW_BOARD_PORT  |  default 4173
 */
'use strict';

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = process.cwd();
const WF = path.join(ROOT, '.workflow');
const PORT = Number(
  process.argv.includes('--port') ? process.argv[process.argv.indexOf('--port') + 1] : process.env.SAW_BOARD_PORT || 4173
);

const COLUMNS = ['draft', 'ready', 'in-progress', 'qa', 'approved', 'done', 'blocked'];

/* ------------------------------------------------------------------ parse -- */

const read = (p) => {
  try {
    return fs.readFileSync(p, 'utf8').replace(/^﻿/, '');
  } catch {
    return null;
  }
};

/** Parse the leading --- frontmatter block. Skips # comment lines. */
function frontmatter(text) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text || '');
  const fm = {};
  if (!m) return fm;
  for (const raw of m[1].split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const kv = /^([A-Za-z0-9_]+):\s*(.*)$/.exec(line);
    if (!kv) continue;
    const key = kv[1];
    let val = kv[2].trim();
    if (val.startsWith('[') && val.endsWith(']')) {
      val = val
        .slice(1, -1)
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    }
    fm[key] = val;
  }
  return fm;
}

/** Body text of a `## Heading` section (until the next `## `). */
function section(text, heading) {
  // No `m` flag: `$` must mean end-of-string, not end-of-line, or the capture
  // truncates at the first line. Anchor the heading with (?:^|\n) instead.
  const re = new RegExp(`(?:^|\\n)##\\s+${heading}[^\\n]*\\n([\\s\\S]*?)(?=\\n##\\s|$)`, 'i');
  const m = re.exec(text || '');
  return m ? m[1] : '';
}

/** {done,total} of `- [ ]` / `- [x]` checkboxes in a chunk. */
function checkboxes(chunk) {
  const all = (chunk.match(/^\s*-\s*\[[ xX]\]/gm) || []).length;
  const done = (chunk.match(/^\s*-\s*\[[xX]\]/gm) || []).length;
  return { done, total: all };
}

/** Verdict word from a report file, or null if the report is absent. */
function verdict(file) {
  const t = read(file);
  if (t === null) return null;
  const m = /Verdict:\s*\**\s*(PASS|FAIL|PENDING)/i.exec(t);
  return m ? m[1].toUpperCase() : 'PENDING';
}

function gitInfo() {
  const run = (args) => {
    const r = spawnSync('git', args, { cwd: ROOT, encoding: 'utf8' });
    return r.status === 0 ? (r.stdout || '').trim() : null;
  };
  const branch = run(['branch', '--show-current']);
  if (branch === null) return { repo: false };
  const porcelain = run(['status', '--porcelain']) || '';
  return { repo: true, branch: branch || '(detached)', dirty: porcelain.split('\n').filter(Boolean).length };
}

/** The next command a human/board would run for a task at this status. */
function nextCommand(t) {
  switch (t.status) {
    case 'draft':
      return { label: 'Finish spec', cmd: `/spec` , human: true };
    case 'ready':
      return { label: 'Run workflow', cmd: `/run-task ${t.id}` };
    case 'in-progress':
      return { label: 'Resume', cmd: `/run-task ${t.id}` };
    case 'qa':
      return { label: 'QA', cmd: `/qa ${t.id}` };
    case 'approved':
      return t.security ? { label: 'Pre-PR', cmd: `/pre-pr ${t.id}` } : { label: 'Security', cmd: `/security-check ${t.id}` };
    case 'blocked':
      return { label: 'Review reports', cmd: `/check-workflow`, human: true };
    case 'done':
      return null;
    default:
      return { label: 'Run workflow', cmd: `/run-task ${t.id}` };
  }
}

function buildState() {
  const specsDir = path.join(WF, 'specs');
  const tasks = [];
  let files = [];
  try {
    files = fs.readdirSync(specsDir).filter((f) => /^TASK-\d+\.md$/i.test(f));
  } catch {
    /* no specs dir yet */
  }

  const doneIds = new Set();
  const rawByFile = {};
  for (const f of files) {
    const text = read(path.join(specsDir, f)) || '';
    rawByFile[f] = text;
    const fm = frontmatter(text);
    if ((fm.status || '').toLowerCase() === 'done') doneIds.add((fm.id || f.replace(/\.md$/i, '')).toUpperCase());
  }

  for (const f of files) {
    const text = rawByFile[f];
    const fm = frontmatter(text);
    const id = (fm.id || f.replace(/\.md$/i, '')).toUpperCase();
    const status = COLUMNS.includes((fm.status || '').toLowerCase()) ? fm.status.toLowerCase() : 'draft';
    const depends = Array.isArray(fm.depends) ? fm.depends : [];
    const gates = Array.isArray(fm.gates) ? fm.gates : [];
    const ac = checkboxes(section(text, 'Acceptance Criteria'));
    const unmetDeps = depends.filter((d) => !doneIds.has(String(d).toUpperCase()));

    const qa = verdict(path.join(WF, 'qa', `${id}-qa.md`));
    const security = verdict(path.join(WF, 'security', `${id}-sec.md`));
    const design = verdict(path.join(WF, 'design', `${id}-design.md`));

    // contract-consistency warnings, mirroring /check-workflow
    const warnings = [];
    if ((status === 'approved' || status === 'done') && qa !== 'PASS')
      warnings.push('status past QA but no QA PASS on record');
    if (gates.includes('design') && !fs.existsSync(path.join(WF, 'design', 'DIRECTION.md')))
      warnings.push('design gate but no DIRECTION.md — run /design');

    const t = {
      id,
      title: (fm.title || '').trim() || id,
      status,
      depends,
      unmetDeps,
      gates,
      ac,
      qa,
      security,
      design,
      startable: status === 'ready' && unmetDeps.length === 0,
      warnings,
    };
    t.next = nextCommand(t);
    tasks.push(t);
  }

  tasks.sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
  const hasDirection = fs.existsSync(path.join(WF, 'design', 'DIRECTION.md'));
  return { project: path.basename(ROOT), git: gitInfo(), hasDirection, columns: COLUMNS, tasks, ts: Date.now() };
}

/* --------------------------------------------------------------------- UI -- */

const PAGE = /* html */ `<!doctype html><html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Saw Board</title>
<style>
:root{
  --bg:#0b0c0e; --panel:#111317; --panel2:#15181d; --line:#23262d; --line2:#2c313a;
  --text:#e7e9ec; --dim:#8a919c; --faint:#5b626d;
  --accent:#ff7a1a; --ok:#39d98a; --fail:#ff5a5f; --pend:#f0b429; --info:#4aa8ff;
  --mono:ui-monospace,"SF Mono",Menlo,Consolas,monospace;
  --sans:Inter,system-ui,-apple-system,Segoe UI,Roboto,sans-serif;
}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--text);font-family:var(--sans);font-size:14px}
header{display:flex;align-items:center;gap:16px;padding:12px 18px;border-bottom:1px solid var(--line);position:sticky;top:0;background:var(--bg);z-index:5}
.brand{font-weight:700;letter-spacing:.02em;display:flex;align-items:center;gap:8px}
.brand .mark{color:var(--accent);font-family:var(--mono)}
.chip{font-family:var(--mono);font-size:12px;color:var(--dim);border:1px solid var(--line2);border-radius:6px;padding:3px 8px}
.chip.warn{color:var(--pend);border-color:#4a3f1a}
.tabs{display:flex;gap:4px;margin-left:auto}
.tab{padding:6px 12px;border-radius:7px;color:var(--dim);cursor:pointer;font-size:13px;border:1px solid transparent}
.tab.active{color:var(--text);background:var(--panel);border-color:var(--line)}
.tab.soon{opacity:.5}
main{padding:14px}
.board{display:flex;gap:12px;overflow-x:auto;padding-bottom:12px;align-items:flex-start}
.col{flex:0 0 268px;background:var(--panel);border:1px solid var(--line);border-radius:12px;min-height:120px;display:flex;flex-direction:column}
.col h2{font-size:11px;text-transform:uppercase;letter-spacing:.14em;color:var(--dim);margin:0;padding:12px 14px 8px;display:flex;justify-content:space-between;align-items:center;font-weight:600}
.col h2 .n{font-family:var(--mono);color:var(--faint)}
.col.blocked h2{color:var(--fail)}
.col.done h2{color:var(--ok)}
.cards{display:flex;flex-direction:column;gap:10px;padding:0 10px 12px;min-height:24px}
.card{background:var(--panel2);border:1px solid var(--line2);border-radius:10px;padding:11px 12px;cursor:default;transition:border-color .15s,transform .05s}
.card:hover{border-color:#3a414d}
.card .id{font-family:var(--mono);font-size:11px;color:var(--accent);letter-spacing:.03em}
.card .title{margin:5px 0 9px;line-height:1.35;font-size:13.5px}
.badges{display:flex;flex-wrap:wrap;gap:5px;margin-bottom:9px}
.b{font-family:var(--mono);font-size:10px;padding:2px 6px;border-radius:5px;border:1px solid var(--line2);color:var(--dim)}
.b.ok{color:var(--ok);border-color:#1e4634}.b.fail{color:var(--fail);border-color:#4a2326}.b.pend{color:var(--pend);border-color:#4a3f1a}
.b.dep{color:var(--info);border-color:#1e3a52}.b.gate{color:var(--dim)}
.b.startable{color:var(--accent);border-color:#4a3115}
.acbar{height:4px;background:var(--line);border-radius:3px;overflow:hidden;margin-bottom:9px}
.acbar>i{display:block;height:100%;background:var(--accent)}
.foot{display:flex;align-items:center;justify-content:space-between;gap:8px}
.cmd{font-family:var(--mono);font-size:11px;color:var(--dim);background:var(--bg);border:1px solid var(--line);border-radius:6px;padding:4px 7px;cursor:pointer;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.cmd:hover{color:var(--text);border-color:var(--line2)}
.run{font-family:var(--sans);font-size:11px;font-weight:600;color:#0b0c0e;background:var(--accent);border:none;border-radius:6px;padding:5px 10px;cursor:not-allowed;opacity:.55}
.run.human{background:var(--pend)}
.warn{margin-top:8px;font-size:11px;color:var(--pend);display:flex;gap:6px;align-items:flex-start}
.empty{color:var(--faint);font-size:12px;padding:10px 4px}
.placeholder{padding:40px;text-align:center;color:var(--dim)}
.placeholder code{font-family:var(--mono);color:var(--accent)}
.toast{position:fixed;bottom:16px;left:50%;transform:translateX(-50%);background:var(--panel);border:1px solid var(--line2);color:var(--text);padding:8px 14px;border-radius:8px;font-size:12px;opacity:0;transition:opacity .2s;pointer-events:none}
.toast.show{opacity:1}
.foot-note{padding:10px 18px;color:var(--faint);font-size:11px;font-family:var(--mono);border-top:1px solid var(--line);display:flex;gap:14px}
</style></head><body>
<header>
  <div class="brand"><span class="mark">◢◤</span> Saw Board <span id="proj" class="chip"></span></div>
  <span id="git" class="chip"></span>
  <div class="tabs">
    <div class="tab active" data-tab="board">Board</div>
    <div class="tab soon" data-tab="runs" title="Phase 2">Runs</div>
    <div class="tab soon" data-tab="settings" title="Phase 2">Settings</div>
  </div>
</header>
<main id="main"></main>
<div class="foot-note"><span id="count"></span><span>read-only · auto-refresh 2.5s · execution arrives in Phase 2</span></div>
<div class="toast" id="toast"></div>
<script>
const T=(id)=>document.getElementById(id);
let active="board";
const badge=(cls,txt)=>'<span class="b '+cls+'">'+txt+'</span>';
function vBadge(name,v){ if(v===null) return ''; const c=v==='PASS'?'ok':v==='FAIL'?'fail':'pend'; return badge(c,name+' '+v); }
function card(t){
  const pct=t.ac.total?Math.round(100*t.ac.done/t.ac.total):0;
  let b='';
  b+=vBadge('QA',t.qa); b+=vBadge('SEC',t.security);
  if(t.gates.includes('design')) b+=vBadge('DSN',t.design);
  t.gates.filter(g=>g!=='design').forEach(g=>b+=badge('gate',g));
  t.unmetDeps.forEach(d=>b+=badge('dep','⛓ '+d));
  if(t.startable) b+=badge('startable','● startable');
  const warn=(t.warnings||[]).map(w=>'<div class="warn">▲ '+w+'</div>').join('');
  const next=t.next?('<button class="run'+(t.next.human?' human':'')+'" disabled title="Live run: Phase 2">'+t.next.label+'</button>'):'';
  const cmd=t.next?'<div class="cmd" data-cmd="'+t.next.cmd+'" title="click to copy">'+t.next.cmd+'</div>':'<div class="cmd" style="opacity:.4">— done —</div>';
  return '<div class="card" data-id="'+t.id+'">'+
    '<div class="id">'+t.id+'</div>'+
    '<div class="title">'+esc(t.title)+'</div>'+
    (t.ac.total?'<div class="acbar"><i style="width:'+pct+'%"></i></div>':'')+
    '<div class="badges">'+(b||'<span class="b">'+ (t.ac.total?('AC '+t.ac.done+'/'+t.ac.total):'no AC') +'</span>')+'</div>'+
    '<div class="foot">'+cmd+next+'</div>'+warn+'</div>';
}
function esc(s){return (s||'').replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));}
function renderBoard(st){
  if(!st.tasks.length) return '<div class="placeholder">No tasks yet. Create one with <code>/spec &lt;description&gt;</code> in opencode.</div>';
  const by={}; st.columns.forEach(c=>by[c]=[]);
  st.tasks.forEach(t=>{(by[t.status]||by.draft).push(t);});
  return '<div class="board">'+st.columns.map(c=>
    '<div class="col '+c+'"><h2>'+c.replace('-',' ')+' <span class="n">'+by[c].length+'</span></h2>'+
    '<div class="cards">'+(by[c].length?by[c].map(card).join(''):'<div class="empty">—</div>')+'</div></div>'
  ).join('')+'</div>';
}
function render(st){
  T('proj').textContent=st.project;
  T('git').innerHTML = st.git.repo ? ('⎇ '+st.git.branch+(st.git.dirty?(' · <span style="color:var(--pend)">'+st.git.dirty+' uncommitted</span>'):'')) : 'no git repo';
  T('count').textContent=st.tasks.length+' tasks'+(st.hasDirection?' · design direction set':'');
  if(active==='board') T('main').innerHTML=renderBoard(st);
  else T('main').innerHTML='<div class="placeholder">The <b>'+active+'</b> tab arrives in Phase 2 —<br>live command execution, run logs, and model/provider settings.</div>';
}
async function tick(){ try{ const r=await fetch('/api/state'); render(await r.json()); }catch(e){} }
document.querySelectorAll('.tab').forEach(el=>el.onclick=()=>{
  document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
  el.classList.add('active'); active=el.dataset.tab; tick();
});
document.addEventListener('click',e=>{
  const c=e.target.closest('.cmd'); if(c&&c.dataset.cmd){navigator.clipboard.writeText(c.dataset.cmd);toast('Copied: '+c.dataset.cmd);}
});
function toast(m){const t=T('toast');t.textContent=m;t.classList.add('show');clearTimeout(t._);t._=setTimeout(()=>t.classList.remove('show'),1400);}
tick(); setInterval(tick,2500);
</script></body></html>`;

/* ----------------------------------------------------------------- server -- */

const server = http.createServer((req, res) => {
  if (req.url === '/api/state') {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify(buildState()));
    return;
  }
  if (req.url === '/' || req.url.startsWith('/?')) {
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    res.end(PAGE);
    return;
  }
  res.writeHead(404);
  res.end('not found');
});

if (!fs.existsSync(WF)) {
  console.error(`\n  Saw Board: no .workflow/ found in ${ROOT}\n  Run this from a project scaffolded with create-saw-app.\n`);
  process.exit(1);
}

server.listen(PORT, '127.0.0.1', () => {
  console.log(`\n  ◢◤ Saw Board  →  http://localhost:${PORT}\n  project: ${path.basename(ROOT)}   (Ctrl+C to stop)\n`);
});
