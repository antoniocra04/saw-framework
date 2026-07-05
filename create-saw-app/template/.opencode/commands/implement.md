---
description: Implement a task strictly per its spec (Implementer role)
agent: implementer
---
Implement task $1.

1. Run your pre-flight gate (spec exists, status ready/in-progress, testable AC, correct branch).
2. Work through the spec's Task Breakdown one step at a time: reuse existing patterns,
   run the narrowest test after each step, commit atomically as `type(scope): desc [$1]`,
   tick the step in the spec.
3. Respect "Out of scope" — implement nothing beyond the spec.
4. When done and the full suite passes, set spec status to `qa` and tell the user to run `/qa $1`.

Context:
!`git branch --show-current`
!`git status --porcelain`
