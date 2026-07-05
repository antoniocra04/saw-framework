---
description: Create or update the project Design Direction (Designer role) - required before any UI task
agent: designer
---
Create (or update) the Design Direction for this project — DIRECTION mode of your procedure.

BRIEF: $ARGUMENTS

Context to mine if the brief is thin: project README, docs/ (concept documents),
existing `.workflow/design/DIRECTION.md` if updating.

Requirements reminder:
- every section filled with concrete, code-checkable values (exact fonts, exact hex
  tokens, real px values) — no adjectives without numbers;
- anti-references and the project ban list are mandatory;
- 1–3 signature elements specific enough that an implementer can build them without asking.

If key brief answers are missing (audience, mood, references) and this is an
interactive session, ask the user before writing. Present the finished direction as
a short summary in chat and tell the user to review the file — the direction is a
contract: once approved, UI tasks are judged against it.
