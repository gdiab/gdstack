# gdstack

George Diab's agent skills. Some are original; some are adapted from people whose skills are worth learning from (credited in [CREDITS.md](CREDITS.md)).

## Install

Claude Code:

```bash
claude plugin marketplace add gdiab/gdstack
claude plugin install gdstack@gdstack
```

Other agents (Codex and others):

```bash
npx skills@latest add gdiab/gdstack
```

## Skills

| Skill | Invoke | What it does |
|---|---|---|
| [`thermo-review`](skills/engineering/thermo-review/SKILL.md) | `/gdstack:thermo-review` | Extremely strict maintainability review of a diff: structural simplification, file size, branching growth, type and boundary cleanliness. Cursor's standard plus scope detection, per-language guidance (C# legacy and modern, TypeScript, Python, Elixir, Go, Rust, Shell), finding classes and a re-review protocol. |
| [`12-factor-eval`](skills/engineering/12-factor-eval/SKILL.md) | `/gdstack:12-factor-eval` | Score a repository 0 to 3 on each of the twelve factors from evidence in the code, ask about what the code cannot show (deployment target, team, external services), and write a report with per-factor evidence, observations and prioritized recommendations. |
| [`grounded-review`](skills/engineering/grounded-review/SKILL.md) | fires on "review X" in a project with accumulated context | Survey the project's docs, planning corpora, sibling repos and agent memory with a subagent before judging the artifact, then write a review where every claim is tagged confirmed-elsewhere, artifact-only or inferred. |
| [`verification-before-completion`](skills/engineering/verification-before-completion/SKILL.md) | fires before any claim of done, fixed or passing | Jesse Vincent's rule, unchanged: no completion claim without running the verifying command in the same message and reading its output. |
| [`receiving-code-review`](skills/engineering/receiving-code-review/SKILL.md) | fires when review feedback arrives | Jesse Vincent's rule, unchanged: verify feedback against the codebase before implementing, push back with technical reasoning, no performative agreement. |
| [`handoff`](skills/workflow/handoff/SKILL.md) | fires on "hand this off", "done for today", "context is getting full" | Route by resume distance: same-day work becomes a background agent seeded with the summary; unknown-time work becomes a durable HANDOFF.md with a single RESUME HERE marker, references instead of restatements, and a suggested-skills list. |
| [`grilling`](skills/workflow/grilling/SKILL.md) | fires on "grill me", "stress-test this plan" | Matt Pocock's skill, unchanged: interview the user in rounds over a design tree, asking the whole settled frontier at once with a recommended answer per question, looking facts up itself and leaving decisions to the user, until nothing is silently assumed. |
| [`grill-me`](skills/workflow/grill-me/SKILL.md) | `/gdstack:grill-me` | Matt Pocock's slash-command entry point to `grilling`, unchanged. |
| [`chrome-cdp`](skills/tools/chrome-cdp/SKILL.md) | `/gdstack:chrome-cdp` | Drive the user's real, logged-in Chrome over the DevTools Protocol with one consent click per Chrome session: a bridge daemon holds the single socket and every command routes through it. Includes the daemon, a low-level driver, and a ChatGPT/claude.ai chat-history admin tool. |

## License

MIT. Adapted skills keep their original licenses; see [CREDITS.md](CREDITS.md).
