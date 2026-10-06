<!-- Read by the thermo-review skill when the diff contains Python. Rule numbers refer to SKILL.md. Sources: ../SOURCES.md -->

# Python

## Rule 5: types and boundaries

- **`Any` as an exit.** New `Any`, `cast()` and `# type: ignore` in application code. `cast` "returns value unchanged" at runtime, so it asserts without checking anything. Where a value really can be anything, the typing docs prefer `object`, which is type-safe, over `Any`, which "indicate[s] that a value is dynamically typed". Remedy: narrow with `isinstance`/`TypeIs` or fix the upstream annotation.
- **Untyped dicts crossing modules.** `dict[str, Any]` (or a bare `dict`) passed between layers is a contract nobody wrote down. Remedy, picked by role: a frozen `@dataclass` for internal domain values; `TypedDict` (with `Required`/`NotRequired`/`ReadOnly`) when the dict shape itself is the wire format; a pydantic model at I/O boundaries where input needs to be parsed and coerced.
- **Parse at the edge, not in the middle.** Request handlers, CLI entry points and queue consumers should turn raw input into a model once. Flag `.get("x")` checks repeated deeper in the call graph, which is shotgun parsing. Note that pydantic coerces by default (`"123"` → `123`), so ask whether the boundary should be strict.
- **Primitive obsession.** Status strings and magic ints. Remedy: `Literal[...]` or an `Enum`/`StrEnum`, and `NewType` for IDs (checker-only, zero runtime cost). Close `match` statements with `assert_never`.
- **Unnecessary optionality.** `x: T | None = None` parameters that every caller passes, or `Optional` returns used as error signals. Remedy: make it required, or raise or return a typed result. The typing guide also warns against union return types that force `isinstance` at every call site.
- **Silent fallbacks.** `except Exception: pass`, `or {}`, `.get(k, default)` on a key the invariant guarantees. Remedy: index directly and let it fail, or validate once at the boundary.

Example phrases:
- `this dict is the real contract between these modules, but nothing names it. can we make it a dataclass (or TypedDict if it's the wire shape)?`
- `why does this need \`cast\` here? it doesn't check anything at runtime. can we narrow or fix the upstream type instead?`

## Rule 7: async and atomicity

- Blocking calls inside `async def` (sync HTTP clients, `time.sleep`, `open`, `subprocess`) stall the whole event loop. Remedy: `asyncio.to_thread` or an async library.
- Independent awaits run serially → `asyncio.TaskGroup`, which cancels siblings on failure. `gather` doesn't cancel the others.
- `create_task` without a kept reference can be garbage-collected mid-run, because the loop "only keeps weak references to tasks". A fire-and-forget task usually belongs in a TaskGroup.

Also: Two or more related writes to a datastore without a transaction can leave state half-applied, and that is a Rule 7 finding regardless of language. Ask for the store's transaction primitive (e.g. Ecto `Repo.transact/2`, SQLAlchemy `Session.begin()`, Go `db.BeginTx`).

## Rule 1: not counted toward the 1000-line ceiling

- `uv.lock`/`poetry.lock`, protobuf/gRPC stubs (`*_pb2.py`, `*_pb2.pyi`), migration-tool revisions (e.g. Alembic), recorded HTTP cassettes/fixtures.

## Hand to tooling (not review findings)

These are mechanical. Don't raise them as findings. If the repo has none of them wired up, say so once, as a single tooling-gap note.

- mypy `--strict`: enables `--disallow-untyped-defs`, `--disallow-any-generics`, `--warn-return-any`, `--warn-unused-ignores`, `--warn-redundant-casts`, `--strict-equality`, `--extra-checks`, and others.
- mypy opt-ins:
  - `--disallow-any-explicit`.
  - `--enable-error-code` with `ignore-without-code` (bare `# type: ignore`), `possibly-undefined`, `truthy-bool`, `unused-awaitable`, `exhaustive-match`, `explicit-override`.
- pyright `typeCheckingMode: "strict"`. Notable rules:
  - `reportUnnecessaryTypeIgnoreComment` and `reportUnnecessaryCast`.
  - `reportUnknownMemberType` and `reportUnknownArgumentType` (Any leakage).
  - `reportMatchNotExhaustive`.
  - `reportUnnecessaryComparison` (dead fallbacks).
  - `reportUnusedCoroutine` (missing `await`).
- Ruff:
  - `ANN401`: `Any` in signatures.
  - `PGH003`: blanket `# type: ignore`.
  - `FBT001`: positional bool params.
  - `BLE001`: blind `except Exception`.
  - `S110`: `try/except/pass`.
  - `RUF006`: dangling `create_task`.
  - `ASYNC210`/`ASYNC220`/`ASYNC230`/`ASYNC251`: blocking HTTP/subprocess/`open`/`sleep` in async.
- asyncio debug mode (`PYTHONASYNCIODEBUG=1`): logs callbacks over 100 ms and never-awaited coroutines.
