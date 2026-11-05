"""Tests for session_usage.py. Every log here is synthetic."""
import contextlib
import io
import json
import sys
import tempfile
import unittest
from datetime import datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "scripts"))
import session_usage as su  # noqa: E402

SECRET = "SECRET-MESSAGE-TEXT"


def stamp(minute):
    return f"2026-01-01T{minute // 60:02d}:{minute % 60:02d}:00Z"


def claude_line(minute, message_id, fresh=0, read=0, write=0, output=0, model="claude-test", content=None):
    usage = {"input_tokens": fresh, "cache_read_input_tokens": read, "cache_creation_input_tokens": write, "output_tokens": output}
    message = {"id": message_id, "model": model, "usage": usage, "content": content or []}
    return {"type": "assistant", "timestamp": stamp(minute), "requestId": "r" + message_id, "cwd": "/tmp/example-project", "message": message}


def tool_use(tool_id, name):
    return {"type": "tool_use", "id": tool_id, "name": name, "input": {"command": SECRET}}


def tool_result(minute, tool_id, text):
    content = [{"type": "tool_result", "tool_use_id": tool_id, "content": text}]
    return {"type": "user", "timestamp": stamp(minute), "message": {"content": content}}


def codex_token_line(minute, total, input_tokens, cached=0, write=0, output=0):
    usage = {"input_tokens": input_tokens, "cached_input_tokens": cached, "cache_write_input_tokens": write, "output_tokens": output, "total_tokens": input_tokens + output}
    info = {"total_token_usage": {"total_tokens": total}, "last_token_usage": usage}
    return {"timestamp": stamp(minute), "type": "event_msg", "payload": {"type": "token_count", "info": info}}


def codex_meta(session_id, parent=None):
    payload = {"id": session_id, "cwd": "/tmp/example-project"}
    if parent:
        payload["parent_thread_id"] = parent
    return {"timestamp": stamp(0), "type": "session_meta", "payload": payload}


class LogCase(unittest.TestCase):
    def setUp(self):
        folder = tempfile.TemporaryDirectory()
        self.addCleanup(folder.cleanup)
        self.root = Path(folder.name)

    def write(self, relative, records, raw_tail=""):
        path = self.root / relative
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text("".join(json.dumps(record) + "\n" for record in records) + raw_tail)
        return path

    def sessions(self, since=None):
        return su.scan([self.root], since).sessions

    def run_cli(self, *args):
        out = io.StringIO()
        with contextlib.redirect_stdout(out):
            code = su.main([str(self.root), *args])
        return code, out.getvalue()


class ClaudeParsing(LogCase):
    def test_one_call_split_over_lines_counts_once(self):
        lines = [claude_line(1, "a", fresh=10, read=100, write=5, output=7) for _ in range(3)]
        self.write("p/s1.jsonl", lines)
        (session,) = self.sessions()
        self.assertEqual(len(session.calls), 1)
        self.assertEqual(session.calls[0].context, 115)

    def test_synthetic_messages_are_skipped(self):
        self.write("p/s1.jsonl", [claude_line(1, "a", fresh=10), claude_line(2, "b", fresh=99, model="<synthetic>")])
        (session,) = self.sessions()
        self.assertEqual([call.context for call in session.calls], [10])

    def test_resumed_session_does_not_double_count_copied_lines(self):
        import os

        older = self.write("p/old.jsonl", [claude_line(1, "a", fresh=10)])
        newer = self.write("p/new.jsonl", [claude_line(1, "a", fresh=10), claude_line(2, "b", fresh=20)])
        os.utime(older, (1, 1))
        os.utime(newer, (2, 2))
        self.assertEqual(sum(len(session.calls) for session in self.sessions()), 2)

    def test_subagent_file_folds_into_its_parent(self):
        self.write("p/s1.jsonl", [claude_line(1, "a", fresh=10)])
        self.write("p/s1/subagents/agent-x.jsonl", [claude_line(2, "b", fresh=20), claude_line(3, "c", fresh=30)])
        (session,) = self.sessions()
        self.assertEqual(session.id, "s1")
        self.assertEqual(len(session.calls), 1)
        self.assertEqual(len(session.all_calls), 3)

    def test_subagent_without_parent_in_scope_still_reports(self):
        self.write("p/missing/subagents/agent-x.jsonl", [claude_line(2, "b", fresh=20)])
        (session,) = self.sessions()
        self.assertEqual(session.id, "agent-x")

    def test_last_cost_record_wins(self):
        self.write("p/s1.jsonl", [{"type": "cost-state", "totalCostUSD": 1.0}, claude_line(1, "a", fresh=10), {"type": "cost-state", "totalCostUSD": 2.5}])
        (session,) = self.sessions()
        self.assertEqual(session.logged_cost, 2.5)

    def test_tool_output_is_measured_by_tool_name(self):
        use = claude_line(1, "a", fresh=10, content=[tool_use("t1", "Bash")])
        self.write("p/s1.jsonl", [use, tool_result(2, "t1", "x" * 40)])
        (session,) = self.sessions()
        self.assertEqual(session.tool_chars["Bash"], 40)

    def test_since_keeps_only_calls_inside_the_window(self):
        self.write("p/s1.jsonl", [claude_line(1, "a", fresh=10), claude_line(120, "b", fresh=20)])
        cutoff = su.parse_time(stamp(60))
        (session,) = self.sessions(cutoff - 0)
        self.assertEqual([call.context for call in session.calls], [20])


class CodexParsing(LogCase):
    def test_input_tokens_already_include_cached_tokens(self):
        self.write("s.jsonl", [codex_meta("c1"), codex_token_line(1, 110, 100, cached=60, write=10, output=10)])
        (session,) = self.sessions()
        call = session.calls[0]
        self.assertEqual((call.context, call.cache_read, call.cache_write, call.fresh), (100, 60, 10, 30))

    def test_repeated_token_event_counts_once(self):
        self.write("s.jsonl", [codex_meta("c1"), codex_token_line(1, 110, 100), codex_token_line(1, 110, 100), codex_token_line(2, 300, 190)])
        (session,) = self.sessions()
        self.assertEqual(len(session.calls), 2)

    def test_inherited_cumulative_total_is_not_counted(self):
        self.write("s.jsonl", [codex_meta("c1"), codex_token_line(1, 900_000, 100)])
        (session,) = self.sessions()
        self.assertEqual(su.totals(session.calls)["processed"], 100)

    def test_child_thread_folds_into_parent(self):
        self.write("a.jsonl", [codex_meta("parent"), codex_token_line(1, 10, 10)])
        self.write("b.jsonl", [codex_meta("child", parent="parent"), codex_token_line(2, 20, 20)])
        self.write("c.jsonl", [codex_meta("grandchild", parent="child"), codex_token_line(3, 30, 30)])
        (session,) = self.sessions()
        self.assertEqual(session.id, "parent")
        self.assertEqual(len(session.subagents), 2)

    def test_tool_output_is_measured(self):
        call = {"timestamp": stamp(1), "type": "response_item", "payload": {"type": "function_call", "call_id": "x", "name": "shell", "arguments": SECRET}}
        result = {"timestamp": stamp(2), "type": "response_item", "payload": {"type": "function_call_output", "call_id": "x", "output": "y" * 12}}
        self.write("s.jsonl", [codex_meta("c1"), call, result, codex_token_line(3, 10, 10)])
        (session,) = self.sessions()
        self.assertEqual(session.tool_chars["shell"], 12)


class ReviewRegressions(LogCase):
    def test_same_session_in_two_account_folders_is_one_row(self):
        self.write("account-a/p/s1.jsonl", [claude_line(1, "a", fresh=10)])
        self.write("account-b/p/s1.jsonl", [claude_line(1, "a", fresh=10), claude_line(2, "b", fresh=20)])
        self.write("account-a/p/s1/subagents/agent-x.jsonl", [claude_line(3, "c", fresh=30)])
        (session,) = self.sessions()
        self.assertEqual(session.id, "s1")
        self.assertEqual(len(session.calls), 2)
        self.assertEqual(len(session.all_calls), 3)

    def test_copied_codex_log_counts_once(self):
        lines = [codex_meta("c1"), codex_token_line(1, 110, 100), codex_token_line(2, 300, 190)]
        self.write("a/s.jsonl", lines)
        self.write("b/s.jsonl", lines)
        (session,) = self.sessions()
        self.assertEqual(len(session.calls), 2)

    def test_records_stream_instead_of_loading_the_file(self):
        path = self.write("p/s1.jsonl", [claude_line(1, "a", fresh=10)])
        records = su.read_records(path, su.Scan([]))
        self.assertIs(iter(records), records)

    def test_broken_claude_records_are_counted_and_the_rest_kept(self):
        wrong_usage = claude_line(1, "a", fresh=10)
        wrong_usage["message"]["usage"] = ["not", "a", "mapping"]
        wrong_count = claude_line(2, "b", output=7)
        wrong_count["message"]["usage"]["output_tokens"] = None
        wrong_time = claude_line(3, "c", fresh=10)
        wrong_time["timestamp"] = 12345
        self.write("p/s1.jsonl", [wrong_usage, wrong_count, wrong_time, claude_line(4, "d", fresh=40)], raw_tail="[1, 2]\n")
        result = su.scan([self.root], None)
        self.assertEqual(result.bad_lines, 4)
        self.assertEqual([call.context for call in result.sessions[0].calls], [40])

    def test_broken_codex_records_are_counted_and_the_rest_kept(self):
        missing_total = codex_token_line(1, 10, 10)
        del missing_total["payload"]["info"]["total_token_usage"]
        self.write("s.jsonl", [codex_meta("c1"), missing_total, codex_token_line(2, 20, 20)])
        result = su.scan([self.root], None)
        self.assertEqual(result.bad_lines, 1)
        self.assertEqual(len(result.sessions[0].calls), 1)

    def test_unusual_field_types_do_not_break_the_report(self):
        odd = claude_line(1, "a", fresh=10)
        odd["message"]["model"] = ["not-text"]
        self.write("p/s1.jsonl", [{"type": "cost-state", "totalCostUSD": "free"}, odd])
        code, output = self.run_cli()
        self.assertEqual(code, 0)
        self.assertIn("s1", output)


class Metrics(unittest.TestCase):
    @staticmethod
    def calls(*sizes, write=0, minutes=1):
        return [su.Call(index * 60 * minutes, size, 0, size, write, 0, "m") for index, size in enumerate(sizes)]

    def test_a_large_drop_is_a_reset(self):
        self.assertEqual(su.context_resets(self.calls(60_000, 200_000, 40_000, 90_000)), 1)

    def test_small_or_partial_drops_are_not_resets(self):
        self.assertEqual(su.context_resets(self.calls(40_000, 10_000, 200_000, 150_000)), 0)

    def test_rewrite_reports_the_idle_gap(self):
        calls = self.calls(1, 2, write=150_000, minutes=70)
        self.assertEqual([gap for _, _, gap in su.cache_rewrites(calls, 100_000)], [None, 70])

    def test_cap_restarts_and_saves(self):
        calls = self.calls(100, 200, 300, 400, 500)
        restarts, processed = su.simulate_cap(calls, 250)
        self.assertEqual(restarts, 2)
        self.assertLess(processed, sum(call.context for call in calls))

    def test_cap_above_the_peak_changes_nothing(self):
        calls = self.calls(100, 200, 300)
        self.assertEqual(su.simulate_cap(calls, 1_000), (0, 600))

    def test_a_real_reset_lowers_the_simulated_context(self):
        calls = self.calls(100, 900, 100, 200)
        self.assertEqual(su.simulate_cap(calls, 10_000), (0, 1300))

    def test_since_formats(self):
        now = datetime(2026, 1, 10, 12)
        self.assertEqual(su.parse_since("all", now), None)
        self.assertEqual(su.parse_since("2d", now), datetime(2026, 1, 8, 12).timestamp())
        self.assertEqual(su.parse_since("3h", now), datetime(2026, 1, 10, 9).timestamp())
        self.assertEqual(su.parse_since("2026-01-02", now), datetime(2026, 1, 2).timestamp())
        with self.assertRaises(Exception):
            su.parse_since("soon", now)


class Reports(LogCase):
    def populate(self):
        secret_message = claude_line(1, "a", fresh=10, write=200_000, content=[{"type": "text", "text": SECRET}, tool_use("t1", "Bash")])
        user = {"type": "user", "timestamp": stamp(2), "message": {"content": SECRET}}
        self.write("p/session-one.jsonl", [secret_message, user, tool_result(3, "t1", SECRET), claude_line(4, "b", read=300_000)])

    def test_no_message_text_reaches_any_report(self):
        self.populate()
        for args in ([], ["--json"], ["--session", "session-one"], ["--session", "session-one", "--json", "--simulate-cap", "100000"]):
            code, output = self.run_cli(*args)
            self.assertEqual(code, 0)
            self.assertNotIn(SECRET, output)

    def test_detail_shows_rewrite_and_simulation(self):
        self.populate()
        _, output = self.run_cli("--session", "session-one", "--simulate-cap", "100000")
        self.assertIn("Cache rewrites of 100.0k or more", output)
        self.assertIn("Simulated restart at 100.0k", output)

    def test_unmatched_session_fails_clearly(self):
        self.populate()
        err = io.StringIO()
        with contextlib.redirect_stderr(err):
            code, _ = self.run_cli("--session", "nope")
        self.assertEqual(code, 1)
        self.assertIn("0 matches", err.getvalue())

    def test_malformed_lines_are_reported_not_hidden(self):
        self.write("p/s1.jsonl", [claude_line(1, "a", fresh=10)], raw_tail='{"cut off\n')
        _, output = self.run_cli()
        self.assertIn("1 malformed lines", output)

    def test_simulate_cap_needs_a_session(self):
        with contextlib.redirect_stderr(io.StringIO()), self.assertRaises(SystemExit):
            su.main([str(self.root), "--simulate-cap", "1000"])

    def test_sessions_sort_by_tokens_processed(self):
        self.write("p/small.jsonl", [claude_line(1, "a", fresh=10)])
        self.write("p/large.jsonl", [claude_line(1, "b", fresh=1_000)])
        _, output = self.run_cli("--json")
        self.assertEqual([item["id"] for item in json.loads(output)["sessions"]], ["large", "small"])


if __name__ == "__main__":
    unittest.main()
