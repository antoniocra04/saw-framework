#!/usr/bin/env node
/*
 * create-saw-app — SAW quality workflow for AI development
 * (opencode harness with roles/gates + Vibe Kanban board).
 *
 * Usage:
 *   npx create-saw-app <project-name>   scaffold a new project
 *   npx create-saw-app init             add the workflow to the current project
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const VK_VERSION = '^0.1.44';
const TEMPLATE_DIR = path.join(__dirname, '..', 'template');

function fail(msg) {
  console.error(`\n  ✖ ${msg}\n`);
  process.exit(1);
}

function usage(code) {
  console.log(`
  Usage:
    npx create-saw-app <project-name>   scaffold a new project with the SAW workflow
    npx create-saw-app init             add the SAW workflow to the current project
`);
  process.exit(code);
}

/** Read a text file tolerating a UTF-8 BOM (common on Windows). */
function readText(p) {
  return fs.readFileSync(p, 'utf8').replace(/^\uFEFF/, '');
}

function git(cwd, ...args) {
  const r = spawnSync('git', args, { cwd, stdio: 'pipe' });
  return r.status === 0;
}

/** Recursively copy srcDir into dstDir, never overwriting existing files. */
function copySkipExisting(srcDir, dstDir, report, prefix = '') {
  fs.mkdirSync(dstDir, { recursive: true });
  for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
    const src = path.join(srcDir, entry.name);
    const dst = path.join(dstDir, entry.name);
    const rel = prefix + entry.name;
    if (entry.isDirectory()) {
      copySkipExisting(src, dst, report, rel + '/');
    } else if (fs.existsSync(dst)) {
      report.skipped.push(rel);
    } else {
      fs.copyFileSync(src, dst);
      report.created.push(rel);
    }
  }
}

/* ---------------------------------------------------------------- scaffold */

function scaffold(rawName) {
  const name = rawName.trim();
  if (!/^[a-zA-Z0-9][a-zA-Z0-9-_.]*$/.test(name)) {
    fail(`Invalid project name "${name}". Use letters, digits, "-", "_", "."`);
  }
  const target = path.resolve(process.cwd(), name);
  if (fs.existsSync(target) && fs.readdirSync(target).length > 0) {
    fail(`Directory "${name}" already exists and is not empty. To add the workflow to an existing project, run "create-saw-app init" inside it.`);
  }

  console.log(`\n  Creating ${name} ...`);
  fs.cpSync(TEMPLATE_DIR, target, { recursive: true });

  // npm strips .gitignore from published packages — template ships it as "gitignore"
  const gi = path.join(target, 'gitignore');
  if (fs.existsSync(gi)) fs.renameSync(gi, path.join(target, '.gitignore'));

  for (const rel of ['package.json', 'README.md']) {
    const p = path.join(target, rel);
    if (!fs.existsSync(p)) continue;
    fs.writeFileSync(p, fs.readFileSync(p, 'utf8').split('{{PROJECT_NAME}}').join(name));
  }

  let gitOk = false;
  if (git(target, 'init', '-b', 'main') || git(target, 'init')) {
    gitOk = git(target, 'add', '-A') && git(target, 'commit', '-m', 'chore: scaffold SAW workflow project');
  }
  if (!gitOk) {
    console.log('  ⚠ git init/commit failed — run "git init && git add -A && git commit" manually (git is required by the workflow).');
  }

  console.log(`
  ✔ Done. Project created at ${target}

  Next steps:

    cd ${name}
    npm install          # installs Vibe Kanban locally
    npm run board        # kanban board UI (first run: pick OPENCODE as executor)

  Or work from the terminal without the board:

    opencode             # then: /spec <describe your first task>

  Docs: docs/getting-started.md · docs/vibe-kanban.md · docs/faq.md
`);
}

/* -------------------------------------------------------------------- init */

function initProject() {
  const target = process.cwd();
  const report = { created: [], skipped: [], merged: [], notes: [] };
  console.log(`\n  Adding SAW workflow to ${target} ...\n`);

  // 1. git is required by the workflow
  if (!fs.existsSync(path.join(target, '.git'))) {
    if (git(target, 'init', '-b', 'main') || git(target, 'init')) {
      report.notes.push('initialized a git repository (the workflow requires git)');
    } else {
      report.notes.push('⚠ no git repository and "git init" failed — the workflow requires git');
    }
  }

  // 2. harness directories — copy, never overwrite
  for (const dir of ['.opencode', '.workflow', 'docs']) {
    copySkipExisting(path.join(TEMPLATE_DIR, dir), path.join(target, dir), report, dir + '/');
  }

  // 3. AGENTS.md — create, or append the contract if the file already exists
  const agentsDst = path.join(target, 'AGENTS.md');
  const agentsTpl = readText(path.join(TEMPLATE_DIR, 'AGENTS.md'));
  const marker = '# Workflow Contract (SAW-for-opencode)';
  if (!fs.existsSync(agentsDst)) {
    fs.writeFileSync(agentsDst, agentsTpl);
    report.created.push('AGENTS.md');
  } else if (readText(agentsDst).includes(marker)) {
    report.skipped.push('AGENTS.md (contract already present)');
  } else {
    fs.appendFileSync(agentsDst, '\n\n---\n\n' + agentsTpl);
    report.merged.push('AGENTS.md (SAW contract appended after your existing rules)');
  }

  // 4. opencode.json — create, or merge only missing top-level keys
  const ocDst = path.join(target, 'opencode.json');
  const ocTpl = JSON.parse(readText(path.join(TEMPLATE_DIR, 'opencode.json')));
  if (!fs.existsSync(ocDst)) {
    fs.writeFileSync(ocDst, JSON.stringify(ocTpl, null, 2) + '\n');
    report.created.push('opencode.json');
  } else {
    try {
      const existing = JSON.parse(readText(ocDst));
      const added = [];
      for (const key of Object.keys(ocTpl)) {
        if (!(key in existing)) {
          existing[key] = ocTpl[key];
          added.push(key);
        }
      }
      if (added.length > 0) {
        fs.writeFileSync(ocDst, JSON.stringify(existing, null, 2) + '\n');
        report.merged.push(`opencode.json (added: ${added.join(', ')})`);
      } else {
        report.skipped.push('opencode.json (all keys present — compare "permission" with the template manually)');
      }
    } catch {
      fs.writeFileSync(path.join(target, 'opencode.saw.json'), JSON.stringify(ocTpl, null, 2) + '\n');
      report.notes.push('⚠ could not parse your opencode.json — wrote opencode.saw.json, merge it manually');
    }
  }

  // 5. quickstart — as a doc, never touching the project README
  const qsDst = path.join(target, 'docs', 'SAW-QUICKSTART.md');
  if (!fs.existsSync(qsDst)) {
    const qs = readText(path.join(TEMPLATE_DIR, 'README.md'))
      .split('{{PROJECT_NAME}}').join(path.basename(target));
    fs.writeFileSync(qsDst, qs);
    report.created.push('docs/SAW-QUICKSTART.md');
  }

  // 6. package.json — add board script + vibe-kanban devDep (Node projects only)
  const pkgPath = path.join(target, 'package.json');
  let hasNpm = false;
  if (fs.existsSync(pkgPath)) {
    try {
      const raw = readText(pkgPath);
      const pkg = JSON.parse(raw);
      const added = [];
      pkg.scripts = pkg.scripts || {};
      if (!pkg.scripts.board) { pkg.scripts.board = 'vibe-kanban'; added.push('scripts.board'); }
      pkg.devDependencies = pkg.devDependencies || {};
      if (!pkg.devDependencies['vibe-kanban']) { pkg.devDependencies['vibe-kanban'] = VK_VERSION; added.push('devDependencies.vibe-kanban'); }
      if (added.length > 0) {
        const indent = /\n(\s+)"/.exec(raw) ? /\n(\s+)"/.exec(raw)[1] : '  ';
        fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, indent) + '\n');
        report.merged.push(`package.json (added: ${added.join(', ')})`);
      } else {
        report.skipped.push('package.json (board script and vibe-kanban already present)');
      }
      hasNpm = true;
    } catch {
      report.notes.push('⚠ could not parse package.json — add "board": "vibe-kanban" and the vibe-kanban devDependency manually');
    }
  } else {
    report.notes.push(`no package.json (non-Node project) — run the board with: npx vibe-kanban@${VK_VERSION.replace('^', '')}`);
  }

  // 7. report
  const list = (arr) => arr.map((x) => `    ${x}`).join('\n');
  if (report.created.length) console.log(`  Created:\n${list(report.created)}\n`);
  if (report.merged.length) console.log(`  Merged:\n${list(report.merged)}\n`);
  if (report.skipped.length) console.log(`  Skipped (already exist):\n${list(report.skipped)}\n`);
  for (const n of report.notes) console.log(`  ${n}`);

  console.log(`
  ✔ SAW workflow installed. Nothing was committed — review with "git diff" / "git status".

  Next steps:

    1. Fill your real test/lint commands into .workflow/templates/spec-template.md
       (replace the <command> placeholders).${hasNpm ? '\n    2. npm install && npm run board   # or work from the terminal: opencode' : '\n    2. opencode                        # terminal mode; board: npx vibe-kanban'}
    3. First task: /spec <describe a small task>   then /run-task TASK-001

  Docs: docs/getting-started.md · docs/vibe-kanban.md · docs/SAW-QUICKSTART.md
`);
}

/* -------------------------------------------------------------------- main */

if (!fs.existsSync(TEMPLATE_DIR)) fail('Template directory missing — broken installation.');

const arg = process.argv[2];
if (!arg) usage(1);
if (arg === '--help' || arg === '-h') usage(0);
if (arg === 'init') {
  initProject();
} else {
  scaffold(arg);
}
