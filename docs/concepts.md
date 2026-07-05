# Core concepts

## The three layers

| Layer | Owner | Responsibility |
|---|---|---|
| **Discipline** | Saw harness (files in your repo) | Specs, gates, role permissions, evidence, statuses |
| **Orchestration** | opencode terminal, or Vibe Kanban | Running agents, worktrees, diff review, PRs |
| **Judgment** | Human | Approving specs, visual/HITL review, merging |

The layers are independent: swap the orchestration UI freely; the discipline travels
with the repo (every clone and worktree gets it automatically).

## Artifacts — state lives on disk

```
.workflow/
├── specs/TASK-001.md          the contract: story, AC, DoD, breakdown, status
├── qa/TASK-001-qa.md          QA report: per-criterion evidence, verdict
├── security/TASK-001-sec.md   security checklist results
├── evidence/TASK-001.md       evidence pack for the PR / human reviewer
├── templates/                 templates the agents copy from
└── retro.md                   lessons learned, appended over time
```

Nothing important exists only in an agent's memory. Any session can die at any
moment; `/check-workflow` reconstructs the full picture from files.

## Task lifecycle

```
draft ──▶ ready ──▶ in-progress ──▶ qa ──▶ approved ──▶ done
                        ▲            │
                        └────────────┘  QA FAIL sends it back
              (blocked — reachable from anywhere, requires a human)
```

The status is one line in the spec's frontmatter — the single source of truth.
Kanban columns, if you use them, are a *visualization* of this, never the master copy.

## The hard gates

1. **No spec → no code.** Implementation requires a spec with testable acceptance
   criteria in status `ready`/`in-progress`. Agents never invent AC mid-flight.
2. **Nobody approves their own work.** Verdicts come only from the QA agent; the
   implementer physically cannot write to `.workflow/qa/`.
3. **Evidence, not claims.** A criterion is met when the QA report contains the
   actual command and its actual output. "Should work" = FAIL.
4. **Gates are sequential.** implement → QA PASS → security PASS → PR. The only
   sanctioned bypass is `/quick-fix`, within its strict limits.
5. **Stop-the-line.** Any agent that finds a spec contradiction, security problem,
   or destructive risk must halt with `BLOCKED: <reason>` — continuing is a
   contract violation.
6. **Humans merge.** (`/run-backlog` may auto-merge gate-passed tasks, but marking a
   task `done` still requires a human via `/close-task`.)

## Roles

| Agent | Does | Cannot | Key permission |
|---|---|---|---|
| `bsa` | Turns requests into specs with testable AC | Write product code | edit: only `.workflow/` |
| `architect` | Reviews specs and diffs for design fit | Implement anything | read-only + `.workflow/` |
| `implementer` | The **only** role that writes product code | Approve own work, alter AC | edit: everything **except** `.workflow/qa|security|evidence` |
| `qas` | Verifies every criterion with real commands | Fix code, soften the bar | edit: only `.workflow/qa/` |
| `security` | Fixed 7-item checklist over the diff | Edit anything but its report | edit: only `.workflow/security/` |
| `tech-writer` | Updates docs to match the actual diff | Touch product code | edit: only `*.md` / `docs/` |

Boundaries are **opencode permissions**, not prompt requests. A weak model can't be
talked out of a rule it has no filesystem rights to break.

## The evidence principle

Bad (what agents do by default):

> ✅ All acceptance criteria verified. Tests pass. Ready to ship!

Good (what the QA gate requires):

```markdown
### AC1: GET /health returns 200 with {"status":"ok"}
- Status: PASS
- Command: `curl -s -o /dev/null -w "%{http_code}" localhost:3000/health`
- Output:
    200
```

The difference is falsifiability. The first can be hallucinated; the second can be
checked by anyone, including a human reviewer three weeks later.

## Dependencies and parallelism

Specs declare ordering in frontmatter:

```yaml
depends: [TASK-004, TASK-005]   # must be `done` (merged) before this task starts
```

Every entry gate checks this, which makes parallel execution safe: run independent
tasks simultaneously (separate Vibe Kanban cards / worktrees), while dependent ones
wait. `/check-workflow` prints the "Startable now" set.

## Why this works for weak models

- **Small steps**: the spec's breakdown means the model handles one bounded step at
  a time — planning (hard) is separated from typing (easy).
- **Fresh-context review**: QA can't be biased by the implementer's reasoning it
  never saw. Agreeableness — the weak model's worst trait — has nothing to agree with.
- **Procedural verification**: "run command, paste output, compare" requires
  discipline, not intelligence. The template supplies the discipline.
- **Bounded failure**: 3 QA rounds max, then `BLOCKED` — a drifting model is
  contained, not compounded. Two blocked runs on the same task class = signal to
  switch that role to a stronger model ([Model strategy](models.md)).
