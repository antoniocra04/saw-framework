<p align="center">
  <img src="docs/assets/logo.png" alt="Saw" width="480">
</p>

<p align="center"><strong>Measure twice, cut once — for AI-written code.</strong></p>

<p align="center">

![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)
![Node >= 18](https://img.shields.io/badge/node-%3E%3D18-brightgreen.svg)
![Works with opencode](https://img.shields.io/badge/works%20with-opencode-8A2BE2.svg)
![PRs welcome](https://img.shields.io/badge/PRs-welcome-orange.svg)

</p>

Saw is a quality-gated development workflow for AI coding agents. It lives inside your
repository and turns "the agent says it's done" into "the agent proved it's done":
nothing merges until the spec is verified, every acceptance criterion is backed by real
command output, and an independent QA agent has issued a PASS verdict.

Built for [opencode](https://opencode.ai). Optional kanban UI via
[Vibe Kanban](https://github.com/BloopAI/vibe-kanban). Works with any language or stack —
Saw installs a development *process*, not a framework.

[Документация на русском →](README.ru.md)

---

## Why

AI coding agents fail in predictable ways:

- **They invent requirements.** Ask for a fix, get a refactor of three unrelated files.
- **They grade their own homework.** "All tests pass" — nothing was run.
- **They drift.** Especially cheaper models: each step slightly off, compounding fast.
- **Context dies.** Close the session, lose the plan.

The usual answer is "use a smarter model and better prompts." Saw's answer is
**process**: the same discipline that lets human teams ship with fallible developers —
specs, role separation, independent review, evidence — encoded as files in your repo
and enforced by agent permissions, not by politely asking.

The payoff: **cheap models produce reliable results**, because the process, not the
model, guarantees quality. Spend expensive tokens on specs and review; let inexpensive
models do the typing.

## How it works

```
  idea ──/spec──▶ SPEC ──/implement──▶ CODE ──/qa──▶ VERDICT ──/security-check──▶ ──/pre-pr──▶ PR ──▶ merge
                 testable AC,          atomic         independent,    fixed          evidence      HUMAN
                 out-of-scope,         commits,       evidence-       checklist      pack          ONLY
                 step breakdown        test each      based, can
                                       step           reject ∞
```

1. **Spec gate.** No code without a spec containing testable acceptance criteria.
   The BSA agent writes it; you approve it. Agents that find missing or contradictory
   requirements must stop (`BLOCKED`), never improvise.
2. **Role separation, enforced.** Six agents with distinct file permissions: the
   implementer cannot write QA reports, QA cannot touch product code (`edit: deny` —
   a hard rule, not a prompt suggestion).
3. **Independent verification.** QA runs in a fresh context, never sees the
   implementer's reasoning, and must paste actual command output for every criterion.
   Empty evidence = FAIL. It can reject work any number of times.
4. **State on disk.** Specs, statuses, QA reports, evidence packs — all files in
   `.workflow/`. Kill the session anytime; `/check-workflow` tells you exactly where
   you are and what to run next.
5. **Humans merge.** Agents prepare a PR with an evidence pack; the final cut is yours.

## Quick start

**New project** (any stack — the first task bootstraps whatever you want):

```bash
npx create-saw-app
```

The CLI checks your environment (Node, git, opencode), offers to install anything
missing, asks for a project name, and sets up git for you. Prefer non-interactive?
`npx create-saw-app my-project --yes` accepts every default (handy for CI).

**Existing project** (any language; non-destructive, idempotent):

```bash
cd your-project
npx create-saw-app init
```

**Manual**: copy `AGENTS.md`, `opencode.json`, `.opencode/`, `.workflow/` into your
repo root. Done — opencode picks everything up automatically.

Then, inside opencode:

```
/spec Add rate limiting to the public API. Criteria: 429 after N requests/min,
      covered by tests, existing endpoints unaffected. Out of scope: auth changes.
```

Review the generated spec (your one important job), then either walk the gates
step by step:

```
/start-work TASK-001 → /implement TASK-001 → /qa TASK-001 → /security-check TASK-001 → /pre-pr TASK-001
```

…or run the whole pipeline with one command:

```
/run-task TASK-001        # all gates, max 3 QA iterations, stops before merge
```

Prefer a UI? `npm run board` opens Vibe Kanban; a card with `/run-task-vk TASK-001`
runs the gates inside an isolated git worktree. See [docs/vibe-kanban.md](docs/vibe-kanban.md).

## Features

- **Spec-gated development** — testable acceptance criteria or no code, period
- **Independent QA with rejection authority** — fresh context, read-only on code, unlimited iterations (capped at 3 per autonomous run)
- **Evidence, not claims** — a criterion counts only with pasted command output
- **Permission-enforced roles** — boundaries in agent config, not in prompts
- **Autonomous pipelines** — `/run-task` (one task), `/run-backlog` (batch with auto-merge and one-command rollback)
- **Parallel-safe** — `depends:` in spec frontmatter gates task startup order
- **Kanban orchestration** — optional Vibe Kanban integration with isolated worktrees
- **Stack- and language-agnostic** — the workflow travels with the repo; non-Node projects skip npm entirely
- **Self-improving** — `/retro` finds repeating failure patterns and patches the harness itself

## Documentation

| Doc | What's inside |
|---|---|
| [Getting started](docs/getting-started.md) | Install, first task end-to-end, configuring your test commands |
| [Core concepts](docs/concepts.md) | Layers, artifacts, lifecycle, gates, roles, the evidence principle |
| [Command reference](docs/commands.md) | All 14 commands: what, when, stop conditions |
| [Model strategy](docs/models.md) | Which model per role, config examples, cost logic |
| [Vibe Kanban](docs/vibe-kanban.md) | Board setup, card types, parallel execution rules |
| [FAQ](docs/faq.md) | Common questions and honest answers |

## When *not* to use Saw

- **Throwaway prototypes.** The gates cost time; if the code is disposable, skip the process (or keep just `/quick-fix`).
- **Exploratory spikes.** Specs assume you know what "done" means. Explore first, then spec.
- **Solo scripts under ~50 lines.** Overhead exceeds benefit.

Saw shines where correctness matters more than speed of the first draft: products,
APIs, anything a teammate — human or AI — will build on top of.

## Requirements

- [git](https://git-scm.com) — the workflow lives on branches and commits
- [opencode](https://opencode.ai) — executes agents and commands
- Node.js ≥ 18 — only for `create-saw-app` and the optional Vibe Kanban board

## Repository layout

This is a monorepo (same pattern as Vite/`create-vite`):

```
/                  the canonical Saw harness — AGENTS.md, .opencode/, .workflow/, docs/
/create-saw-app    the npm scaffolder; template/ is a build artifact regenerated
                   from the repo root by `npm run sync` (runs automatically on publish)
```

Edit the harness only at the repo root — never in `create-saw-app/template/`.

## Credits & license

MIT. Process design adapted from
[safe-agentic-workflow](https://github.com/bybren-llc/safe-agentic-workflow)
© ByBren, LLC (J. Scott Graham) — Words To Film By™.
