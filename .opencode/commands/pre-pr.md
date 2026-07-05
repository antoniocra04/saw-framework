---
description: Pre-PR validation - checks all gates, assembles evidence, prepares the PR
---
Run pre-PR validation for task $1. Evaluate each step as PASS / WARNING / BLOCKER.
Steps marked (BLOCKING) must be PASS before a PR can be created.

## Step 1 — QA gate (BLOCKING)
Read `.workflow/qa/$1-qa.md`. It must exist and its verdict must be PASS.
Spec `.workflow/specs/$1.md` status must be `approved`.

## Step 2 — Security gate (BLOCKING)
Read `.workflow/security/$1-sec.md`. It must exist with verdict PASS.

## Step 3 — Clean committed tree (BLOCKING)
!`git status --porcelain`
Everything must be committed.

## Step 4 — Commit format (BLOCKING)
!`git log --oneline -15`
Every task commit matches `type(scope): description [$1]`.

## Step 5 — Up to date with base branch
Fetch and rebase onto the base branch; resolve conflicts by re-running tests afterwards.

## Step 6 — Docs
Check whether the diff changes behavior described in README/docs. If yes and docs were not
updated, invoke the tech-writer subagent to update them (WARNING until done).

## Step 7 — Evidence pack
Create `.workflow/evidence/$1.md` from `.workflow/templates/evidence-template.md`:
summary of the change, links to QA and security reports, full test suite output, diff stat.

## Step 8 — PR
Print the step-by-step status table first. If any BLOCKER remains → `RESULT: FAIL` and stop.
Otherwise ask the user to confirm, then:
- `git push -u origin <branch>`
- create the PR (`gh pr create` if available) with title `$1: <spec title>` and the evidence
  pack as the body. Mention that final review and merge is done by a human (HITL) —
  never merge yourself.

End with `RESULT: OK — PR ready for human review` or `RESULT: FAIL — <blockers>`.
