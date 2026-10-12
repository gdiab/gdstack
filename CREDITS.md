# Credits

Skills adapted from other people's work, with where they came from and the exact version used. Each adapted skill also has an `UPSTREAM.md` next to its `SKILL.md` saying how to pull in upstream changes.

| gdstack skill | Source | Upstream version | License |
|---|---|---|---|
| `thermo-review` | [`thermo-nuclear-code-quality-review`](https://github.com/cursor/plugins/tree/main/cursor-team-kit/skills/thermo-nuclear-code-quality-review) in Cursor's `cursor-team-kit` | `6e3d2ea` (2026-05-28), verified unchanged at `df58112` (2026-10-05) | MIT, © 2026 Cursor ([licenses/cursor-plugins.LICENSE](licenses/cursor-plugins.LICENSE); a copy ships inside the skill folder as `LICENSE.cursor`) |
| `verification-before-completion` | [`verification-before-completion`](https://github.com/obra/superpowers/tree/main/skills/verification-before-completion) in Jesse Vincent's superpowers | 6.4.1, `5bf4e7801` (2026-10-11) | MIT, © 2025 Jesse Vincent ([licenses/superpowers.LICENSE](licenses/superpowers.LICENSE)) |
| `receiving-code-review` | [`receiving-code-review`](https://github.com/obra/superpowers/tree/main/skills/receiving-code-review) in Jesse Vincent's superpowers | 6.4.1, `5bf4e7801` (2026-10-11) | MIT, © 2025 Jesse Vincent ([licenses/superpowers.LICENSE](licenses/superpowers.LICENSE)) |
| `grilling` | [`grilling`](https://github.com/mattpocock/skills/tree/main/skills/productivity/grilling) in Matt Pocock's skills | `main` @ `95249b0` (2026-10-07) | MIT, © 2026 Matt Pocock ([licenses/mattpocock-skills.LICENSE](licenses/mattpocock-skills.LICENSE)) |
| `grill-me` | [`grill-me`](https://github.com/mattpocock/skills/tree/main/skills/productivity/grill-me) in Matt Pocock's skills | `main` @ `95249b0` (2026-10-07) | MIT, © 2026 Matt Pocock ([licenses/mattpocock-skills.LICENSE](licenses/mattpocock-skills.LICENSE)) |

## Ideas, not text

- `handoff` is derived from Matt Pocock's `handoff` and `claude-handoff` skills ([mattpocock/skills](https://github.com/mattpocock/skills), MIT): the "Suggested skills" section and the reference-don't-restate rule are his ideas; the wording and the rest are original.

- `thermo-review`'s "Sharper rules" section (unrepresentable states, the next-diff test, one-caller parameters, removal plans for temporary code, pushing special cases to the edge, "didn't know it existed" is a finding) and its findings format were prompted by a rewrite of Cursor's skill published as a GitHub gist by Bobby Lansing ([dataguybobby](https://gist.github.com/dataguybobby/a2714a7336012c40612e9b76b39ff35f)). The wording here is original.
- The per-language guidance in `thermo-review/languages/` is original writing, based on the public documentation listed in `thermo-review/SOURCES.md`.
