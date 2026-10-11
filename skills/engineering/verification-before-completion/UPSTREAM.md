# Upstream

- **Source:** https://github.com/obra/superpowers/tree/main/skills/verification-before-completion (Jesse Vincent, MIT).
- **Version adapted:** superpowers 6.4.1, commit `5bf4e7801` (the version shipped in the `claude-plugins-official` marketplace on 2026-10-11).
- **What's ours:** only the quoted `description` in the frontmatter and the HTML comment under it. The body is upstream's, unchanged.
- **Why it is here:** gdstack keeps one owner per job. The superpowers plugin was disabled because its fifteen auto-triggering skills overlap other installed skills; these two cover jobs nothing else owns.

## Pulling in an upstream change

1. Fetch the new upstream `SKILL.md`.
2. Replace everything below the HTML comment with upstream's body.
3. Update the version line above and the row in `CREDITS.md`.
