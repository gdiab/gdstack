---
name: thermo-review
description: "Run an extremely strict maintainability review of a diff: abstraction quality, giant files, spaghetti-condition growth, type and boundary cleanliness. Adapted from Cursor's thermo-nuclear-code-quality-review, with scope detection, per-language guidance, finding classes and a re-review protocol."
disable-model-invocation: true
---

<!-- The section from "# Thermo-Nuclear Code Quality Review" through "## Approval Bar" is Cursor's text, unchanged (MIT, © 2026 Cursor: see LICENSE.cursor in this folder; version and merge notes in UPSTREAM.md). Everything under "# gdstack additions" and in languages/ is gdstack's. -->

# Thermo-Nuclear Code Quality Review

Use this skill for an unusually strict review focused on implementation quality, maintainability, abstraction quality, and codebase health.

Above all, this skill should push the reviewer to be **ambitious** about code structure. Do not merely identify local cleanup opportunities. Actively search for "code judo" moves: restructurings that preserve behavior while making the implementation dramatically simpler, smaller, more direct, and more elegant.

## Core Prompt

Start from this baseline:

> Perform a deep code quality audit of the current branch's changes.
> Rethink how to structure / implement the changes to meaningfully improve code quality without impacting behavior.
> Work to improve abstractions, modularity, reduce Spaghetti code, improve succinctness and legibility.
> Be ambitious, if there is a clear path to improving the implementation that involves restructuring some of the codebase, go for it.
> Be extremely thorough and rigorous. Measure twice, cut once.

## Non-Negotiable Additional Standards

Apply the baseline prompt above, plus these explicit review rules:

0. **Be ambitious about structural simplification.**
   - Do not stop at "this could be a bit cleaner."
   - Look for opportunities to reframe the change so that whole branches, helpers, modes, conditionals, or layers disappear entirely.
   - Prefer the solution that makes the code feel inevitable in hindsight.
   - Assume there is often a "code judo" move available: a re-organization that uses the existing architecture more effectively and makes the change dramatically simpler and more elegant.
   - If you see a path to delete complexity rather than rearrange it, push hard for that path.

1. **Do not let a PR push a file from under 1k lines to over 1k lines without a very strong reason.**
   - Treat this as a strong code-quality smell by default.
   - Prefer extracting helpers, subcomponents, modules, or local abstractions instead of letting a file sprawl past 1000 lines.
   - If the diff crosses that threshold, explicitly ask whether the code should be decomposed first.
   - Only waive this if there is a compelling structural reason and the resulting file is still clearly organized.

2. **Do not allow random spaghetti growth in existing code.**
   - Be highly suspicious of new ad-hoc conditionals, scattered special cases, or one-off branches inserted into unrelated flows.
   - If a change adds "weird if statements in random places", treat that as a design problem, not a stylistic nit.
   - Prefer pushing the logic into a dedicated abstraction, helper, state machine, policy object, or separate module instead of tangling an existing path.
   - Call out changes that make the surrounding code harder to reason about, even if they technically work.

3. **Bias toward cleaning the design, not just accepting working code.**
   - If behavior can stay the same while the structure becomes meaningfully cleaner, push for the cleaner version.
   - Do not rubber-stamp "it works" implementations that leave the codebase messier.
   - Strongly prefer simplifications that remove moving pieces altogether over refactors that merely spread the same complexity around.

4. **Prefer direct, boring, maintainable code over hacky or magical code.**
   - Treat brittle, ad-hoc, or "magic" behavior as a code-quality problem.
   - Be skeptical of generic mechanisms that hide simple data-shape assumptions.
   - Flag thin abstractions, identity wrappers, or pass-through helpers that add indirection without buying clarity.

5. **Push hard on type and boundary cleanliness when they affect maintainability.**
   - Question unnecessary optionality, `unknown`, `any`, or cast-heavy code when a clearer type boundary could exist.
   - Prefer explicit typed models or shared contracts over loosely-shaped ad-hoc objects.
   - If a branch relies on silent fallback to paper over an unclear invariant, ask whether the boundary should be made explicit instead.

6. **Keep logic in the canonical layer and reuse existing helpers.**
   - Call out feature logic leaking into shared paths or implementation details leaking through APIs.
   - Prefer existing canonical utilities/helpers over bespoke one-offs.
   - Push code toward the right package, service, or module instead of normalizing architectural drift.

7. **Treat unnecessary sequential orchestration and non-atomic updates as design smells when the cleaner structure is obvious.**
   - If independent work is serialized for no good reason, ask whether the flow should run in parallel instead.
   - If related updates can leave state half-applied, push for a more atomic structure.
   - Do not over-index on micro-optimizations, but do flag avoidable orchestration complexity that makes the implementation more brittle.

## Primary Review Questions

For every meaningful change, ask:

- Is there a "code judo" move that would make this dramatically simpler?
- Can this change be reframed so fewer concepts, branches, or helper layers are needed?
- Does this improve or worsen the local architecture?
- Did the diff add branching complexity where a better abstraction should exist?
- Did a previously cohesive module become more coupled, more stateful, or harder to scan?
- Is this logic living in the right file and layer?
- Did this change enlarge a file or component past a healthy size boundary?
- Are there repeated conditionals that signal a missing model or missing helper?
- Is the implementation direct and legible, or does it rely on special cases and incidental control flow?
- Is this abstraction actually earning its keep, or is it just a wrapper?
- Did the diff introduce casts, optionality, or ad-hoc object shapes that obscure the real invariant?
- Is this logic living in the canonical layer, or did the diff leak details across a boundary?
- Is this orchestration more sequential or less atomic than it needs to be?

## What to Flag Aggressively

Escalate findings when you see:

- A complicated implementation where a cleaner reframing could delete whole categories of complexity.
- Refactors that move code around but fail to reduce the number of concepts a reader must hold in their head.
- A file crossing 1000 lines due to the PR, especially if the new code could be split out.
- New conditionals bolted onto unrelated code paths.
- One-off booleans, nullable modes, or flags that complicate existing control flow.
- Feature-specific logic leaking into general-purpose modules.
- Generic "magic" handling that hides simple structure and makes the code harder to reason about.
- Thin wrappers or identity abstractions that add indirection without simplifying anything.
- Unnecessary casts, `any`, `unknown`, or optional params that muddy the real contract.
- Copy-pasted logic instead of extracted helpers.
- Narrow edge-case handling implemented in the middle of an already busy function.
- Refactors that technically pass tests but make the code less modular or less readable.
- "Temporary" branching that is likely to become permanent debt.
- Bespoke helpers where the codebase already has a canonical utility for the job.
- Logic added in the wrong layer/package when it should live somewhere more central.
- Sequential async flow where obviously independent work could stay simpler and clearer with parallel execution.
- Partial-update logic that leaves state less atomic than necessary.

## Preferred Remedies

When you identify a code-quality problem, prefer suggestions like:

- Delete a whole layer of indirection rather than polishing it.
- Reframe the state model so conditionals disappear instead of getting centralized.
- Change the ownership boundary so the feature becomes a natural extension of an existing abstraction.
- Turn special-case logic into a simpler default flow with fewer exceptions.
- Extract a helper or pure function.
- Split a large file into smaller focused modules.
- Move feature-specific logic behind a dedicated abstraction.
- Replace condition chains with a typed model or explicit dispatcher.
- Separate orchestration from business logic.
- Collapse duplicate branches into a single clearer flow.
- Delete wrappers that do not meaningfully clarify the API.
- Reuse the existing canonical helper instead of introducing a near-duplicate.
- Make type boundaries more explicit so the control flow gets simpler.
- Move the logic to the package/module/layer that already owns the concept.
- Parallelize independent work when that also simplifies the orchestration.
- Restructure related updates into a more atomic flow when partial state would be harder to reason about.

Do not be satisfied with "maybe rename this" feedback when the real issue is structural.
Do not be satisfied with a merely cleaner version of the same messy idea if there is a plausible path to a much simpler idea.

## Review Tone

Be direct, serious, and demanding about quality.
Do not be rude, but do not soften major maintainability issues into mild suggestions.
If the code is making the codebase messier, say so clearly.
If the implementation missed an opportunity for a dramatic simplification, say that clearly too.

Good phrases:

- `this pushes the file past 1k lines. can we decompose this first?`
- `this adds another special-case branch into an already busy flow. can we move this behind its own abstraction?`
- `this works, but it makes the surrounding code more spaghetti. let's keep the behavior and restructure the implementation.`
- `this feels like feature logic leaking into a shared path. can we isolate it?`
- `this abstraction seems unnecessary. can we just keep the direct flow?`
- `why does this need a cast / optional here? can we make the boundary more explicit instead?`
- `this looks like a bespoke helper for something we already have elsewhere. can we reuse the canonical one?`
- `i think there's a code-judo move here that makes this much simpler. can we reframe this so these branches disappear?`
- `this refactor moves complexity around, but doesn't really delete it. is there a way to make the model itself simpler?`

## Output Expectations

Prioritize findings in this order:

1. Structural code-quality regressions
2. Missed opportunities for dramatic simplification / code-judo restructuring
3. Spaghetti / branching complexity increases
4. Boundary / abstraction / type-contract problems that make the code harder to reason about
5. File-size and decomposition concerns
6. Modularity and abstraction issues
7. Legibility and maintainability concerns

Do not flood the review with low-value nits if there are larger structural issues.
Prefer a smaller number of high-conviction comments over a long list of cosmetic notes.

## Approval Bar

Do not approve merely because behavior seems correct.
The bar for approval is:

- no clear structural regression
- no obvious missed opportunity to make the implementation dramatically simpler when such a path is visible
- no unjustified file-size explosion
- no obvious spaghetti-growth from special-case branching
- no obviously hacky or magical abstraction that makes the code harder to reason about
- no unnecessary wrapper/cast/optionality churn obscuring the real design
- no clear architecture-boundary leak or avoidable canonical-helper duplication
- no missed opportunity for an obvious decomposition that would materially improve maintainability

Treat these as presumptive blockers unless the author can justify them clearly:

- the PR preserves a lot of incidental complexity when there is a plausible code-judo move that would delete it
- the PR pushes a file from below 1000 lines to above 1000 lines
- the PR adds ad-hoc branching that makes an existing flow more tangled
- the PR solves a local problem by scattering feature checks across shared code
- the PR adds an unnecessary abstraction, wrapper, or cast-heavy contract that makes the design more indirect
- the PR duplicates an existing helper or puts logic in the wrong layer when there is a clear canonical home

If those conditions are not met, leave explicit, actionable feedback and push for a cleaner decomposition.

# gdstack additions

Everything above is the core standard. The sections below say how to run it and sharpen a few rules. Where they conflict with the core, the core's bar wins; these sections only add.

## What this review is (and is not)

This is a maintainability and structure review, not a correctness review. Don't hunt for functional bugs or re-run correctness gates the user says already passed, unless a structural change plainly breaks behavior. Correctness belongs to other reviewers and to the tests.

## Before you start

1. **Scope.** In this order:
   1. If the user named a scope (a path, a commit range, a base ref, a PR), review exactly that.
   2. Otherwise, if there are uncommitted changes, review `git diff` plus `git diff --cached`.
   3. Otherwise, review the branch against its merge-base with the default branch. Find the default branch with `git symbolic-ref --short refs/remotes/origin/HEAD`; if that fails, use whichever of `origin/main`, `origin/master`, `origin/dev` exists. Never assume `main`.
2. **Repo conventions.** If `docs/agents/code-review.md` exists, read it before reviewing. It can widen or narrow scope (sub-repos, config files that count as code), name the canonical helpers and layers, and set the ambition level. Treat it as the repo's own extension of Rule 6.
3. **Languages.** For each language in the diff, read the matching file in [languages/](languages/): `csharp.md`, `typescript.md` (also JavaScript), `python.md`, `elixir.md`, `go.md`, `rust.md`, `shell.md`. Read only the ones the diff touches. They say how Rules 1, 5 and 7 show up in that language. A language with no file gets the core rules alone.
4. **Read the code, not just the diff.** Open the surrounding files: Rules 0, 2 and 6 can't be judged from hunks alone.

## Who reviews

Review with fresh eyes. Run the review in a subagent that reads this skill file itself and receives only the scope, not the implementer's reasoning, so its judgement isn't anchored on why the code was written that way. If the user asks for a second model (for example `codex exec`), give it the same skill file and scope. If no subagent is available, review in the current session and say so. The review is read-only: don't modify files, commit or push.

## Ambition

Default to full ambition, as the core asks. When the user or `docs/agents/code-review.md` says the work is an upgrade, migration or other minimal-diff change, switch to **diff-only**: findings must be about problems this diff introduced or extended. List pre-existing debt you noticed under a separate **Out of scope (pre-existing)** heading, without blocking on it.

## Sharper rules

- **`unknown` and its kin are right at the input boundary.** Untrusted input (a parsed request, a deserialized payload, a message from another process) should arrive as the language's "unknown" type and be parsed into a real type once, at the edge. Rule 5's problem is that loose type travelling inward, not its presence at the edge.
- **Make illegal states unrepresentable.** If code defends against a state with checks, ask whether the type or data shape could make that state impossible instead.
- **The next-diff test.** Ask what the next change on top of this one looks like. If this diff makes it harder to write, that's a structural finding.
- **One-caller parameters.** A new parameter, flag or branch that exists for exactly one caller, at the cost of clarity for every other caller, is Rule 2 spaghetti.
- **Temporary needs a removal plan.** A compatibility shim, feature flag or "temporary" branch with no stated removal condition is permanent debt. Ask for the condition.
- **Push unavoidable special cases to the edge.** When a special case can't be modeled away, it belongs at the boundary of the system, not threaded through shared logic.
- **"Didn't know it existed" is a finding.** A bespoke helper that duplicates a canonical one is Rule 6 even when the author missed it honestly.

## Findings format

- **Report classes, not instances.** When the same problem appears more than once, report it once as a class with every instance listed (`file:line`). The author should be able to fix the whole family in one pass.
- **Each finding:** the class name; every instance as `file:line`; what's wrong, in one or two sentences; the concrete restructuring you'd prefer (delete a layer, reframe the state model, extract a module, split the file), not "this could be cleaner"; and whether it's a **presumptive blocker** under the approval bar.
- **Tooling, not findings.** Anything the language file lists under "Hand to tooling" is mechanical. Don't raise individual instances. If the repo has none of those checks wired up, add one tooling-gap note at the end.
- **Order** findings by the core's priority list, blockers first.
- **End with a verdict:** `approve` or `request changes`, against the approval bar, in one line.

## Re-review (round 2 and later)

When reviewing a follow-up to an earlier review of the same work:

1. Read the earlier review first.
2. For each earlier finding, say **resolved**, **partially resolved** or **not resolved**, with `file:line` evidence.
3. Flag anything the follow-up newly orphaned or broke structurally: dead parameters, unused dependencies, leftover config, stale docs.
4. Don't open new fronts on code the follow-up didn't touch, unless it's a presumptive blocker you missed before. Say so plainly if it is.
5. End with the verdict.
