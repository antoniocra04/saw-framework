# create-saw-app

<p align="center">
  <img src="https://raw.githubusercontent.com/antoniocra04/saw-framework/main/docs/assets/logo.png" alt="Saw" width="360">
</p>

**Saw** — measure twice, cut once for AI-written code.

Scaffold or retrofit a project with the Saw quality workflow for AI-assisted development:
an [opencode](https://opencode.ai) harness (roles, quality gates, evidence-based delivery)
plus a preconfigured [Vibe Kanban](https://github.com/BloopAI/vibe-kanban) board. Nothing
merges ("cuts") until it's been measured: spec verified, criteria proven, QA verdict passed.

Process design adapted from [safe-agentic-workflow](https://github.com/bybren-llc/safe-agentic-workflow)
(© ByBren, LLC / J. Scott Graham, MIT + attribution).

## New project

```bash
npx create-saw-app my-project
cd my-project
npm install
npm run board        # kanban UI; or just: opencode
```

Stack-agnostic: the first workflow task (`/spec`) bootstraps whatever stack you want —
the scaffolder installs the development *system*, not a framework.

## Existing project (any language)

```bash
cd your-project
npx create-saw-app init
```

Non-destructive and idempotent:

- `.opencode/`, `.workflow/`, `docs/` — copied, existing files never overwritten
- `AGENTS.md` — created, or the SAW contract is appended below your existing rules
- `opencode.json` — created, or missing top-level keys merged in (yours win)
- `package.json` — `board` script + `vibe-kanban` devDependency added if absent
  (indentation preserved); non-Node projects: use `npx vibe-kanban` instead
- your `README.md` is never touched (quickstart lands in `docs/SAW-QUICKSTART.md`)
- nothing is committed — review with `git diff`

## What you get

- 6 role agents with separated permissions: bsa, architect, implementer, qas, security, tech-writer
- 14 commands: step-by-step (`/spec` → `/start-work` → `/implement` → `/qa` → `/security-check` → `/pre-pr`),
  autonomous pipelines (`/run-task`, `/run-backlog`), Vibe Kanban mode (`/run-task-vk`, `/close-task`),
  service (`/check-workflow`, `/quick-fix`, `/retro`)
- Hard gates: no spec → no code; nobody approves their own work; evidence, not claims;
  humans merge
- Docs: getting started, core concepts, full command reference, model strategy,
  Vibe Kanban guide, FAQ — in `docs/` (English, with Russian versions in `docs/ru/`)

## License

MIT. Workflow concept attribution: ByBren, LLC — Words To Film By™.
