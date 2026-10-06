<!-- Read by the thermo-review skill when the diff contains Elixir. Rule numbers refer to SKILL.md. Sources: ../SOURCES.md -->

# Elixir

## Rule 5: types and boundaries

Context: Elixir is dynamically typed. As of **v1.20 (June 2026)** the compiler runs gradual set-theoretic type inference over every program, without annotations, and reports "verified bugs" (violations guaranteed to fail at runtime). User-facing type signatures don't exist yet. The roadmap puts *typed structs* next, then signatures. Typespecs are a separate Erlang-based notation that the compiler never uses, are checked only by Dialyzer, and "may be phased out". So in Elixir the boundaries a reviewer can check today are **structs, tagged tuples, function-head patterns, and process message/state shapes**, not annotations.

- **Bare maps where a struct belongs.** A map with known keys passed between modules is an unnamed contract. Remedy: `defstruct` with `@enforce_keys` for required fields. Struct shapes are also what the type system will build on first. Dot access (`map.key`) for required keys, `map[:key]` only for optional ones. The official anti-pattern guide calls `map[:key]` on a guaranteed key "non-assertive map access".
- **Assert with patterns, not defensive code.** Function heads and `case` should match the shapes you expect and let anything else crash under supervision. Flag catch-all clauses that return a plausible default ("non-assertive pattern matching"). Matching the struct where the value is bound (`%User{} = user`) also lets the type checker prove later struct updates.
- **Return-shape discipline.** Fallible public functions return `{:ok, value} | {:error, reason}`. Flag `try/rescue` used for expected failures ("exceptions for control-flow"), functions whose return type changes with an option ("alternative return types"), and `with` blocks whose `else` collapses unrelated errors into one bucket.
- **Primitive and boolean obsession.** Structured data in strings, or overlapping boolean options like `admin: true, editor: true`. Remedy: a struct, or an atom such as `role: :admin | :editor`. Flag `String.to_atom/1` on external input ("dynamic atom creation").
- **Process boundaries are type boundaries.** GenServer `call`/`cast` messages and state are contracts too. Flag raw `GenServer.call(pid, {...})` or `Agent.update` scattered across modules. Remedy: one client API module that owns the message shapes. Keep GenServer state as a struct, not an ad-hoc map.
- **Typespecs.** Ask for `@spec` on public functions at module boundaries as documentation and for Dialyzer. Don't treat a spec as enforcement, because the compiler ignores it.

Example phrases:
- `this map is crossing three modules with fixed keys. can we make it a struct with @enforce_keys so the shape is explicit?`
- `this fallback clause hides a shape we didn't expect. can we match assertively and let the supervisor handle the rest?`

## Rule 7: async and atomicity

- State for one concept split across several processes (or a process plus ETS plus the DB) can't be updated atomically. Ask whether one process, or one DB transaction, should own it.
- Read-modify-write done in the client (`Agent.get` then `Agent.update`) races. The Agent docs warn that computing new state client-side "can lead to race conditions". Remedy: `get_and_update`/a single `call` that does the change in the server.
- Processes used for code organization become bottlenecks. Independent work belongs in `Task.async_stream` or under a `Task.Supervisor`, not in sequential `GenServer.call`s.
- Multi-step DB writes belong in one `Repo.transact/2`. `Repo.transaction/2` is deprecated in favor of it.

Also: Two or more related writes to a datastore without a transaction can leave state half-applied, and that is a Rule 7 finding regardless of language. Ask for the store's transaction primitive (e.g. Ecto `Repo.transact/2`, SQLAlchemy `Session.begin()`, Go `db.BeginTx`).

## Rule 1: not counted toward the 1000-line ceiling

- `mix.lock`, `priv/repo/migrations/*`, generated fixtures. Hand-written Phoenix templates and LiveViews **do** count.

## Hand to tooling (not review findings)

These are mechanical. Don't raise them as findings. If the repo has none of them wired up, say so once, as a single tooling-gap note.

- `mix compile --warnings-as-errors`: type-system "verified bug" warnings fail CI (v1.20+).
- Dialyzer via `dialyxir`, with flags `:unmatched_returns`, `:error_handling`, `:underspecs`: checks `@spec`s and ignored `{:error, _}` returns.
- Credo:
  - `Credo.Check.Warning.UnsafeToAtom` (disabled by default, enable it): dynamic atom creation.
  - `Credo.Check.Readability.Specs` (disabled by default): `@spec` on public functions.
