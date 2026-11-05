#!/usr/bin/env python3
"""Report token use from Claude Code and Codex session logs.

Reads usage fields and the size of tool output. Message text, tool input and
tool output are never printed, so a report is safe to paste into another session.

  session_usage.py                         last 7 days, every local log root
  session_usage.py --since 30d --top 5     widen the window, show five sessions
  session_usage.py --session 2df69d30      one session in detail
  session_usage.py --session 2df69d30 --simulate-cap 200000
  session_usage.py path/to/logs            only these files or folders
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sys
from collections import Counter
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Iterable, Iterator, Optional

DEFAULT_WINDOW = "7d"
# A reset is context falling by at least half from a size worth compacting.
# Claude Code logs carry no compaction marker, and Codex forks inherit their parent's
# markers before their first call, so both providers use this one rule.
RESET_MIN_CONTEXT = 50_000
RESET_RATIO = 0.5
GROWTH_POINTS = 12


@dataclass
class Call:
    """One model call. `context` is every input token the call processed."""

    time: float
    context: int
    fresh: int
    cache_read: int
    cache_write: int
    output: int
    model: str


@dataclass
class Session:
    provider: str
    id: str
    project: str = "?"
    parent: Optional[str] = None
    logged_cost: Optional[float] = None
    calls: list[Call] = field(default_factory=list)
    tool_chars: Counter = field(default_factory=Counter)
    subagents: list["Session"] = field(default_factory=list)

    @property
    def subagent_calls(self) -> list[Call]:
        return [call for child in self.subagents for call in child.calls]

    @property
    def all_calls(self) -> list[Call]:
        return self.calls + self.subagent_calls


@dataclass
class Scan:
    sessions: list[Session]
    files: int = 0
    skipped_files: int = 0
    bad_lines: int = 0


def parse_time(stamp: Optional[str]) -> Optional[float]:
    if not stamp:
        return None
    try:
        return datetime.fromisoformat(stamp.replace("Z", "+00:00")).timestamp()
    except ValueError:
        return None


def parse_since(value: Optional[str], now: datetime) -> Optional[float]:
    """Turn 7d, 24h, YYYY-MM-DD or all into an epoch cutoff."""
    if value is None or value == "all":
        return None
    match = re.fullmatch(r"(\d+)([dh])", value)
    if match:
        amount, unit = int(match[1]), match[2]
        delta = timedelta(days=amount) if unit == "d" else timedelta(hours=amount)
        return (now - delta).timestamp()
    try:
        return datetime.fromisoformat(value).timestamp()
    except ValueError:
        raise argparse.ArgumentTypeError(f"--since: expected 7d, 24h, YYYY-MM-DD or all, got {value!r}")


def text_size(value: Any) -> int:
    """Count characters in a tool result without keeping them."""
    if isinstance(value, str):
        return len(value)
    if isinstance(value, list):
        return sum(text_size(item) for item in value)
    if isinstance(value, dict):
        return sum(text_size(value.get(key)) for key in ("text", "content", "output"))
    return 0


def claude_session(records: Iterable[dict], path: Path, since: Optional[float], seen: set) -> Session:
    in_subagent_folder = path.parent.name == "subagents"
    session = Session("claude", path.stem, parent=path.parent.parent.name if in_subagent_folder else None)
    tool_names: dict[str, str] = {}
    for record in records:
        if session.project == "?" and record.get("cwd"):
            session.project = Path(record["cwd"]).name
        if record.get("type") == "cost-state":
            session.logged_cost = record.get("totalCostUSD")
            continue
        message = record.get("message")
        time = parse_time(record.get("timestamp"))
        if not isinstance(message, dict) or time is None:
            continue
        content = message.get("content")
        blocks = [block for block in content if isinstance(block, dict)] if isinstance(content, list) else []
        if record.get("type") == "assistant":
            for block in blocks:
                if block.get("type") == "tool_use":
                    tool_names[block.get("id")] = block.get("name", "?")
            add_claude_call(session, message, record, time, since, seen)
        elif record.get("type") == "user" and (since is None or time >= since):
            for block in blocks:
                tool_id = block.get("tool_use_id")
                if block.get("type") == "tool_result" and ("tool", tool_id) not in seen:
                    seen.add(("tool", tool_id))
                    session.tool_chars[tool_names.get(tool_id, "?")] += text_size(block.get("content"))
    return session


def add_claude_call(session: Session, message: dict, record: dict, time: float, since: Optional[float], seen: set) -> None:
    usage = message.get("usage")
    if not usage or message.get("model") == "<synthetic>" or (since is not None and time < since):
        return
    # One API call spans several log lines, and a resumed session can repeat earlier lines.
    key = (message.get("id"), record.get("requestId")) if message.get("id") else record.get("uuid")
    if key in seen:
        return
    seen.add(key)
    fresh = usage.get("input_tokens", 0)
    cache_read = usage.get("cache_read_input_tokens", 0)
    cache_write = usage.get("cache_creation_input_tokens", 0)
    session.calls.append(
        Call(time, fresh + cache_read + cache_write, fresh, cache_read, cache_write, usage.get("output_tokens", 0), message.get("model", "?"))
    )


def codex_session(records: Iterable[dict], path: Path, since: Optional[float]) -> Session:
    session = Session("codex", path.stem)
    has_meta = False
    model = "?"
    previous_total = None
    tool_names: dict[str, str] = {}
    for record in records:
        kind = record.get("type")
        payload = record.get("payload") if isinstance(record.get("payload"), dict) else {}
        subtype = payload.get("type")
        time = parse_time(record.get("timestamp"))
        if kind == "session_meta" and not has_meta:
            has_meta = True
            session.id = payload.get("id") or session.id
            session.parent = payload.get("parent_thread_id") or payload.get("forked_from_id")
            session.project = Path(payload.get("cwd") or "?").name
        elif kind == "turn_context":
            model = payload.get("model") or model
        elif subtype == "token_count" and payload.get("info") and time is not None:
            info = payload["info"]
            total = info["total_token_usage"]["total_tokens"]
            if total == previous_total:  # Codex repeats the event when nothing new ran.
                continue
            previous_total = total
            if since is None or time >= since:
                session.calls.append(codex_call(info["last_token_usage"], time, model))
        elif subtype in ("function_call", "custom_tool_call"):
            tool_names[payload.get("call_id")] = payload.get("name", "?")
        elif subtype in ("function_call_output", "custom_tool_call_output"):
            if time is not None and (since is None or time >= since):
                session.tool_chars[tool_names.get(payload.get("call_id"), "?")] += text_size(payload.get("output"))
    return session


def codex_call(usage: dict, time: float, model: str) -> Call:
    # Unlike Claude's usage, Codex's input_tokens already includes the cached tokens.
    context = usage.get("input_tokens", 0)
    cache_read = usage.get("cached_input_tokens", 0)
    cache_write = usage.get("cache_write_input_tokens", 0)
    return Call(time, context, max(0, context - cache_read - cache_write), cache_read, cache_write, usage.get("output_tokens", 0), model)


def read_records(path: Path) -> tuple[list[dict], int]:
    records, bad_lines = [], 0
    with path.open(errors="ignore") as handle:
        for line in handle:
            if not line.strip():
                continue
            try:
                record = json.loads(line)
            except ValueError:
                bad_lines += 1
                continue
            if isinstance(record, dict):
                records.append(record)
    return records, bad_lines


def is_codex(records: list[dict]) -> bool:
    return bool(records) and records[0].get("type") in ("session_meta", "turn_context", "event_msg", "response_item")


def default_roots() -> list[Path]:
    """Every Claude config folder (accounts can have their own) and the Codex sessions folder."""
    home = Path.home()
    roots = list(home.glob(".claude*/projects"))
    if os.environ.get("CLAUDE_CONFIG_DIR"):
        roots.append(Path(os.environ["CLAUDE_CONFIG_DIR"]) / "projects")
    roots.append(Path(os.environ.get("CODEX_HOME", home / ".codex")) / "sessions")
    return sorted({root.resolve() for root in roots if root.is_dir()})


def log_files(targets: Iterable[Path], since: Optional[float]) -> Iterator[Path]:
    """Yield logs oldest first, so a resumed session's repeated lines count once, in the original."""
    found = set()
    for target in targets:
        found.update(target.rglob("*.jsonl") if target.is_dir() else [target])
    dated = []
    for path in found:
        try:
            modified = path.stat().st_mtime
        except OSError:
            continue
        if since is None or modified >= since:
            dated.append((modified, path))
    yield from (path for _, path in sorted(dated))


def scan(targets: Iterable[Path], since: Optional[float]) -> Scan:
    result = Scan([])
    seen: set = set()
    for path in log_files(targets, since):
        try:
            records, bad_lines = read_records(path)
        except OSError:
            result.skipped_files += 1
            continue
        result.files += 1
        result.bad_lines += bad_lines
        session = codex_session(records, path, since) if is_codex(records) else claude_session(records, path, since, seen)
        result.sessions.append(session)
    result.sessions = attach_subagents(result.sessions)
    return result


def attach_subagents(sessions: list[Session]) -> list[Session]:
    """Fold each child into its top-level parent. A child whose parent is out of scope stands alone."""
    by_id = {session.id: session for session in sessions}

    def root_of(session: Session) -> Session:
        visited = {session.id}
        while session.parent in by_id and session.parent not in visited:
            session = by_id[session.parent]
            visited.add(session.id)
        return session

    top_level = []
    for session in sessions:
        root = root_of(session)
        if root is session:
            top_level.append(session)
        else:
            root.subagents.append(session)
    return [session for session in top_level if session.all_calls]


def context_resets(calls: list[Call]) -> int:
    return sum(
        1
        for before, after in zip(calls, calls[1:])
        if before.context >= RESET_MIN_CONTEXT and after.context <= before.context * RESET_RATIO
    )


def cache_rewrites(calls: list[Call], minimum: int) -> list[tuple[float, int, Optional[int]]]:
    """Large cache writes, with the idle minutes before each. A long gap suggests an expired cache."""
    rewrites = []
    for index, call in enumerate(calls):
        if call.cache_write >= minimum:
            gap = round((call.time - calls[index - 1].time) / 60) if index else None
            rewrites.append((call.time, call.cache_write, gap))
    return rewrites


def simulate_cap(calls: list[Call], cap: int) -> tuple[int, int]:
    """Replay the context growth with a restart at `cap`. Returns (restarts, tokens processed)."""
    base = calls[0].context
    simulated = base
    restarts = processed = 0
    previous = base
    for call in calls:
        simulated = min(simulated, call.context) if call.context < previous else simulated + call.context - previous
        previous = call.context
        if simulated > cap:
            simulated = base
            restarts += 1
        processed += simulated
    return restarts, processed


def totals(calls: list[Call]) -> dict[str, int]:
    return {
        "calls": len(calls),
        "processed": sum(call.context for call in calls),
        "fresh": sum(call.fresh for call in calls),
        "cache_read": sum(call.cache_read for call in calls),
        "cache_write": sum(call.cache_write for call in calls),
        "output": sum(call.output for call in calls),
    }


def session_summary(session: Session, rewrite_min: int, cap: Optional[int]) -> dict:
    calls = session.calls
    summary = {
        "provider": session.provider,
        "id": session.id,
        "project": session.project,
        "start": min(call.time for call in session.all_calls),
        "end": max(call.time for call in session.all_calls),
        "models": Counter(call.model for call in session.all_calls).most_common(),
        "main": totals(calls),
        "all": totals(session.all_calls),
        "subagents": len(session.subagents),
        "first_context": calls[0].context if calls else 0,
        "peak_context": max((call.context for call in calls), default=0),
        "context_resets": context_resets(calls),
        "cache_rewrites": cache_rewrites(calls, rewrite_min),
        "tool_chars": (session.tool_chars + sum((child.tool_chars for child in session.subagents), Counter())).most_common(),
        "logged_cost": session.logged_cost,
    }
    if cap and calls:
        restarts, processed = simulate_cap(calls, cap)
        actual = summary["main"]["processed"]
        summary["simulated_cap"] = {
            "cap": cap,
            "restarts": restarts,
            "processed": processed,
            "saving_percent": round(100 * (1 - processed / actual)) if actual else 0,
        }
    return summary


def short(number: float) -> str:
    for limit, suffix in ((1e9, "B"), (1e6, "M"), (1e3, "k")):
        if abs(number) >= limit:
            return f"{number / limit:.1f}{suffix}"
    return str(int(number))


def clock(epoch: float) -> str:
    return datetime.fromtimestamp(epoch).strftime("%Y-%m-%d %H:%M")


def cost_text(summary: dict) -> str:
    cost = summary["logged_cost"]
    return "-" if cost is None else f"${cost:.2f}"


def scope_lines(window: str, result: Scan, shown: int) -> list[str]:
    lines = [f"Scope: {window}, {result.files} log files, {len(result.sessions)} sessions, showing {shown}"]
    if result.skipped_files or result.bad_lines:
        lines.append(f"Not read: {result.skipped_files} files, {result.bad_lines} malformed lines")
    return lines


def table(summaries: list[dict]) -> list[str]:
    header = f"{'Session':<9}{'Tool':<7}{'Project':<24}{'Calls':>7}{'Peak':>8}{'Processed':>11}{'Written':>9}{'Output':>8}{'Resets':>7}{'Rewrites':>9}{'Subs':>5}{'Cost':>9}"
    lines = [header]
    for item in summaries:
        lines.append(
            f"{item['id'][:8]:<9}{item['provider']:<7}{item['project'][:23]:<24}{item['all']['calls']:>7}"
            f"{short(item['peak_context']):>8}{short(item['all']['processed']):>11}{short(item['all']['cache_write']):>9}"
            f"{short(item['all']['output']):>8}{item['context_resets']:>7}{len(item['cache_rewrites']):>9}"
            f"{item['subagents']:>5}{cost_text(item):>9}"
        )
    return lines


def detail(item: dict, calls: list[Call], rewrite_min: int) -> list[str]:
    main, everything = item["main"], item["all"]
    lines = [
        f"Session {item['id']} ({item['provider']}, {item['project']})",
        f"Span: {clock(item['start'])} to {clock(item['end'])}",
        f"Models: {', '.join(f'{name} ({count})' for name, count in item['models'])}",
        f"Logged cost: {cost_text(item)}",
        "",
        f"Main thread: {main['calls']} calls, context {short(item['first_context'])} to peak {short(item['peak_context'])}, {item['context_resets']} resets",
        f"Processed {short(main['processed'])}: cache read {short(main['cache_read'])}, cache written {short(main['cache_write'])}, uncached {short(main['fresh'])}. Output {short(main['output'])}",
    ]
    if item["subagents"]:
        lines.append(f"Subagents: {item['subagents']} sessions, {everything['calls'] - main['calls']} calls, {short(everything['processed'] - main['processed'])} processed")
    if calls:
        step = max(1, len(calls) // GROWTH_POINTS)
        lines += ["", "Context growth:"] + [f"  {clock(call.time)}  {short(call.context)}" for call in calls[::step]]
    if item["cache_rewrites"]:
        lines += ["", f"Cache rewrites of {short(rewrite_min)} or more:"]
        for time, tokens, gap in item["cache_rewrites"]:
            lines.append(f"  {clock(time)}  {short(tokens)}, {'first call' if gap is None else f'{gap} min since the previous call'}")
    if item["tool_chars"]:
        lines += ["", "Tool output, in characters:"] + [f"  {short(size):>8}  {name}" for name, size in item["tool_chars"][:10]]
    if "simulated_cap" in item:
        sim = item["simulated_cap"]
        lines += [
            "",
            f"Simulated restart at {short(sim['cap'])}: {sim['restarts']} restarts, {short(sim['processed'])} processed, {sim['saving_percent']}% less.",
            "This is an upper estimate. It ignores the cost of rebuilding cache and state after each restart.",
        ]
    return lines


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Report token use from Claude Code and Codex session logs. Prints metrics only, never message text.")
    parser.add_argument("paths", nargs="*", type=Path, help="log files or folders; default is every local log root")
    parser.add_argument("--since", help=f"7d, 24h, YYYY-MM-DD or all; default {DEFAULT_WINDOW}, or all when paths are given")
    parser.add_argument("--session", help="show one session in detail, by id or id prefix")
    parser.add_argument("--top", type=int, default=15, help="sessions to show, most tokens processed first")
    parser.add_argument("--rewrite-min", type=int, default=100_000, help="cache write size that counts as a rewrite")
    parser.add_argument("--simulate-cap", type=int, help="with --session, estimate a restart at this context size")
    parser.add_argument("--json", action="store_true", help="print JSON")
    return parser


def main(argv: Optional[list[str]] = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    if args.simulate_cap and not args.session:
        parser.error("--simulate-cap needs --session")
    window = args.since or ("all" if args.paths else DEFAULT_WINDOW)
    try:
        since = parse_since(window, datetime.now())
    except argparse.ArgumentTypeError as error:
        parser.error(str(error))
    missing = [str(path) for path in args.paths if not path.exists()]
    if missing:
        parser.error(f"no such path: {', '.join(missing)}")
    result = scan(args.paths or default_roots(), since)

    sessions = sorted(result.sessions, key=lambda session: -sum(call.context for call in session.all_calls))
    if args.session:
        sessions = [session for session in sessions if session.id.startswith(args.session)]
        if len(sessions) != 1:
            print(f"--session {args.session}: {len(sessions)} matches in scope ({window}). Try a longer id or --since all.", file=sys.stderr)
            return 1
    else:
        sessions = sessions[: args.top]
    summaries = [session_summary(session, args.rewrite_min, args.simulate_cap) for session in sessions]

    if args.json:
        print(json.dumps({"window": window, "files": result.files, "sessions_in_scope": len(result.sessions), "skipped_files": result.skipped_files, "bad_lines": result.bad_lines, "sessions": summaries}, indent=2))
        return 0
    lines = scope_lines(window, result, len(summaries))
    if args.session:
        lines += [""] + detail(summaries[0], sessions[0].calls, args.rewrite_min)
    elif summaries:
        lines += ["", "Processed, Written and Output include subagents. Peak and Resets are the main thread. Cost is the whole session, as logged.", ""] + table(summaries)
    print("\n".join(lines))
    return 0


if __name__ == "__main__":
    sys.exit(main())
