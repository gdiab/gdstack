---
name: handoff
description: "Compact the current session into a handoff so the work can resume cleanly, in a fresh session today or at an unknown later time. Use whenever the user asks to hand off, wrap up, park, or stop the current work (write a handoff, I'm done for today, pick this up later, hand this off, context is getting full), even if they never say the word handoff. Routes by resume distance and defers to the user's own handoff convention when their instructions define one."
---

# Handoff

If the user's instructions (a CLAUDE.md, AGENTS.md or equivalent) define a handoff convention, that convention wins wherever it and this skill disagree. The defaults below apply where it is silent.

The purpose of any handoff is one thing: a fresh agent with zero context resumes the work without re-deriving anything. Every rule below serves that.

## 1. Determine the resume distance

- The user's words decide. "After lunch", "in an hour", "right away", "context is getting full but keep going" mean **same-day**. "Done for today", "whenever I get back to this", or an end-of-session wrap with no time named mean **unknown-time**.
- If it's genuinely ambiguous, ask one question: resuming today, or at some unknown later time? Don't guess when the two paths produce such different artifacts.

## 2a. Same-day: spawn, don't write

No durable file. A repo file for a two-hour gap is ceremony that goes stale by tomorrow. Compact the conversation into a summary and launch it as a background agent:

```bash
claude --bg --name "<short descriptive name>" "<handoff summary>"
```

- The summary becomes the new agent's prompt. Structure it as: current state, immediate next actions, artifact references (paths/URLs, not content), and a "Suggested skills" list naming which skills the new session should invoke and why.
- Always pass `--name`. It labels the job list, session picker, and terminal title.
- Redact secrets ruthlessly. The summary appears in process lists and job UIs.
- Tell the user the agent's name and that `claude agents` manages it.
- If the user doesn't want a spawned agent (or `claude --bg` is unavailable), write the same summary to a doc in the OS temp dir instead and print its path.

## 2b. Unknown-time: durable artifact

Write to the project's handoff surface:

- **Default**: `HANDOFF.md` at the repo root, updated in place. Git history preserves old handoffs; never accumulate `HANDOFF-2.md` variants.
- **A notes vault or docs project**: one handoff note per project, named and encoded the way that project's AGENTS.md says (frontmatter, links, memory-file pairing).
- Any other existing project convention beats the default. Look before creating.

### Contents contract

- `## RESUME HERE (YYYY-MM-DD)` near the top. Run `date` first; never trust the session-start snapshot. Update the marker in place; two competing markers is worse than none.
- **State**: what's done, what's in flight, and explicitly what shipped vs. what's still a working artifact. Conflating those two is the classic handoff lie.
- **Next actions**: concrete, ordered, small enough to start cold.
- **References, not restatements**: point at files, PRs, issues, commits, wikilinks. Content that lives in an artifact is never copied into the handoff. A stale copy is worse than a link.
- `## Suggested skills`: which skills the resuming session should invoke, and why.
- **Open questions**: anything the user still needs to decide.
- **Redact secrets**: the reader is a fresh agent with no sense of what was sensitive in this session.
- If the project has agent memory, add or update a one-line `HANDOFF:` pointer in the relevant memory file. The memory holds the pointer; the artifact holds the detail. Update both or the pair lies.

## Quality bar

Before finishing, reread the handoff as if you were the fresh agent: can you resume within two minutes of reading, without asking the user anything already answered this session? If not, fix it, usually by cutting restated content and sharpening next actions, not by adding more prose.

## Provenance

Derived from Matt Pocock's `handoff` and `claude-handoff` skills ([mattpocock/skills](https://github.com/mattpocock/skills), MIT), merged with a durable handoff-note practice developed independently. The "Suggested skills" section and the reference-don't-restate rule are his; the two-distance routing and the durable contents contract are gdstack's. See UPSTREAM.md.
