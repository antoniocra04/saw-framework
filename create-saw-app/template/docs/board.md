# Saw Board

A local visual kanban for the Saw workflow. It reads `.workflow/` and git and
renders your tasks as a board — the same state `/check-workflow` reports, but visual
and auto-refreshing. Zero dependencies (a single Node script), binds to
`127.0.0.1`, works offline.

```bash
npm run board          # or: node .saw/board.mjs
# → http://localhost:4173
```

Port: `--port N`, `SAW_BOARD_PORT`, default `4173`.

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

## Phase 2 (coming): live execution

The board's API and UI are built to add, next:

- **Run workflow** button per card → runs the `/run-task` pipeline headlessly via
  `opencode run --command run-task <id> --format json`, with the card advancing
  through columns automatically as the agent updates the spec's `status:`.
- **Drag a card** to a column → runs that stage.
- **Live run logs** streamed from opencode's JSON events; questions/`BLOCKED` states
  surfaced on the card with a notification, answered in place (session `--continue`).
- **Settings tab**: model, provider, and API key (via `opencode providers` +
  `opencode.json`).

Until then the board is read-only: it visualizes everything and lets you copy the
exact command to run in `opencode`.

## Why Saw ships its own board

Saw previously leaned on Vibe Kanban, which is unmaintained and distributes its binary
from a CDN that is frequently unreachable. The Saw Board removes that dependency
entirely: it's part of the harness, travels in every scaffolded project, and needs
nothing downloaded.
