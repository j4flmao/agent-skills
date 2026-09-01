# Dart Fundamentals

## 1. Sound Null Safety (Dart 2.12+)
Dart's null safety is "sound". This means if a variable is declared as `String` (not `String?`), the AOT compiler mathematically guarantees it can never be null, allowing it to generate smaller and faster machine code without runtime null checks.

```dart
String name = "Alice";
// name = null; // COMPILER ERROR

String? optionalName;
optionalName = null; // OK

// Safe access
int? length = optionalName?.length;

// Late variables (promises to initialize before use)
late String databaseUrl;
```

## 2. Mixins
Mixins allow you to reuse a class's code in multiple class hierarchies without using traditional inheritance (which is limited to single inheritance).

```dart
mixin Logger {
  void log(String msg) {
    print("LOG: $msg");
  }
}

class UserService with Logger {
  void createUser() {
    log("User created"); // Reusing the mixin method
  }
}
```

## 3. Futures and Streams
- **`Future<T>`**: Represents a single asynchronous value (like a Promise in JS).
- **`Stream<T>`**: Represents a sequence of asynchronous values over time (like an RxJS Observable).

```dart
// Stream generation using async* and yield
Stream<int> countSeconds(int max) async* {
  for (int i = 1; i <= max; i++) {
    await Future.delayed(Duration(seconds: 1));
    yield i; // Pushes a value into the stream
  }
}

void listen() async {
  await for (final value in countSeconds(5)) {
    print(value);
  }
}
```
