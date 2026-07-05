# Command reference

All commands are typed in opencode from the default **Build** agent — commands route
to the right role automatically; never switch agents by hand. Every workflow command
ends with a machine-readable last line:

```
RESULT: <OK|BLOCKED|FAIL> — <one sentence>
```

## At a glance

| Command | Role | Purpose |
|---|---|---|
| `/spec <description>` | bsa | Create a spec with testable acceptance criteria |
| `/start-work TASK-N` | — | Entry gate + branch creation |
| `/implement TASK-N` | implementer | Write code strictly per the spec |
| `/qa TASK-N` | qas (subtask) | Independent verification, PASS/FAIL verdict |
| `/security-check TASK-N` | security (subtask) | Fixed checklist over the task diff |
| `/pre-pr TASK-N` | — | All-gates check, evidence pack, PR prep |
| `/end-work TASK-N` | — | Close after merge (step-by-step mode) |
| `/run-task TASK-N` | pipeline | All gates autonomously, **never merges** |
| `/run-backlog [TASK-N…]` | pipeline | Batch: gates + auto-merge per passing task |
| `/run-task-vk TASK-N` | pipeline | Vibe Kanban mode: gates only, VK owns git |
| `/close-task TASK-N` | — | Mark `done` after human merge, log retro |
| `/check-workflow` | — | Status board: tasks, deps, next commands |
| `/quick-fix <description>` | — | Guarded shortcut for trivial changes |
| `/retro [TASK-N]` | — | Mine failures, improve the harness itself |

---

## Authoring

### `/spec <description>`
BSA takes the next TASK id, does mandatory pattern discovery (grep before invent),
and fills every section of the template: user story, 3–7 testable AC, DoD, test
strategy, **out of scope**, step breakdown. Unresolved questions → status stays
`draft` and the questions are listed; otherwise `ready`.
Good input = what to build + where to look + how to verify.

## Step-by-step gates

Use these when learning the system or supervising a tricky task; `/run-task`
bundles them otherwise.

### `/start-work TASK-N`
Gate: spec exists, status `ready`, AC testable, `depends:` all `done`, tree clean.
Then branch `task/NNN-slug`, status → `in-progress`. Refuses loudly otherwise.

### `/implement TASK-N`
Implementer pre-flight (spec gate + correct branch), then the breakdown loop:
one step → reuse-first → narrowest test → atomic commit `type(scope): desc [TASK-N]`
→ tick the step. AC conflict discovered mid-work → `BLOCKED`, never silent
reinterpretation. Exit: status → `qa`.

### `/qa TASK-N`
Runs as an isolated subtask (fresh context — independence by construction).
For every AC: run the verification command, paste real output, PASS/FAIL. Plus full
suite, linter, diff-scope check. Any FAIL → verdict FAIL, status back to
`in-progress`, failures listed as expected/actual. Unlimited rejection authority.

### `/security-check TASK-N`
Fixed 7-item checklist over the task diff: secrets, injection, authz, input
validation, dependencies, error handling, path traversal. Findings are concrete
(file, line, severity, fix) or they don't count. Critical/high → FAIL, blocks the PR.

### `/pre-pr TASK-N`
Final assembly: QA PASS on record? security PASS? tree committed? commit format?
rebased on base? docs updated (invokes tech-writer if needed)? → evidence pack →
push + PR (with your confirmation). Never merges.

### `/end-work TASK-N`
Step-by-step-mode closer: verifies a human merged, status → `done`, retro entry,
branch cleanup. (Pipeline modes use `/close-task` instead.)

## Pipelines

### `/run-task TASK-N`
Entry gate → implement → QA → *(FAIL? re-implement with the failure list, max 3
rounds)* → security → evidence. Stops before merge, prints the phase table and the
HITL checklist. Stop-conditions: missing/contradictory AC, unmet dependency, 3× QA
FAIL, critical security finding — all end in an explicit `BLOCKED`.

### `/run-backlog [TASK-N…]`
No args: all `ready` tasks with satisfied deps, in id order, re-evaluated after each
merge. Per task: the `/run-task` pipeline; on OK → merge `--no-ff` (one
`git revert -m 1` rolls back a whole task), status `approved` — **not** `done`;
on BLOCKED → stop the whole batch (dependents would build on sand). Final report
accumulates every pending HITL check. Night mode: gates catch broken, only you
catch ugly — walk the HITL list before the next batch.

### `/run-task-vk TASK-N`
For a Vibe Kanban card. Same gates as `/run-task`, but: verifies it's inside a VK
worktree (refuses on the base branch), creates no branches, never merges, never
opens PRs — VK owns all git mechanics. Exit: status `approved`, "drag the card to
Review".

### `/close-task TASK-N`
Run on the base branch after a human merge. Confirms the merge actually happened,
status → `done`, retro entry (incl. QA attempt count), local branch cleanup
(skipped under VK — it cleans its own worktrees).

## Utilities

### `/check-workflow`
The dashboard and the answer to "where was I?": every task with status, unmet deps,
and its exact next command; the **Startable now** parallel set; contract-violation
warnings (e.g. `approved` with no QA report). Works in a fresh session — state is
files.

### `/quick-fix <description>`
The honest shortcut. Eligibility gate first: ≤ 2 files, no auth/payments/schema/
public-API changes, trivially verifiable. Then: inline mini-AC, `fix/` branch,
minimal change, real test output, security items 1–2 on the diff. Anything smells
bigger → `ESCALATE: needs full workflow, run /spec`.

### `/retro [TASK-N]`
Reads the retro log and recent QA/security reports, hunts repeating failure
patterns, and proposes concrete harness patches (a new checklist item, a stricter
template line) — applied after your confirmation. The workflow debugs itself.
