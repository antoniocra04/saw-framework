#!/usr/bin/env node
/*
 * Regenerates template/ from the repository root (the canonical Saw harness).
 *
 * The repo root is the source of truth; template/ is a build artifact plus a few
 * template-only files ({{PROJECT_NAME}} package.json, README.md, gitignore) that
 * this script never touches. Runs automatically before `npm publish` (prepack),
 * so a stale template can't reach the registry. Run manually: npm run sync
 */
'use strict';

const fs = require('fs');
const path = require('path');

const pkgDir = path.join(__dirname, '..');           // create-saw-app/
const rootDir = path.join(pkgDir, '..');             // repo root (canonical harness)
const templateDir = path.join(pkgDir, 'template');

// sanity: are we actually inside the Saw repo?
for (const marker of ['AGENTS.md', 'opencode.json', '.opencode', 'docs']) {
  if (!fs.existsSync(path.join(rootDir, marker))) {
    console.error(`sync-template: repo root marker missing: ${marker} — aborting.`);
    process.exit(1);
  }
}

const rm = (p) => fs.rmSync(p, { recursive: true, force: true });
const cp = (src, dst) => fs.cpSync(src, dst, { recursive: true });

// 1. harness files: wipe and re-copy from root
for (const item of ['AGENTS.md', 'opencode.json', '.opencode', '.saw', 'docs']) {
  rm(path.join(templateDir, item));
  cp(path.join(rootDir, item), path.join(templateDir, item));
}

// Russian README ships inside template docs
cp(path.join(rootDir, 'README.ru.md'), path.join(templateDir, 'docs', 'ru', 'README.ru.md'));

// 2. .workflow: templates from root; artifact dirs recreated empty; fresh retro log.
//    (Never copy root specs/qa/security/evidence — if this repo dogfoods Saw,
//    its own tasks must not leak into scaffolded projects.)
const wfSrc = path.join(rootDir, '.workflow');
const wfDst = path.join(templateDir, '.workflow');
rm(wfDst);
fs.mkdirSync(wfDst, { recursive: true });
cp(path.join(wfSrc, 'templates'), path.join(wfDst, 'templates'));
for (const dir of ['specs', 'qa', 'security', 'evidence', 'design']) {
  fs.mkdirSync(path.join(wfDst, dir), { recursive: true });
  fs.writeFileSync(path.join(wfDst, dir, '.gitkeep'), '');
}
fs.writeFileSync(
  path.join(wfDst, 'retro.md'),
  '# Retro Log\n\n<!-- Appended by /close-task, /end-work and /retro. Newest entries on top. -->\n'
);

// 3. report
const count = (dir) => {
  let n = 0;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    n += e.isDirectory() ? count(path.join(dir, e.name)) : 1;
  }
  return n;
};
console.log(`sync-template: OK — template/ regenerated from repo root (${count(templateDir)} files).`);
