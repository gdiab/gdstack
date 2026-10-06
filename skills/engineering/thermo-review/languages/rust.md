<!-- Read by the thermo-review skill when the diff contains Rust. Rule numbers refer to SKILL.md. Sources: ../SOURCES.md -->

# Rust

## Rule 5: types and boundaries

- **`unwrap`/`expect` at boundaries.** Fine in tests, prototypes, and where an invariant is locally proven. At I/O, parsing or public-API boundaries they turn a recoverable error into a panic. Clippy's `unwrap_in_result` captures this exactly: functions returning `Result` that still unwrap inside. Remedy: `?` with a meaningful error type.
- **Stringly-typed errors.** `Result<T, String>` or `Box<dyn Error>` in library or module APIs. Error types should implement `std::error::Error` and be meaningful. Remedy: an `enum` of failure modes per module boundary. Flag `map_err(|_| ...)` that throws the cause away.
- **Primitive obsession and bool/Option arguments.** The API guidelines ask for newtypes to "statically distinguish between different interpretations of an underlying type" (C-NEWTYPE) and for "arguments [that] convey meaning through types, not `bool` or `Option`" (C-CUSTOM-TYPE). Several bools on a struct usually mean a state machine is hiding inside it. Remedy: an `enum`.
- **Parse into types (C-VALIDATE).** Rust APIs "should enforce the validity of input whenever practical". The Book's "custom types for validation" pattern is a newtype with a checked constructor. Flag the same validation repeated at every use site.
- **Clone to silence the borrow checker.** `.clone()` sprinkled in to make the borrow checker go quiet usually means an ownership boundary is wrong. Remedy: restructure ownership (borrow, move, `Arc` at one clear owner) rather than copy.
- **`unsafe` without a stated invariant.** Each `unsafe` block needs a `// SAFETY:` justification, and should be wrapped in a safe abstraction with a narrow interface. Flag `unsafe` that leaks into callers' responsibilities.
- **Wildcard matches on your own enums.** `_ =>` on an enum the crate owns hides the next variant. Remedy: list the variants.

Example phrases:
- `this \`unwrap\` sits right at the parse boundary. can we return a typed error and let the caller decide?`
- `three bools on this struct look like states. can we make it an enum so the impossible combinations go away?`

## Rule 7: async and atomicity

- A `std::sync::Mutex` guard held across `.await` can deadlock or block the executor. Drop it before the await, or restructure so the lock is short-lived. Reaching for `tokio::sync::Mutex` by reflex is "a common error".
- Blocking or CPU-heavy work inside a future starves the executor → `spawn_blocking`.
- Independent futures awaited in sequence → `join!`/`try_join!`/`JoinSet`. When `select!` is used, check cancellation safety of each branch.

Also: Two or more related writes to a datastore without a transaction can leave state half-applied, and that is a Rule 7 finding regardless of language. Ask for the store's transaction primitive (e.g. Ecto `Repo.transact/2`, SQLAlchemy `Session.begin()`, Go `db.BeginTx`).

## Rule 1: not counted toward the 1000-line ceiling

- `Cargo.lock`, `build.rs` output in `OUT_DIR` (e.g. prost/bindgen), `insta` `.snap` files.

## Hand to tooling (not review findings)

These are mechanical. Don't raise them as findings. If the repo has none of them wired up, say so once, as a single tooling-gap note.

- Clippy:
  - `unwrap_used`/`expect_used` (restriction): enable for non-test code.
  - `unwrap_in_result` (restriction).
  - `map_err_ignore` (restriction).
  - `wildcard_enum_match_arm` (restriction).
  - `fn_params_excessive_bools`/`struct_excessive_bools` (pedantic).
  - `option_option`, `ref_option` (pedantic).
  - `redundant_clone` (nursery), `implicit_clone` (pedantic).
  - `undocumented_unsafe_blocks` + `multiple_unsafe_ops_per_block` (restriction).
  - `await_holding_lock` and `await_holding_refcell_ref` (suspicious, on by default).
  - `let_underscore_future` (suspicious): dropped future.
  - `large_futures`, `unused_async` (pedantic).
- rustc:
  - `#![forbid(unsafe_code)]` for crates that need no unsafe.
  - `unsafe_op_in_unsafe_fn`: warn-by-default in edition 2024.
