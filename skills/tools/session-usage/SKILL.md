---
name: session-usage
description: "Report where tokens went across Claude Code and Codex sessions: context growth, cache rewrites, subagents, tool output and logged cost. Reads local session logs and prints metrics only."
disable-model-invocation: true
---

# Session usage

Answer one question: where did the tokens go? This skill reports. It changes nothing and proposes no fixes.

The report holds metrics, session ids, project folder names, model names and tool names. It never holds message text, tool input or tool output, so you can paste it into another session. Keep it that way: read the logs only through the script, because logs can contain secrets.

## Steps

1. Run the script from this skill's folder. Use the window the user asked for. Without one, use the 7-day default.

   ```bash
   python3 scripts/session_usage.py
   python3 scripts/session_usage.py --since 30d --top 5
   ```

   It scans every `~/.claude*/projects` folder and `~/.codex/sessions`. To read other logs, such as a copy from another machine, pass their files or folders as arguments.

2. Run the detail view for each session the user named or that dominates the table.

   ```bash
   python3 scripts/session_usage.py --session <id-prefix>
   ```

   If the id is not found, widen the window with `--since all`.

3. If the user asks what a context limit would save, add `--simulate-cap <tokens>` to the detail view.

4. Report the scope line, then the sessions that stand out, with their numbers. Use the guide below. Finish when each number you cite comes from the script's output.

## Reading the report

| Field | Meaning | Look for |
|---|---|---|
| Processed | All input tokens across calls. Each call counts its whole context again. | A few sessions holding most of the total. |
| Peak | Largest context of one main-thread call. | A high peak with 0 resets: every later call carried the whole history. |
| Resets | Times context fell by half or more from at least 50,000 tokens. Compaction causes this, but so can other context changes. | 0 in a long session. |
| Rewrites | Cache writes of 100,000 tokens or more, with the idle time before each in the detail view. | Long gaps: the cache probably expired, and the next call wrote the context again. |
| Subs | Subagent or child sessions folded into this row. | Subagents holding most of the session's total. |
| Tool output | Characters returned, by tool. | One tool dominating. These characters stay in context for later calls. |

## Limits

- **Processed is not a bill.** Most of it is usually cache reads, which cost far less than uncached input. On a subscription, no call is billed at these rates.
- **Cost appears only where the log recorded it.** Claude Code writes it per session, and a running session may not have it yet. Whether it includes subagents is unverified. Codex logs have none. The script holds no price table, because prices go stale.
- **Written can read 0 for Codex** when the log does not report cache writes. Treat that as unknown, not as no writes.
- **The cap simulation is an upper estimate.** It ignores rebuilding the cache after each restart and any work lost in the restart.
- **The window filters calls, not cost.** Logged cost always covers the whole session.
- **Log formats are undocumented and can change.** The script counts malformed lines in its scope line. If totals look wrong, compare one session with the provider's own usage screen.
