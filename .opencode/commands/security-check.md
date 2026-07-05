---
description: Security review of the task diff against the fixed checklist (Security gate)
agent: security
subtask: true
---
Run the security review for task $1.

Go through your fixed 7-item checklist against the task diff, write
`.workflow/security/$1-sec.md` with CLEAR/FINDING/N-A per item, and deliver a PASS or FAIL
verdict. Findings must be concrete: file, line, severity, exploit scenario, required fix.
A critical finding blocks the PR — no exceptions.
