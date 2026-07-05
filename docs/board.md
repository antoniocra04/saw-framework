# Saw Board

A local visual kanban for the Saw workflow. It reads `.workflow/` and git and
renders your tasks as a board — the same state `/check-workflow` reports, but visual
and auto-refreshing. Zero dependencies (a single Node script), binds to
`127.0.0.1`, works offline.

```bash
npm run board          # or: node .saw/board.mjs
# → http://localhost:4173
```

Port: `--port N`, `SAW_BOARD_PORT`, default `4173`. The board **always opens**, even
in a brand-new project with no tasks — it creates `.workflow/` if missing and shows an
empty board ready for your first spec.

## File layout (edit these freely)

The board is plain, dependency-free Node + HTML/CSS/JS — no build step, no bundle:

```
.saw/
├── board.mjs            entry point (starts the server)
├── server/
│   ├── server.mjs       HTTP server + routes
│   └── state.mjs        reads .workflow/ → board state (edit parsing here)
└── ui/
    ├── index.html       markup
    ├── styles.css       theme + layout (the :root vars up top are the theme)
    └── app.js           client rendering
```

Change the look in `ui/styles.css`, the columns/parsing in `server/state.mjs`, the
markup in `ui/index.html`. Refresh the browser — no rebuild.

## What it shows

- **Columns** by lifecycle: `draft → ready → in-progress → qa → approved → done`,
  plus a `blocked` lane.
- **Cards** with: task id + title, acceptance-criteria progress bar, gate verdict
  badges (`QA`, `SEC`, and `DSN` for design-gated tasks), unmet dependencies
  (`⛓ TASK-x`), a `● startable` marker when a `ready` task's deps are all met, and
  the next command to run (click to copy).
- **Contract warnings** on a card when state is inconsistent (e.g. `approved` with no
  QA PASS on record, or a `design`-gated task with no `DIRECTION.md`).
- **Git chip**: current branch and uncommitted-file count.

State lives in files, so the board is always accurate and survives restarts — it's a
view over `.workflow/`, never a second source of truth.

## Live execution

The board runs the workflow for you — no terminal needed (requires `opencode` on PATH):

- **Run button** on each card runs its next step via `opencode run --command …`
  (a `ready` card runs the whole `/run-task` pipeline; a `qa` card runs `/qa`, etc.).
  The card then advances through columns on its own as the agent updates the spec's
  `status:` on disk.
- **＋ New task** asks for a description and runs `/spec` — the analyst agent writes
  the spec, which appears on the board.
- **Runs tab** streams the live log of a run over SSE, with a list of past runs and
  their `OK` / `BLOCKED` / `FAIL` result. If a run ends `BLOCKED` (e.g. a missing
  Design Direction, or unmet dependency), you fix it and re-run.
- **Settings tab** lists the models `opencode` knows and writes your choice to
  `opencode.json`. API keys stay in `opencode auth login` — never edited from the browser.

Runs are serialized (one at a time — agents share a git branch) and each asks for
confirmation first, since a run spends tokens and can change code. Every run is a real
`opencode` process; completion is detected from Saw's own `RESULT:` line, so the board
doesn't depend on opencode's internal event format.

**Still manual (roadmap):** dragging a card between columns to trigger a stage, and
answering an agent's mid-run question in place. For now a `BLOCKED` result tells you
exactly what's needed; you resolve it and hit Run again.

## Why Saw ships its own board

Saw previously leaned on Vibe Kanban, which is unmaintained and distributes its binary
from a CDN that is frequently unreachable. The Saw Board removes that dependency
entirely: it's part of the harness, travels in every scaffolded project, and needs
nothing downloaded.
