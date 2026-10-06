<!-- Read by the thermo-review skill when the diff contains Shell. Rule numbers refer to SKILL.md. Sources: ../SOURCES.md -->

# Shell

## Rule 7 and Rule 1

Pipelines hide failures unless `set -o pipefail`, or `PIPESTATUS`. Treat `set -euo pipefail` as table stakes. If a script needs real orchestration (parallelism, retries, partial-failure handling), that's the signal to rewrite it in a structured language. Google's guide draws the line at about 100 lines or non-trivial control flow.

A shell file approaching 1000 lines is already a Rule 1 finding.

## Hand to tooling (not review findings)

- ShellCheck on every script. `set -euo pipefail` in a shared header (e.g. SC2155, masked return values).
