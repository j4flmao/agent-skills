---
name: lang-dart
description: >
  Use this skill when the user says 'Dart', 'Dart 3', 'null safety', 'records', 'patterns', 'sealed class', 'Future', 'Stream', 'async*', 'isolate', 'Isolate.run', 'dart:ffi', 'pub', 'build_runner', 'freezed', 'dart test'. Writes and reviews idiomatic Dart 3: sound null safety, records/patterns/sealed classes, async with Futures and Streams, isolates for CPU work, FFI, code generation and testing. Do NOT use for: Flutter widget and state-management architecture (use flutter-expertise / flutter-internals), backend frameworks in other languages.
version: "2.0.0"
author: "j4flmao"
license: "MIT"
tags: [languages, dart, null-safety, async, isolates]
---

# Dart

## Purpose
Dart is the language under Flutter and also runs CLIs and servers. Dart 3 made null safety mandatory and added records, patterns and class modifiers, which change how idiomatic code is written. This skill covers those features, the single-threaded event-loop model and when to move work to isolates.

## Agent Protocol

### Trigger
"Dart", "Dart 3", "null safety", "records", "patterns", "sealed class", "Future", "Stream", "isolate", "Isolate.run", "dart:ffi", "pub", "build_runner", "freezed".

### Input Context
- Dart SDK version (from `pubspec.yaml` `environment.sdk`) and whether Flutter is involved
- Platform (mobile, web via dart2js/dart2wasm, CLI/server AOT)
- Lints in use (`package:lints`, `flutter_lints`, `very_good_analysis`)

### Output Artifact
Dart code, `pubspec.yaml`/`analysis_options.yaml` changes, tests. No file unless requested.

### Response Format
```
SDK: {Dart 3.x}
Change: {what and why}
Code: {snippet}
Async/isolate notes: {what runs where}
Verify: dart analyze && dart test
```

## 1. Execution Model
- One thread per isolate with an event loop (microtask queue first, then event queue). `Future`s and `Stream`s are scheduled callbacks on that loop — they do **not** run in parallel.
- Isolates have separate heaps and communicate by message passing; use them for CPU-heavy work so the UI/event loop stays responsive.
- Compilation: JIT with hot reload during development; AOT native code for release (mobile, `dart compile exe`); JavaScript (`dart2js`) or WebAssembly (`dart2wasm`) on the web.

## 2. Null Safety
- Types are non-nullable by default; `String?` allows null. Flow analysis promotes after checks (`if (x != null) x.length`). Promotion does not apply to public fields that could change — copy to a local first.
- Operators: `?.`, `??`, `??=`, `!` (throws if null — use only where an invariant guarantees non-null).
- `late` defers initialisation; reading before assignment throws `LateInitializationError` — prefer constructor initialisation.

## 3. Dart 3 Features
```dart
sealed class Shape {}
final class Circle extends Shape { Circle(this.r); final double r; }
final class Rect extends Shape { Rect(this.w, this.h); final double w, h; }

double area(Shape s) => switch (s) {        // exhaustive: compiler errors if a subtype is missing
  Circle(:final r) => 3.141592653589793 * r * r,
  Rect(:final w, :final h) => w * h,
};

(int, String) parse(String line) {           // records: lightweight multiple returns
  final [id, name] = line.split(',');        // list pattern (throws StateError if shape mismatches)
  return (int.parse(id), name.trim());
}
```
- Class modifiers: `sealed`, `final`, `base`, `interface`, `mixin class` control extension/implementation outside the library.
- Extension types (Dart 3.3) wrap a value with a zero-cost static interface (`extension type UserId(int value) {}`).
- Static metaprogramming (macros) was cancelled in 2025; keep using code generation (`build_runner` with `json_serializable`, `freezed`).

## 4. Async Patterns
```dart
Future<User> loadUser(String id) async {
  final resp = await http.get(Uri.parse('$base/users/$id')).timeout(const Duration(seconds: 5));
  if (resp.statusCode != 200) {
    throw HttpException('GET /users/$id failed: ${resp.statusCode}');
  }
  return User.fromJson(jsonDecode(resp.body) as Map<String, dynamic>);
}
```
- Always `await` or deliberately handle a Future; enable the `unawaited_futures` / `discarded_futures` lints and use `unawaited(...)` (dart:async) when fire-and-forget is intended.
- Run independent work concurrently with `Future.wait([...])` or record syntax `final (a, b) = await (fa, fb).wait;`.
- Streams: single-subscription vs broadcast; cancel `StreamSubscription`s in `dispose`; `async*` + `yield` to produce streams.
- Errors thrown in a Future without a handler surface as uncaught zone errors — handle them at the boundary.

## 5. Isolates
```dart
final result = await Isolate.run(() => parseLargeJson(rawString));  // Dart 2.19+
```
- `Isolate.run` spawns, runs and returns one result — ideal for one-off CPU work (JSON decode of large payloads, image processing, crypto). In Flutter, `compute()` wraps the same idea.
- Long-lived workers: `Isolate.spawn` + `SendPort`/`ReceivePort`. Messages are copied (except transferable typed data and immutable objects in the same isolate group); closures sent to `Isolate.run` must not capture unsendable objects (e.g. open sockets).
- Isolates are not available on the web (use web workers via JS interop).

## 6. FFI and Interop
- `dart:ffi` calls C APIs: `DynamicLibrary.open`, `lookupFunction`, `Pointer`, `Struct`; generate bindings with `package:ffigen`. Native assets (build hooks) package native code with a package.
- JS interop on the web: `dart:js_interop` with extension types (required for dart2wasm).

## 7. Tooling
- `dart format`, `dart analyze` (with `package:lints/recommended.yaml` or stricter), `dart fix --apply`, `dart test` (`package:test`, `package:mocktail` for mocks), `dart pub outdated`.
- `dart compile exe bin/main.dart` for a self-contained native CLI.

## 8. Anti-Patterns
| Anti-pattern | Problem | Fix |
|--------------|---------|-----|
| Heavy synchronous work in `async` functions | blocks the event loop (UI jank) | `Isolate.run` |
| `!` to silence the analyzer | runtime null errors | restructure, local promotion |
| Forgotten `await` | lost errors, wrong order | lints + explicit `unawaited` |
| `dynamic` everywhere / unchecked `jsonDecode` casts | runtime type errors | typed models, generated `fromJson` |
| Not cancelling stream subscriptions | leaks, callbacks after dispose | cancel in `dispose` |

## 9. Checklist
- [ ] SDK constraint `>=3.x`; strict lints enabled
- [ ] No unjustified `!` or `late`
- [ ] Sealed hierarchies + exhaustive `switch` for state/results
- [ ] CPU-heavy work moved to isolates; Futures awaited or explicitly unawaited
- [ ] `dart analyze` clean and `dart test` passing in CI

## References
- `references/dart-fundamentals.md` — null safety, mixins, streams
- `references/dart-advanced.md` — isolates, FFI, code generation
- `references/bloc-generics.md` — generics in BLoC-style state management
- `references/dart-testing.md` — unit and widget tests
