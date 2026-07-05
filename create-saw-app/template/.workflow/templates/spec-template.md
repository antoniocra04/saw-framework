---
id: TASK-NNN
title: <short title>
status: draft
created: YYYY-MM-DD
# Tasks that must be `done` (merged to base) before this one may start.
# Example: depends: [TASK-004, TASK-005]. Empty list = can start anytime.
depends: []
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
