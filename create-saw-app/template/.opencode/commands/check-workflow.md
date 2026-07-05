---
description: Show workflow status - all tasks, current branch, pending gates
---
Show the current workflow state as a short report:

Specs:
!`grep -H "^status:" .workflow/specs/*.md 2>/dev/null || echo "(no specs)"`

Dependencies:
!`grep -H "^depends:" .workflow/specs/*.md 2>/dev/null || echo "(none declared)"`

Git:
!`git branch --show-current`
!`git status --porcelain`

QA / security reports present:
!`ls .workflow/qa .workflow/security 2>/dev/null`

For each task print: id, title, status, unmet dependencies, and the NEXT command to run
(`/start-work`, `/implement`, `/qa`, `/security-check`, `/pre-pr`, `/close-task`,
or the pipelines `/run-task` / `/run-task-vk`) based on its status and which reports exist.

Then print a **"Startable now"** list: all `ready` tasks whose dependencies are all `done` —
these can be launched in parallel (e.g. as separate Vibe Kanban cards).

Flag any inconsistencies (e.g. status `approved` but no QA report, or a task marked `done`
whose dependency is not — both violate the contract).
