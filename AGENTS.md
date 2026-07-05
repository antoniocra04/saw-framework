# Workflow Contract (SAW-for-opencode)

This project uses a gated, evidence-based workflow adapted from Safe-Agentic-Workflow (SAFe).
Every agent in this project MUST follow this contract. When in doubt: STOP and report, do not improvise.

## Artifacts (single source of truth is on disk, not in your memory)

- `.workflow/specs/TASK-NNN.md` — spec: user story, Acceptance Criteria (AC), Definition of Done (DoD), status
- `.workflow/qa/TASK-NNN-qa.md` — independent QA report with verdict
- `.workflow/security/TASK-NNN-sec.md` — security review report
- `.workflow/design/DIRECTION.md` — the visual contract (tokens, type, ban list); `TASK-NNN-design.md` — design review reports
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
6. **Specialist gates are opt-in per task.** Core gates (QA, security) always run.
   Extra gates run ONLY if the spec's `gates:` list names them (chosen by the BSA at
   spec time, overridable by a human). A backend task has `gates: []` and invokes no
   specialist role. See the gate registry below.

## Gate registry (specialist gates)

QA and security are core and always run — they are NOT in this table. Everything here
is optional and activates only when listed in a spec's `gates:` frontmatter field.

| tag | trigger (BSA adds it when…) | precondition | gate |
|-----|------------------------------|--------------|------|
| `design` | the task touches anything the user sees (pages, components, styles, emails) | `.workflow/design/DIRECTION.md` exists | `designer` agent review (`/design-check`), between QA and security; UI code must use only the direction's tokens/fonts/signature elements |

To add a future specialist gate: create its agent + `/x-check` command, add a row here
(tag, trigger, precondition, what it checks), and the `/run-task*` pipelines will run it
automatically for any spec that lists the tag — no pipeline change needed.

## Rules for all agents

- **Search first, reuse always.** Before writing new code: grep for existing patterns,
  helpers, and similar implementations. Create new patterns only when nothing fits, and say so.
- **Atomic commits** in the format: `type(scope): description [TASK-NNN]`
  where type ∈ feat|fix|refactor|test|docs|chore. One logical change per commit.
- **Small steps.** After each meaningful change, run the narrowest relevant test/build command
  before moving on. Do not batch 10 changes and hope.
- **Do not touch** files under `.workflow/qa/`, `.workflow/security/`, or design review
  reports unless you are the qas/security/designer agent. Implementers update only the `status` field and `Implementation Notes`
  section of their spec.
- **Report format.** When finishing any workflow step, end with exactly one line:
  `RESULT: <OK|BLOCKED|FAIL> — <one sentence>`.
