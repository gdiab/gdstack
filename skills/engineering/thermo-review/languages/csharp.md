<!-- Read by the thermo-review skill when the diff contains C# / .NET (legacy .NET Framework and modern .NET). Rule numbers refer to SKILL.md. Sources: ../SOURCES.md -->

# C# / .NET (legacy .NET Framework and modern .NET)

## Rule 5: types and boundaries

Tag each finding with its era: [legacy] (.NET Framework 4.x, C# 7.3, no nullable), [modern] (.NET 8+), [migration] (a mixed codebase partway through the upgrade). Leave anything an analyzer or nullable warnings already catch to tooling, and spend review comments on the shape of the boundary.

**Escape hatches**
- [all] `object`, `dynamic`, `Dictionary<string, object>`, `DataSet`/`DataTable`, or `ViewBag`/`ViewData` crossing a method or layer boundary. The real shape exists in someone's head, and `dynamic` turns every mistake into a runtime failure. Remedy: a named type (a sealed class in C# 7.3, a `record` in modern) or a strongly typed view model.
  - `this hands a Dictionary<string, object> across the service boundary. what's the actual shape? can we give it a type?`
- [all] downcasts (`as`, hard casts, `is X x` ladders) on a value that came from your own API. The parameter or return type is too wide for its callers, so the model is missing something. Remedy: narrow the signature, or add a virtual/interface member so the type ladder disappears. A cast at a genuine foreign boundary (deserialization, interop) is fine; one in domain code is not.
- [all] reflection over your own types (property lookup by string name, `Activator`/`GetType().GetMethod` dispatch) where an interface or an explicit dispatcher would do. This is Rule 4's "magic" in C# form.
- [modern] `!` (null-forgiving), `null!`/`default!` initializers, and sentinel defaults (`string.Empty`, `"N/A"`, `-1`, `Guid.Empty`) added to quiet nullable warnings. Each `!` is a place the compiler stops protecting you, and every caller has to know about a sentinel. Remedy: a constructor parameter, a `required` member, a nullable-analysis attribute (`[NotNullWhen]`, `[MemberNotNull]`), or an honest `T?`.
  - `why does this need a ! here? can the type say it's never null instead?`

**Optionality and "unset"**
- [legacy] without nullable reference types, "can be null" is invisible in the signature. Flag new public members that return `null` to mean "not found" or "not configured" with nothing in the name or type to say so. Remedy: the `TryGet(out T)` pattern (plus a throwing twin), or a distinct result type.
- [all] optional parameters, nullable `bool?`/enum flags, or `null`-means-default arguments that switch a method into a different mode. This is the "nullable modes" smell in C#. Remedy: separate methods, or one typed options/command object whose shape makes the modes explicit.

**Primitive obsession vs typed models**
- [all] the same `Guid`/`int` id, or a `string` status/kind/code, threaded through several layers where two of them could be swapped silently. Remedy: an `enum` for closed sets; a strongly typed id (`readonly struct` in 7.3, `readonly record struct` in modern) for identities that cross layers.
- [modern] hand-rolled DTO/value classes with mutable setters plus manual `Equals`/`GetHashCode`. Remedy: `record`/`record struct` with `required`/`init` members.
- [legacy] don't demand C# 9+ features in a C# 7.3 project. The fix there is an immutable class with constructor validation, not a `LangVersion` bump smuggled into a feature PR (see [migration]).

**Loosely-shaped contracts and boundary leaks**
- [all] anonymous types or long-lived tuples carrying a concept across a method boundary. Remedy: a named record or class once the shape outlives one method.
- [all] `IQueryable<T>` or tracked EF entities escaping the data layer (returned from a repository or service, bound straight to a controller or endpoint). Callers then compose provider-specific queries and can over-post. Remedy: materialize inside the layer and return a DTO or projection. Don't demand a repository either: `DbContext` already is the unit of work, and a repository that only passes `DbSet` methods through is a Rule 4 identity wrapper.
  - `this returns the EF entity straight from the endpoint. can we project to a response type so the persistence shape stays inside?`
- [legacy] `ConfigurationManager.AppSettings["..."]` string lookups scattered through business code. [modern] the equivalent is `IConfiguration["..."]` inside services. Remedy: one typed settings/options class bound at the edge and injected (in modern, `AddOptions<T>().Bind(...).ValidateOnStart()`).

**Silent fallbacks over unclear invariants**
- [all] `catch (Exception) { return null/default/false; }`, `FirstOrDefault()` followed by carrying on as if found, or `?? new Foo()` hiding a "this should never be missing". Remedy: state the invariant (`Single`, a guard that throws, or a nullable return the caller must handle) and catch only what you can actually handle.
- [all] exceptions used as cross-layer control flow (throw in the service, catch-and-branch in the controller for an expected outcome). Remedy: a `Try` method or an explicit result type for expected failures; keep exceptions for the unexpected.

**DI and abstraction shape**
- [legacy] dependencies `new`-ed inline, static singletons, or a static resolver called from business code. [modern] `IServiceProvider.GetService` in non-composition code, an injected "factory" that can resolve anything, or `BuildServiceProvider()` during registration. All of these are service locator. Remedy: constructor injection; for runtime selection, a narrowly typed factory. `Microsoft.Extensions.DependencyInjection` supports net462+, so [legacy] code can adopt it without porting first.
- [all] an `IFooService` interface whose only implementation is `FooService` and whose only other consumer is a mock. It's a header interface: indirection that doesn't model a real seam. Ask whether it earns its keep, and keep interfaces at real seams (I/O, external systems, true polymorphism).
  - `this interface has one implementation and mirrors it member for member. is it modeling a seam, or can we depend on the class directly?`

**[migration]: when a diff touches legacy code**
- Don't ask for drive-by modernization of untouched lines. Do block new escape hatches (`dynamic`, `object` bags, new `#nullable disable`, new `!`) added to code that's being migrated.
- New types in a half-migrated project should be nullable-aware from day one (`#nullable enable` at the top, or the project-default-enable plus opt-out strategy). Treat a new `#nullable disable` in a migrated file as a regression.
- On `net48` the BCL is not nullable-annotated, so missing warnings at BCL calls prove nothing. A raised `LangVersion` on `net48` is outside Microsoft's support matrix: features that need runtime or BCL types fail, and the nullable attributes need polyfills. Ask for that decision to be explicit and project-wide (`Directory.Build.props`), not slipped into a feature PR.
- Leave `null!`/`default!` scaffolding visible as migration debt; it should shrink with each pass, not spread.

## Rule 7: async and atomicity

**C# (async / atomicity)**
- Sync-over-async (`.Result`, `.Wait()`, `GetAwaiter().GetResult()`): [legacy] it can deadlock on classic ASP.NET's and UI SynchronizationContexts; [modern] ASP.NET Core has no context, so it won't deadlock, but it starves the thread pool. Remedy: async all the way. If a sync interface truly forces it, confine the block to one adapter at the edge rather than scattering it.
- `async void` is for event handlers only. Elsewhere its exceptions can't be observed and callers can't await it.
- Fire-and-forget (`_ = DoAsync()`, a bare `Task.Run` in a request): flag it when the work matters. [modern] move it to a `BackgroundService`/queue that creates its own DI scope, and never capture `HttpContext` or a request-scoped `DbContext`. [legacy] `HostingEnvironment.QueueBackgroundWorkItem` at minimum.
- `ConfigureAwait(false)`: [legacy] needed in library code reachable from classic ASP.NET/UI. [modern] ASP.NET Core app code doesn't need it, so don't let it spread through app code; keep it in shared libraries.
- Sequential awaits of independent I/O → `Task.WhenAll`, **except** on a single `DbContext`. EF does not support parallel operations on one context, so use separate contexts (`IDbContextFactory`) or keep it sequential.
- Non-atomic writes: several `SaveChanges` calls for one business operation can leave it half-applied. Remedy: one `SaveChanges` (transactional by default in EF6 and EF Core) or an explicit `BeginTransaction`. `TransactionScope` across awaits needs `TransactionScopeAsyncFlowOption.Enabled`.
- [migration] moving from classic ASP.NET to Core removes the one-continuation-at-a-time guarantee, so request code that mutates shared state across awaits may now race.

## Rule 1: not counted toward the 1000-line ceiling

**C# (what doesn't count toward 1000 lines)**: tool-generated files (`*.Designer.cs`, `*.g.cs`, `*.g.i.cs`, `*.generated.cs`, or a first comment containing `<auto-generated>`); EF migrations and the model snapshot; WinForms/WPF designer partials. The hand-written half of a `partial` class still counts, and splitting a class into partials to dodge the ceiling is not decomposition.

## Hand to tooling (not review findings)

These are mechanical. Don't raise them as findings. If the repo has none of them wired up, say so once, as a single tooling-gap note.

The **[all]** rules marked "needs analyzers enabled" need `EnableNETAnalyzers` on `net48`/netstandard. Legacy non-SDK csproj needs the `Microsoft.CodeAnalysis.NetAnalyzers` NuGet package plus `EffectiveAnalysisLevel` and `AnalysisMode`, because `AnalysisLevel` isn't understood there.

**Project / MSBuild settings**

| Setting | Purpose | Era |
|---|---|---|
| `<Nullable>enable</Nullable>` | Turns on nullable annotations and warnings (CS86xx), which removes "null as invisible unset" | [modern] (template default); [migration] via the `disable`/`enable`/`warnings`/`annotations` strategies |
| `<WarningsAsErrors>nullable</WarningsAsErrors>` | Makes every nullability warning an error so `!` and `#nullable disable` become deliberate | [modern], [migration] once clean |
| `#nullable enable` per file / `#nullable disable` per unmigrated file | File-by-file rollout; the end state is no directives left | [migration] |
| `<AnalysisMode>Recommended</AnalysisMode>` (or `<AnalysisLevel>latest-Recommended</AnalysisLevel>`) | Promotes more CA rules to build warnings than the default set | [modern]; legacy csproj via `EffectiveAnalysisLevel` + `AnalysisMode` |
| `<EnableNETAnalyzers>true</EnableNETAnalyzers>` | CA analyzers for projects targeting .NET Framework / netstandard (on by default only for .NET 5+) | [legacy], [migration] (SDK-style) |
| `Microsoft.CodeAnalysis.NetAnalyzers` PackageReference | CA analyzers for old-style (non-SDK) csproj | [legacy] |
| `<EnforceCodeStyleInBuild>true</EnforceCodeStyleInBuild>` | Runs IDExxxx style rules in CI builds, not only in the IDE | all (SDK-style) |
| `<LangVersion>` pinned in `Directory.Build.props`, never `latest` | One explicit, solution-wide language decision | [migration] |
| `Microsoft.VisualStudio.Threading.Analyzers` PackageReference | Supplies the VSTHRD async rules below | all |
| PolySharp (or equivalent attribute polyfill) | Makes `[NotNullWhen]`, `[MemberNotNull]` etc. available when `net48` uses a raised `LangVersion` | [migration] |
| DI scope validation (`validateScopes`/`ValidateScopes`) | Catches captive dependencies (a singleton holding a scoped service) at startup | [modern] |

**Rule IDs (`.editorconfig`: `dotnet_diagnostic.<ID>.severity = warning|error`)**

| ID | Purpose | Era |
|---|---|---|
| CS8600–CS8625 family (via `nullable`) | Possible null dereference/assignment; uninitialized non-nullable member (CS8618) | [modern], [migration] |
| CA1031 | Do not catch general exception types (off by default; configurable list) | all (needs analyzers enabled) |
| CA2200 | Rethrow with `throw;` to preserve the stack (on by default in .NET 5+) | all |
| CA1849 | Call the async overload inside async methods; also flags `.Wait()`, `.Result`, `GetAwaiter().GetResult()` (off by default) | all |
| CA2016 | Forward the `CancellationToken` you were given (suggestion by default) | all |
| CA2007 | `ConfigureAwait` on awaited tasks. **Library projects only**: Microsoft says to suppress it for app code and ASP.NET Core | [legacy] libs, shared libs |
| CS4014 | Un-awaited task call; forces `await` or an explicit `_ =` discard | all (compiler) |
| CS1998 | `async` method with no `await` | all (compiler) |
| VSTHRD002 | Avoid problematic synchronous waits | all |
| VSTHRD100 / VSTHRD101 | Avoid `async void` methods / async lambdas passed to void-returning delegates | all |
| VSTHRD103 | Call async methods when in an async method | all |
| VSTHRD110 | Observe the result of async calls (fire-and-forget) | all |
| VSTHRD111 | Use `.ConfigureAwait(bool)`. Library code only, same caveat as CA2007 | [legacy] libs |
| VSTHRD114 | Don't return `null` from a `Task`-returning method | all |
| IDE0019 / IDE0260 (`csharp_style_pattern_matching_over_as_with_null_check = true`) | `as` + null check → `is T x` pattern | C# 7+ (works in 7.3) |
| `generated_code = true` (editorconfig glob) | Marks generator output so nullable analysis and style rules skip it; doubles as the file-ceiling exclusion list | all |

Judgement stays with the reviewer even when a rule exists. CA1031 can't tell *why* a catch-all is there, and VSTHRD110 can't tell whether the work needed a hosted service. Tooling removes the mechanical instances; the Rule 5/7 text above covers the design question.
