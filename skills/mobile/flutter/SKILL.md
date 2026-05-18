---
name: flutter
description: Flutter cross-platform development — Dart, Widgets, Riverpod/BLoC, GoRouter, Clean Architecture, Hive/Isar, Flutter Test.
---

# Flutter

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

// Usage in widget
class OrderListScreen extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final ordersAsync = ref.watch(orderListProvider);
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
}
```

## Navigation — GoRouter

```dart
// lib/app/router.dart
final router = GoRouter(
  initialLocation: '/orders',
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
    } catch (_) {
      final cached = await local.getCachedOrders();
      return cached.map((c) => c.toEntity()).toList();
    }
  }
}
```

## Testing

```dart
// test/unit/order_bloc_test.dart
void main() {
  late MockOrderRepository mockRepo;
  late OrderBloc bloc;

  setUp(() {
    mockRepo = MockOrderRepository();
    bloc = OrderBloc(mockRepo);
  });

  blocTest<OrderBloc, OrderState>(
    'emits [Loading, Loaded] on success',
    build: () => bloc,
    act: (_) => bloc.add(LoadOrders()),
    setUp: () => when(() => mockRepo.getOrders())
        .thenAnswer((_) async => [tOrder]),
    expect: () => [isA<OrderLoading>(), isA<OrderLoaded>()],
  );
}
```

## References

### Reference Files
- `references/architecture.md` — Clean Architecture, folder structure, DI
- `references/state-management.md` — Riverpod, BLoC, Provider patterns
- `references/testing.md` — unit, widget, integration, golden tests
- `references/widgets.md` — custom widgets, layout patterns, theming

### Related Skills
- `mobile/android/SKILL.md` — Android-specific integration
- `mobile/ios/SKILL.md` — iOS-specific integration
- `mobile/universal/deployment/SKILL.md` — app store deployment

## Handoff

Hand off to `mobile/universal/deployment/SKILL.md` for build and deployment.
