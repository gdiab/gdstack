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
| [`chrome-cdp`](skills/tools/chrome-cdp/SKILL.md) | `/gdstack:chrome-cdp` | Drive the user's real, logged-in Chrome over the DevTools Protocol with one consent click per Chrome session: a bridge daemon holds the single socket and every command routes through it. Includes the daemon, a low-level driver, and a ChatGPT/claude.ai chat-history admin tool. |

## License

MIT. Adapted skills keep their original licenses; see [CREDITS.md](CREDITS.md).
