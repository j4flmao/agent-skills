# Flutter State Management

## Riverpod

```dart
// Provider — synchronous
final counterProvider = StateProvider<int>((ref) => 0);

// FutureProvider — async
final userProvider = FutureProvider<User>((ref) => fetchUser());

// NotifierProvider — mutable state
@riverpod
class Cart extends _$Cart {
  @override
  Set<Item> build() => {};
  void add(Item item) => state = {...state, item};
  void remove(Item item) => state = {...state}..remove(item);
}
```

## BLoC

```dart
// Event
sealed class OrderEvent {}
final class LoadOrders extends OrderEvent {}
final class FilterOrders extends OrderEvent {
  final String query;
  FilterOrders(this.query);
}

// State
sealed class OrderState {}
final class OrderInitial extends OrderState {}
final class OrderLoading extends OrderState {}
final class OrderLoaded extends OrderState {
  final List<Order> orders;
  OrderLoaded(this.orders);
}

// BLoC
class OrderBloc extends Bloc<OrderEvent, OrderState> {
  OrderBloc() : super(OrderInitial()) {
    on<LoadOrders>(_onLoad);
    on<FilterOrders>(_onFilter);
  }
}
```

## Provider (legacy)

```dart
class Counter with ChangeNotifier {
  int _count = 0;
  int get count => _count;
  void increment() {
    _count++;
    notifyListeners();
  }
}
```
