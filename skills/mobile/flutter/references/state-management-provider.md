# Flutter State Management with Provider

## Overview
Provider is Flutter's recommended state management solution that uses InheritedWidget under the hood. It provides ChangeNotifier for reactive state, dependency injection through context, and efficient widget rebuilding.

## Provider Basics

### Simple Provider
```dart
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

// Model
class Counter extends ChangeNotifier {
  int _count = 0;
  int get count => _count;

  void increment() {
    _count++;
    notifyListeners();
  }

  void decrement() {
    _count--;
    notifyListeners();
  }

  void reset() {
    _count = 0;
    notifyListeners();
  }
}

// Provide the model
void main() {
  runApp(
    ChangeNotifierProvider(
      create: (context) => Counter(),
      child: MyApp(),
    ),
  );
}

// Consume in widgets
class CounterWidget extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final counter = context.watch<Counter>();

    return Column(
      children: [
        Text('Count: ${counter.count}'),
        Row(
          children: [
            IconButton(
              icon: Icon(Icons.add),
              onPressed: () => counter.increment(),
            ),
            IconButton(
              icon: Icon(Icons.remove),
              onPressed: () => counter.decrement(),
            ),
            IconButton(
              icon: Icon(Icons.refresh),
              onPressed: () => counter.reset(),
            ),
          ],
        ),
      ],
    );
  }
}
```

## Provider Types

### MultiProvider
```dart
void main() {
  runApp(
    MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthProvider()),
        ChangeNotifierProvider(create: (_) => CartProvider()),
        ChangeNotifierProvider(create: (_) => SettingsProvider()),
        Provider(create: (_) => ApiClient()),
        StreamProvider<User?>(create: (_) => AuthService().userStream),
      ],
      child: MyApp(),
    ),
  );
}
```

### Different Provider Types
```dart
// Provider - provides a value without change notification
Provider<ApiClient>(
  create: (_) => ApiClient(),
  child: Consumer<ApiClient>(
    builder: (context, api, child) {
      return Text(api.baseUrl);
    },
  ),
)

// ChangeNotifierProvider - provides ChangeNotifier for reactive state
ChangeNotifierProvider<TodoModel>(
  create: (_) => TodoModel()..loadTodos(),
)

// FutureProvider - provides async values
FutureProvider<List<Todo>>(
  create: (_) => TodoService().fetchTodos(),
  initialData: [],
  catchError: (context, error) {
    print('Error: $error');
    return [];
  },
)

// StreamProvider - provides stream values
StreamProvider<User?>(
  create: (_) => AuthService().authStateChanges,
  initialData: null,
)

// ValueListenableProvider - provides ValueNotifier
ValueListenableProvider<Locale>(
  create: (_) => ValueNotifier(Locale('en')),
)
```

## Consumption Patterns

### Consumer and Selector
```dart
// Consumer - rebuilds entire widget tree
Consumer<CartProvider>(
  builder: (context, cart, child) {
    return Badge(
      label: Text('${cart.itemCount}'),
      child: child!,
    );
  },
  child: Icon(Icons.shopping_cart),
)

// Selector - rebuilds only when selected value changes
Selector<CartProvider, int>(
  selector: (context, cart) => cart.itemCount,
  builder: (context, count, child) {
    return Text('Items: $count');
  },
)

// context.watch - rebuilds when value changes
@override
Widget build(BuildContext context) {
  final theme = context.watch<ThemeProvider>().currentTheme;
  return MaterialApp(theme: theme);
}

// context.read - accesses value without rebuilding
void _onSubmit() {
  context.read<AuthProvider>().login(email, password);
}

// context.select - rebuilds on specific property change
@override
Widget build(BuildContext context) {
  final isLoggedIn = context.select<AuthProvider, bool>(
    (auth) => auth.isLoggedIn,
  );
  return isLoggedIn ? Dashboard() : LoginScreen();
}
```

## Advanced Patterns

### ProxyProvider
```dart
// ProxyProvider derives one provider from another
MultiProvider(
  providers: [
    ChangeNotifierProvider(create: (_) => AuthProvider()),
    ChangeNotifierProxyProvider<AuthProvider, UserProfileProvider>(
      create: (_) => UserProfileProvider(),
      update: (context, auth, previous) {
        previous?.updateUser(auth.user);
        return previous!;
      },
    ),
  ],
)
```

### State Management with Services
```dart
// Service class
class TodoService {
  Future<List<Todo>> fetchTodos() async {
    final response = await http.get(Uri.parse('/api/todos'));
    return (json.decode(response.body) as List)
        .map((json) => Todo.fromJson(json))
        .toList();
  }
}

// ViewModel
class TodoViewModel extends ChangeNotifier {
  final TodoService _service;
  List<Todo> _todos = [];
  bool _isLoading = false;
  String? _error;

  TodoViewModel(this._service);

  List<Todo> get todos => _todos;
  bool get isLoading => _isLoading;
  String? get error => _error;

  Future<void> loadTodos() async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      _todos = await _service.fetchTodos();
    } catch (e) {
      _error = e.toString();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> addTodo(Todo todo) async {
    _todos.add(todo);
    notifyListeners();
  }

  Future<void> toggleTodo(String id) async {
    final index = _todos.indexWhere((t) => t.id == id);
    if (index != -1) {
      _todos[index] = _todos[index].copyWith(completed: !_todos[index].completed);
      notifyListeners();
    }
  }
}

// Usage
class TodoListScreen extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: context.watch<TodoViewModel>().isLoading
          ? Center(child: CircularProgressIndicator())
          : Consumer<TodoViewModel>(
              builder: (context, vm, child) {
                if (vm.error != null) {
                  return ErrorWidget(message: vm.error!);
                }
                return ListView.builder(
                  itemCount: vm.todos.length,
                  itemBuilder: (context, index) {
                    final todo = vm.todos[index];
                    return ListTile(
                      title: Text(todo.title),
                      leading: Checkbox(
                        value: todo.completed,
                        onChanged: (_) => vm.toggleTodo(todo.id),
                      ),
                    );
                  },
                );
              },
            ),
    );
  }
}
```

## Testing

### Testing Providers
```dart
void main() {
  testWidgets('Counter increments correctly', (tester) async {
    await tester.pumpWidget(
      ChangeNotifierProvider(
        create: (_) => Counter(),
        child: MaterialApp(
          home: CounterWidget(),
        ),
      ),
    );

    expect(find.text('Count: 0'), findsOneWidget);

    await tester.tap(find.byIcon(Icons.add));
    await tester.pump();

    expect(find.text('Count: 1'), findsOneWidget);
  });
}
```

## Key Points
- Provider uses InheritedWidget for efficient widget rebuilding
- ChangeNotifier with notifyListeners drives reactive updates
- MultiProvider composes multiple providers in a tree
- context.watch rebuilds on changes, context.read accesses without rebuild
- Selector rebuilds only when selected value changes
- ProxyProvider derives state from other providers
- Provider type provides non-reactive values (services, config)
- FutureProvider and StreamProvider handle async values
- Consumer isolates rebuild scope to specific subtree
- Provider is the foundation for other state management approaches
- Testing with pumpWidget and provider setup
- Dispose providers when no longer needed
- Avoid rebuilding large widget trees with fine-grained selectors
- Decompose providers by feature/domain boundaries
- Use ChangeNotifierProxyProvider for reactive dependency injection
- Provider.of<T>(context, listen: false) equals context.read()
- The Provider tree mirrors widget hierarchy
- Named providers allow multiple providers of same type
- Provider.value creates an existing instance
- MultiProvider child does not rebuild on provider changes
