---
description: Close out a task after the PR is merged by a human
---
Close out task $1. The PR must already be merged by a human — verify before proceeding:
!`git log --oneline -5 --all`

1. If the merge cannot be confirmed → `RESULT: BLOCKED — PR not merged, merge is a human action` and stop.
2. Set spec `.workflow/specs/$1.md` status to `done`.
3. Switch to the base branch, pull, and delete the local task branch.
4. Append a short entry to `.workflow/retro.md`: what went well, what blocked, which gate
   caught issues (date, task id, 2–4 bullets).

End with `RESULT: OK — $1 closed`.
