# Model strategy

Saw's economic premise: **the process guarantees quality, so intelligence can be
spent where it compounds and saved where it doesn't.** A spec error multiplies into
every downstream task; a typing error is caught by the next gate. Pay accordingly.

## Recommended assignment

| Role | Model tier | Why |
|---|---|---|
| `bsa` | **Strong** | Spec quality determines everything downstream. Never economize here. |
| `architect` | **Strong** | Design review leverage: one catch saves N implementation rounds. |
| `implementer` | **Cheap** (default) | Follows a prewritten breakdown one step at a time. Escalate per task class (see below). |
| `qas` | Cheap is fine | "Run command, paste output, compare" needs discipline, not brains — the report template supplies the discipline. |
| `security` | Mid/strong | Checklist-driven, but findings need judgment. |
| `tech-writer` | **Cheap** | Describe the diff, delete stale lines. |

## Configuration

Per-role, in `opencode.json` (overrides the agent files):

```json
{
  "agent": {
    "bsa":         { "model": "anthropic/claude-sonnet-5" },
    "architect":   { "model": "anthropic/claude-sonnet-5" },
    "implementer": { "model": "anthropic/claude-haiku-4-5-20251001" }
  }
}
```

Or in an agent's frontmatter (`.opencode/agents/implementer.md`):

```yaml
model: anthropic/claude-haiku-4-5-20251001
```

Vibe Kanban users: define `strong` / `cheap` executor variants and pick per card —
see [vibe-kanban.md](vibe-kanban.md).

## When to escalate the implementer

Cheap models handle CRUD, layouts from a spec, tests, docs, config. They reliably
struggle with: 3D/shaders, scroll choreography, concurrency, subtle refactors of
tangled code, performance work.

The signal is built in: **`RESULT: BLOCKED — QA failed 3x`**. One blocked run —
maybe bad luck. The same task class blocked twice — stop re-prompting; switch that
task (or the role) to a stronger model. Re-running a drifting model is the most
expensive way to fail: you pay for up to 3 full implement+QA rounds each attempt.

`/retro` surfaces these patterns from the logs so the decision is data, not vibes.

## The cost logic, explicitly

- A **spec** is written once by a strong model and steers 1–15 cheap-model steps.
- A **QA round** costs one cheap-model pass; an **undetected bug** costs a debugging
  session plus everything built on top of it meanwhile.
- The 3-attempt cap converts "model in a loop" from an unbounded cost into a fixed,
  known one that ends in an explicit `BLOCKED` — which is information, not waste:
  it tells you precisely where cheap intelligence stops being cheap.
