# Flutter Architecture

## Clean Architecture Layers

```
feature/
├── data/                  # External layer
│   ├── datasources/       # API, DB, platform channels
│   ├── models/            # JSON serializable DTOs
│   └── repositories/      # Impl: combine datasources
├── domain/                # Inner layer — no deps
│   ├── entities/          # Pure Dart objects
│   ├── repositories/      # Abstract interfaces
│   └── usecases/          # Single-responsibility operations
└── presentation/          # UI layer
    ├── providers/         # Riverpod providers / BLoC
    ├── screens/           # Full-screen widgets
    └── widgets/           # Reusable components
```

## Dependency Injection

```dart
// Using Riverpod providers as DI
final dioProvider = Provider<Dio>((ref) => Dio(BaseOptions(baseUrl: env.apiUrl)));

final orderRemoteProvider = Provider<OrderRemoteDataSource>(
  (ref) => OrderRemoteDataSourceImpl(dio: ref.watch(dioProvider)),
);

final orderRepoProvider = Provider<OrderRepository>(
  (ref) => OrderRepositoryImpl(
    remote: ref.watch(orderRemoteProvider),
    local: ref.watch(orderLocalProvider),
  ),
);
```

## GetIt Service Locator

```dart
final sl = GetIt.instance;

void initDependencies() {
  sl.registerLazySingleton<Dio>(() => Dio());
  sl.registerFactory<OrderRepository>(() => OrderRepositoryImpl(sl()));
}
```
