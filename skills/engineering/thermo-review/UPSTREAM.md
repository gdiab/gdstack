# Upstream

- **Source:** https://github.com/cursor/plugins/tree/main/cursor-team-kit/skills/thermo-nuclear-code-quality-review (an identical copy also lives in `cursor/plugins/thermos/`).
- **Version adapted:** last upstream change `6e3d2ea` (2026-05-28); confirmed byte-identical at `df58112` (2026-10-05).
- **What's ours:** only the frontmatter, the HTML comment under it, the `# gdstack additions` section, `languages/` and `SOURCES.md`. The text from `# Thermo-Nuclear Code Quality Review` through `## Approval Bar` is Cursor's, unchanged.

## Pulling in an upstream change

1. Fetch the new upstream `SKILL.md`.
2. Replace the core (from `# Thermo-Nuclear Code Quality Review` up to, not including, `# gdstack additions`) with upstream's body.
3. Re-read `# gdstack additions` and `languages/` against the new core: drop anything upstream now covers, and fix rule numbers if they moved.
4. Update the version line above and the row in `CREDITS.md`.
