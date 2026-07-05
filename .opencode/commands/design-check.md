---
description: Design review of a UI task diff against the Design Direction (Designer gate)
agent: designer
subtask: true
---
Run the design review for task $1 — REVIEW mode of your procedure.

Judge the task diff against `.workflow/design/DIRECTION.md` and the global slop scan:
token compliance greps, slop markers, typography/spacing/signature compliance.
Write `.workflow/design/$1-design.md` with CLEAR/FINDING per check and deliver a
PASS or FAIL verdict. Findings must be concrete: file, pattern, violated rule, exact fix.

You are a gate with iteration authority. "Has styling" is not "designed" —
do not soften the bar.
