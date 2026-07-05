# Design quality — killing AI slop

Ask any model — even a frontier one — for a "beautiful, professional, original"
frontend and you get the same thing: centered hero, three equal cards, indigo
gradient, Inter, `rounded-xl shadow-lg`, emoji icons. This is not a model defect you
can prompt away with "be more creative". It's a process defect, and Saw fixes it the
same way it fixes correctness: with a contract and a gate.

## Why models produce generic design

1. **Unfalsifiable requirements.** "Looks premium" can't fail a check, so the model
   optimizes what *can* fail (tests) and regresses to the statistical mean of its
   training data everywhere else. The mean of all websites is, by definition, generic.
2. **No one owns aesthetics.** In the default pipeline QA verifies commands, security
   verifies the checklist — and nobody ever says "this is slop, redo it".
3. **Design decisions made while typing.** Without upfront direction the model picks
   fonts, colors, and layout mid-implementation, one safe default at a time.

## How Saw fixes it

**1. The Design Direction** (`/design <brief>` → `.workflow/design/DIRECTION.md`) —
a visual contract written by the `designer` agent (art-director role): exact fonts
and type scale, semantic color tokens with hex values, spacing and layout rules,
motion tokens, 1–3 *signature elements*, a voice guide, anti-references, and a ban
list. Every rule is checkable by reading code — no adjectives without numbers.

**2. Spec-level enforcement (opt-in).** The design gate is not global — it is one
entry in Saw's gate registry. A task that touches what users see gets `design` added
to its `gates:` frontmatter list by the BSA; a backend task keeps `gates: []` and the
designer is never invoked. When `design` is opted in, the BSA refuses to write the
spec without a direction (`BLOCKED — run /design first`) and adds checkable visual AC
("colors only via tokens", "signature element X present") instead of "looks good".

**3. The implementer obeys the direction, not its instincts.** For tasks with the `design` gate
it must read DIRECTION.md before coding and use only its tokens, fonts, and
elements. The safe defaults a model reaches for are exactly what the next gate rejects.

**4. The design gate** (`/design-check TASK-N`, automatic in `/run-task` pipelines
between QA and security). The designer agent reviews the diff in a fresh context:

- **token compliance** — greps the diff for raw hex/rgb/hsl and framework palette
  classes (`-indigo-`, `bg-gradient-to-`…): each hit is a violation;
- **the slop scan** — emoji-as-icons, single-font uniformity, uniform card grids,
  centered hero + two buttons, placeholder copy ("Unleash", "Elevate", ✨🚀),
  default violet gradients, no layout rhythm;
- **direction compliance** — scale respected, signature elements actually built.

Verdict PASS/FAIL with file:line findings; FAIL routes back to the implementer
(max 2 rounds in pipelines, then `BLOCKED` — a human look is needed).

## What this does and doesn't buy you

It reliably eliminates the *recognizable slop* and makes UI work converge to the
direction — which is where most of "looks AI-generated" lives. It does not replace
your eye: the direction itself is taste, so review DIRECTION.md as carefully as you
review specs, and keep the HITL browser check before merge. A model can follow a
signature element rule; only you can say the signature element was worth having.

## Practical tips

- Spend your strongest model on `/design` — it's one document steering every UI task.
- Give `/design` real references ("like site X's typography, mood of film Y") —
  concrete inputs produce concrete rules.
- If the design gate FAILs twice on the same class of finding, the direction is
  probably ambiguous there — fix DIRECTION.md via `/design`, don't argue with the gate.
- Backend tasks are untouched: with `gates: []` the whole design system is skipped —
  no designer, no direction requirement, no extra cost. The gate only exists for tasks
  that opt into it.
