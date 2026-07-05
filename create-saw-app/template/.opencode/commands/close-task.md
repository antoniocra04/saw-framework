---
description: Close a merged task - mark done, log retro (run on the base branch)
---
Close out task $1 after its branch/PR was merged by a human.

1. Verify the current branch is the base branch (main/master/dev) and the task's
   changes are actually in it:
   !`git branch --show-current`
   !`git log --oneline -10`
   If the merge cannot be confirmed → `RESULT: BLOCKED — $1 not merged into base,
   merge is a human action` and stop.
2. Set spec `.workflow/specs/$1.md` status to `done`.
3. Append an entry to `.workflow/retro.md`: date, task id, 2–4 bullets (what went well,
   what blocked, which gate caught issues, how many QA attempts were needed —
   take the count from `.workflow/qa/$1-qa.md` if recorded).
4. Local branch cleanup: if a merged local branch `task/<NNN>-*` exists, delete it.
   In Vibe Kanban mode skip this — VK cleans up its own worktrees and branches.
5. Commit the .workflow changes: `chore(workflow): close $1 [$1]`.

End with `RESULT: OK — $1 closed` or `RESULT: BLOCKED — <reason>`.
