/*
 * Job runner — spawns `opencode run --command …` for the current project and
 * streams its output. One job at a time (agents share a git branch, so runs are
 * serialized). No shell: args are passed as an array, so free-text descriptions
 * (e.g. for /spec) can never be a shell-injection vector.
 *
 * Detects completion via our own `RESULT: OK|BLOCKED|FAIL` convention that every
 * Saw command prints as its last line — no dependency on opencode's event schema.
 */
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

let opencodeBin;
/**
 * Absolute path to a DIRECTLY-spawnable opencode binary (cached), or null.
 * Node refuses to spawn .cmd/.bat without a shell, and a shell is unsafe for the
 * free-text /spec description — so we resolve the real .exe (or unix binary),
 * never the npm .cmd shim. `SAW_OPENCODE_BIN` overrides everything.
 */
export function resolveOpencode() {
  if (opencodeBin !== undefined) return opencodeBin;
  if (process.env.SAW_OPENCODE_BIN) return (opencodeBin = process.env.SAW_OPENCODE_BIN);

  const finder = process.platform === 'win32' ? 'where' : 'which';
  const r = spawnSync(finder, ['opencode'], { encoding: 'utf8' });
  const cands = r.status === 0 ? r.stdout.split(/\r?\n/).map((s) => s.trim()).filter(Boolean) : [];

  let bin = null;
  // 1) a directly-spawnable entry: .exe on Windows; a non-shim file on unix
  for (const c of cands) {
    if (process.platform === 'win32') {
      if (c.toLowerCase().endsWith('.exe')) { bin = c; break; }
    } else if (!c.endsWith('.cmd') && !c.endsWith('.ps1')) {
      bin = c;
      break;
    }
  }
  // 2) npm shim → the real binary lives under node_modules/opencode-ai/bin
  if (!bin) {
    for (const c of cands) {
      for (const exe of ['opencode.exe', 'opencode']) {
        const guess = path.join(path.dirname(c), 'node_modules', 'opencode-ai', 'bin', exe);
        if (fs.existsSync(guess)) { bin = guess; break; }
      }
      if (bin) break;
    }
  }
  opencodeBin = bin;
  return opencodeBin;
}

const jobs = new Map(); // id -> job
const subs = new Map(); // id -> Set(res)
let activeId = null;
let seq = 0;

const RESULT_RE = /RESULT:\s*(OK|BLOCKED|FAIL)/i;

export const isBusy = () => activeId !== null;
export const getActiveId = () => activeId;
export const listJobs = () => [...jobs.values()].map(summary).reverse();
export const getJob = (id) => jobs.get(id) || null;

export function startRun(root, command, args, model) {
  if (activeId) return { error: 'A run is already in progress — wait for it to finish or stop it.', code: 409 };
  const bin = resolveOpencode();
  if (!bin) return { error: 'opencode is not on PATH. Install it: npm i -g opencode-ai', code: 500 };

  const id = 'job' + ++seq;
  const argv = ['run', '--command', command, ...args, '--auto'];
  if (model) argv.push('--model', model);

  const job = { id, command, args, model: model || null, status: 'running', startedAt: Date.now(), endedAt: null, exitCode: null, result: null, lines: [], lastLineAt: Date.now() };
  jobs.set(id, job);
  activeId = id;

  const record = (text, stream) => {
    // strip ANSI colors so the browser console shows clean text
    const clean = text.replace(/\x1b\[[0-9;]*m/g, '');
    const entry = { t: Date.now(), stream, text: clean };
    job.lines.push(entry);
    job.lastLineAt = Date.now();
    if (job.lines.length > 5000) job.lines.shift();
    const m = RESULT_RE.exec(clean);
    if (m) job.result = m[1].toUpperCase();
    emit(id, { type: 'line', entry });
  };
  const pump = (chunk, stream) => {
    for (const line of chunk.toString().split(/\r?\n/)) if (line !== '') record(line, stream);
  };

  let child;
  try {
    // stdin: 'ignore' — if opencode tries to ask something interactively it gets
    // EOF and fails fast with an error we can show, instead of hanging forever.
    child = spawn(bin, argv, { cwd: root, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (e) {
    job.status = 'failed';
    activeId = null;
    record('failed to start opencode: ' + e.message, 'err');
    emit(id, { type: 'status', status: 'failed', result: null });
    return { id };
  }
  job.child = child;
  record(`$ opencode ${argv.join(' ')}`, 'meta');

  child.stdout.on('data', (c) => pump(c, 'out'));
  child.stderr.on('data', (c) => pump(c, 'err'));
  child.on('error', (e) => record('process error: ' + e.message, 'err'));

  // watchdog: silence for 60s usually means opencode is stuck on something
  // interactive (model/provider selection, auth). Tell the user what to check.
  let warned = false;
  const watchdog = setInterval(() => {
    if (job.status !== 'running') return clearInterval(watchdog);
    const quiet = Date.now() - job.lastLineAt;
    if (quiet > 60000 && !warned) {
      warned = true;
      record('… no output for 60s. The agent may be waiting for a model/provider/auth. Check Settings (model set? key added?), or press Stop and run "opencode" in the terminal once to complete setup.', 'meta');
    }
  }, 10000);

  child.on('close', (code) => {
    clearInterval(watchdog);
    job.status = job.result === 'BLOCKED' || job.result === 'FAIL' ? 'failed' : code === 0 ? 'done' : 'failed';
    job.exitCode = code;
    job.endedAt = Date.now();
    job.child = null;
    activeId = null;
    if (code === 0 && !job.result) record('run ended without a RESULT line — likely an opencode-level error above (auth/model/config).', 'meta');
    emit(id, { type: 'status', status: job.status, exitCode: code, result: job.result });
  });

  return { id };
}

export function stopJob(id) {
  const j = jobs.get(id);
  if (j && j.child) {
    j.child.kill();
    return true;
  }
  return false;
}

export function subscribe(id, res) {
  if (!subs.has(id)) subs.set(id, new Set());
  subs.get(id).add(res);
  res.on('close', () => subs.get(id)?.delete(res));
}

function emit(id, ev) {
  const set = subs.get(id);
  if (set) for (const res of set) res.write(`data: ${JSON.stringify(ev)}\n\n`);
}

function summary(j) {
  return { id: j.id, command: j.command, args: j.args, status: j.status, startedAt: j.startedAt, endedAt: j.endedAt, result: j.result, exitCode: j.exitCode, lineCount: j.lines.length };
}

/** Does opencode exist? For the UI to show a helpful hint. */
export const opencodeAvailable = () => resolveOpencode() !== null;
