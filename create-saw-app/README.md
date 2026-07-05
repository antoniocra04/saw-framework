# create-saw-app

<p align="center">
  <img src="https://raw.githubusercontent.com/antoniocra04/saw-framework/main/docs/assets/logo.png" alt="Saw" width="360">
</p>

**Saw** — measure twice, cut once for AI-written code.

Scaffold or retrofit a project with the Saw quality workflow for AI-assisted development:
an [opencode](https://opencode.ai) harness (roles, quality gates, evidence-based delivery)
plus a built-in zero-dependency visual board (`npm run board`). Nothing merges ("cuts")
until it's been measured: spec verified, criteria proven, QA verdict passed.

Process design adapted from [safe-agentic-workflow](https://github.com/bybren-llc/safe-agentic-workflow)
(© ByBren, LLC / J. Scott Graham, MIT + attribution).

## New project

```bash
npx create-saw-app my-project
cd my-project
npm install
npm run board        # kanban UI; or just: opencode
```

Saw is a **workflow** framework, not a stack: the first task (`/spec`) bootstraps
whatever stack you want (Next.js, FastAPI, a Rust CLI…). The scaffolder adds the
workflow, never boilerplate.

## Existing project (any language)

```bash
cd your-project
npx create-saw-app init
```

Non-destructive and idempotent:

- `.opencode/`, `.workflow/`, `docs/` — copied, existing files never overwritten
- `AGENTS.md` — created, or the SAW contract is appended below your existing rules
- `opencode.json` — created, or missing top-level keys merged in (yours win)
- `package.json` — a `board` script (`node .saw/board.mjs`) added if absent
  (indentation preserved); the board itself is zero-dependency, nothing to install
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
