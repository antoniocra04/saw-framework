---
description: Batch mode - run all ready tasks through the pipeline sequentially with auto-merge
---
Process the backlog autonomously. Tasks to process: $ARGUMENTS
(if empty — all specs with status `ready` whose dependencies are `done`, in ascending
TASK id order; re-evaluate the set after each merge, since merges unlock dependents).

Specs present:
!`grep -H "^status:" .workflow/specs/*.md 2>/dev/null`
!`grep -H "^depends:" .workflow/specs/*.md 2>/dev/null`

## Per task, in order
1. Run the exact `/run-task` pipeline (Phase 0–5 incl. any specialist gates the spec's
   `gates:` list opts into, same stop-conditions, max 3 QA attempts / 2 design attempts).
2. If the task ends `RESULT: OK` (all gates passed):
   - `git checkout <base>` and merge the task branch with `--no-ff`
     (merge commit per task → one `git revert -m 1` undoes the whole task later).
   - Set spec status to `approved` with the note "auto-merged, awaiting HITL visual
     review". Only a human moves a task to `done` (via /close-task).
   - Continue to the next task (later tasks may depend on this merge).
3. If the task ends `RESULT: BLOCKED`:
   - Leave its branch as-is, set spec status `blocked`.
   - STOP the whole batch (later tasks likely depend on the blocked one).
     Do not skip ahead.

## Final report (always produce, even on early stop)
- Table: task / verdict / QA attempts / merged yes-no.
- List of ALL pending HITL visual checks accumulated from the merged specs —
  the human must walk through these in the browser before running the next batch.
- If stopped: which task blocked and the exact failure summary.

End with `RESULT: OK — N tasks merged, M HITL checks pending` or
`RESULT: BLOCKED — stopped at TASK-NNN`.
