#!/usr/bin/env node
/*
 * create-saw-app — Saw: measure twice, cut once for AI-written code.
 *
 * Usage:
 *   npx create-saw-app [name]     scaffold a new project (prompts if name omitted)
 *   npx create-saw-app init       add the Saw workflow to the current project
 *
 * Flags: --yes/-y (accept defaults, no prompts) · --no-git · --no-install · --help/-h
 *
 * Zero runtime dependencies by design — keeps `npx` instant and install-free.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { spawnSync } = require('child_process');

const TEMPLATE_DIR = path.join(__dirname, '..', 'template');

/* --------------------------------------------------------------- pretty --- */

const useColor = process.stdout.isTTY && !process.env.NO_COLOR;
const paint = (code, s) => (useColor ? `\x1b[${code}m${s}\x1b[0m` : s);
const c = {
  bold: (s) => paint('1', s),
  dim: (s) => paint('2', s),
  red: (s) => paint('31', s),
  green: (s) => paint('32', s),
  yellow: (s) => paint('33', s),
  cyan: (s) => paint('36', s),
  orange: (s) => paint('38;5;208', s),
};
const ok = c.green('✔');
const warn = c.yellow('▲');
const bad = c.red('✖');

function banner() {
  console.log();
  console.log('  ' + c.orange(c.bold('◢◤ Saw')) + c.dim('  — measure twice, cut once for AI-written code'));
  console.log();
}

function fail(msg) {
  console.error(`\n  ${bad} ${msg}\n`);
  process.exit(1);
}

function usage(code) {
  console.log(`
  ${c.bold('create-saw-app')} — scaffold or retrofit the Saw quality workflow

  ${c.bold('Usage')}
    npx create-saw-app ${c.cyan('[name]')}     create a new project (asks for a name if omitted)
    npx create-saw-app ${c.cyan('init')}       add Saw to the project in the current folder

  ${c.bold('Options')}
    -y, --yes         accept all defaults, no questions (for CI)
        --no-git      don't run git init / initial commit
        --no-install  don't offer to install dependencies
    -h, --help        show this help
`);
  process.exit(code);
}

/* --------------------------------------------------------------- prompts -- */

let INTERACTIVE = process.stdin.isTTY && process.stdout.isTTY;

function prompt(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(question, (ans) => {
      rl.close();
      resolve(ans);
    });
  });
}

async function ask(question, def) {
  if (!INTERACTIVE) return def;
  const suffix = def ? c.dim(`(${def}) `) : '';
  const ans = (await prompt(`  ${c.cyan('?')} ${question} ${suffix}`)).trim();
  return ans || def;
}

async function confirm(question, def = true) {
  if (!INTERACTIVE) return def;
  const hint = def ? c.dim('(Y/n)') : c.dim('(y/N)');
  const ans = (await prompt(`  ${c.cyan('?')} ${question} ${hint} `)).trim().toLowerCase();
  if (!ans) return def;
  return ans === 'y' || ans === 'yes';
}

/* --------------------------------------------------------------- system --- */

// These helpers use `shell: true` with a constant command STRING (never an args
// array), which both resolves .cmd shims on Windows and avoids the DEP0190
// warning. No user-controlled data is ever interpolated into these strings —
// the project directory is passed via `cwd`, not spliced into the command.

/** Run a constant command line inheriting stdio (installs the user should see). */
function run(cmdline, cwd) {
  const r = spawnSync(cmdline, { stdio: 'inherit', shell: true, cwd });
  return r.status === 0;
}

/** First line of `<cmd> <arg>`, or null if the tool is missing. */
function toolVersion(cmd, arg = '--version') {
  try {
    const r = spawnSync(`${cmd} ${arg}`, { stdio: 'pipe', shell: true });
    if (r.status !== 0) return null;
    return (r.stdout ? r.stdout.toString() : '').trim().split('\n')[0] || '(installed)';
  } catch {
    return null;
  }
}

function git(cwd, ...args) {
  const r = spawnSync('git', args, { cwd, stdio: 'pipe' });
  return r.status === 0;
}

/**
 * Environment doctor: prints a checklist and returns capability flags.
 * Offers to install what's safely installable (opencode via npm).
 */
async function doctor(flags) {
  console.log('  ' + c.bold('Checking your environment'));

  const nodeMajor = parseInt(process.versions.node.split('.')[0], 10);
  const nodeOk = nodeMajor >= 18;
  console.log(`    ${nodeOk ? ok : bad} Node.js ${process.versions.node}` + (nodeOk ? '' : c.red('  — need ≥ 18')));

  const gitV = toolVersion('git');
  console.log(`    ${gitV ? ok : bad} git ${gitV ? c.dim(gitV.replace('git version ', '')) : c.red('— not found')}`);

  const npmV = toolVersion('npm', '-v');
  console.log(`    ${npmV ? ok : warn} npm ${npmV ? c.dim(npmV) : c.yellow('— not found (needed only for the board)')}`);

  let opencodeV = toolVersion('opencode');
  console.log(`    ${opencodeV ? ok : warn} opencode ${opencodeV ? c.dim(opencodeV) : c.yellow('— not found')}`);

  console.log();
  const env = { nodeOk, git: !!gitV, npm: !!npmV, opencode: !!opencodeV };

  // git is required — hard stop guidance, but we don't try to auto-install a system pkg
  if (!env.git) {
    console.log(`  ${warn} git is required by the workflow. Install it: ${c.cyan('https://git-scm.com/downloads')}`);
  }

  // opencode runs the agents — offer to install it via npm (safe, reversible)
  if (!env.opencode) {
    if (!env.npm) {
      console.log(`  ${warn} opencode runs the agents. Install it: ${c.cyan('https://opencode.ai/docs')}`);
    } else if (!flags.noInstall && (await confirm('opencode is not installed. Install it now (npm i -g opencode-ai)?', true))) {
      console.log();
      const done = run('npm install -g opencode-ai');
      console.log();
      if (done && toolVersion('opencode')) {
        console.log(`  ${ok} opencode installed.\n`);
        env.opencode = true;
      } else {
        console.log(`  ${warn} Couldn't install automatically. Try manually: ${c.cyan('npm i -g opencode-ai')}\n`);
      }
    } else {
      console.log(`  ${c.dim('Skipped. Later: npm i -g opencode-ai   (or https://opencode.ai/docs)')}\n`);
    }
  }

  return env;
}

/* ---------------------------------------------------------------- shared -- */

/** Read a text file tolerating a UTF-8 BOM (common on Windows). */
function readText(p) {
  return fs.readFileSync(p, 'utf8').replace(/^\uFEFF/, '');
}

/* -------------------------------------------------------------- scaffold -- */

function isValidName(name) {
  return /^[a-zA-Z0-9][a-zA-Z0-9-_.]*$/.test(name);
}

async function scaffold(rawName, flags) {
  const env = await doctor(flags);

  // resolve project name (prompt if missing/invalid)
  let name = (rawName || '').trim();
  while (true) {
    if (!name) name = await ask('Project name?', 'my-saw-app');
    if (!isValidName(name)) {
      if (!INTERACTIVE) fail(`Invalid project name "${name}". Use letters, digits, "-", "_", "."`);
      console.log(`  ${bad} "${name}" — use letters, digits, "-", "_", "." only.`);
      name = '';
      continue;
    }
    const target = path.resolve(process.cwd(), name);
    if (fs.existsSync(target) && fs.readdirSync(target).length > 0) {
      if (!INTERACTIVE) fail(`Directory "${name}" already exists and is not empty. Use "create-saw-app init" inside it instead.`);
      console.log(`  ${bad} "${name}" already exists and isn't empty. Pick another name.`);
      name = '';
      continue;
    }
    break;
  }

  const target = path.resolve(process.cwd(), name);
  const doGit = !flags.noGit && env.git && (await confirm('Initialize a git repository with an initial commit?', true));

  console.log(`\n  Creating ${c.bold(name)} …`);
  fs.cpSync(TEMPLATE_DIR, target, { recursive: true });

  // npm strips .gitignore from published packages — template ships it as "gitignore"
  const gi = path.join(target, 'gitignore');
  if (fs.existsSync(gi)) fs.renameSync(gi, path.join(target, '.gitignore'));

  for (const rel of ['package.json', 'README.md']) {
    const p = path.join(target, rel);
    if (fs.existsSync(p)) fs.writeFileSync(p, readText(p).split('{{PROJECT_NAME}}').join(name));
  }
  console.log(`  ${ok} Files created.`);

  if (doGit) {
    const gitDone =
      (git(target, 'init', '-b', 'main') || git(target, 'init')) &&
      git(target, 'add', '-A') &&
      git(target, 'commit', '-m', 'chore: scaffold Saw workflow project');
    console.log(gitDone ? `  ${ok} Git repository initialized.` : `  ${warn} git init failed — do it manually later.`);
  }

  // final report
  console.log(`\n  ${c.green(c.bold('Done!'))} Your project is ready at ${c.cyan(name)}\n`);
  console.log('  ' + c.bold('Next steps'));
  console.log(`    ${c.dim('$')} cd ${name}`);
  console.log(`    ${c.dim('$')} opencode             ${c.dim('# then:  /spec  describe your first task')}`);
  console.log(`    ${c.dim('$')} npm run board        ${c.dim('# open the visual Saw board (no install needed)')}`);
  console.log();
  console.log(`  ${c.dim('Docs: docs/getting-started.md · docs/concepts.md · docs/faq.md')}`);
  console.log();
}

/* ------------------------------------------------------------------ init -- */

async function initProject(flags) {
  const env = await doctor(flags);
  const target = process.cwd();

  if (INTERACTIVE && !(await confirm(`Add the Saw workflow to ${c.bold(path.basename(target))}?`, true))) {
    console.log(`  ${c.dim('Cancelled.')}\n`);
    return;
  }

  const report = { created: [], skipped: [], merged: [], notes: [] };
  console.log(`\n  Adding the Saw workflow to ${target} …\n`);

  // 1. git is required by the workflow
  if (!fs.existsSync(path.join(target, '.git'))) {
    if (!flags.noGit && env.git && (git(target, 'init', '-b', 'main') || git(target, 'init'))) {
      report.notes.push('initialized a git repository (the workflow requires git)');
    } else {
      report.notes.push(`${warn} no git repository — the workflow requires git; run "git init" here`);
    }
  }

  // 2. harness directories — copy, never overwrite
  for (const dir of ['.opencode', '.workflow', '.saw', 'docs']) {
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
    report.merged.push('AGENTS.md (Saw contract appended after your existing rules)');
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
      report.notes.push(`${warn} could not parse your opencode.json — wrote opencode.saw.json, merge it manually`);
    }
  }

  // 5. quickstart — as a doc, never touching the project README
  const qsDst = path.join(target, 'docs', 'SAW-QUICKSTART.md');
  if (!fs.existsSync(qsDst)) {
    const qs = readText(path.join(TEMPLATE_DIR, 'README.md')).split('{{PROJECT_NAME}}').join(path.basename(target));
    fs.writeFileSync(qsDst, qs);
    report.created.push('docs/SAW-QUICKSTART.md');
  }

  // 6. package.json — wire the built-in board script (Node projects only).
  //    The board itself is a zero-dep .saw/board.mjs, so there is no dependency to add.
  const pkgPath = path.join(target, 'package.json');
  if (fs.existsSync(pkgPath)) {
    try {
      const raw = readText(pkgPath);
      const pkg = JSON.parse(raw);
      pkg.scripts = pkg.scripts || {};
      if (!pkg.scripts.board) {
        pkg.scripts.board = 'node .saw/board.mjs';
        const indent = /\n(\s+)"/.exec(raw) ? /\n(\s+)"/.exec(raw)[1] : '  ';
        fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, indent) + '\n');
        report.merged.push('package.json (added: scripts.board)');
      } else {
        report.skipped.push('package.json (board script already present)');
      }
    } catch {
      report.notes.push(`${warn} could not parse package.json — add "board": "node .saw/board.mjs" to scripts manually`);
    }
  } else {
    report.notes.push('no package.json (non-Node project) — run the board with: node .saw/board.mjs');
  }

  // 7. report
  const list = (arr) => arr.map((x) => `      ${x}`).join('\n');
  if (report.created.length) console.log(`  Created:\n${list(report.created)}\n`);
  if (report.merged.length) console.log(`  Merged:\n${list(report.merged)}\n`);
  if (report.skipped.length) console.log(`  Skipped (already exist):\n${list(report.skipped)}\n`);
  for (const n of report.notes) console.log(`  ${n}`);

  console.log(`\n  ${c.green(c.bold('Done!'))} Saw installed. Nothing was committed — review with ${c.cyan('git diff')}.\n`);
  console.log('  ' + c.bold('Next steps'));
  console.log(`    1. Put your real test/lint commands into .workflow/templates/spec-template.md`);
  console.log(`       ${c.dim('(replace the <command> placeholders)')}`);
  console.log(`    2. ${c.dim('$')} opencode  →  /spec describe a small task  →  /run-task TASK-001`);
  console.log(`    3. ${c.dim('$')} npm run board  ${c.dim('(or: node .saw/board.mjs)  — the visual Saw board')}`);
  console.log(`\n  ${c.dim('Docs: docs/getting-started.md · docs/board.md · docs/SAW-QUICKSTART.md')}\n`);
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

/* ------------------------------------------------------------------ main -- */

async function main() {
  if (!fs.existsSync(TEMPLATE_DIR)) fail('Template directory missing — broken installation.');

  const argv = process.argv.slice(2);
  const flags = {
    yes: argv.includes('--yes') || argv.includes('-y'),
    noGit: argv.includes('--no-git'),
    noInstall: argv.includes('--no-install'),
    help: argv.includes('--help') || argv.includes('-h'),
  };
  if (flags.yes) INTERACTIVE = false;
  const positional = argv.filter((a) => !a.startsWith('-'));

  if (flags.help) usage(0);

  banner();
  if (positional[0] === 'init') {
    await initProject(flags);
  } else {
    await scaffold(positional[0], flags);
  }
}

main().catch((e) => fail(e && e.message ? e.message : String(e)));
