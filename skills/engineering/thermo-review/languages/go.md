<!-- Read by the thermo-review skill when the diff contains Go. Rule numbers refer to SKILL.md. Sources: ../SOURCES.md -->

# Go

## Rule 5: types and boundaries

- **`any`/`interface{}` in signatures.** Flag an empty interface used to avoid naming a type, especially in exported APIs and struct fields. Remedy: a concrete type, a small consumer-side interface (Go interfaces "generally belong in the package that uses values of the interface type"), or generics where they meet a real requirement. The Google Go style guide warns against using them prematurely.
- **Type assertions without `ok`.** `v.(T)` panics on a mismatch. Use the comma-ok form `v, ok := x.(T)` or a type switch. At the design level, though, a cluster of assertions means the value should have been typed further upstream. Ask why it's `any` at all.
- **In-band errors and sentinel values.** Returning `""`, `-1` or `nil, nil` to mean "not found" hides failure from callers. Remedy: an extra `ok bool` or an `error` return.
- **Primitive obsession.** Named types (`type UserID string`, `type Status int` with `iota` constants) give distinct identities at near-zero cost. Flag raw `string`/`int` used for domain concepts crossing package lines.
- **Loose contracts.** `map[string]any` handed between packages, and unexported-field structs copied across APIs. Remedy: a named struct owned by the producing package, decoded once at the edge (JSON/HTTP), and passed by type after that.
- **Silent fallbacks.** `_ = f()` or `x, _ := f()` dropping an error ("Do not discard errors using `_` variables"), or zero-value defaults masking a missing field. Remedy: handle or return the error, and make required fields explicit at construction.
- **Context as a boundary.** `context.Context` goes as the first parameter, never in a struct field. A ctx stored in a struct hides lifetime from callers.

Example phrases:
- `this \`any\` hides what's really one of two types. can we name the type (or use a small interface on the consumer side)?`
- `\`"" means not found\` is an in-band error. can we return \`(v, ok)\` so callers can't forget the check?`

## Rule 7: async and atomicity

- Every `go` statement needs a clear exit: "make it clear when — or whether — they exit". Goroutines blocked on channels leak. The classic case is an early `return` from a result-collecting loop that strands senders on an unbuffered channel.
- Contexts must flow through the call chain, and the `cancel` func has to run on every path.
- Shared mutable state needs a mutex or channel ownership. Remedy for fan-out: `errgroup.WithContext`, which propagates the first error and cancels the rest.

Also: Two or more related writes to a datastore without a transaction can leave state half-applied, and that is a Rule 7 finding regardless of language. Ask for the store's transaction primitive (e.g. Ecto `Repo.transact/2`, SQLAlchemy `Session.begin()`, Go `db.BeginTx`).

## Rule 1: not counted toward the 1000-line ceiling

- any file with the standard `// Code generated ... DO NOT EDIT.` header, `go.sum`, `vendor/`, golden files under `testdata/`.

## Hand to tooling (not review findings)

These are mechanical. Don't raise them as findings. If the repo has none of them wired up, say so once, as a single tooling-gap note.

- `go vet`:
  - `lostcancel`: cancel func not called on all paths.
  - `copylocks`: locks copied by value.
  - `waitgroup`: WaitGroup misuse.
  - `unusedresult`.
- `go test -race`: data races.
- golangci-lint:
  - `forcetypeassert`: assertions without `ok`.
  - `errcheck`: dropped errors.
  - `exhaustive`: enum switch exhaustiveness.
  - `nilnil`: `nil, nil` returns.
  - `containedctx`: ctx in structs.
  - `contextcheck`: non-inherited ctx.
  - `noctx`: missing ctx on HTTP/DB calls.
  - `errorlint`: Go 1.13 wrapping misuse.
  - `musttag`: untagged (un)marshalled structs.
  - `staticcheck`.
- Go 1.26 experimental `goroutineleak` pprof profile (`GOEXPERIMENT=goroutineleakprofile`) for leak hunting.
