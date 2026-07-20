/*
 * Saw Board HTTP server. Serves the static UI (../ui) and the /api/* endpoints:
 *   GET  /api/state            board snapshot (specs + git)
 *   GET  /api/env              { opencode: bool, model }
 *   POST /api/run              { command, args[], model? } → start a run
 *   GET  /api/jobs             recent runs
 *   GET  /api/jobs/:id         one run + full log
 *   GET  /api/jobs/:id/stream  live SSE (backlog then new lines/status)
 *   POST /api/jobs/:id/stop    kill a run
 *   GET  /api/models           `opencode models`
 *   GET/POST /api/settings     read / write the model in opencode.json
 *
 * Binds to 127.0.0.1 only. One run at a time (see runner.mjs).
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { buildState } from './state.mjs';
import * as runner from './runner.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const UI_DIR = path.join(HERE, '..', 'ui');

const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml' };

// which slash-commands the board may invoke, and how their args are validated
const TASK_CMDS = new Set(['run-task', 'run-task-vk', 'implement', 'qa', 'security-check', 'design-check', 'pre-pr', 'start-work', 'close-task', 'end-work']);
const FREE_CMDS = new Set(['spec', 'quick-fix', 'design']); // one free-text arg (a description)
const NOARG_CMDS = new Set(['run-backlog', 'check-workflow', 'retro']);

function ensureWorkflow(root) {
  for (const d of ['specs', 'qa', 'security', 'design', 'evidence']) fs.mkdirSync(path.join(root, '.workflow', d), { recursive: true });
}

const json = (res, code, obj) => {
  res.writeHead(code, { 'content-type': 'application/json' });
  res.end(JSON.stringify(obj));
};

const readBody = (req) =>
  new Promise((resolve) => {
    let b = '';
    req.on('data', (c) => (b += c));
    req.on('end', () => {
      try {
        resolve(JSON.parse(b || '{}'));
      } catch {
        resolve({});
      }
    });
  });

function serveStatic(res, urlPath) {
  const rel = urlPath === '/' ? 'index.html' : urlPath.replace(/^\/+/, '');
  const file = path.join(UI_DIR, rel);
  if (!file.startsWith(UI_DIR) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
    res.writeHead(404, { 'content-type': 'text/plain' });
    res.end('not found');
    return;
  }
  res.writeHead(200, { 'content-type': MIME[path.extname(file)] || 'application/octet-stream' });
  res.end(fs.readFileSync(file));
}

function readModel(root) {
  try {
    return JSON.parse(fs.readFileSync(path.join(root, 'opencode.json'), 'utf8').replace(/^﻿/, '')).model || null;
  } catch {
    return null;
  }
}

function readConfig(root) {
  try {
    return JSON.parse(fs.readFileSync(path.join(root, 'opencode.json'), 'utf8').replace(/^﻿/, ''));
  } catch {
    return {};
  }
}
function writeConfig(root, cfg) {
  fs.writeFileSync(path.join(root, 'opencode.json'), JSON.stringify(cfg, null, 2) + '\n');
}
function writeModel(root, model) {
  const cfg = readConfig(root);
  cfg.model = model;
  writeConfig(root, cfg);
}
function writeProviderKey(root, id, apiKey) {
  const cfg = readConfig(root);
  cfg.provider = cfg.provider || {};
  cfg.provider[id] = cfg.provider[id] || {};
  cfg.provider[id].options = { ...(cfg.provider[id].options || {}), apiKey };
  writeConfig(root, cfg);
}

// `opencode models` takes ~1-2s (spawns the binary) — cache it so the Settings
// tab doesn't stall every time it opens.
let modelsCache = { t: 0, list: [] };
function models(root) {
  if (Date.now() - modelsCache.t < 60000 && modelsCache.list.length) return modelsCache.list;
  const bin = runner.resolveOpencode();
  if (!bin) return [];
  const r = spawnSync(bin, ['models'], { encoding: 'utf8', cwd: root });
  const list = r.status === 0 ? r.stdout.split(/\r?\n/).map((s) => s.trim()).filter(Boolean) : [];
  if (list.length) modelsCache = { t: Date.now(), list };
  return list;
}

export function start(root = process.cwd(), port = 4173) {
  ensureWorkflow(root);

  const server = http.createServer(async (req, res) => {
    const url = req.url.split('?')[0];
    const method = req.method;

    if (url === '/api/state') return json(res, 200, buildState(root));
    if (url === '/api/env') return json(res, 200, { opencode: runner.opencodeAvailable(), model: readModel(root), busy: runner.isBusy(), activeJob: runner.getActiveId() });

    if (url === '/api/run' && method === 'POST') {
      const body = await readBody(req);
      const command = String(body.command || '');
      let args = Array.isArray(body.args) ? body.args.map(String) : [];
      if (!TASK_CMDS.has(command) && !FREE_CMDS.has(command) && !NOARG_CMDS.has(command)) return json(res, 400, { error: `command not allowed: ${command}` });
      if (TASK_CMDS.has(command)) {
        if (!/^TASK-\d+$/i.test(args[0] || '')) return json(res, 400, { error: 'a valid TASK-NNN id is required' });
        args = [args[0].toUpperCase()];
      } else if (FREE_CMDS.has(command)) {
        const text = args.join(' ').trim();
        if (!text) return json(res, 400, { error: 'a description is required' });
        args = [text];
      } else {
        args = [];
      }
      const r = runner.startRun(root, command, args, body.model);
      return r.error ? json(res, r.code || 500, { error: r.error }) : json(res, 200, { id: r.id });
    }

    if (url === '/api/jobs' && method === 'GET') return json(res, 200, { busy: runner.isBusy(), jobs: runner.listJobs() });

    let m;
    if ((m = url.match(/^\/api\/jobs\/([^/]+)\/stream$/)) && method === 'GET') {
      const job = runner.getJob(m[1]);
      if (!job) return json(res, 404, { error: 'no such job' });
      res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache', connection: 'keep-alive' });
      for (const entry of job.lines) res.write(`data: ${JSON.stringify({ type: 'line', entry })}\n\n`);
      if (job.status !== 'running') res.write(`data: ${JSON.stringify({ type: 'status', status: job.status, result: job.result, exitCode: job.exitCode })}\n\n`);
      runner.subscribe(m[1], res);
      return;
    }
    if ((m = url.match(/^\/api\/jobs\/([^/]+)\/stop$/)) && method === 'POST') return json(res, 200, { stopped: runner.stopJob(m[1]) });
    if ((m = url.match(/^\/api\/jobs\/([^/]+)$/)) && method === 'GET') {
      const job = runner.getJob(m[1]);
      return job ? json(res, 200, job) : json(res, 404, { error: 'no such job' });
    }

    if (url === '/api/models' && method === 'GET') return json(res, 200, { models: models(root) });
    if (url === '/api/settings' && method === 'GET') return json(res, 200, { model: readModel(root) });
    if (url === '/api/settings' && method === 'POST') {
      const body = await readBody(req);
      if (!body.model) return json(res, 400, { error: 'model is required' });
      writeModel(root, String(body.model));
      return json(res, 200, { model: String(body.model) });
    }
    if (url === '/api/auth' && method === 'GET') {
      const bin = runner.resolveOpencode();
      if (!bin) return json(res, 200, { text: 'opencode not on PATH' });
      const r = spawnSync(bin, ['auth', 'list'], { encoding: 'utf8' });
      // strip ANSI colors and TUI box-drawing so the browser shows clean text
      const text = (r.stdout || r.stderr || '')
        .replace(/\x1b\[[0-9;]*m/g, '')
        .split(/\r?\n/)
        .map((l) => l.replace(/^[│┌└├╰╭]\s?/, '').trim())
        .filter(Boolean)
        .join('\n');
      return json(res, 200, { text: text || 'no providers configured' });
    }
    if (url === '/api/provider' && method === 'POST') {
      const body = await readBody(req);
      const id = String(body.id || '').trim().toLowerCase();
      const apiKey = String(body.apiKey || '');
      if (!/^[a-z0-9-]+$/.test(id)) return json(res, 400, { error: 'provider id must be a slug (e.g. anthropic, openai, openrouter)' });
      if (!apiKey) return json(res, 400, { error: 'API key is required' });
      writeProviderKey(root, id, apiKey);
      return json(res, 200, { ok: true, id });
    }

    serveStatic(res, url);
  });

  server.listen(port, '127.0.0.1', () => {
    console.log(`\n  \x1b[38;5;208m◢◤ Saw Board\x1b[0m  →  http://localhost:${port}`);
    console.log(`  project: ${path.basename(root)}   ${runner.opencodeAvailable() ? '' : '(opencode not on PATH — runs disabled)'}(Ctrl+C to stop)\n`);
    // warm the models cache so the Settings tab is instant on first open
    setTimeout(() => {
      try {
        models(root);
      } catch {
        /* ignore */
      }
    }, 50);
  });
  return server;
}
