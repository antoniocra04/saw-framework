---
id: TASK-NNN
title: <short title>
status: draft
created: YYYY-MM-DD
# Tasks that must be `done` (merged to base) before this one may start.
# Example: depends: [TASK-004, TASK-005]. Empty list = can start anytime.
depends: []
# Optional specialist gates this task opts into. Core gates (QA, security) ALWAYS run
# and are not listed here. Add a tag only when the task needs that extra review:
#   design — task touches anything users see (requires .workflow/design/DIRECTION.md)
# Empty list = backend/logic only: no specialist gate runs. See the gate registry in AGENTS.md.
gates: []
---

# TASK-NNN — <title>

## User Story
As a <role>, I want <capability>, so that <benefit>.

## Acceptance Criteria
<!-- 3–7 items. Each must be verifiable by a concrete command or observable check.
     Write the verification hint in parentheses. -->
- [ ] AC1: <testable outcome> (verify: `<command>`)
- [ ] AC2: <testable outcome> (verify: <manual check, exact steps>)

## Definition of Done
- [ ] All acceptance criteria verified by QA with evidence
- [ ] Full test suite passes: `<command>`
- [ ] Linter passes: `<command>`
- [ ] No secrets or credentials in the diff
- [ ] Docs updated if behavior described in them changed

## Design Direction (only when `gates:` includes `design`)
<!-- Which DIRECTION.md sections apply hardest here + task-specific visual AC.
     Visual AC must be checkable: token-only colors, named signature element present,
     specific typography usage — not "looks good". Delete section if design gate is off. -->
- Applies: <DIRECTION.md sections>
- [ ] Visual AC: <checkable rule> (verify: grep/inspect <what>)

## Patterns to Reuse
<!-- Filled by BSA during pattern discovery. File paths + what to reuse from them. -->
- `<path>` — <what to reuse>

## Test Strategy
- Unit: <what must be covered>
- Integration: <what must be covered, or N/A>

## Out of Scope
<!-- Explicit list of things NOT to do. Protects against scope creep. -->
- <not this>

## Task Breakdown
<!-- Small, ordered, individually committable steps. Implementer ticks these. -->
- [ ] 1. <step>
- [ ] 2. <step>

## Open Questions
<!-- Must be empty before status can become `ready`. -->

## Architect Review
<!-- Filled by architect agent if invoked. -->

## Implementation Notes
<!-- One line per completed step, added by implementer. -->
