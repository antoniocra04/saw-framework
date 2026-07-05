---
description: Start work on a task - validates the spec gate and creates the branch
---
Start work on task $1 (e.g. TASK-001). Follow these steps IN ORDER, stop at the first failure:

## Step 1 — Spec gate (MANDATORY, stop-the-line)
Read `.workflow/specs/$1.md`.
- If the file does not exist → output `BLOCKED: no spec for $1, run /spec first` and STOP.
- If status is not `ready` → output `BLOCKED: spec status is not ready` and STOP.
- If the Acceptance Criteria section is empty or contains non-testable items →
  output `BLOCKED: AC not testable, fix the spec` and STOP. Do NOT invent AC yourself.
- If the spec frontmatter lists `depends:`, every listed task's spec must have status
  `done`. Otherwise → output `BLOCKED: dependency <id> not merged` and STOP.

## Step 2 — Clean tree
Current state:
!`git status --porcelain`
!`git branch --show-current`
- If there are uncommitted changes → ask the user what to do with them and STOP.

## Step 3 — Branch
- Update the base branch (main/master/dev — whichever this repo uses) with `git pull`.
- Create branch: `git checkout -b task/<NNN>-<short-slug>` (lowercase, hyphens).

## Step 4 — Mark started
- Set spec status to `in-progress`.
- Print the spec's Task Breakdown and say: implementation runs via `/implement $1`.

End with `RESULT: OK — ready to implement $1` or `RESULT: BLOCKED — <reason>`.
