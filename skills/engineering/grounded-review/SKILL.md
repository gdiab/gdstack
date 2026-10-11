---
name: grounded-review
description: "Activate when asked to review, audit, assess, critique, or evaluate an artifact (code repo, doc, config, PR, design) in a project that has accumulated prior context: discovery docs, planning corpora, memory entries, sibling repos, INDEX/README files. Forces a corpus survey via subagent BEFORE forming conclusions from the artifact, then produces a review where every claim is tagged with its source. Use whenever the user says review X, look at X, what do you think of X, audit X, assess X, is this any good, or names a specific repo, doc or PR in a project with a docs folder, multiple repos, or accumulated research, even if they do not mention prior work. Prevents calling claims unverified that are documented elsewhere, missing framing that changes conclusions, and needing two or three correction passes."
---

# Grounded Review

Reviewing an unfamiliar artifact in a project with accumulated context is not the same as reviewing a standalone artifact. The artifact's own documentation may be stale, aspirational, or one person's private framing. Claims you would otherwise mark "unverified" may be settled in a planning doc the user wrote three weeks ago. Vocabulary you would call "private taxonomy" may be team-shared.

The default behavior (read the artifact, form conclusions, write the review) produces cascading errors in this setting. The user has the corpus mental model and you do not, so the user has to correct you, often across multiple passes. This skill prevents that by surveying the corpus first.

## When to use

- Code review of an unfamiliar repo in a multi-repo project
- Architecture or design review when the project has accumulated planning docs
- Any review where the user has said or implied "we have docs about this"
- Any review where prior context has accumulated across sessions and artifacts
- Any time you are about to say "I'll read the repo and tell you what I think" in a project with a populated `docs/` folder

## When to skip

- Reviewing a standalone artifact with no surrounding corpus
- Quick lookups (single-file reads, specific symbol grep)
- The user explicitly says "ignore prior context, look at this fresh"
- The artifact IS the corpus (e.g., reviewing the discovery docs themselves)

## Workflow

### 1. Identify the artifact

Be specific: "the billing-service repo at code/billing-service", not "the billing stuff". If the user was vague, confirm before surveying.

### 2. Enumerate the corpus

Build a list of locations to survey. Check, in this order, and do not stop at the first one:

1. **Obvious project docs**: `docs/`, `docs/discovery/`, `docs/<topic>/`, root-level `README.md` and `INDEX.md`
2. **Sibling artifacts of the same family**: if reviewing a repo at `code/foo`, check `code/bar/docs/`, `code/bar/CLAUDE.md`, `code/bar/.claude/skills/`, and the root of every sibling repo
3. **Planning corpora that may not be co-located with the artifact**: look for files named `*plan*`, `*roadmap*`, `*stabilization*`, `*architecture*`, `*assessment*` anywhere in the project tree
4. **Agent memory**: the harness's project memory (in Claude Code, `~/.claude/projects/*/memory/MEMORY.md`) and the files it indexes
5. **Cross-reference indices**: every `INDEX.md` and `README.md` at a directory root tells you what else exists in that directory; read them

The most common miss is #3: planning docs that live in a sibling repo or a non-obvious subdirectory rather than the project's main `docs/` folder. Stabilization plans, architecture decision records, and roadmaps often live alongside the code they describe rather than in central documentation. Always look outside the obvious location before concluding the corpus is exhausted.

### 3. Dispatch an Explore subagent

Use the `Explore` subagent type at `very thorough`. Pass:

- **Context summary**: what is already established in the session that the agent cannot see
- **Explicit file list**: at least the top ~20 most likely relevant, with primary/secondary tiers
- **Specific questions** grouped by section (artifact-specific, architecture, workflow, contradictions)
- **Citation requirement**: every claim quotes `file:line`
- **Negative-finding requirement**: explicitly state when something is NOT mentioned anywhere
- **Catch-all section**: "anything that changes the frame", for surprises
- **Word-count cap**: typically 2000 to 3500 words; longer dilutes signal
- **Read-only constraint**: do not write files, do not query mutable systems

See `references/survey-prompt-template.md` for the parameterized template to copy from.

### 4. Synthesize the review with source-tagged claims

Every substantive claim in the review carries a source tag. Use this convention:

| Tag | Meaning |
|---|---|
| ✅ confirmed-elsewhere | Claim verified in discovery docs, planning corpus, or sibling repo. Cite `file:line`. |
| 🟡 artifact-only | Claim visible only in the artifact under review. May be the artifact author's private framing, aspirational, or stale. Treat with appropriate skepticism. |
| ❌ inferred | Not directly supported by either the artifact or the corpus. Mark explicitly as inference. |

A well-grounded review reads like this:

> The repo describes itself with one term 🟡 (artifact-only, README.md:12). The team-shared term in the planning corpus is different ✅ (sibling-repo/docs/PLAN.md:84, docs/recommendations.md:312). I will use the team-shared term below.

Every review produced via this skill SHOULD include a section near the top that summarizes the corpus survey: which docs were read, which questions were answered, and any negative findings worth flagging. This makes the grounding legible to the reader and surfaces gaps.

### 5. Diff-from-prior-pass section (only when revising)

If you are revising an earlier review, include an explicit table of what changed and why. This makes corrections legible and prevents the user from having to mentally diff. Format:

| Prior claim | Revised claim | Why it changed |
|---|---|---|
| "X is unverified" | "X confirmed in plan.md:42" | Found in planning corpus on pass 2 |
| "term Y is private framing" | "term Y is team-shared" | Cross-referenced 3 planning docs |

## Red flags during execution

These thoughts mean STOP and re-survey:

| Thought | What it usually means |
|---|---|
| "The repo's README is enough context" | You have not surveyed the corpus. The README is artifact-only. |
| "I'll skim a few docs and start writing" | Use a subagent. Skimming compresses too much. |
| "There's no planning doc for this" | Have you looked in sibling repos? In `code/*/docs/`? |
| "I'm going to call this claim unverified" | Search the corpus first. The user may have written about it. |
| "The terminology in the repo is private framing" | Cross-reference 2-3 other docs before saying this. |

## What success looks like

A grounded review:

- Names the corpus surveyed up front
- Cites `file:line` for cross-corpus claims
- Distinguishes artifact-only claims from cross-verified ones without being asked
- Surfaces negative findings ("X is NOT mentioned anywhere in the corpus") explicitly
- Does not need 2+ correction passes from the user before landing
- If revising, makes the diff from the prior pass legible

A review that fails this skill's bar will, on average, get the user reply: "you missed [doc]" or "that's actually in [planning corpus], you don't need to mark it unverified."

## Why this matters

The pattern this skill addresses: a review that needs three passes to land. First pass jumps into the artifact without surveying docs. Second pass reads the obvious documentation folder but misses a planning corpus that lives elsewhere (commonly in a sibling repo). Third pass, only after the user explicitly points to the missing context, grounds fully and corrects vocabulary errors plus a number of "unverified" claims that were actually settled in the corpus all along.

The cost of three passes is not just time; it is trust. Each correction signals that the model did not understand the context the user was operating in. The corpus survey is cheap (one subagent call, ~30 seconds of wall time, a few thousand tokens). Doing it first is the difference between a review the user can use and a review the user has to fix.
