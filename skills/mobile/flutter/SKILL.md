---
name: flutter-expertise
description: >
  Use this skill when the user says 'Flutter', 'Flutter app', 'widget rebuild', 'Riverpod', 'BLoC', 'Provider', 'go_router', 'Flutter performance', 'jank', 'const widget', 'platform channel', 'Flutter testing', 'golden test', 'Flutter release build', 'flavors'. Builds and reviews Flutter apps: project structure, state management choice (Riverpod 3, BLoC, Provider), navigation, rebuild/paint optimisation, platform channels and FFI, testing (unit/widget/golden/integration) and release builds. Do NOT use for: engine/rendering internals (use flutter-internals), Dart language features (use lang-dart), cross-platform framework comparison (use mobile-patterns).
version: "2.0.0"
author: "j4flmao"
license: "MIT"
tags: [mobile, flutter, dart, riverpod, bloc, performance]
---

# Flutter

## Purpose
Flutter renders its own UI from a declarative widget tree, so app quality depends on keeping rebuilds narrow, state ownership clear, and heavy work off the UI isolate. This skill provides the default architecture, state-management decision rules, current Riverpod/BLoC APIs, performance techniques and the testing pyramid for production Flutter apps.

## Agent Protocol

### Trigger
"Flutter", "widget rebuild", "Riverpod", "BLoC", "Provider", "go_router", "Flutter performance", "jank", "const widget", "platform channel", "golden test", "flavors".

### Input Context
- Flutter/Dart versions (`flutter --version`, `pubspec.yaml`), target platforms
- Current state-management and navigation packages
- Symptom (jank, memory, build size) with DevTools data if available

### Output Artifact
Dart code, folder structure, `pubspec.yaml` changes, test code or a performance plan. No file unless requested.

### Response Format
```
Flutter/Dart: {versions}
Layer: {UI | state | data | platform}
Change: {what and why}
Code: {snippet}
Verify: {flutter test / DevTools trace / golden diff}
```

## 1. Project Structure (feature-first)
```
lib/
  main.dart                 // ProviderScope / BlocProvider roots, app config per flavor
  app/router.dart           // go_router configuration
  features/orders/
    data/                   // DTOs, API clients, repositories (implementations)
    domain/                 // entities, repository interfaces, use cases (pure Dart)
    presentation/           // widgets, controllers/notifiers/blocs
  core/                     // theming, networking, error types, utils
```
Keep `domain` free of Flutter imports so it unit-tests without a device. See `references/architecture.md`.

## 2. Choosing State Management
| Option | Fits | Notes |
|--------|------|-------|
| `setState` / `ValueNotifier` | local, ephemeral widget state | do not lift everything into global state |
| Riverpod 3 | app-wide state, DI, async data, testability | compile-safe providers; `Notifier`/`AsyncNotifier` APIs |
| BLoC / Cubit (`flutter_bloc`) | teams wanting explicit events → states, strong tracing | more boilerplate; great for complex flows |
| Provider + ChangeNotifier | existing apps, simple DI | Riverpod is its successor by the same author |

### Riverpod 3 (current API)
`StateProvider`, `StateNotifierProvider` and `ChangeNotifierProvider` are legacy in Riverpod 3 (importable from `package:flutter_riverpod/legacy.dart`). New code uses `Notifier`/`AsyncNotifier`:
```dart
import 'package:flutter_riverpod/flutter_riverpod.dart';

final counterProvider = NotifierProvider<Counter, int>(Counter.new);

class Counter extends Notifier<int> {
  @override
  int build() => 0;
  void increment() => state++;
}

final ordersProvider = AsyncNotifierProvider<OrdersController, List<Order>>(OrdersController.new);

class OrdersController extends AsyncNotifier<List<Order>> {
  @override
  Future<List<Order>> build() => ref.watch(orderRepositoryProvider).fetchOrders();

  Future<void> refresh() async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(() => ref.read(orderRepositoryProvider).fetchOrders());
  }
}

class CounterText extends ConsumerWidget {
  const CounterText({super.key});
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final count = ref.watch(counterProvider);           // rebuilds only when the int changes
    return Text('Count: $count');
  }
}
```
- `ref.watch` in `build`, `ref.read` in callbacks, `ref.listen` for side effects (snackbars, navigation).
- `select` to rebuild on part of a state: `ref.watch(userProvider.select((u) => u.name))`.
- Riverpod 3 providers compare with `==` before notifying; give state classes value equality (records, `freezed`, `equatable`).
- Code generation (`@riverpod` with `riverpod_generator`) is optional and produces the same providers.

### BLoC
Use `BlocBuilder` with `buildWhen`, `BlocSelector` for slices, `BlocListener` for one-off effects; model states as a sealed class hierarchy and switch exhaustively.

## 3. Navigation
`go_router` for declarative, URL-based routing (deep links, web, redirects for auth guards); `StatefulShellRoute` for bottom-nav tabs with preserved stacks. Avoid mixing imperative `Navigator.push` and router-driven navigation for the same flows.

## 4. Performance
- `const` constructors so unchanged subtrees are skipped; split large `build` methods into small widgets (not helper methods returning widgets) so rebuilds stay local.
- Lists: `ListView.builder`/`SliverList` with `itemExtent` or `prototypeItem` for fixed heights; never build thousands of children eagerly.
- Avoid `Opacity` and `ClipPath` in animated subtrees (they can force offscreen layers); use `AnimatedOpacity`/`FadeTransition` or color alpha. `RepaintBoundary` isolates frequently repainting widgets — verify with the DevTools repaint overlay rather than adding it everywhere.
- Images: size them (`cacheWidth`/`cacheHeight`), cache network images, precache hero images.
- Move CPU work off the UI isolate with `compute()`/`Isolate.run` (large JSON, image processing).
- Profile in `--profile` mode on a real device with DevTools (frame chart, raster vs UI thread). Debug mode is not representative.
- Rendering backend: Impeller is the default on iOS and on modern Android; check the Impeller docs for your Flutter version's Android fallback behaviour before debugging rendering differences.

## 5. Platform Integration
- Platform channels (`MethodChannel`, `EventChannel`) for native APIs; generate type-safe bindings with `pigeon` instead of hand-written string method names. See `references/platform-channels.md`.
- `dart:ffi` + `ffigen` for C libraries; Dart build hooks bundle native code with packages.
- Prefer maintained plugins (flutter.dev / Flutter Favorite) and check platform support before adopting.

## 6. Testing
| Level | Tool | Purpose |
|-------|------|---------|
| Unit | `package:test`, `mocktail` | domain/use cases, notifiers (`ProviderContainer` with overrides) |
| Widget | `flutter_test` (`testWidgets`, `pumpWidget`, finders) | UI behaviour without a device |
| Golden | `matchesGoldenFile` (or `alchemist`) | visual regressions; pin fonts/platform for stable images |
| Integration | `integration_test` (+ Patrol for native dialogs) | end-to-end on device/emulator |
See `references/testing.md`.

## 7. Builds and Releases
- Flavors / `--dart-define-from-file=env/prod.json` for environment config; never ship secrets in the binary.
- Release: `flutter build appbundle --release` (Android), `flutter build ipa` (iOS); enable `--obfuscate --split-debug-info=build/symbols` and upload symbols to the crash reporter.
- Android 15+ devices with 16 KB memory pages: keep Flutter and native plugins current so native libraries are 16 KB aligned (Google Play requirement for new apps/updates targeting Android 15+).

## 8. Anti-Patterns
| Anti-pattern | Problem | Fix |
|--------------|---------|-----|
| One giant `build()` with business logic | wide rebuilds, untestable | small widgets + notifiers/blocs |
| `ref.read` inside `build` | UI never updates | `ref.watch` |
| Using legacy `StateProvider` in new Riverpod 3 code | deprecated path | `Notifier`/`AsyncNotifier` |
| Heavy work in `build` or on the UI isolate | jank | precompute, `Isolate.run` |
| `!` on nullable state in widgets | red-screen crashes | handle loading/error/empty states |
| `setState` after `dispose` | exceptions | check `mounted`, cancel subscriptions |

## 9. Checklist
- [ ] Feature-first structure; domain layer free of Flutter imports
- [ ] One state-management approach, used consistently
- [ ] `const` widgets, builder lists, profiled in profile mode on device
- [ ] Loading/error/empty states rendered for every async source
- [ ] Unit + widget + golden + integration tests in CI
- [ ] Release builds obfuscated with symbols uploaded

## References
- `references/flutter-fundamentals.md` — widgets, layout, state basics
- `references/widgets.md` — widget catalogue and composition
- `references/architecture.md` — layering and project structure
- `references/state-management-provider.md` — Provider/Riverpod patterns
- `references/platform-channels.md` — method/event channels, pigeon
- `references/flutter-advanced.md` — isolates, rendering, advanced patterns
- `references/testing.md` — unit, widget, golden, integration tests
