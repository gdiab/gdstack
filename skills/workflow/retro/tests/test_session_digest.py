"""Tests for session_digest.py. Every log and secret here is synthetic."""
import contextlib
import io
import json
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "scripts"))
import session_digest as sd  # noqa: E402

TIME = "2026-01-01T10:00:00Z"
ASSISTANT_TEXT = "ASSISTANT-REASONING-TEXT"
TOOL_OUTPUT = "TOOL-OUTPUT-TEXT"


def tool_use(tool_id, name, **tool_input):
    block = {"type": "tool_use", "id": tool_id, "name": name, "input": tool_input}
    return {"type": "assistant", "timestamp": TIME, "message": {"content": [{"type": "text", "text": ASSISTANT_TEXT}, block]}}


def tool_result(tool_id, error=False):
    block = {"type": "tool_result", "tool_use_id": tool_id, "content": TOOL_OUTPUT, "is_error": error}
    return {"type": "user", "timestamp": TIME, "message": {"content": [block]}}


def user(text, **extra):
    return {"type": "user", "timestamp": TIME, "message": {"content": text}, **extra}


def codex_item(**payload):
    return {"timestamp": TIME, "type": "response_item", "payload": payload}


class Masking(unittest.TestCase):
    def test_secrets_are_masked(self):
        cases = {
            "password=hunter2": "hunter2",
            "curl -H 'Authorization: Bearer abc.def-ghi'": "abc.def-ghi",
            "postgres://admin:s3cret@db.example.com/app": "s3cret",
            "export API_KEY=abc123": "abc123",
            "AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI": "wJalrXUtnFEMI",
            '{"client_secret": "shhh-value"}': "shhh-value",
            "Server=x;AccountKey=abcd1234==;": "abcd1234",
            "tool --token mytokenvalue": "mytokenvalue",
            "tool --password=mypasswordvalue": "mypasswordvalue",
            "ping alex@example.com": "alex@example.com",
            "value ghp_abcdefghijklmnopqrstuvwx1234": "ghp_abcdefghijklmnopqrstuvwx1234",
            'password="first second third"': "second",
            "--token 'first second third'": "third",
            "curl -u admin:hunter2 https://example.com": "hunter2",
            "curl --user 'admin:two words' https://example.com": "two words",
            "curl -uadmin:hunter2 https://example.com": "hunter2",
            "curl -u 'admin:two words' https://example.com": "two words",
            "http -a admin:hunter2 example.com": "hunter2",
            "http --auth=admin:hunter2 example.com": "hunter2",
            "sshpass -p hunter2 ssh host": "hunter2",
            "sshpass -phunter2 ssh host": "hunter2",
            "mysql -h db -u root -phunter2 app": "hunter2",
            "mysqldump -phunter2 app": "hunter2",
            "curl -uadmin:'two words' https://example.com": "words",
            "http -a admin:alpha,beta example.com": "beta",
            "mysql -p'two words' app": "words",
            "export TOKEN=part1'quoted part'part3": "part3",
            "password=alpha,beta": "beta",
            "PASSWORD=alpha\\ beta run": "beta",
            "tool --token alpha\\ beta run": "beta",
            "PASSWORD=alpha\\;beta run": "beta",
            '{"cmd":"API_KEY=\\"synthetic secret\\" run"}': "synthetic",
        }
        for text, secret in cases.items():
            with self.subTest(text=text):
                self.assertNotIn(secret, sd.mask(text, 200))

    def test_masking_runs_before_the_cut(self):
        text = "x" * 80 + " password=abcdefghijklmnop"
        self.assertNotIn("abcdefgh", sd.mask(text, 95))

    def test_ordinary_commands_stay_readable(self):
        self.assertEqual(sd.mask("pytest   tests/unit -q", 90), "pytest tests/unit -q")
        for command in ("git push -u origin main", "sort -u names.txt", "mkdir -p build/out", "docker run -p 80:80 app"):
            with self.subTest(command=command):
                self.assertEqual(sd.mask(command, 90), command)

    def test_long_text_is_cut(self):
        self.assertEqual(len(sd.mask("word " * 100, 20)), 20)


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


class Claude(LogCase):
    def test_counts_tools_failures_and_repeats(self):
        records = []
        for index in range(3):
            records += [tool_use(f"t{index}", "Bash", command="npm test"), tool_result(f"t{index}", error=index == 0)]
        digest = sd.read_digest(self.write("s1.jsonl", records))
        self.assertEqual(digest.tools["Bash"], 3)
        self.assertEqual(digest.failed["Bash"], 1)
        self.assertEqual(digest.failures[0][2], "npm test")
        self.assertIn("Bash: npm test", sd.render(digest))

    def test_only_real_user_messages_are_kept(self):
        records = [
            user("please stop doing that"),
            user("internal note", isMeta=True),
            user("<system-reminder>injected</system-reminder>"),
            tool_result("t1"),
        ]
        digest = sd.read_digest(self.write("s1.jsonl", records))
        self.assertEqual([text for _, _, text in digest.users], ["please stop doing that"])

    def test_a_user_message_opening_with_another_tag_is_kept(self):
        digest = sd.read_digest(self.write("s1.jsonl", [user('<note id="1"/> real request')]))
        self.assertEqual(len(digest.users), 1)

    def test_assistant_text_and_tool_output_never_appear(self):
        path = self.write("s1.jsonl", [tool_use("t1", "Bash", command="ls"), tool_result("t1", error=True), user("hello there")])
        report = sd.render(sd.read_digest(path))
        self.assertNotIn(ASSISTANT_TEXT, report)
        self.assertNotIn(TOOL_OUTPUT, report)

    def test_quoted_secret_in_a_command_is_masked_in_the_report(self):
        calls = [tool_use(f"t{index}", "Bash", command="mysql --password 'two words' -e 'select 1'") for index in range(3)]
        report = sd.render(sd.read_digest(self.write("s1.jsonl", calls)))
        self.assertIn("select 1", report)
        self.assertNotIn("two words", report)

    def test_attached_credentials_are_masked_in_the_report(self):
        for command in ("curl -uadmin:hunter2 https://example.com", "curl -uadmin:'hunter2 two' https://example.com", "curl -u admin:ab,hunter2 https://example.com"):
            with self.subTest(command=command):
                calls = [tool_use(f"t{index}", "Bash", command=command) for index in range(3)]
                report = sd.render(sd.read_digest(self.write("s1.jsonl", calls)))
                self.assertIn("example.com", report)
                self.assertNotIn("hunter2", report)

    def test_user_secrets_are_masked_in_the_report(self):
        report = sd.render(sd.read_digest(self.write("s1.jsonl", [user("use password=hunter2 for this")])))
        self.assertNotIn("hunter2", report)

    def test_broken_records_are_counted_and_the_rest_kept(self):
        wrong_time = user("first")
        wrong_time["timestamp"] = 12345
        digest = sd.read_digest(self.write("s1.jsonl", [wrong_time, user("second")], raw_tail='[1]\n{"cut off\n'))
        self.assertEqual(digest.bad_lines, 3)
        self.assertEqual(len(digest.users), 1)

    def test_subagent_logs_are_reported(self):
        path = self.write("s1.jsonl", [user("hello")])
        self.write("s1/subagents/agent-x.jsonl", [user("child")])
        self.assertEqual(sd.read_digest(path).subagent_logs, 1)


class Codex(LogCase):
    def records(self):
        meta = {"timestamp": TIME, "type": "session_meta", "payload": {"id": "c1"}}
        return [
            meta,
            codex_item(type="function_call", name="shell", arguments='{"cmd":"ls"}', call_id="a"),
            codex_item(type="custom_tool_call", name="exec", input="git status", call_id="b"),
            codex_item(type="function_call_output", output=TOOL_OUTPUT, call_id="a"),
            codex_item(type="message", role="user", content=[{"type": "input_text", "text": "try again"}]),
            codex_item(type="message", role="user", content=[{"type": "input_text", "text": "<environment_context>x"}]),
            codex_item(type="message", role="assistant", content=[{"type": "output_text", "text": ASSISTANT_TEXT}]),
        ]

    def test_reads_tools_and_user_messages(self):
        digest = sd.read_digest(self.write("rollout.jsonl", self.records()))
        self.assertEqual(digest.session, "c1")
        self.assertEqual(digest.tools, {"shell": 1, "exec": 1})
        self.assertEqual([text for _, _, text in digest.users], ["try again"])

    def test_escaped_secret_in_repeated_arguments_is_masked_in_the_report(self):
        arguments = json.dumps({"cmd": 'API_KEY="synthetic secret value" deploy'})
        calls = [codex_item(type="function_call", name="shell", arguments=arguments, call_id=str(index)) for index in range(3)]
        report = sd.render(sd.read_digest(self.write("rollout.jsonl", calls)))
        self.assertIn("deploy", report)
        self.assertNotIn("synthetic", report)

    def test_report_says_failures_are_unknown_and_hides_content(self):
        report = sd.render(sd.read_digest(self.write("rollout.jsonl", self.records())))
        self.assertIn("not available", report)
        self.assertNotIn(TOOL_OUTPUT, report)
        self.assertNotIn(ASSISTANT_TEXT, report)


class Cli(LogCase):
    def test_finds_a_log_by_prefix_and_skips_subagents(self):
        wanted = self.write("p/abc123.jsonl", [user("hello")])
        self.write("p/abc123/subagents/agent-abc123.jsonl", [user("child")])
        self.assertEqual(list(sd.find_logs("abc", [self.root])), [wanted])

    def test_finds_a_codex_log_by_the_id_inside_its_name(self):
        wanted = self.write("2026/01/rollout-2026-01-01-abc123.jsonl", [user("hello")])
        self.assertEqual(list(sd.find_logs("abc123", [self.root])), [wanted])

    def test_path_argument_prints_a_digest(self):
        path = self.write("s1.jsonl", [user("hello there")])
        out = io.StringIO()
        with contextlib.redirect_stdout(out):
            self.assertEqual(sd.main([str(path)]), 0)
        self.assertIn("hello there", out.getvalue())

    def test_no_match_fails_clearly(self):
        err = io.StringIO()
        with contextlib.redirect_stderr(err):
            self.assertEqual(sd.main(["no-such-session-id"]), 1)
        self.assertIn("0 matching logs", err.getvalue())

    def test_spread_keeps_both_ends(self):
        self.assertEqual(sd.spread(list(range(10)), 4), [0, 1, 8, 9])


if __name__ == "__main__":
    unittest.main()
