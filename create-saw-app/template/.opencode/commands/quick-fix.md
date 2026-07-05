---
description: Lightweight path for trivial fixes - limited scope, still verified
---
Quick-fix request: $ARGUMENTS

## Eligibility gate (check FIRST)
A quick-fix is allowed ONLY if ALL of these hold:
- touches at most 2 files;
- no changes to auth, payments, database schema/migrations, or public API contracts;
- behavior change is trivially verifiable (typo, off-by-one, broken import, config value, copy text).

If ANY condition fails → output `ESCALATE: needs full workflow, run /spec` and STOP.

## Procedure
1. Write a one-line mini-AC in the chat: "Fix is correct when: <verifiable check>".
2. Create branch `fix/<short-slug>` (never commit to the base branch directly).
3. Make the minimal change. Nothing else.
4. Run the relevant tests and the mini-AC check; paste actual output.
5. Commit as `fix(scope): description [quick-fix]`.
6. Run steps 1–2 of the security checklist mentally on the diff (secrets, injection);
   if anything is suspicious → ESCALATE.

End with `RESULT: OK — <mini-AC> verified` or `ESCALATE: <reason>`.
