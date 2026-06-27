---
name: flutter
description: >
  Use this skill when the user asks about Flutter, Dart, widgets, Flutter
  architecture, state management, Riverpod, BLoC, GoRouter, Flutter testing,
  or Material Design.
version: "2.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [mobile, flutter, phase-4]
---

# Flutter

## Purpose
Build Flutter cross-platform applications with clean architecture, Riverpod or BLoC state management, GoRouter navigation, and layered testing.

## Agent Protocol

### Trigger
User request includes: `flutter`, `dart`, `flutter widget`, `flutter architecture`, `flutter state`, `flutter testing`, `flutter layout`, `flutter navigation`, `material design`, `cupertino`.

### Input Context
- Flutter SDK version (stable/beta/master)
- Dart version
- State management (Provider, Riverpod, BLoC, GetX)
- Platform target (iOS, Android, Web, Desktop)
- Architecture (Clean Architecture, MVC, TDD)

### Output Artifact
A markdown document containing:
- Project structure
- Widget tree / component hierarchy
- State management setup
- Navigation/routing config
- Data layer (repository, model, API)
- Test plan

### Response Format
Produce the artifact directly. No preamble, no postamble, no explanations. No filler, no hedging, no transitions. Strip articles a/an/the where unambiguous. Compress output — why use many token when few do trick.

### Max Response Length
4096 tokens

## Workflow

### Step 1: Set Up Project Structure
Organize code with feature-first architecture: core, features (data/domain/presentation), and app-level config.

### Step 2: Choose State Management
Select Riverpod for scalable reactive state or BLoC for event-driven architectures with clear state transitions.

### Step 3: Configure Navigation
Set up GoRouter with declarative routing, nested routes, and deep linking support.

### Step 4: Implement Data Layer
Use repository pattern with remote and local data sources, model mapping, and error handling.

### Step 5: Write Tests
Cover business logic with unit tests, widgets with widget tests, and flows with integration tests.

## Architecture Decision Trees

### State Management Selection
```
App complexity?
├── Simple (<10 screens)
│   → Provider (simple, well-known) or setState (for forms/settings)
├── Medium (10-30 screens, moderate state)
│   → Riverpod — compile-safe, auto-dispose, test-friendly
├── Complex (real-time, event-heavy, large team)
│   → BLoC — explicit events/states, best for event-sourced architectures
└── High-frequency data (chat, trading, gaming)
    → BLoC or Riverpod Notifier (avoid setState, which rebuilds entire widget tree)
```

### Navigation Strategy
```
Platform target?
├── Mobile + Web
│   → GoRouter — declarative, deep linking, URL-based routes
├── Mobile only
│   → GoRouter or auto_route (code-gen, type-safe)
├── Desktop
│   → GoRouter with ShellRoute for nested navigation
└── Simple app (2-3 screens)
    → Navigator 2.0 or GetX navigation (minimal boilerplate)
```

### Platform Channel vs FFI
```
Need native platform access?
├── Simple (sensor reading, battery level) → MethodChannel
├── Complex (ML inference, audio processing) → FFI (dart:ffi)
├── Third-party SDK (payment, maps) → Flutter plugin from pub.dev
└── Custom UI component (native map, camera) → PlatformView
```

## Project Structure

```
lib/
├── app/
│   ├── app.dart
│   └── router.dart
├── core/
│   ├── constants/
│   ├── errors/
│   ├── network/
│   ├── theme/
│   └── utils/
├── features/
│   ├── orders/
│   │   ├── data/
│   │   │   ├── datasources/
│   │   │   ├── models/
│   │   │   └── repositories/
│   │   ├── domain/
│   │   │   ├── entities/
│   │   │   ├── repositories/
│   │   │   └── usecases/
│   │   └── presentation/
│   │       ├── providers/
│   │       ├── screens/
│   │       └── widgets/
│   └── ...
└── main.dart
test/
├── unit/
├── widget/
└── integration/
```

## State Management — Riverpod

```dart
// lib/features/orders/presentation/providers/order_provider.dart
@riverpod
class OrderList extends _$OrderList {
  @override
  Future<List<Order>> build() async {
    final repo = ref.watch(orderRepositoryProvider);
    return repo.getOrders();
  }

  Future<void> refresh() async => ref.invalidateSelf();
}

// StateNotifierProvider for mutable state
@riverpod
class OrderFilter extends _$OrderFilter {
  @override
  OrderFilterState build() => const OrderFilterState();

  void setStatus(OrderStatus? status) => state = state.copyWith(status: status);
  void setQuery(String q) => state = state.copyWith(query: q);
}

// Usage in widget
class OrderListScreen extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final ordersAsync = ref.watch(orderListProvider);
    final filter = ref.watch(orderFilterProvider);

    return ordersAsync.when(
      data: (orders) => ListView.builder(
        itemCount: orders.length,
        itemBuilder: (_, i) => OrderCard(order: orders[i]),
      ),
      loading: () => const CircularProgressIndicator(),
      error: (e, _) => Text('Error: $e'),
    );
  }
}
```

## State Management — BLoC

```dart
// lib/features/orders/presentation/bloc/order_bloc.dart
class OrderBloc extends Bloc<OrderEvent, OrderState> {
  final OrderRepository _repo;

  OrderBloc(this._repo) : super(OrderInitial()) {
    on<LoadOrders>(_onLoadOrders);
    on<FilterOrders>(_onFilterOrders);
  }

  Future<void> _onLoadOrders(LoadOrders event, Emitter<OrderState> emit) async {
    emit(OrderLoading());
    try {
      final orders = await _repo.getOrders();
      emit(OrderLoaded(orders));
    } catch (e) {
      emit(OrderError(e.toString()));
    }
  }

  Future<void> _onFilterOrders(FilterOrders event, Emitter<OrderState> emit) async {
    final current = state;
    if (current is OrderLoaded) {
      final filtered = current.orders.where((o) => o.status == event.status).toList();
      emit(OrderLoaded(filtered));
    }
  }
}
```

## Navigation — GoRouter

```dart
// lib/app/router.dart
final router = GoRouter(
  initialLocation: '/orders',
  routes: [
    ShellRoute(
      builder: (context, state, child) => AppShell(child: child),
      routes: [
        GoRoute(
          path: '/orders',
          builder: (_, __) => const OrderListScreen(),
          routes: [
            GoRoute(
              path: ':id',
              builder: (_, state) => OrderDetailScreen(
                orderId: state.pathParameters['id']!,
              ),
            ),
          ],
        ),
        GoRoute(path: '/profile', builder: (_, __) => const ProfileScreen()),
      ],
    ),
  ],
);
```

## Data Layer — Repository Pattern

```dart
// lib/features/orders/data/repositories/order_repository_impl.dart
class OrderRepositoryImpl implements OrderRepository {
  final OrderRemoteDataSource remote;
  final OrderLocalDataSource local;

  OrderRepositoryImpl({required this.remote, required this.local});

  @override
  Future<List<Order>> getOrders() async {
    try {
      final models = await remote.fetchOrders();
      await local.cacheOrders(models);
      return models.map((m) => m.toEntity()).toList();
    } catch (e) {
      final cached = await local.getCachedOrders();
      if (cached.isNotEmpty) return cached.map((c) => c.toEntity()).toList();
      rethrow;
    }
  }

  @override
  Future<Order> getOrder(String id) async {
    try {
      return (await remote.fetchOrder(id)).toEntity();
    } catch (_) {
      final cached = await local.getCachedOrder(id);
      if (cached != null) return cached.toEntity();
      rethrow;
    }
  }
}
```

## Dependency Injection — Riverpod

```dart
// Providers central
final dioProvider = Provider<Dio>((ref) => Dio(BaseOptions(
  baseUrl: 'https://api.example.com',
  connectTimeout: const Duration(seconds: 10),
)));

final remoteDataSourceProvider = Provider<OrderRemoteDataSource>((ref) {
  return OrderRemoteDataSourceImpl(ref.watch(dioProvider));
});

final localDataSourceProvider = Provider<OrderLocalDataSource>((ref) {
  return OrderLocalDataSourceImpl(ref.watch(databaseProvider));
});

final orderRepositoryProvider = Provider<OrderRepository>((ref) {
  return OrderRepositoryImpl(
    remote: ref.watch(remoteDataSourceProvider),
    local: ref.watch(localDataSourceProvider),
  );
});
```

## Testing

```dart
// test/unit/order_repository_test.dart
void main() {
  late MockOrderRemoteDataSource mockRemote;
  late MockOrderLocalDataSource mockLocal;
  late OrderRepositoryImpl repo;

  setUp(() {
    mockRemote = MockOrderRemoteDataSource();
    mockLocal = MockOrderLocalDataSource();
    repo = OrderRepositoryImpl(remote: mockRemote, local: mockLocal);
  });

  group('getOrders', () {
    test('returns orders from remote and caches locally', () async {
      final models = [OrderModel(id: '1', customerName: 'Test')];
      when(() => mockRemote.fetchOrders()).thenAnswer((_) async => models);
      when(() => mockLocal.cacheOrders(any())).thenAnswer((_) async => {});

      final result = await repo.getOrders();

      expect(result.length, 1);
      verify(() => mockLocal.cacheOrders(models)).called(1);
    });

    test('falls back to cache when remote fails', () async {
      when(() => mockRemote.fetchOrders()).thenThrow(Exception('Network error'));
      when(() => mockLocal.getCachedOrders()).thenAnswer((_) async => [
        CachedOrder(id: '1', customerName: 'Cached'),
      ]);

      final result = await repo.getOrders();

      expect(result.length, 1);
      expect(result.first.customerName, 'Cached');
    });

    test('rethrows when both remote and cache fail', () async {
      when(() => mockRemote.fetchOrders()).thenThrow(Exception('Network error'));
      when(() => mockLocal.getCachedOrders()).thenAnswer((_) async => []);

      expect(() => repo.getOrders(), throwsA(isA<Exception>()));
    });
  });
}
```

## Platform Channels

```dart
// lib/core/platform/payment_channel.dart
class PaymentChannel {
  static const _channel = MethodChannel('com.example.app/payment');

  static Future<String> processPayment(double amount, String currency) async {
    try {
      final result = await _channel.invokeMethod<String>('processPayment', {
        'amount': amount,
        'currency': currency,
      });
      return result ?? '';
    } on MissingPluginException {
      throw UnsupportedError('Payment not available on this platform');
    }
  }
}
```

## Flutter Performance Patterns

- Use `const` constructors on all widgets that don't mutate
- `RepaintBoundary` for widgets that repaint independently (maps, animations)
- `ListView.builder` over `ListView(children:)` for large lists (lazy construction)
- `AnimatedBuilder` or `ValueListenableBuilder` for local animations — avoid `setState` on parent
- `ImageCache.maximumSize` set to ~100MB for image-heavy apps
- `shouldRepaint` returns false in custom painters when visual output unchanged
- `Opacity` widget is expensive — use `AnimatedOpacity` or draw with alpha in canvas
- Profile builds only — never measure performance on debug builds (JIT is 2-5x slower)
- Use `flutter build apk --split-debug-info` to reduce release binary size

## Platform Considerations

- iOS: `platform_channels_ios` for Swift/Obj-C interop
- Android: `platform_channels_android` for Kotlin interop, FlutterEngineGroup for multiple engines
- Web: `dart:html` is deprecated — use `package:web` for DOM access
- Desktop: `window_manager` for window controls, `system_tray` for tray icons
- Keyboard: `Shortcuts` + `Actions` widget for keyboard shortcuts (desktop/web)

## Pubspec Strategy

```yaml
dependencies:
  flutter:
    sdk: flutter
  # State management
  flutter_riverpod: ^2.5.0
  riverpod_annotation: ^2.3.0
  # Navigation
  go_router: ^14.0.0
  # Network
  dio: ^5.4.0
  # Local storage
  drift: ^2.18.0
  sqlite3_flutter_libs: ^0.5.0
  # Code gen
  freezed_annotation: ^2.4.0
  json_annotation: ^4.9.0

dev_dependencies:
  build_runner: ^2.4.0
  freezed: ^2.5.0
  json_serializable: ^6.8.0
  riverpod_generator: ^2.4.0
  mockito: ^5.4.0
  drift_dev: ^2.18.0
```

## Anti-Patterns

- **Giant Widget build methods**: Extract reusable widgets — one widget = one screen section
- **setState for everything**: Use state management for shared state; `setState` for local form state only
- **GlobalKey misuse**: Use keys for widget identity, not for accessing state from outside
- **Business logic in Widgets**: Extract to providers/blocs — widgets should be pure UI + event dispatch
- **Navigator.push everywhere**: Use GoRouter's context.go() for URL-based navigation
- **Streams without disposal**: Riverpod auto-disposes, but raw StreamSubscription must be cancelled in dispose()
- **Infinite ListView without builders**: Always use `ListView.builder`, `GridView.builder`, or `CustomScrollView`
- **Asset loading on main thread**: Use `compute()` or `Isolate` for heavy asset processing (image decoding)
- **Ignoring null safety**: Use `required` keyword, nullable types with `??` and `?.`, avoid `late` without guarantees

## Rules

- Prefer Riverpod over BLoC for most apps — BLoC overhead justified only for event-heavy features
- Use const constructors on all widgets that don't mutate — enables Flutter's rebuild optimization
- Repository pattern must cache-fallback on network failure — never surface network errors directly
- BlocListener for side effects (navigation, snackbar), BlocBuilder for UI
- GoRouter routes defined in one file — never scatter route definitions across features
- All async operations must handle loading, error, and data states in the UI
- Keep business logic out of widgets — use providers/blocs for all stateful logic
- Platform channels must have web fallback handlers for Flutter web
- Use freezed for immutable data classes and sealed unions
- Run `flutter analyze` before every commit — zero warnings policy
- Profile builds for performance measurement — never use debug builds

## References
  - references/architecture.md — Flutter Architecture
  - references/flutter-advanced.md — Flutter Advanced Topics
  - references/flutter-fundamentals.md — Flutter Fundamentals
  - references/platform-channels.md — Flutter Platform Channels
  - references/state-management-provider.md — Flutter State Management with Provider
  - references/state-management.md — Flutter State Management
  - references/testing.md — Flutter Testing
  - references/widgets.md — Flutter Widgets
## Handoff

Hand off to `mobile/universal/deployment/SKILL.md` for build and deployment.
## Implementation Patterns

### Observer Pattern for Event Handling
`
interface EventObserver<T> {
  onEvent(event: T): Promise<void>;
}

class EventBus<T> {
  private observers: Set<EventObserver<T>> = new Set();
  subscribe(observer: EventObserver<T>): void {
    this.observers.add(observer);
  }
  unsubscribe(observer: EventObserver<T>): void {
    this.observers.delete(observer);
  }
  async emit(event: T): Promise<void> {
    const results = Array.from(this.observers).map(o => o.onEvent(event));
    await Promise.allSettled(results);
  }
}
`

### Configuration-Driven Approach
`
config:
  defaults:
    timeout: 30s
    retryCount: 3
  overrides:
    production:
      timeout: 60s
      retryCount: 5
    development:
      timeout: 300s
      retryCount: 1
`

## Production Considerations

### Deployment Checklist
- [ ] Configuration validated against schema before startup
- [ ] Health check endpoints registered and monitored
- [ ] Graceful shutdown with draining period (30s timeout)
- [ ] Resource limits configured (CPU, memory, file descriptors)
- [ ] Log level set appropriate for environment
- [ ] Metrics endpoint secured and exposed
- [ ] Rate limiting configured per-tier
- [ ] TLS certificates valid and auto-renewing
- [ ] Database migrations run as separate deployment step
- [ ] Feature flags ready for gradual rollout

### Monitoring and Alerting
| Metric | Threshold | Severity | Action |
|--------|-----------|----------|--------|
| Error rate | > 1% over 5min | Critical | Page on-call |
| p99 latency | > 2s over 5min | Warning | Investigate |
| Throughput drop | > 50% over 1min | Critical | Check upstream |
| Queue depth | > 1000 over 1min | Warning | Scale consumers |
| Disk usage | > 85% | Warning | Clean or expand |
| Memory usage | > 90% heap | Critical | Restart or scale |

## Anti-Patterns

| Anti-Pattern | Symptom | Root Cause | Solution |
|-------------|---------|------------|----------|
| Premature optimization | Complex code for no measured benefit | Guessing instead of profiling | Measure first, optimize based on data |
| Copy-paste reuse | Duplicate code across codebase | Lack of abstraction | Extract shared logic into libraries |
| Gold-plating | Features with no current requirement | Over-engineering | YAGNI — build what's needed now |
| Magical thinking | Assumptions without validation | Skipping error handling | Handle all failure modes explicitly |

## Performance Optimization

### Caching Strategy
Cache hierarchy: L1 (in-memory local) → L2 (distributed Redis/Memcached) → L3 (CDN/Edge).
Cache invalidation: TTL-based (simple, stale), event-based (complex, fresh), write-through (consistent, higher write latency), write-behind (fast writes, eventual consistency).

### Resource Pooling
- Database connections: Pool of reusable connections (HikariCP, pgBouncer)
- HTTP connections: Keep-alive + connection pooling for external calls
- Thread pool: Bounded thread pools for async task execution

### Profiling Methodology
1. Establish baseline with production traffic profile
2. Profile CPU with sampling profiler (pprof, perf, async-profiler)
3. Profile memory with heap dumps and allocation tracking
4. Profile I/O with strace/perf trace for syscall analysis
5. Profile latency with distributed tracing (OpenTelemetry)
6. Identify bottleneck, formulate hypothesis, implement fix
7. Re-profile to verify improvement, repeat

## Security Considerations

### Threat Modeling (STRIDE)
- Spoofing: Identity validation, authentication
- Tampering: Integrity checks, digital signatures
- Repudiation: Audit logs, non-repudiation
- Information disclosure: Encryption, access control
- Denial of service: Rate limiting, resource quotas
- Elevation of privilege: Principle of least privilege

### Supply Chain Security
- Dependency scanning: Snyk, Dependabot, Trivy
- SBOM generation: CycloneDX or SPDX format
- Signed commits: GPG or SSH commit signing
- Artifact verification: Checksum validation, signature verification

### Secrets Management
- Secrets never in code — always in secrets manager (Vault, AWS Secrets Manager)
- Rotation policy: Rotate database credentials every 90 days
- Access audit: Log every secrets access, alert on anomalies
- Encryption at rest and in transit for all secrets
- Principle of least privilege: each service gets only its own secrets

## Rules
- Default-deny security posture — allow only explicitly required access.
- All inputs validated, all outputs encoded, all errors handled.
- Defend in depth — multiple layers of security controls.
- Fail securely — errors default to safe behavior.
- Log security-relevant events for audit and investigation.
- Keep dependencies updated — automate vulnerability scanning.
- Design for observability from day one, not as an afterthought.
- Document all architectural decisions with rationale.
- Review code for security, performance, and correctness before merging.