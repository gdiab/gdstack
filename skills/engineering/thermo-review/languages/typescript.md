<!-- Read by the thermo-review skill when the diff contains TypeScript / JavaScript. Rule numbers refer to SKILL.md. Sources: ../SOURCES.md -->

# TypeScript / JavaScript

## Rule 5: types and boundaries

- **Escape hatches that hide a real shape.** Flag new `any`, `as` casts, `!` non-null assertions and `@ts-ignore`/`@ts-expect-error` in non-test code. In each case the type system knew something was wrong and the diff overruled it. The handbook calls `!` "effectively a type assertion" that "doesn't change the runtime behavior", and notes these assertions "are error-prone if we start to move code around". Remedy: narrow (type guard, `in`, discriminant check) or fix the upstream type so the cast becomes unnecessary.
- **`unknown` belongs at the edge and nowhere else.** `unknown` on a value that just came off the wire is correct. The flag is when it travels inward and gets cast at the point of use. Remedy: parse once at the boundary (a schema such as zod, or a hand-written guard) into a named type, and let only that type cross the module line.
- **Optional fields standing in for states.** An object with several `?:` fields where only certain combinations are valid is a missing discriminated union. The handbook's own example replaces `radius?`/`sideLength?` with `kind: "circle" | "square"`, and the `!`s disappear. Pair this with a `never` exhaustiveness check so adding a variant breaks the build instead of falling through.
- **Primitive obsession.** IDs, money, emails and slugs passed as bare `string`/`number` across modules. TS is structural, so `UserId` and `OrderId` are interchangeable unless branded. Remedy: branded types, minted by the parser and nowhere else.
- **Loosely-shaped contracts.** `Record<string, unknown>`, option bags with a dozen optionals, or a function returning `T | null | undefined | false`. Remedy: one named exported type per contract, colocated with its owner. Use `satisfies` where the author wants a checked literal without widening it.
- **Silent fallbacks.** `?? ""`, `|| 0`, `?? {}` and `catch {}` on a value the invariant says must exist. Each one turns a contract violation into wrong data. Remedy: make the value required in the type, or fail loudly at the boundary.
- **Plain JS.** Without a compiler, the boundary has to be a runtime parse plus JSDoc types checked with `checkJs`/`// @ts-check`. Flag new JS modules that pass untyped object literals between files.

Example phrases:
- `this cast is doing the type system's job by hand. can we parse at the boundary and pass a real type in?`
- `these three optional fields are really a union. can we model it with a discriminant so the \`!\`s go away?`

## Rule 7: async and atomicity

- A promise neither awaited nor returned (fire-and-forget) loses its errors and its ordering. Flag it unless it's explicitly `void`-ed with a reason.
- Independent `await`s in sequence are serialized orchestration. Remedy: `Promise.all`, or `Promise.allSettled` when partial failure is acceptable.
- Async callbacks passed where a sync callback is expected (`forEach(async ...)`, event handlers) silently drop promises.
- A loop of `await`s that writes related records without a transaction is a partial-update risk.

Also: Two or more related writes to a datastore without a transaction can leave state half-applied, and that is a Rule 7 finding regardless of language. Ask for the store's transaction primitive (e.g. Ecto `Repo.transact/2`, SQLAlchemy `Session.begin()`, Go `db.BeginTx`).

## Rule 1: not counted toward the 1000-line ceiling

- `package-lock.json`/`pnpm-lock.yaml`/`yarn.lock`, generated `.d.ts`, codegen output (OpenAPI/GraphQL/ORM clients), `__snapshots__/*.snap`, migration files.

## Hand to tooling (not review findings)

These are mechanical. Don't raise them as findings. If the repo has none of them wired up, say so once, as a single tooling-gap note.

- `strict: true`: default since **TS 6.0** (Mar 2026). Flag only an explicit `"strict": false` or a weakened sub-flag. It bundles `noImplicitAny`, `strictNullChecks`, `useUnknownInCatchVariables`, and others.
- `noUncheckedIndexedAccess`: adds `undefined` to index-signature reads. **Not** in `strict`.
- `exactOptionalPropertyTypes`: distinguishes "absent" from "`undefined`". Not in `strict`.
- `checkJs` / `// @ts-check`: type-check plain JS.
- typescript-eslint:
  - `no-explicit-any` (recommended): bans `any`.
  - `no-unsafe-assignment`/`-member-access`/`-argument`/`-return`/`-call` (type-checked): stop `any` spreading.
  - `no-non-null-assertion` (strict): bans `!`.
  - `ban-ts-comment` (recommended): bans `@ts-ignore` and requires descriptions on `@ts-expect-error`.
  - `no-unsafe-type-assertion` (opt-in, type-checked): flags `as` that narrows.
  - `no-unnecessary-type-assertion` (recommended): removes dead casts.
  - `switch-exhaustiveness-check` (opt-in, type-checked): exhaustive unions.
  - `no-unnecessary-condition` (strict-type-checked): catches fallbacks on non-nullable values.
  - `no-floating-promises` (recommended-type-checked): unhandled promises.
  - `no-misused-promises` (recommended-type-checked): async callbacks in sync slots.
  - `await-thenable`: awaiting non-promises.
