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

## License

MIT. Adapted skills keep their original licenses; see [CREDITS.md](CREDITS.md).
