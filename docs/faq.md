# FAQ

### Is Saw a framework like Next.js?

It's a *workflow* framework, not a *stack* framework. Next.js ships application code
and picks your UI library; Saw ships agents, gates, and artifacts, and picks nothing
about your stack. Your stack can be anything — the first task bootstraps it. That's
also why `create-saw-app init` works in Python/Go/Rust repos.

### Do I need Vibe Kanban?

No. The board is optional orchestration sugar (parallel worktrees, diff review UI,
preview browser). The full workflow runs from the opencode terminal: `/run-task` and
`/run-backlog` cover everything. Start without it; add it when you want parallelism
or a visual review queue.

### Do I need opencode specifically?

Currently yes — the harness is built on opencode's agents, commands, and permission
model. The *concepts* (spec files, gates, evidence, role separation) are portable,
and the upstream safe-agentic-workflow project ships harnesses for Claude Code,
Gemini CLI, and Codex CLI if you live elsewhere.

### QA failed my code but it actually works. Why?

Almost always one of: (1) the acceptance criterion wasn't testable, so QA couldn't
prove it — fix the spec, that's a spec bug; (2) QA couldn't *run* the verification
(missing test command in the template, missing dependency) — empty evidence is FAIL
by design, because "probably fine" is how AI slop ships; (3) the code genuinely
handles the happy path only. Read the QA report: expected vs actual is spelled out
per criterion.

### What happens after `BLOCKED — QA failed 3x`?

The task's status becomes `blocked` and the pipeline stops burning money. Read the
last QA report. Typical exits: the AC were contradictory (fix the spec), the task
was too big (split it), or the model is out of its depth (switch the implementer to
a stronger model — see [Model strategy](models.md)). Then set status back to `ready`
and rerun.

### Can I skip the gates for a one-line fix?

Yes — `/quick-fix <description>`. It's the sanctioned shortcut with guardrails:
max 2 files, no auth/payments/schema/public-API changes, a stated mini-criterion
verified with real output. If the change doesn't fit those limits, it will refuse
and tell you to `/spec` — that refusal is the feature.

### Why can't the agents just merge?

Because the gates verify *correctness claims*, not *judgment*: they prove the tests
pass, not that the feature feels right, looks right, or should exist. Merging is
where judgment is applied, and judgment is the human's job. (`/run-backlog`
auto-merges into the base branch to unblock dependent tasks, but tasks stay
`approved` — not `done` — until a human reviews and runs `/close-task`.)

### Isn't this slower than just prompting?

For the first draft — yes, by design ("measure twice"). For working software — it's
usually faster, because you stop paying the hidden tax: re-explaining context,
debugging unverified claims, and unwinding scope creep. If the code is genuinely
disposable, don't use Saw; that's what the README's "when not to use" section is for.

### Does it work with strong models too?

Yes, and well — strong models drift too, just more subtly. The gates are model-
agnostic; the difference is only economic (with strong models everywhere you're
buying insurance; with mixed models you're buying capability — see
[Model strategy](models.md)).

### A session died mid-task. Now what?

Nothing is lost — state is files, not context. Open a new session and run
`/check-workflow`: it prints every task, its status, and the exact next command.

### How do I run tasks in parallel safely?

Declare ordering in spec frontmatter (`depends: [TASK-004]`) — entry gates enforce
it. `/check-workflow` prints the "Startable now" set; each parallel task gets its
own Vibe Kanban card/worktree. Rule of thumb: parallelize independent cheap tasks,
serialize the hard ones.

### What's the license situation?

MIT. The process design is adapted from
[safe-agentic-workflow](https://github.com/bybren-llc/safe-agentic-workflow)
© ByBren, LLC (J. Scott Graham), whose MIT license requires this attribution —
keep it if you fork.
