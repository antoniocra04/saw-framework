---
description: Vibe Kanban mode - run quality gates only, VK owns the worktree/branch/PR/merge
---
Run the quality pipeline for task $1, adapted for Vibe Kanban.

IMPORTANT — ownership split in this mode:
- Vibe Kanban already put you in an isolated git worktree on a task branch.
  DO NOT create branches, DO NOT switch branches, DO NOT merge, DO NOT open PRs.
  Those are VK's job. You only run the gates and commit into the current branch.

## Phase 0 — Entry gate (no branch creation)
1. Verify you are NOT on the base branch (main/master/dev):
   !`git branch --show-current`
   If you are on the base branch → `RESULT: BLOCKED — no VK worktree, run from a VK task card`, stop.
2. Read `.workflow/specs/$1.md`. Status must be `ready` (or `in-progress` if resuming);
   AC must exist and be testable. Otherwise → `RESULT: BLOCKED — <reason>`, stop.
3. Dependency check: if the spec frontmatter lists `depends:`, every listed task's spec
   must have status `done` (i.e. merged to base). Otherwise →
   `RESULT: BLOCKED — dependency <id> not merged`, stop.
4. Set spec status to `in-progress`.

## Phase 1 — Implement
Invoke the `implementer` subagent: "Implement $1 per its spec, follow your full procedure
(pre-flight gate, one breakdown step at a time, atomic commits, narrowest test each step)."
Commits go into the current branch only.

## Phase 2 — QA (fresh context, mandatory)
Invoke the `qas` subagent: "Run independent QA for $1 per your full procedure."

## Phase 3 — Iteration loop (max 3 attempts)
- QA verdict FAIL and attempts < 3 → re-invoke `implementer` with the exact failure list
  from `.workflow/qa/$1-qa.md`, then re-run Phase 2. Count the attempt.
- QA verdict FAIL on attempt 3 → set spec status to `blocked`, output
  `RESULT: BLOCKED — QA failed 3x, needs human (or stronger model)`, stop.

## Phase 3.5 — Specialist gates (only the ones the spec opts into)
Read the spec's `gates:` frontmatter list. If empty → skip this phase entirely.
For each tag, run its gate per the registry in AGENTS.md. Currently defined:
- `design` → invoke the `designer` subagent: "Run the design review for $1 (REVIEW mode)."
  - FAIL and attempts < 2 → re-invoke `implementer` with the findings from
    `.workflow/design/$1-design.md` (styling-level fixes only, then re-run the full
    test suite), then re-run the design review. Count the attempt.
  - FAIL on attempt 2 → set spec status `blocked`,
    `RESULT: BLOCKED — design failed 2x, needs human art direction`, stop.

## Phase 4 — Security
Invoke the `security` subagent for $1. FAIL with critical/high findings →
`RESULT: BLOCKED — security`, stop.

## Phase 5 — Evidence + handoff
Build `.workflow/evidence/$1.md` from the template (QA/security verdicts, diff stat,
test output, commits). Commit all `.workflow` artifacts into the current branch.
Set spec status to `approved` (NOT `done` — a human moves it to done via /close-task
after visual review and merge).

## Exit (NEVER merge)
Print a phase table (phase / attempts / verdict) and the spec's HITL visual-check items,
then end with:
`RESULT: OK — $1 passed gates, drag the VK card to Review (check diff + browser preview)`

## Stop-conditions (immediate halt, no retry)
- On base branch / no worktree → BLOCKED
- Spec contradiction, missing AC, or unmet dependency → BLOCKED
- 3x QA fail → BLOCKED
- Security critical finding → BLOCKED
- Any destructive git operation would be required → BLOCKED
