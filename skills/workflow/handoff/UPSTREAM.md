# Upstream

- **Source:** Matt Pocock's `handoff` and `claude-handoff` skills in https://github.com/mattpocock/skills (MIT).
- **Relationship:** derived, not vendored. The two-distance routing (same-day spawn vs durable artifact), the contents contract and the quality bar are gdstack's; the "Suggested skills" section and the reference-don't-restate rule come from Matt's skills. No block of his text is reproduced verbatim.
- **Checked against:** mattpocock/skills `main` @ `0f8999f` (2026-10-06; still tagged v1.3.1, changeset pending). Adopted from that check: pass the summary to `claude --bg` from a file with `$(cat …)` rather than inline (upstream #562), and name the temp dir (`$TMPDIR`, else `/tmp`; `%TEMP%` on Windows) (upstream #272).

## When upstream changes

Re-read his `handoff` for new rules worth adopting; there is no block to replace mechanically.
