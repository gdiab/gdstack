# Credits

Skills adapted from other people's work, with where they came from and the exact version used. Each adapted skill also has an `UPSTREAM.md` next to its `SKILL.md` saying how to pull in upstream changes.

| gdstack skill | Source | Upstream version | License |
|---|---|---|---|
| `thermo-review` | [`thermo-nuclear-code-quality-review`](https://github.com/cursor/plugins/tree/main/cursor-team-kit/skills/thermo-nuclear-code-quality-review) in Cursor's `cursor-team-kit` | `6e3d2ea` (2026-05-28), verified unchanged at `df58112` (2026-10-05) | MIT, © 2026 Cursor ([licenses/cursor-plugins.LICENSE](licenses/cursor-plugins.LICENSE); a copy ships inside the skill folder as `LICENSE.cursor`) |

## Ideas, not text

- `thermo-review`'s "Sharper rules" section (unrepresentable states, the next-diff test, one-caller parameters, removal plans for temporary code, pushing special cases to the edge, "didn't know it existed" is a finding) and its findings format were prompted by a rewrite of Cursor's skill published as a GitHub gist by Bobby Lansing ([dataguybobby](https://gist.github.com/dataguybobby/a2714a7336012c40612e9b76b39ff35f)). The wording here is original.
- The per-language guidance in `thermo-review/languages/` is original writing, based on the public documentation listed in `thermo-review/SOURCES.md`.
