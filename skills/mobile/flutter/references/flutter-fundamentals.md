# Flutter Fundamentals

## Overview
Flutter is Google's UI toolkit for building natively compiled applications from a single codebase. It uses Dart, the Skia/Impeller rendering engine, and a widget-based composition model. Flutter supports iOS, Android, web, and desktop from one codebase.

## Core Concepts

### Widgets
Everything in Flutter is a Widget. Two types: `StatelessWidget` (immutable, describes UI based on constructor params) and `StatefulWidget` (mutable state via `State` object). Widgets compose deeply — complex UIs from simple building blocks. Build method returns a widget tree.

### State Management
Widgets maintain state via `setState()` for local state. For shared state, use Provider, Riverpod, BLoC, or GetIt. Riverpod is the modern choice: compile-safe, testable, auto-dispose. BLoC uses events and states with Streams. Provider is simplest for small apps.

### Build Process
Flutter compiles Dart to native code via AOT compilation for release builds. Debug builds use JIT for hot reload. iOS builds require Xcode and macOS. Android builds require Gradle. Web builds to JavaScript/WebAssembly. Desktop builds per platform.

### Platform Channels
Flutter communicates with native code via `MethodChannel`. Dart sends a method name and arguments, native side receives and responds. Use `pigeon` package for type-safe channel definitions. Minimize channel calls for performance.

## Architecture Patterns

### Repository Pattern
Repository abstracts data sources (remote API, local DB, cache). ViewModel/Controller calls repository, never data sources directly. Repositories return `Future` or `Stream` for async data. Handle errors and loading states consistently.

### BLoC Pattern
Business Logic Component: Events (input) → Bloc (logic) → States (output). `BlocProvider` provides Bloc to widget tree. `BlocBuilder` rebuilds on state change. `BlocListener` for one-shot events (navigation, snackbar). Test with `bloc_test` package.

### Riverpod
Declarative state management with compile-time safety. `Provider` for synchronous values. `FutureProvider` for async data. `StateNotifierProvider` for mutable state. `StreamProvider` for streams. `ref.watch` for reactivity, `ref.read` for one-shot access.

## Data Management

### Local Database
`sqflite` for SQLite on mobile. `drift` (formerly moor) for type-safe SQL with code generation. `Isar` for NoSQL document DB with JSON-like queries. `Hive` for lightweight key-value storage. Prefer drift for complex relational data, Isar/Hive for simple data.

### Network Requests
`http` package for simple requests. `dio` for advanced use: interceptors, retry, cancellation, progress tracking. `graphql_flutter` for GraphQL APIs. `chopper` for Retrofit-like generated API clients. Always use `catchError` / try-catch for network calls.

### Secure Storage
`flutter_secure_storage` wraps Keychain (iOS) and EncryptedSharedPreferences (Android). AES encryption with platform key stores. Use for tokens, credentials, and sensitive data. Never use `SharedPreferences` for secrets.

## Security Fundamentals

### SSL Pinning
Implement certificate pinning in Dio via `BadCertificateCallback` or a custom `HttpOverrides`. For production, pin the public key hash (not full cert). Include backup hashes for cert rotation. Test with both valid and invalid certs.

### Code Obfuscation
Enable `--obfuscate` and `--split-debug-info` in release builds. Obfuscation renames symbols to hinder reverse engineering. Keep debug info for crash deobfuscation. Combine with `--tree-shake-icons` for smaller bundle.

## Build & Dependency Management

### pubspec.yaml
Central configuration: dependencies (from pub.dev or git), dev_dependencies (testing, linting), assets (images, fonts, JSON), plugins (platform-specific packages). Use `^` version constraint for semver compatibility. `dependency_overrides` for conflict resolution.

### Build Flavors
Configure flavors for dev/staging/prod via `--dart-define` and `--flavor`. Android: Gradle product flavors. iOS: Xcode schemes with different bundle IDs. Separate config files per flavor. Firebase per environment.

### Testing
`flutter_test` for unit and widget tests. `integration_test` for end-to-end tests. `golden_toolkit` for golden/snapshot tests. `mocktail` for mocking. `coverage` package for code coverage reporting. Run on CI with `flutter test --coverage`.

## Key Points
- Widget-based composition: everything is a widget (StatelessWidget / StatefulWidget)
- Riverpod over Provider for modern state management (compile-safe, testable)
- Drift for type-safe relational DB; Isar/Hive for NoSQL
- Dio for advanced networking with interceptors
- flutter_secure_storage for secrets (wraps platform secure storage)
- `--obfuscate` + `--split-debug-info` for release builds
- Hot reload in debug (JIT), AOT compilation for release
- Platform channels for native interop (minimize calls)
- Build flavors via --dart-define for env-specific config
- Golden tests for visual regression
