<optional provenance marker, fresh per dispatch, if your setup uses one>
# Lane <letter> (<verb> <PR/issue>): <one-line title>

You are the <review|build> lane for <PR #n / issue #n>. <One sentence on the deliverable.> You do not post on GitHub, push, open PRs or merge; the orchestrator does that on the user's word. Never touch the main checkout or any other worktree.

## Where you are
- Worktree `<abs path>`, <detached at <sha> = PR head | branch <name> off origin/main = <sha>>. Environment is synced (for example `uv run --no-sync …`; substitute your stack); <test infrastructure that is up>.
- Commit identity (build lanes): `git -c user.name="<user>" -c user.email=<email> commit …`; stage explicit paths; no AI attribution; subject `type(scope): subject (#issue)`.
- Read first, in order: <project rules file>; <the ruling / issue / PR body>; <owning design doc sections>; <the files that change>.
- Snapshot rule for mutation runs (example for a uv/pytest src-layout project; substitute your stack): `git archive HEAD | tar -x -C /tmp/snap<N>`, mutate only the copy, run pytest with `PYTHONPATH=/tmp/snap<N>/src`; never edit tracked files in the worktree (review lane: write only under `tasks/`).

## Already checked by the orchestrator (verify, do not re-derive)
<facts established upstream, so the lane spends its effort elsewhere>

## Attack list | What to build
<numbered, concrete: predicates, placement, readers, docs, conventions, mutants with the test expected to kill each>
<build lanes: version numbers pre-assigned, known collisions with open PRs, "if you find yourself designing undocumented behaviour, stop and report it">

## Review loop (required before "done")
In parallel, as soon as the suite is green: (1) an adversarial reviewer via the Agent tool (`general-purpose`, `effort: max|high`) with this attack list, the snapshot rule and the severity discipline; (2) Codex CLI: prompt to `tasks/codex-<n>-r1-prompt.md`, then from the worktree `codex exec --sandbox read-only --output-last-message tasks/codex-<n>-r1-findings.md - < tasks/codex-<n>-r1-prompt.md > tasks/codex-<n>-r1-run.log 2>&1` in the background (prompt on stdin). Reproduce every finding above nit before keeping it; check it against the plan (rulings, open issues, open PRs). Build lane: fix above-nit findings with TDD, re-run both. Review lane: you do not fix the author's code; prove each kept finding with a failing test or a mutant on the snapshot, and round 2 re-attacks your round-1 report (refute kept findings, find what was missed). Cap at two rounds, then report the rest. `git status` before and after each round.

Severity: nit = wording, naming, comments. Anything that can <domain-specific losses: lose or corrupt data, change a user-visible result, weaken an existing test, crash> is follow-up or blocker.

## Output
- <commits on the branch, not pushed | nothing committed>
- `tasks/<report>.md`: findings table in the project's format (`file:line` / MATCH|DIVERGES|MISSING / blocker|follow-up|nit / claim), reproductions for every finding above nit, "Verified OK" bullets with how, suite summary lines, mutant table, review rounds, recommended verdict, and a ready-to-post body in plain prose for the user.
- <`tasks/pr-<n>-body.md` for build lanes>
Last line of the report, exactly: `FINDINGS ABOVE NIT: <n>`. Then reply in the terminal with only the report path(s).
