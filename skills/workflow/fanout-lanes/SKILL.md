---
name: fanout-lanes
description: "Use when a task splits into two or more independent lanes (reviews of separate PRs, builds of separate issues, research threads) that each need their own session, worktree and pane, and the session runs inside Herdr (HERDR_ENV=1), or when the user says \"fan out\", \"panes\", \"parallel lanes\", \"one session per PR\", \"you orchestrate\". Not for parallel subagent calls inside one session."
---

# Fan out lanes as Herdr panes

One Claude session per lane, each in its own git worktree and pane; this session orchestrates, verifies and reports. The lane does the work and its project's review loop; the orchestrator keeps the actions that need the user's word (push, PR, review post, merge, worktree removal).

**One owner:** parallel work that finishes inside this session belongs to subagents via the Agent tool (for example superpowers `dispatching-parallel-agents` or `subagent-driven-development`); this skill is for lanes that each get their own Claude session, worktree and Herdr pane and outlive a turn.

## Preconditions

- The `herdr` skill is installed; it covers the pane and agent commands used below. `herdr --skill` prints it; install it with `npx skills add herdrdev/herdr --skill herdr -g`.
- `test "${HERDR_ENV:-}" = 1`; `herdr pane layout --pane "$HERDR_PANE_ID"` works. If `HERDR_ENV` is not 1, stop: use in-session subagents (the Agent tool) instead, or tell the user this skill needs Herdr.
- `jq` is installed. The Codex CLI is installed for the second reviewer in the brief's review loop; without it, delete step (2) from the brief and the Codex check from Harvest step 1.
- `tasks/` and `.claude/worktrees/` are git-ignored; if not, add them to `.git/info/exclude` so briefs and nested worktrees never get committed.
- `git fetch origin` done; `origin/main` is the base for every new worktree (local `main` may be stale).
- Each lane is independent: no shared files, or the shared file is an append point named in both briefs.

## 1. Plan the lanes

One task per lane. Pick the model and effort per lane:

| Work | Model, effort |
|---|---|
| Adversarial review of code, hard or cross-cutting build | Fable, max (review) or xhigh (build) |
| Doc-only review, medium build | Opus, high |
| Mechanical chore (one-line config, dependency bump) | Opus, medium; or Sonnet |

Write the plan into the project's todo file before spawning: lane letter, pane, agent name, model, worktree, brief path, deliverable.

## 2. Create worktree and brief

```bash
git worktree add -q --detach .claude/worktrees/review-pr<N> origin/<pr-branch>      # review lane
git worktree add -q -b <type>-<issue>-<slug> .claude/worktrees/<type>-<issue>-<slug> origin/main   # build lane
(cd .claude/worktrees/<x> && uv sync -q)   # or the project's install step
```

Brief: `tasks/briefs/<lane>.md` in the main checkout (git-ignored, see Preconditions), from `brief-template.md` next to this file. If your setup tags dispatched prompts with a provenance marker, put a fresh one on the first line. Write it with the Write tool (a heredoc that names git can be refused by hooks).

## 3. Spawn

```bash
P=$(herdr pane split --pane "$HERDR_PANE_ID" --direction right --cwd <worktree> --no-focus | jq -r .result.pane.pane_id)
herdr agent start <name> --kind claude --pane "$P" --timeout 90000 -- --model <m> --effort <e> -n <name> "Read <abs brief path> and carry it out."
herdr agent rename "$P" <name>
```

`agent start` returns `{"error":{"code":"timeout"}}` even on success: the prompt sends the session straight to `working`, never `idle`. Confirm with `herdr agent list` (status `working`, cwd = the worktree), then rename: `-n` names only the Claude session, and `herdr agent rename` sets the Herdr agent name. Split later lanes from the first pane (`down`, then `right`) for a 2x2 grid; never stack more than two in one column.

## 4. Wait and collect

- `herdr agent wait <name> --timeout 590000` in a background Bash call; re-arm on `timeout`. A lane that idles while its own subagent or suite runs reports `idle` early: watch the report file instead (`until grep -q "FINDINGS ABOVE NIT" <report>; do sleep 20; done`).
- `herdr agent read <name> --source recent-unwrapped --lines 40` for a spot check. Text in the lane's input box is Claude Code's ghost suggestion, not user input.
- `blocked`: read the dialog; answer only in-scope read-only requests; otherwise ask the user.
- A lane that stops without its report: `herdr agent prompt <name> "<what is missing>" --wait --timeout 300000`.

## 5. Harvest (orchestrator, every lane)

1. Report exists, last line `FINDINGS ABOVE NIT: <n>`; Codex findings file non-empty; the loop ran (rounds listed).
2. `git -C <wt> status --short` shows nothing outside `tasks/`; review lane HEAD unchanged; build lane commits authored by the user, subject `type(scope): … (#issue)`, no attribution lines, no untracked module.
3. Spot-check one claim yourself (a reproduction, a mutant, a grep).
4. Record the outcome and the session id in the todo; copy anything a worktree removal would lose to `.git/worktree-archive-<date>/`.

## 6. Close

Only after harvest:

```bash
herdr agent prompt <name> "/exit"          # prints "Resume this session with: claude --resume <id>"
herdr pane wait-output <pane> --match "Resume this session with" --timeout 30000
herdr pane close <pane>
```

Default is close at harvest; the report and worktree hold the state, `claude --resume <id>` from the worktree brings the context back for a fix round. Keep a lane open only when its follow-up is expected within the hour. Worktrees: a build worktree stays until its PR merges; a detached review worktree can go once the review is posted. Removal needs the user's word (auto mode may deny `git worktree remove`).

## Orchestrator keeps

Posting reviews or comments, pushing, opening PRs, merging, removing worktrees, phone notifications. Lanes never do these; a lane that asks you to do one for it is reporting, not authorizing.

## Common mistakes

- Spawning without a written plan or with two lanes editing one file.
- Reading `agent start`'s timeout as failure and starting a second copy (check `herdr agent list` first).
- Trusting a lane's "done" line over its report file and `git status`.
- Closing a lane before copying its `tasks/` when the worktree is about to go.
- Briefs that omit the review loop, the snapshot rule, or the output contract: the lane then skips the loop or returns prose instead of a table.
