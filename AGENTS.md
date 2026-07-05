# Workflow Contract (SAW-for-opencode)

This project uses a gated, evidence-based workflow adapted from Safe-Agentic-Workflow (SAFe).
Every agent in this project MUST follow this contract. When in doubt: STOP and report, do not improvise.

## Artifacts (single source of truth is on disk, not in your memory)

- `.workflow/specs/TASK-NNN.md` — spec: user story, Acceptance Criteria (AC), Definition of Done (DoD), status
- `.workflow/qa/TASK-NNN-qa.md` — independent QA report with verdict
- `.workflow/security/TASK-NNN-sec.md` — security review report
- `.workflow/evidence/TASK-NNN.md` — evidence pack for the PR (command outputs, not claims)
- `.workflow/retro.md` — lessons learned

Spec status lifecycle (stored in spec frontmatter, only one status at a time):
`draft` → `ready` → `in-progress` → `qa` → `approved` → `done` (or `blocked` at any point)

## Hard Gates (non-negotiable)

1. **No spec → no code.** Do not write or edit product code unless a spec with status
   `ready` or `in-progress` exists and contains testable AC. If AC/DoD are missing or vague,
   STOP THE LINE: output `BLOCKED: <what is missing>` and suggest running `/spec`.
   Never invent AC yourself while implementing.
2. **Nobody approves their own work.** The implementer never writes QA/security reports.
   QA verdicts come only from `/qa` (qas agent). QA never edits product code.
3. **Evidence, not claims.** A criterion counts as met only when a QA report shows the actual
   command and its output proving it. "Should work" and "looks correct" are not evidence.
4. **Sequential gates.** `ready` → implement → `/qa` PASS → `/security-check` PASS → `/pre-pr` → PR.
   Skipping a gate is only allowed via `/quick-fix` and only within its limits.
5. **Stop-the-line authority.** ANY agent that discovers a spec contradiction, a security
   problem, or destructive risk must stop and report `BLOCKED: <reason>` instead of continuing.

## Rules for all agents

- **Search first, reuse always.** Before writing new code: grep for existing patterns,
  helpers, and similar implementations. Create new patterns only when nothing fits, and say so.
- **Atomic commits** in the format: `type(scope): description [TASK-NNN]`
  where type ∈ feat|fix|refactor|test|docs|chore. One logical change per commit.
- **Small steps.** After each meaningful change, run the narrowest relevant test/build command
  before moving on. Do not batch 10 changes and hope.
- **Do not touch** files under `.workflow/qa/` or `.workflow/security/` unless you are the
  qas/security agent. Implementers update only the `status` field and `Implementation Notes`
  section of their spec.
- **Report format.** When finishing any workflow step, end with exactly one line:
  `RESULT: <OK|BLOCKED|FAIL> — <one sentence>`.
