# Getting started

This guide takes you from an empty (or existing) repository to your first merged,
fully verified task. Time budget: ~10 minutes of your attention.

## Prerequisites

- **git** — required. The workflow creates branches and atomic commits.
- **[opencode](https://opencode.ai)** — required. Runs the agents and slash commands.
- **Node.js ≥ 18** — optional. Only needed for `create-saw-app` and the Vibe Kanban board.
  Python/Go/Rust/any projects work fine without npm.

## Install

**Option A — new project:**

```bash
npx create-saw-app my-project
cd my-project
```

You get: git repo with an initial commit, the full harness, Vibe Kanban as a local
devDependency (`npm run board`), and docs. No stack is imposed — your first task
bootstraps whatever you want (Next.js, FastAPI, a CLI in Rust — anything).

**Option B — existing project:**

```bash
cd your-project
npx create-saw-app init
```

Non-destructive and idempotent: existing files are never overwritten, your
`AGENTS.md` rules stay first (the Saw contract is appended below), missing keys are
merged into `opencode.json` and `package.json`, your README is untouched, nothing is
committed. Review with `git diff`, then commit.

**Option C — manual:** copy `AGENTS.md`, `opencode.json`, `.opencode/`, `.workflow/`
into the repo root.

## One-time setup

Open `.workflow/templates/spec-template.md` and replace the `<command>` placeholders
with your real commands:

```markdown
- [ ] Full test suite passes: `npm test`        ← yours here
- [ ] Linter passes: `npm run lint`             ← yours here
```

Every future spec and QA report copies these. (New project with no stack yet? Skip —
do it right after your first scaffolding task.)

## Your first task, end to end

Start opencode in the project root. Everything happens via slash commands from the
default Build agent — **you never switch agents manually**; commands route roles
automatically.

### 1. Create a spec

```
/spec Add a /health endpoint returning {status:"ok"} and the app version.
      Criteria: GET /health returns 200 with correct JSON, covered by a test.
      Out of scope: auth, other endpoints.
```

The BSA agent writes `.workflow/specs/TASK-001.md`: user story, testable acceptance
criteria, patterns to reuse, step breakdown, out-of-scope list. It ends with:

```
RESULT: OK — TASK-001 created with status ready
```

### 2. Review the spec — your most important job

Open the spec file. Check: are the criteria actually verifiable? Does out-of-scope
protect you? Any open questions? Fix by telling the agent ("remove AC3, add a
constraint: don't touch the router config") or edit the file directly. Then commit:

```bash
git add .workflow && git commit -m "docs: spec TASK-001"
```

> Ten minutes reading a spec saves hours of redone work. This is where you steer.

### 3. Run the pipeline

```
/run-task TASK-001
```

What happens autonomously: entry gate (spec ready? dependencies met? tree clean?) →
branch `task/001-...` → implementer works through the breakdown step by step with
atomic commits → **independent QA in a fresh context** runs every criterion's
verification command and pastes real output → on FAIL, the implementer gets the
failure list and retries (max 3 rounds) → security checklist over the diff →
evidence pack. It ends with:

```
RESULT: OK — TASK-001 passed all gates, branch task/001 awaits human review
```

or an honest `RESULT: BLOCKED — <reason>` telling you exactly what's stuck.

Prefer to watch each phase? Run the gates individually instead:
`/start-work` → `/implement` → `/qa` → `/security-check` → `/pre-pr`.

### 4. Review and merge — humans cut

Look at the branch (and the app itself, if the change is visible). The QA report
`.workflow/qa/TASK-001-qa.md` shows every criterion with the actual command output
that proved it. Satisfied?

```bash
git checkout main && git merge --no-ff task/001-<slug>
```

```
/close-task TASK-001
```

Status becomes `done`, a retro entry is logged, the branch is cleaned up.

### 5. Repeat

```
/spec <next thing>
```

Lost? `/check-workflow` prints every task, its status, unmet dependencies, and the
exact next command — state lives on disk, so this works even in a brand-new session.

## Next steps

- Put a cheap model on the implementer and a strong one on specs — [Model strategy](models.md)
- Run tasks in parallel on a kanban board — [Vibe Kanban](vibe-kanban.md)
- Understand what's underneath — [Core concepts](concepts.md)
- Trivial one-line fix? `/quick-fix <description>` — the honest shortcut with guardrails
