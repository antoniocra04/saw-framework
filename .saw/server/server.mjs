/*
 * Saw Board HTTP server. Serves the static UI (../ui) and the /api/* endpoints.
 * Zero dependencies. Always starts and shows the interface — even in a brand-new
 * project with no tasks yet (it ensures .workflow/ exists so specs can be created).
 *
 * Phase 2 will add POST /api/run (spawn `opencode run --command …`) and an SSE
 * log stream here — the routing table below is where those endpoints plug in.
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildState } from './state.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const UI_DIR = path.join(HERE, '..', 'ui');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
};

/** Ensure the workflow folders exist so a fresh project can receive specs. */
function ensureWorkflow(root) {
  for (const d of ['specs', 'qa', 'security', 'design', 'evidence']) {
    fs.mkdirSync(path.join(root, '.workflow', d), { recursive: true });
  }
}

function serveStatic(res, urlPath) {
  const rel = urlPath === '/' ? 'index.html' : urlPath.replace(/^\/+/, '');
  const file = path.join(UI_DIR, rel);
  // keep serving sandboxed to the ui/ dir
  if (!file.startsWith(UI_DIR) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
    res.writeHead(404, { 'content-type': 'text/plain' });
    res.end('not found');
    return;
  }
  res.writeHead(200, { 'content-type': MIME[path.extname(file)] || 'application/octet-stream' });
  res.end(fs.readFileSync(file));
}

export function start(root = process.cwd(), port = 4173) {
  ensureWorkflow(root);

  const server = http.createServer((req, res) => {
    const url = req.url.split('?')[0];
    if (url === '/api/state') {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify(buildState(root)));
      return;
    }
    // Phase 2 endpoints (POST /api/run, /api/jobs/:id/stream) slot in here.
    serveStatic(res, url);
  });

  server.listen(port, '127.0.0.1', () => {
    console.log(`\n  \x1b[38;5;208m◢◤ Saw Board\x1b[0m  →  http://localhost:${port}`);
    console.log(`  project: ${path.basename(root)}   (Ctrl+C to stop)\n`);
  });
  return server;
}
