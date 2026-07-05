/*
 * Reads the Saw workflow state from disk (.workflow/ + git) and returns a plain
 * object the UI renders. Pure data layer — no HTTP, no DOM. Edit the parsing
 * rules here if your spec format changes.
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

export const COLUMNS = ['draft', 'ready', 'in-progress', 'qa', 'approved', 'done', 'blocked'];

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
    let val = kv[2].trim();
    if (val.startsWith('[') && val.endsWith(']')) {
      val = val.slice(1, -1).split(',').map((s) => s.trim()).filter(Boolean);
    }
    fm[kv[1]] = val;
  }
  return fm;
}

/** Body of a `## Heading` section (until the next `## `). */
function section(text, heading) {
  const re = new RegExp(`(?:^|\\n)##\\s+${heading}[^\\n]*\\n([\\s\\S]*?)(?=\\n##\\s|$)`, 'i');
  const m = re.exec(text || '');
  return m ? m[1] : '';
}

/** {done,total} of `- [ ]` / `- [x]` checkboxes in a chunk. */
function checkboxes(chunk) {
  return {
    total: (chunk.match(/^\s*-\s*\[[ xX]\]/gm) || []).length,
    done: (chunk.match(/^\s*-\s*\[[xX]\]/gm) || []).length,
  };
}

/** Verdict word from a report file, or null if the report is absent. */
function verdict(file) {
  const t = read(file);
  if (t === null) return null;
  const m = /Verdict:\s*\**\s*(PASS|FAIL|PENDING)/i.exec(t);
  return m ? m[1].toUpperCase() : 'PENDING';
}

function gitInfo(root) {
  const run = (args) => {
    const r = spawnSync('git', args, { cwd: root, encoding: 'utf8' });
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
      return { label: 'Finish spec', cmd: '/spec', human: true };
    case 'ready':
      return { label: 'Run workflow', cmd: `/run-task ${t.id}` };
    case 'in-progress':
      return { label: 'Resume', cmd: `/run-task ${t.id}` };
    case 'qa':
      return { label: 'QA', cmd: `/qa ${t.id}` };
    case 'approved':
      return t.security ? { label: 'Pre-PR', cmd: `/pre-pr ${t.id}` } : { label: 'Security', cmd: `/security-check ${t.id}` };
    case 'blocked':
      return { label: 'Review', cmd: '/check-workflow', human: true };
    case 'done':
      return null;
    default:
      return { label: 'Run workflow', cmd: `/run-task ${t.id}` };
  }
}

export function buildState(root) {
  const WF = path.join(root, '.workflow');
  const specsDir = path.join(WF, 'specs');
  let files = [];
  try {
    files = fs.readdirSync(specsDir).filter((f) => /^TASK-\d+\.md$/i.test(f));
  } catch {
    /* no specs dir yet — empty board */
  }

  const raw = {};
  const doneIds = new Set();
  for (const f of files) {
    raw[f] = read(path.join(specsDir, f)) || '';
    const fm = frontmatter(raw[f]);
    if ((fm.status || '').toLowerCase() === 'done') doneIds.add((fm.id || f.replace(/\.md$/i, '')).toUpperCase());
  }

  const tasks = files.map((f) => {
    const text = raw[f];
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

    const warnings = [];
    if ((status === 'approved' || status === 'done') && qa !== 'PASS') warnings.push('past QA but no QA PASS on record');
    if (gates.includes('design') && !fs.existsSync(path.join(WF, 'design', 'DIRECTION.md'))) warnings.push('design gate but no DIRECTION.md — run /design');

    const t = { id, title: (fm.title || '').trim() || id, status, depends, unmetDeps, gates, ac, qa, security, design };
    t.startable = status === 'ready' && unmetDeps.length === 0;
    t.warnings = warnings;
    t.next = nextCommand(t);
    return t;
  });

  tasks.sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
  return {
    project: path.basename(root),
    git: gitInfo(root),
    hasWorkflow: fs.existsSync(WF),
    hasDirection: fs.existsSync(path.join(WF, 'design', 'DIRECTION.md')),
    columns: COLUMNS,
    tasks,
    ts: Date.now(),
  };
}
