---
name: debugging
description: "Find the root cause of a bug before changing code, by building a feedback loop that goes red on the symptom. Use when a fix did not hold, a failure is intermittent or will not reproduce, behaviour differs between environments, something is slower than it was, something broke after a change, deploy or restart, or the user asks to debug, diagnose or find the root cause. Not for an error whose message already names the fix, and not for explaining how code works."
---

# Debugging

Symptom fixes do not ship. Every change that ships traces to runtime evidence, and the smallest change the evidence justifies is the fix. The whole loop below is for a bug that survived a first look.

Redact secrets in everything you quote or capture. Build loops against environment variables so credentials stay out of what you show.

## 1. Read what you already have

- Read the whole error and stack trace, including line numbers and codes. For an error in a rendered page, read the page console before theorizing about the server.
- Check what changed: diff and recent commits, dependencies, config, environment. If it fails after a restart or deploy, suspect persisted state (config files, caches, lock files, serialized state) before code. If clearing a state file restores behaviour, the fix is validating that state, not clearing it.
- A match to a failure you have seen before is a hypothesis, not a diagnosis.

## 2. Build a loop that goes red

This is most of the work. With a tight signal that fails on this bug, bisection, hypotheses and instrumentation all become mechanical. Without one, reading code produces theories.

Pick the first that reaches the bug:

1. A failing test, at whatever seam reaches the bug.
2. An HTTP or CLI call with a fixture input, diffed against known-good output.
3. A headless browser script asserting on DOM, console or network.
4. A captured payload or event log, replayed through the code path.
5. A throwaway harness around one function.
6. A bisection script for `git bisect run`, when the bug appeared between two known states.
7. The same input through old and new versions, diffed.
8. Last resort: a script that prompts the human step by step and prints their answers for you to read.

The loop is ready when you can name one command, already run once with its output shown, that fails on the user's exact symptom (not merely "errors") and will pass once the bug is fixed; gives the same verdict every run; finishes in seconds; and runs unattended, except the human-driven script. For a flaky bug, raise the reproduction rate first: loop it, run it in parallel, add load, narrow the timing window.

The loop can sit at any seam. The final check in step 5 happens on the surface where the user saw the bug.

Then minimize. Cut inputs, callers, config and steps one at a time, re-running after each cut, until every remaining element is load-bearing. The minimal repro shrinks the hypothesis space and becomes the regression test.

If you cannot build a loop, say what you tried and ask for what would give you one: access to the environment that reproduces it, a redacted captured artifact (HAR file, log dump, core dump, screen recording with timestamps), or permission to add temporary instrumentation. Ask the user to reproduce by hand only with a specific reason your surface cannot reach the bug.

When there is no runtime at all (logs, snapshots and source only), say so and diagnose from the evidence anyway. Steps 3 to 5 then run on paper: state the hypotheses and which evidence in hand supports or rules out each, propose the fix and the test, and label every claim observed or inferred and the fix unverified. Refusing to read available evidence is a failure, not caution.

## 3. Hypothesize, then split

- Write down one to five hypotheses, as many as the bug deserves. Each states a prediction: "if X is the cause, then Y changes the outcome." No prediction, no hypothesis.
- With more than one, show the ranked list to the user before testing; they often re-rank it instantly. Proceed with your ranking if they are away.
- Test the split that rules out the most. Change one variable at a time. When evidence refutes a hypothesis, revert whatever it motivated.
- Trace backward. Where did the bad value originate? Keep moving up the callers until you reach the source. Compare against a working example in the same codebase and list every difference, however small.
- Instrument to separate hypotheses, never to log everything. A debugger or REPL first; otherwise logs at the boundaries that distinguish the candidates, tagged with one prefix such as `[DEBUG-a4f2]` so cleanup is a single grep. Log before the dangerous operation, with the inputs and context, not after it fails. When the failing layer of a multi-component chain is unknown, one probe per boundary (what enters, what leaves), run once, locates the layer; that is bisection, not logging everything.
- For a performance regression, logs are the wrong tool. Measure a baseline, then bisect.

## 4. Stop rule

After two fixes that did not hold, stop and say so. Do not stack a third. Re-read the evidence from step 1 with what the attempts added, and tell the user what each attempt ruled out. Repeated failure means missing evidence, not a verdict on the architecture.

If the investigation ends at environment, timing or an external system, document what was ruled out, add the appropriate handling (retry, timeout, a clear error) and a signal that will show the cause next time. Most "no root cause" results are unfinished investigations, so say which this is.

## 5. Fix at the source

- Ship the smallest change the evidence justifies. No bundled refactors, no "might help" additions. A nil check that silences a crash is a symptom fix; a guard is the fix only at a trust boundary where the input is legitimately untrusted.
- Look for siblings: the same pattern elsewhere in the codebase. Fix the ones in scope and report the rest.
- Write the regression test before the fix, at a seam that exercises the real pattern (a cross-caller bug needs a test with both callers). A test at a seam too shallow to reach the pattern is false confidence. If no correct seam exists, that is a finding: note it and move on.
- Watch the test fail. If you forced the failure by mutating code or a fixture, diff against a pristine copy to prove the mutation landed. Apply the fix. Watch it pass. Run the existing suite too.
- Re-run the original, unminimized scenario on the surface where the user saw the bug. "Inconclusive" is not a pass. If that re-run still fails while the regression test passes, check what you observed (which build, which surface, which data) before concluding the fix is wrong.
- When committing, land the failing test before the fix in history.

## 6. Finish

- Remove instrumentation: grep the tag. Keep repro scripts and captured artifacts outside product code, say where they are, and delete them only when asked.
- Report what was broken, the root cause, the fix and the verification, with the failing-then-passing output quoted verbatim and redacted. Put the confirmed hypothesis in the commit message so the next debugger learns.
- If the deciding fact took a deep dig, propose the cheap always-on signal (a log line, an assertion, a check) that would have shown it at first look.

## Red flags

Stop and return to step 2 when you catch yourself at any of these: "just try changing X"; "it's probably X", with nothing in hand that would show it; several changes at once, then run the tests; "I'll add the test after it works"; "one more attempt"; each fix reveals a new problem somewhere else.

## Provenance

Original text. Ideas from three sources, all MIT: Jesse Vincent's `systematic-debugging` in [superpowers](https://github.com/obra/superpowers) (recent-change check, backward tracing, working examples, per-boundary probes, the rationalization list, the no-root-cause exit); Matt Pocock's `diagnosing-bugs` in [mattpocock/skills](https://github.com/mattpocock/skills) (loop first, the loop menu, tightening, minimizing, what to ask for when no loop exists, falsifiable hypotheses, tagged instrumentation, the seam rule, cleanup, hypothesis in the commit, redaction); Lauren Tan's `principle-fix-root-causes` and the bug-fix playbook in [pstack](https://github.com/cursor/plugins) (verification on the user's surface, revert on refutation, smallest justified change, siblings, state before code on restart, the always-on signal, inconclusive is not a pass). Where this skill departs from them: hypothesis count scales with the bug, evidence-only diagnosis is allowed with stated limits, the stop rule reassesses instead of judging the architecture, and a guard can be the fix at a trust boundary.
