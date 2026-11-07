#!/usr/bin/env python3
"""Reduce one Claude Code or Codex session log to a short masked digest for a retrospective.

  session_digest.py 2df69d30             find a session by id or id prefix
  session_digest.py path/to/session.jsonl

Prints tool counts, failed calls with the start of each error, repeated calls
and the start of each user message. Masking is best effort, so keep the digest
out of commits and shared documents. Assistant text and the output of
successful calls are never printed.
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sys
from collections import Counter
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Any, Iterator, Optional

LABEL_CHARS = 90
USER_CHARS = 160
ERROR_CHARS = 120
ERROR_SCAN_CHARS = 2000  # Mask this much, so a secret that starts near the cut is still whole.
MAX_FAILURES = 15
MAX_REPEATS = 10
MAX_USER_MESSAGES = 40
REPEAT_MIN = 3

SECRET_NAME = r"[\w.-]*(?:password|passwd|pwd|secret|token|api[_-]?key|access[_-]?key|account[_-]?key|credential|private[_-]?key)[\w.-]*"
# One shell argument: escapes, quoted segments and plain text joined, up to whitespace or a shell separator.
SHELL_ARG = r"(?:\\.|\"[^\"]*\"|'[^']*'|[^\s;&|\"'\\])+"
MASKS = [
    (re.compile(r"://[^/\s:@]+:[^/\s@]+@"), "://***@"),
    (re.compile(r"(?i)\b(bearer|basic)\s+[\w.~+/=-]+"), r"\1 ***"),
    # Basic auth flags hold user:password, with or without a separator. Without a colon they are plain options.
    (re.compile(rf"(\s)(-u|-a|--user|--auth)[ =]?(?=\S*:){SHELL_ARG}"), r"\1\2 ***"),
    (re.compile(rf"\b(sshpass\s+-p)\s*{SHELL_ARG}"), r"\1 ***"),
    (re.compile(rf"\b(mysql|mysqldump|mariadb)\b([^|;&]*?\s)-p{SHELL_ARG}"), r"\1\2-p***"),
    (re.compile(rf"(?i)(--?{SECRET_NAME})[ =]{SHELL_ARG}"), r"\1 ***"),
    (re.compile(rf"(?i)({SECRET_NAME})[\"']?\s*[:=]\s*{SHELL_ARG}"), r"\1=***"),
    (re.compile(r"[\w.+-]+@[\w-]+\.[\w.-]+"), "***@***"),
]
OPAQUE = re.compile(r"[A-Za-z0-9+=_-]{24,}")
# Harness text that logs record as user messages. Other leading tags can be the user's own.
INJECTED = re.compile(r"\s*<(?:system-reminder|command-|local-command|task-notification|environment_context|user_instructions|turn_aborted)")


def mask(text: str, limit: int) -> str:
    """Mask first and cut after, so a cut can't leave part of a secret unmatched."""
    text = re.sub(r"\s+", " ", text.replace('\\"', '"')).strip()  # Codex arguments are escaped JSON.
    for pattern, replacement in MASKS:
        text = pattern.sub(replacement, text)
    text = OPAQUE.sub(lambda match: "***" if re.search(r"\d", match[0]) else match[0], text)
    return text if len(text) <= limit else text[: limit - 3] + "..."


@dataclass
class Digest:
    provider: str
    session: str
    start: Optional[float] = None
    end: Optional[float] = None
    tools: Counter = field(default_factory=Counter)
    failed: Counter = field(default_factory=Counter)
    failures: list[tuple[float, str, str, str]] = field(default_factory=list)
    labels: Counter = field(default_factory=Counter)
    users: list[tuple[float, int, str]] = field(default_factory=list)
    failures_known: bool = True
    bad_lines: int = 0
    subagent_logs: int = 0

    def saw(self, time: float) -> None:
        self.start = time if self.start is None else min(self.start, time)
        self.end = time if self.end is None else max(self.end, time)

    def add_tool(self, name: str, label: str) -> None:
        self.tools[name] += 1
        if label:
            self.labels[f"{name}: {label}"] += 1

    def add_user(self, time: float, text: str) -> None:
        if text.strip() and not INJECTED.match(text):
            self.users.append((time, len(text), mask(text, USER_CHARS)))


def parse_time(stamp: Optional[str]) -> Optional[float]:
    if not stamp:
        return None
    return datetime.fromisoformat(stamp.replace("Z", "+00:00")).timestamp()


def block_text(content: Any) -> str:
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        return "\n".join(block.get("text", "") for block in content if isinstance(block, dict) and block.get("type") in ("text", "input_text"))
    return ""


class ClaudeReader:
    def __init__(self, path: Path) -> None:
        self.digest = Digest("claude", path.stem)
        self.calls: dict[str, tuple[str, str]] = {}

    def add(self, record: dict) -> None:
        message = record.get("message")
        time = parse_time(record.get("timestamp"))
        if not isinstance(message, dict) or time is None:
            return
        self.digest.saw(time)
        content = message.get("content")
        blocks = [block for block in content if isinstance(block, dict)] if isinstance(content, list) else []
        if record.get("type") == "assistant":
            for block in blocks:
                if block.get("type") == "tool_use":
                    self.add_tool_use(block)
        elif record.get("type") == "user":
            for block in blocks:
                if block.get("type") == "tool_result" and block.get("is_error"):
                    name, label = self.calls.get(block.get("tool_use_id"), ("?", ""))
                    self.digest.failed[name] += 1
                    error = mask(block_text(block.get("content"))[:ERROR_SCAN_CHARS], ERROR_CHARS)
                    self.digest.failures.append((time, name, label, error))
            if not record.get("isMeta"):
                self.digest.add_user(time, block_text(content))

    def add_tool_use(self, block: dict) -> None:
        name = str(block.get("name", "?"))
        tool_input = block.get("input") if isinstance(block.get("input"), dict) else {}
        raw = next((tool_input[key] for key in ("command", "file_path", "pattern", "url", "description") if tool_input.get(key)), "")
        label = mask(str(raw), LABEL_CHARS)
        self.calls[block.get("id")] = (name, label)
        self.digest.add_tool(name, label)


class CodexReader:
    def __init__(self, path: Path) -> None:
        self.digest = Digest("codex", path.stem, failures_known=False)

    def add(self, record: dict) -> None:
        payload = record.get("payload") if isinstance(record.get("payload"), dict) else {}
        kind = payload.get("type")
        time = parse_time(record.get("timestamp"))
        if record.get("type") == "session_meta" and payload.get("id"):
            self.digest.session = str(payload["id"])
        if time is None or record.get("type") != "response_item":
            return
        self.digest.saw(time)
        if kind in ("function_call", "custom_tool_call"):
            raw = payload.get("input") or payload.get("arguments") or ""
            self.digest.add_tool(str(payload.get("name", "?")), mask(str(raw), LABEL_CHARS))
        elif kind == "message" and payload.get("role") == "user":
            self.digest.add_user(time, block_text(payload.get("content")))


def read_digest(path: Path) -> Digest:
    reader = None
    bad_lines = 0
    with path.open(errors="ignore") as handle:
        for line in handle:
            if not line.strip():
                continue
            try:
                record = json.loads(line)
                if not isinstance(record, dict):
                    raise ValueError("not an object")
                if reader is None:
                    codex = record.get("type") in ("session_meta", "turn_context", "event_msg", "response_item")
                    reader = (CodexReader if codex else ClaudeReader)(path)
                reader.add(record)
            except (AttributeError, KeyError, TypeError, ValueError):
                bad_lines += 1
    digest = reader.digest if reader else Digest("?", path.stem)
    digest.bad_lines = bad_lines
    subagents = path.with_suffix("") / "subagents"
    digest.subagent_logs = len(list(subagents.glob("*.jsonl"))) if subagents.is_dir() else 0
    return digest


def log_roots() -> list[Path]:
    home = Path.home()
    roots = list(home.glob(".claude*/projects"))
    if os.environ.get("CLAUDE_CONFIG_DIR"):
        roots.append(Path(os.environ["CLAUDE_CONFIG_DIR"]) / "projects")
    roots.append(Path(os.environ.get("CODEX_HOME", home / ".codex")) / "sessions")
    return sorted({root.resolve() for root in roots if root.is_dir()})


def find_logs(session: str, roots: list[Path]) -> Iterator[Path]:
    for root in roots:
        for path in root.rglob(f"*{session}*.jsonl"):
            if path.parent.name != "subagents":
                yield path


def clock(epoch: float) -> str:
    return datetime.fromtimestamp(epoch).strftime("%Y-%m-%d %H:%M")


def render(digest: Digest) -> str:
    span = f"{clock(digest.start)} to {clock(digest.end)}" if digest.start is not None else "no timed records"
    lines = [
        f"Session {digest.session} ({digest.provider}), {span}",
        f"Subagent logs not in this digest: {digest.subagent_logs}. Malformed lines: {digest.bad_lines}.",
        "",
        "Tool calls (failed):",
    ]
    lines += [f"  {count:>5} ({digest.failed[name]})  {name}" for name, count in digest.tools.most_common()]
    shown_failures = min(MAX_FAILURES, len(digest.failures))
    lines += ["", f"Failed calls, {shown_failures} of {len(digest.failures)}:" if digest.failures_known else "Failed calls: not available, Codex logs have no failure flag."]
    for time, name, label, error in digest.failures[:MAX_FAILURES]:
        lines += [f"  {clock(time)}  {name}: {label}", f"      error: {error}"]
    repeats = [(label, count) for label, count in digest.labels.most_common(MAX_REPEATS) if count >= REPEAT_MIN]
    lines += ["", f"Calls repeated {REPEAT_MIN} or more times:"] + [f"  {count:>5}  {label}" for label, count in repeats]
    shown = spread(digest.users, MAX_USER_MESSAGES)
    lines += ["", f"User messages, {len(shown)} of {len(digest.users)} (time, length, masked start):"]
    lines += [f"  {clock(time)}  {length:>6}  {text}" for time, length, text in shown]
    return "\n".join(lines)


def spread(items: list, limit: int) -> list:
    """Keep the earliest and latest halves. A correction can come at any point."""
    if len(items) <= limit:
        return items
    half = limit // 2
    return items[:half] + items[-half:]


def main(argv: Optional[list[str]] = None) -> int:
    parser = argparse.ArgumentParser(description="Print a short masked digest of one session log.")
    parser.add_argument("session", help="session id, id prefix, or path to a .jsonl log")
    args = parser.parse_args(argv)
    candidate = Path(args.session)
    paths = [candidate] if candidate.is_file() else sorted(set(find_logs(args.session, log_roots())))
    if len(paths) != 1:
        print(f"{args.session}: {len(paths)} matching logs. Use a longer id or pass the log path.", file=sys.stderr)
        return 1
    print(render(read_digest(paths[0])))
    return 0


if __name__ == "__main__":
    sys.exit(main())
