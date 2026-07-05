---
description: Capture lessons learned into the retro log and improve the harness
---
Run a retrospective (optionally for a specific task: $ARGUMENTS).

1. Read `.workflow/retro.md` and recent QA/security reports.
2. Identify repeating failure patterns: which gate keeps catching the same class of mistake?
3. Append findings to `.workflow/retro.md`.
4. If a mistake repeats 2+ times, propose a concrete harness improvement: a new checklist
   item in the relevant agent file, a stricter AC template line, or a lint rule.
   Show the proposed edit and apply it after user confirmation.
