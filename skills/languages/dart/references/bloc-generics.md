# Dart: Generics and the BLoC Pattern

## 1. Dart's Sound Type System
Since Dart 2.0, the type system is strictly sound. Unlike Java's Type Erasure, Dart generics are **Reified**. This means a `List<int>` is recognized as different from a `List<String>` at runtime, making `is` checks and reflection highly accurate.

## 2. The BLoC Pattern (Business Logic Component)
BLoC is the most popular architectural pattern in Flutter/Dart. It heavily relies on Generics to enforce strict boundaries between UI Events and UI States.

### The Generic Abstract Class
A BLoC receives a stream of `Event` objects and outputs a stream of `State` objects.

```dart
// The base class from the flutter_bloc package uses Generics
abstract class Bloc<Event, State> {
  State _state;
  State get state => _state;

  // Stream controllers omitted for brevity
  
  Bloc(this._state);

  // Handlers mapped to specific event types
  void on<E extends Event>(
    Future<void> Function(E event, Emitter<State> emit) handler,
  ) {
    // Registers the handler for the specific Event type 'E'
  }
}
```

## 3. Implementing a Type-Safe Auth BLoC
We define the exact boundaries using sealed classes (Dart 3) and inject them into the Generic parameters.

```dart
// 1. Define States
sealed class AuthState {}
class AuthInitial extends AuthState {}
class AuthLoading extends AuthState {}
class AuthSuccess extends AuthState {
  final String token;
  AuthSuccess(this.token);
}

// 2. Define Events
sealed class AuthEvent {}
class LoginRequested extends AuthEvent {
  final String username;
  final String password;
  LoginRequested(this.username, this.password);
}

// 3. The Concrete BLoC locking in the Generics
class AuthBloc extends Bloc<AuthEvent, AuthState> {
  
  AuthBloc() : super(AuthInitial()) {
    // The generic constraints ensure 'event' is purely of type LoginRequested
    // and 'emit' can ONLY emit AuthState objects.
    on<LoginRequested>((event, emit) async {
      emit(AuthLoading());
      
      try {
        final token = await api.login(event.username, event.password);
        emit(AuthSuccess(token));
      } catch (e) {
        emit(AuthInitial()); // Back to initial on fail
      }
    });
  }
}
```
Thanks to Dart's reified generics, the `on<LoginRequested>` function registers a runtime type check that correctly routes incoming events to the specific handler memory block.
