# Dart Testing (Flutter Test & Mockito)

## 1. Unit Testing
Standard Dart unit testing requires the `test` package. Setup is straightforward.

```dart
import 'package:test/test.dart';

void main() {
  group('String functions', () {
    test('String.split() splits the string on the delimiter', () {
      var string = 'foo,bar,baz';
      expect(string.split(','), equals(['foo', 'bar', 'baz']));
    });

    test('String.trim() removes surrounding whitespace', () {
      var string = '  foo ';
      expect(string.trim(), equals('foo'));
    });
  });
}
```

## 2. Mocking with Mocktail (or Mockito)
In modern Dart (with Sound Null Safety), code generation is required for Mockito. Many developers prefer `mocktail` which avoids code generation.

```dart
import 'package:test/test.dart';
import 'package:mocktail/mocktail.dart';

class MockCat extends Mock implements Cat {}

void main() {
  test('mock behavior', () {
    final cat = MockCat();
    
    when(() => cat.sound()).thenReturn('meow');
    
    expect(cat.sound(), 'meow');
    verify(() => cat.sound()).called(1);
  });
}
```

## 3. Flutter Widget Testing
Widget tests run in a headless environment but actually render the UI elements to the tree.

```dart
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter/material.dart';

void main() {
  testWidgets('MyWidget has a title and message', (WidgetTester tester) async {
    // 1. Build the widget
    await tester.pumpWidget(MaterialApp(
      home: Scaffold(body: Text('Hello, World!')),
    ));

    // 2. Find the widget
    final titleFinder = find.text('Hello, World!');

    // 3. Verify it exists
    expect(titleFinder, findsOneWidget);
  });
}
```
