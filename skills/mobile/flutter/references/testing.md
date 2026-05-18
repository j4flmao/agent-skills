# Flutter Testing

## Unit Test

```dart
void main() {
  group('OrderEntity', () {
    test('fromJson creates valid entity', () {
      final json = {'id': '1', 'total': 99.99};
      final entity = OrderEntity.fromJson(json);
      expect(entity.id, '1');
      expect(entity.total, 99.99);
    });
  });
}
```

## Widget Test

```dart
void main() {
  testWidgets('OrderCard displays customer name', (tester) async {
    await tester.pumpWidget(
      MaterialApp(home: OrderCard(order: tOrder)),
    );
    expect(find.text('Alice'), findsOneWidget);
  });
}
```

## Golden Test

```dart
void main() {
  testWidgets('OrderListScreen golden', (tester) async {
    await tester.pumpWidget(createTestApp());
    await expectLater(find.byType(OrderListScreen),
      matchesGoldenFile('goldens/order_list.png'));
  });
}
```

## Integration Test

```dart
void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  testWidgets('full order flow', (tester) async {
    await tester.pumpWidget(const App());
    await tester.tap(find.text('Orders'));
    await tester.pumpAndSettle();
    expect(find.text('Order #1'), findsOneWidget);
  });
}
```
