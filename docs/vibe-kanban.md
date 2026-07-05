# Vibe Kanban integration

[Vibe Kanban](https://github.com/BloopAI/vibe-kanban) is the optional orchestration
layer on top of Saw: a kanban board, an isolated git worktree per task, parallel
execution, diff review with inline comments, a preview browser, and PR creation.
Discipline (gates, roles, evidence) stays in the harness — which ships inside your
repo, so **every worktree VK creates automatically contains the full workflow**.
That's the whole trick; there is no glue code.

[Русская версия →](ru/vibe-kanban.md)

## Ownership split — the one rule that matters

| What | Owner |
|---|---|
| Worktrees, branches, PRs, merges | **Vibe Kanban** |
| Specs, QA/security gates, evidence, statuses | **Saw** (`/run-task-vk`) |
| Spec approval, visual review, merge decision | **Human** |

Inside VK cards use **only `/run-task-vk`** — it runs gates without touching git
mechanics. `/run-task` and `/run-backlog` are for terminal use; running them inside
VK would fight the board for branch ownership.

## Setup

```bash
npx vibe-kanban        # pin the version — the project is community-maintained
```

1. Add your project (the repo containing the harness).
2. Executor: **OPENCODE** (`~/.local/share/vibe-kanban/config.json` → `executor_profile`).
3. Project setup script: your dependency install command (e.g. `npm ci`) so every
   fresh worktree builds and QA can run tests.

Scaffolded projects also get VK as a local devDependency: `npm run board`.

## Model profiles (`~/.local/share/vibe-kanban/profiles.json`)

Two executor variants — strong for hard tasks, cheap for routine:

```json
{
  "executors": {
    "OPENCODE": {
      "strong": { "base_command_override": "opencode run --model anthropic/claude-sonnet-5" },
      "cheap":  { "base_command_override": "opencode run --model anthropic/claude-haiku-4-5-20251001" }
    }
  }
}
```

Pick the variant when starting a card. Rule of thumb: 3D/shaders/concurrency/
architecture → strong; layout-from-spec, tests, docs → cheap.
See [Model strategy](models.md).

## Two card types

**SPEC card** — creating the contract:

```
/spec <task description with criteria and out-of-scope>
```

Output is a spec file in the card's branch — **you review the spec as a diff right
in VK**, send corrections as comments to the agent. Merging the spec card = spec
approved.

**BUILD card** — executing it:

```
/run-task-vk TASK-NNN
```

The agent runs all gates inside the card (implement → QA up to 3 rounds → security
→ evidence) and stops at status `approved`, merging nothing.

## Card flow

```
Todo → In Progress   (gates run inside the card automatically)
     → Review        (you: diff + preview browser + the HITL checklist from the spec)
     → PR / merge    (one click in VK)
     → on the base branch: /close-task TASK-NNN   (status done, retro logged)
```

## Parallelism

Declare ordering in spec frontmatter — `depends: [TASK-005]` — and the
`/run-task-vk` entry gate refuses to start until dependencies are `done`. Which
tasks are safe to launch right now → `/check-workflow`, section **"Startable now"**.

Recommended: independent cheap tasks in parallel freely; hard tasks one at a time,
with a preview-browser look before each merge.

## If VK goes away

Saw is fully functional without it: `/run-task` and `/run-backlog` from the
terminal. Any other UI (OpenChamber, OpenGUI) drives the same commands — the
discipline layer doesn't know or care what's clicking the buttons.
