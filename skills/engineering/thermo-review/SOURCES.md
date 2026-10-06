# Sources

Every claim in `languages/*.md` was checked against these pages on 2026-10-06. Citation markers were stripped from the language files to keep them short.

## C# / .NET

**Microsoft Learn: language, nullable, conventions**
- C# coding conventions (catch only what you can handle; `required` over constructors; analyzers/editorconfig): https://learn.microsoft.com/en-us/dotnet/csharp/fundamentals/coding-style/coding-conventions
- Language versioning (C# 7.3 default for all .NET Framework; C# 12/13/14 for .NET 8/9/10; newer-than-default is unsupported): https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/language-versioning
- Configure language version (don't use `latest`; Directory.Build.props): https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/configure-language-version
- Nullable migration strategies (four defaults, file by file, two-phase, generated-code exclusion list, remove `null!`/`default!` when done): https://learn.microsoft.com/en-us/dotnet/csharp/nullable-migration-strategies (redirects to …/advanced-topics/update-applications/nullable-migration-strategies)
- Resolve nullable warnings (use `!` only when the type system can't express it; no sentinels; `required`; `[NotNullWhen]`/`[MemberNotNull]`): https://learn.microsoft.com/en-us/dotnet/csharp/fundamentals/null-safety/common-tasks/resolve-warnings
- Compiler options, errors and warnings (`WarningsAsErrors` accepts `nullable`): https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/compiler-options/errors-warnings
- Using type `dynamic` (bypasses static checking; errors surface at run time): https://learn.microsoft.com/en-us/dotnet/csharp/advanced-topics/interop/using-type-dynamic
- Tuples vs records ("for long-lived domain concepts … prefer records, classes, or structs"; tuples over anonymous types): https://learn.microsoft.com/en-us/dotnet/csharp/fundamentals/types/tuples (anonymous-types URL redirected here)
- Framework Design Guidelines, Exceptions and Performance (Tester-Doer, Try-Parse): https://learn.microsoft.com/en-us/dotnet/standard/design-guidelines/exceptions-and-performance

**Microsoft Learn: analyzers**
- Code analysis overview (default rule sets for .NET 8/9/10, `AnalysisMode`, `EnforceCodeStyleInBuild`, legacy csproj via NetAnalyzers + `EffectiveAnalysisLevel`): https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/overview
- CA1031: https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/quality-rules/ca1031
- CA1849: https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/quality-rules/ca1849
- CA2007 (suppress for app code / ASP.NET Core): https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/quality-rules/ca2007
- CA2016: https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/quality-rules/ca2016
- IDE0019: https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/style-rules/ide0019
- CS4014 / CS1998: https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/compiler-messages/async-await-errors
- VSTHRD analyzer index (Microsoft.VisualStudio.Threading.Analyzers): https://microsoft.github.io/vs-threading/analyzers/index.html

**Microsoft Learn: async, DI, options, hosting**
- Async scenarios (async void only for event handlers; `WhenAll`; blocking preference order; ConfigureAwait note): https://learn.microsoft.com/en-us/dotnet/csharp/asynchronous-programming/async-scenarios
- ConfigureAwait FAQ, Stephen Toub (ASP.NET Core has no SynchronizationContext; use `ConfigureAwait(false)` in general-purpose library code): https://devblogs.microsoft.com/dotnet/configureawait-faq/
- DI guidelines (avoid service locator / `GetService`; avoid resolve-anything factories; avoid `BuildServiceProvider` at registration; avoid static access; captive dependency; scope validation): https://learn.microsoft.com/en-us/dotnet/core/extensions/dependency-injection/guidelines
- Options pattern (typed settings, `ValidateOnStart`): https://learn.microsoft.com/en-us/dotnet/core/extensions/options
- Hosted services (BackgroundService, create a scope for scoped services): https://learn.microsoft.com/en-us/aspnet/core/fundamentals/host/hosted-services
- `HostingEnvironment.QueueBackgroundWorkItem` (legacy ASP.NET tracks the work item and delays AppDomain shutdown): https://learn.microsoft.com/en-us/dotnet/api/system.web.hosting.hostingenvironment.queuebackgroundworkitem
- Microsoft.Extensions.DependencyInjection on NuGet (10.0.12 supports net462+ / netstandard2.0): https://www.nuget.org/packages/Microsoft.Extensions.DependencyInjection

**Microsoft Learn: ASP.NET Core, EF**
- Views overview (ViewData/ViewBag resolve dynamically and are error-prone; separate viewmodels from business models): https://learn.microsoft.com/en-us/aspnet/core/mvc/views/overview
- First web API tutorial, "Prevent over-posting" (DTOs): https://learn.microsoft.com/en-us/aspnet/core/tutorials/first-web-api
- EF Core transactions (SaveChanges is transactional by default; `BeginTransaction`; `TransactionScopeAsyncFlowOption`): https://learn.microsoft.com/en-us/ef/core/saving/transactions
- EF6 transactions (SaveChanges wrapped in a transaction in all EF versions; `Database.BeginTransaction`): https://learn.microsoft.com/en-us/ef/ef6/saving/transactions
- DbContext lifetime (one unit of work; not thread-safe; no parallel operations on one context; await immediately): https://learn.microsoft.com/en-us/ef/core/dbcontext-configuration/
- Tracking vs no-tracking (projections without entities aren't tracked): https://learn.microsoft.com/en-us/ef/core/querying/tracking
- Migrations overview (generated migration files + model snapshot): https://learn.microsoft.com/en-us/ef/core/managing-schemas/migrations/
- Persistence-layer design (DbContext implements Repository + UoW; "repositories shouldn't be mandatory"): https://learn.microsoft.com/en-us/dotnet/architecture/microservices/microservice-ddd-cqrs-patterns/infrastructure-persistence-layer-design

**Microsoft Learn: porting**
- Upgrade overview (Copilot modernization agent recommended; Upgrade Assistant deprecated): https://learn.microsoft.com/en-us/dotnet/core/porting/
- Port from .NET Framework (SDK-style csproj also works for net4x; PackageReference; multi-target): https://learn.microsoft.com/en-us/dotnet/core/porting/framework-overview
- Pre-migration changes (4.7.2+, PackageReference, SDK-style): https://learn.microsoft.com/en-us/dotnet/core/porting/premigration-needed-changes

**Practitioners**
- David Fowler, AsyncGuidance.md (async void "ALWAYS bad" in ASP.NET Core; avoid `.Result`/`.Wait`; sync-over-async starves the thread pool): https://github.com/davidfowl/AspNetCoreDiagnosticScenarios/blob/master/AsyncGuidance.md
- David Fowler, AspNetCoreGuidance.md (don't capture HttpContext or scoped services in background work; use `IServiceScopeFactory`): https://github.com/davidfowl/AspNetCoreDiagnosticScenarios/blob/master/AspNetCoreGuidance.md
- Stephen Cleary, "Don't Block on Async Code" (UI and classic ASP.NET context deadlock; the preferred fix is not blocking): https://blog.stephencleary.com/2012/07/dont-block-on-async-code.html
- Stephen Cleary, "ASP.NET Core SynchronizationContext" (no context; blocking won't deadlock but still wrong; implicit parallelism risk): https://blog.stephencleary.com/2017/03/aspnetcore-synchronization-context.html
- Mark Seemann, "Service Locator is an Anti-Pattern" (hidden dependencies; prefer constructor injection; abstract factory for runtime choice): https://blog.ploeh.dk/2010/02/03/ServiceLocatorisanAnti-Pattern/
- Mark Seemann, "Interfaces are not abstractions" (header interfaces; Reused Abstractions Principle): https://blog.ploeh.dk/2010/12/02/Interfacesarenotabstractions/
- Andrew Lock, strongly typed IDs vs primitive obsession (2019, still the canonical C# write-up): https://andrewlock.net/using-strongly-typed-entity-ids-to-avoid-primitive-obsession-part-1/
- Gérald Barré (Meziantou), NRT on .NET Standard 2.0 / .NET Framework (BCL un-annotated → oblivious; attribute polyfills; multi-target; 2019): https://www.meziantou.net/how-to-use-nullable-reference-types-in-dotnet-standard-2-0-and-dotnet-.htm
- PolySharp (source-only polyfills for newer C# features on .NET Framework; includes the nullable attributes). Seen only via search-result summary, repo not opened: https://github.com/Sergio0694/PolySharp

**Recent practice (2025–2026 check)**
- Mukesh Murugan, "Repository Pattern in .NET 10: Do You Really Need It?" (updated 2026-06-04; `IQueryable` from a repository is a leaky abstraction; greenfield .NET 10: use DbContext directly). It's a secondary source that agrees with Microsoft's "repositories shouldn't be mandatory": https://codewithmukesh.com/blog/repository-pattern-do-you-really-need-it/
- Microsoft docs dated 2025–2026 (nullable migration 2026-05; resolve-warnings 2026-05; EF transactions 2026-08; DI guidelines 2026-01; hosted services 2026-10) show current guidance is unchanged in substance from the classic sources above. Nick Chapsas was not used (nothing that needed corroborating).

## TypeScript, Python, Elixir, Go, Rust, Shell

1. Alexis King, "Parse, don't validate" — https://lexi-lambda.github.io/blog/2019/11/05/parse-don-t-validate/
2. TS Handbook, Everyday Types (non-null assertion) — https://www.typescriptlang.org/docs/handbook/2/everyday-types.html
3. TS Handbook, Narrowing (discriminated unions, `never` exhaustiveness, `!` caution) — https://www.typescriptlang.org/docs/handbook/2/narrowing.html
4. Zod API, branded types — https://zod.dev/api
5. TS 4.9 release notes, `satisfies` — https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-9.html
6. TSConfig `checkJs` — https://www.typescriptlang.org/tsconfig/#checkJs
7. Python `typing` module docs (cast, Any vs object, NewType, TypedDict, Literal, assert_never, TypeIs) — https://docs.python.org/3/library/typing.html
8. Python typing best practices (Any vs object, avoid union returns) — https://typing.python.org/en/latest/reference/best_practices.html
9. Pydantic strict mode (coercion by default) — https://docs.pydantic.dev/latest/concepts/strict_mode/
10. Elixir v1.20 docs, Gradual set-theoretic types (incl. roadmap, struct-update proof) — https://elixir.hexdocs.pm/gradual-set-theoretic-types.html
11. José Valim, "Elixir v1.20 released: now a gradually typed language" (2026-06-03) — https://elixir-lang.org/blog/2026/06/03/elixir-v1-20-0-released/
12. Elixir Typespecs reference ("may be phased out"; never used by compiler; Dialyzer) — https://elixir.hexdocs.pm/typespecs.html
13. Elixir Structs guide (`@enforce_keys`) — https://elixir.hexdocs.pm/structs.html
14. Elixir code-related anti-patterns — https://elixir.hexdocs.pm/code-anti-patterns.html
15. Elixir design-related anti-patterns — https://elixir.hexdocs.pm/design-anti-patterns.html
16. Elixir process-related anti-patterns — https://elixir.hexdocs.pm/process-anti-patterns.html
17. Elixir `Agent` docs (client-side state computation races) — https://elixir.hexdocs.pm/Agent.html ; `GenServer` client API — https://elixir.hexdocs.pm/GenServer.html
18. Go Code Review Comments (Interfaces, In-Band Errors, Handle Errors, Contexts, Goroutine Lifetimes) — https://go.dev/wiki/CodeReviewComments
19. Google Go Style Guide, Decisions (Generics) — https://google.github.io/styleguide/go/decisions
20. Effective Go (comma-ok type assertions; share memory by communicating) — https://go.dev/doc/effective_go
21. Go `context` package (no ctx in structs; vet checks CancelFunc) — https://pkg.go.dev/context
22. Clippy lint index — https://rust-lang.github.io/rust-clippy/stable/index.html
23. Rust API Guidelines, Interoperability (C-GOOD-ERR) — https://rust-lang.github.io/api-guidelines/interoperability.html
24. Rust API Guidelines, Type safety (C-NEWTYPE, C-CUSTOM-TYPE) — https://rust-lang.github.io/api-guidelines/type-safety.html
25. Rust API Guidelines, Dependability (C-VALIDATE) — https://rust-lang.github.io/api-guidelines/dependability.html
26. The Rust Book 9.3, "Custom Types for Validation" — https://doc.rust-lang.org/book/ch09-03-to-panic-or-not-to-panic.html
27. Rust 2024 edition guide, `unsafe_op_in_unsafe_fn` — https://doc.rust-lang.org/edition-guide/rust-2024/unsafe-op-in-unsafe-fn.html
28. Ecto.Repo (`transact/2`; `transaction/2` deprecated) — https://hexdocs.pm/ecto/Ecto.Repo.html
29. SQLAlchemy Session basics (begin/commit/rollback framing) — https://docs.sqlalchemy.org/en/20/orm/session_basics.html
30. Go `database/sql` (`BeginTx`) — https://pkg.go.dev/database/sql
31. typescript-eslint `no-floating-promises` — https://typescript-eslint.io/rules/no-floating-promises/
32. Python "Developing with asyncio" (debug mode, blocking code) — https://docs.python.org/3/library/asyncio-dev.html
33. Python asyncio Tasks (`create_task` weak refs, `TaskGroup` vs `gather`, `to_thread`) — https://docs.python.org/3/library/asyncio-task.html
34. Elixir `Task` (`async_stream`, `Task.Supervisor`) — https://elixir.hexdocs.pm/Task.html
35. Go 1.26 release notes (experimental goroutine leak profile + leak example) — https://go.dev/doc/go1.26
36. `errgroup` — https://pkg.go.dev/golang.org/x/sync/errgroup
37. Tokio tutorial, Shared state (std vs tokio Mutex; holding a guard across `.await`) — https://tokio.rs/tokio/tutorial/shared-state
38. Tokio `spawn_blocking` — https://docs.rs/tokio/latest/tokio/task/fn.spawn_blocking.html
39. Tokio `select!` (cancellation safety) — https://docs.rs/tokio/latest/tokio/macro.select.html
40. Google Shell Style Guide (100-line rule, ShellCheck, PIPESTATUS) — https://google.github.io/styleguide/shellguide.html
41. GitHub Linguist overrides (`linguist-generated`) — https://github.com/github-linguist/linguist/blob/main/docs/overrides.md
42. `go` command docs, generated-code header convention — https://pkg.go.dev/cmd/go
43. Announcing TypeScript 6.0 ("strict is now true by default") — https://devblogs.microsoft.com/typescript/announcing-typescript-6-0/
44. TSConfig reference, `strict` and related flags — https://www.typescriptlang.org/tsconfig/#strict
45. typescript-eslint rules index — https://typescript-eslint.io/rules/
46. mypy command line (`--strict` contents, `--disallow-any-explicit`) — https://mypy.readthedocs.io/en/stable/command_line.html
47. mypy optional error codes — https://mypy.readthedocs.io/en/stable/error_code_list2.html
48. Pyright configuration — https://github.com/microsoft/pyright/blob/main/docs/configuration.md
49. Ruff rules (ANN401, PGH003, FBT001, BLE001, S110, RUF006, ASYNC210/220/230/251) — https://docs.astral.sh/ruff/rules/
50. `mix compile.elixir` (`--warnings-as-errors`) — https://hexdocs.pm/mix/Mix.Tasks.Compile.Elixir.html
51. Dialyxir README (flags) — https://hexdocs.pm/dialyxir/readme.html
52. Credo `UnsafeToAtom` — https://hexdocs.pm/credo/Credo.Check.Warning.UnsafeToAtom.html
53. Credo `Readability.Specs` — https://hexdocs.pm/credo/Credo.Check.Readability.Specs.html
54. `go vet` analyzers — https://pkg.go.dev/cmd/vet
55. Go race detector — https://go.dev/doc/articles/race_detector
56. golangci-lint linters — https://golangci-lint.run/docs/linters/
57. rustc allowed-by-default lints (`unsafe_code`) — https://doc.rust-lang.org/rustc/lints/listing/allowed-by-default.html
58. ShellCheck SC2155 — https://www.shellcheck.net/wiki/SC2155
