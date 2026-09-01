# Advanced Dart

## 1. Isolates (True Multithreading)
Because Dart's standard async features run on a single thread's Event Loop, CPU-bound tasks will freeze the UI. 
To achieve true parallelism, Dart uses **Isolates**. Isolates do not share memory (no mutexes/locks). They communicate purely by passing messages through `SendPort` and `ReceivePort`.

```dart
import 'dart:isolate';

// This function MUST be top-level or static
void heavyComputation(SendPort sendPort) {
  int result = 0;
  for (int i = 0; i < 1000000000; i++) result++;
  
  // Send the result back to the main isolate
  sendPort.send(result);
}

void startComputation() async {
  final receivePort = ReceivePort();
  
  // Spawn a new background thread (Isolate)
  await Isolate.spawn(heavyComputation, receivePort.sendPort);
  
  // Await the message from the background isolate
  receivePort.listen((message) {
    print("Result from background: $message");
  });
}
```
*Note: In modern Flutter, you can simply use the `compute(heavyFunction, data)` helper which manages the Isolate lifecycle for you.*

## 2. FFI (Foreign Function Interface)
Dart FFI allows Dart code to synchronously call C/C++ libraries. This is how Flutter plugins interact with native OS APIs (like SQLite, Audio encoders, or ML models).

```dart
import 'dart:ffi' as ffi;

// 1. Open the dynamic library (.so, .dylib, .dll)
final dylib = ffi.DynamicLibrary.open('libmath.so');

// 2. Look up the C function signature
final addPointer = dylib.lookup<ffi.NativeFunction<ffi.Int32 Function(ffi.Int32, ffi.Int32)>>('add');

// 3. Map it to a Dart function
final add = addPointer.asFunction<int Function(int, int)>();

// 4. Call native C code directly!
print(add(2, 3)); 
```
