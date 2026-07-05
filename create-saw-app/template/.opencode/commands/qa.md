---
description: Independent QA verification of a task against its Acceptance Criteria (QAS gate)
agent: qas
subtask: true
---
Run independent QA verification for task $1.

Follow your QAS procedure exactly: verify EVERY acceptance criterion by actually running
commands and pasting real output into `.workflow/qa/$1-qa.md`. Run the full test suite and
linter. Check the diff stays within the spec's scope. Deliver a PASS or FAIL verdict —
on FAIL, list every failed criterion with expected vs actual and set the spec status back
to `in-progress`.

You are a gate. Do not be agreeable. Empty evidence = FAIL.
