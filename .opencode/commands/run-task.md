---
description: Autonomous pipeline for one task - runs all gates without user input, never merges
---
Run the FULL pipeline for task $1 autonomously. Do not ask the user anything between
phases. Stop only on the stop-conditions listed below.

## Phase 0 — Entry gate (inline, same rules as /start-work)
1. Read `.workflow/specs/$1.md`. Status must be `ready` (or `in-progress` if resuming).
   AC must exist and be testable. Otherwise → `RESULT: BLOCKED — <reason>`, stop.
2. Dependency check: if the spec frontmatter lists `depends:`, every listed task's spec
   must have status `done`. Otherwise → `RESULT: BLOCKED — dependency <id> not merged`, stop.
3. `git status --porcelain` must be clean (commit .workflow files yourself if they are
   the only untracked changes). Create branch `task/<NNN>-<slug>` from the base branch
   if it does not exist yet. Set spec status to `in-progress`.

## Phase 1 — Implement
Invoke the `implementer` subagent: "Implement $1 per its spec, follow your full procedure
(pre-flight gate, one breakdown step at a time, atomic commits, narrowest test each step)."

## Phase 2 — QA (fresh context, mandatory)
Invoke the `qas` subagent: "Run independent QA for $1 per your full procedure."

## Phase 3 — Iteration loop (max 3 attempts)
- QA verdict FAIL and attempts < 3 → re-invoke `implementer` with the exact failure list
  from `.workflow/qa/$1-qa.md`, then re-run Phase 2. Count the attempt.
- QA verdict FAIL on attempt 3 → set spec status to `blocked`, output
  `RESULT: BLOCKED — QA failed 3x, needs human (or stronger model)`, stop.

## Phase 4 — Security
Invoke the `security` subagent for $1. FAIL with critical/high findings →
`RESULT: BLOCKED — security`, stop.

## Phase 5 — Evidence
Build `.workflow/evidence/$1.md` from the template (QA/security verdicts, diff stat,
test output, commits). Commit all .workflow artifacts to the task branch.

## Exit (NEVER merge)
Print a phase table (phase / attempts / verdict) and the HITL items from the spec that
a human must check visually. End with:
`RESULT: OK — $1 passed all gates, branch task/<NNN> awaits human review`

## Stop-conditions (immediate halt, no retry)
- Spec contradiction, missing AC, or unmet dependency → BLOCKED
- 3x QA fail → BLOCKED
- Security critical finding → BLOCKED
- Any destructive git operation would be required → BLOCKED
