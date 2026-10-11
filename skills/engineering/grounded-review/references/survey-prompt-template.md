# Survey Subagent Prompt Template

Copy this template and fill in the bracketed sections. Dispatch via the `Explore` subagent at thoroughness `very thorough`.

---

```
I need a comprehensive survey of [CORPUS DESCRIPTION, e.g. "the discovery docs in
docs/, the planning docs in code/<sibling-repo>/docs/, and the project memory at
~/.claude/projects/<project>/memory/"] to ground a review of [ARTIFACT, be specific:
path, scope, what version].

## Context I have that you don't

[Paste a tight summary of what is already established in the session: who the user is,
what work has been happening, what the artifact is for, any vocabulary the team uses
that you have already learned. The agent cannot see the conversation history.]

## Files to read

Primary (read carefully, cite liberally):
1. [path]
2. [path]
3. [path]
... (top ~10 most likely relevant)

Secondary (skim, cite if relevant):
1. [path]
2. [path]
... (next ~10)

Also enumerate:
- The root README.md and INDEX.md of [each relevant directory]
- Any file matching [glob patterns: *plan*, *roadmap*, *architecture*, *assessment*]
  in [directories]
- The MEMORY.md index at [path] and any memory files it references that look relevant

## Questions to answer

For each question: give Finding + Evidence (file:line) + Implication for the review.

### Section A: [Artifact-specific questions]
- What is the artifact's stated purpose, and where is that stated?
- What does the artifact say about its own status (production, experimental, deprecated)?
- What dependencies does it claim, and are those claims corroborated elsewhere?

### Section B: [Architecture / system context]
- How does the artifact fit into the larger system as described in planning docs?
- Are there contradictions between the artifact's self-description and the corpus?
- Are there team-shared terms for what the artifact does, and how do they differ from
  the artifact's own terminology?

### Section C: [Workflow / lifecycle]
- Who owns this artifact? Who deploys it? Who consumes its output?
- What is the artifact's history per the corpus (when introduced, why, by whom)?
- Any planned changes mentioned in the corpus?

### Section D: [Contradictions and surprises]
- Anything in the corpus that contradicts the artifact?
- Anything in the corpus that the artifact contradicts?

### Section E: [Anything that changes the frame]
Catch-all. Surface anything you found that would change how a reviewer should approach
this artifact, even if it does not fit the questions above.

## Output requirements

- 2000-3500 words. Longer dilutes signal.
- Quote `file:line` for every claim.
- Explicitly state negative findings: "X is NOT mentioned in [corpus location]."
- If a claim is supported by multiple sources, cite all of them.
- If a claim has only one source, say so explicitly so I can weight it.
- Do not editorialize. I will form the review; you supply grounded evidence.

## Constraints

- READ-ONLY. Do not write, edit, or modify any files.
- Do not query mutable systems (databases, APIs, cloud consoles).
- Do not run commands that have side effects.
- If a file is too large to read in full, sample structurally (first N lines + table
  of contents + any sections matching the questions) and say what you sampled.
```

---

## Tips for using the template

- **Tier the file list.** Primary (10) and secondary (10) is a good default. The agent will read all primary and skim secondary; without tiers it tries to read everything equally and runs out of budget.
- **Front-load the context summary.** The agent's biggest blind spot is what you and the user have already established. A tight 5-10 line summary of "who, what, why" prevents the agent from re-deriving it from raw files.
- **Group questions by section.** This shapes the output structure and makes synthesis easier. The catch-all "anything that changes the frame" section is non-negotiable; it is where surprises surface.
- **Demand negative findings.** Without an explicit ask, agents tend to omit "X was not found" because it feels like nothing to report. The negative findings are often the most useful part.
- **Cap word count.** 2000-3500 is the sweet spot. Past 4000 the report becomes a second artifact you have to review, defeating the purpose.

## When to expand the template

- **Multi-corpus reviews.** If surveying more than one corpus (e.g., docs + memory + sibling repo), break the file list into corpus sections so the agent can pace itself.
- **Long-lived projects.** Add a "what has changed recently?" question pointing the agent at git log or recent memory entries, since corpora accumulate stale claims.
- **Reviews that revisit prior work.** If you are revising an earlier review, include the prior review in the file list and ask: "what claims in the prior review are now contradicted or strengthened by what you found?"
