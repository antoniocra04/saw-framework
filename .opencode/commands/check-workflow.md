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

QA / security / design reports present:
!`ls .workflow/qa .workflow/security .workflow/design 2>/dev/null`

For each task print: id, title, status, unmet dependencies, its `gates:` list, and the
NEXT command to run (`/start-work`, `/implement`, `/qa`, then `/design-check` etc. for
each specialist gate the spec opts into, `/security-check`, `/pre-pr`, `/close-task`,
or the pipelines `/run-task` / `/run-task-vk`) based on its status and which reports
exist. If any spec lists `design` in `gates:` but `.workflow/design/DIRECTION.md` does
not exist, flag it: run `/design` first.

Then print a **"Startable now"** list: all `ready` tasks whose dependencies are all `done` —
these can be launched in parallel (e.g. as separate Vibe Kanban cards).

Flag any inconsistencies (e.g. status `approved` but no QA report, or a task marked `done`
whose dependency is not — both violate the contract).
