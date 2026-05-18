# Mobile Unit Testing

## Mocking

```swift
// Swift (protocol-based)
protocol OrderServiceProtocol { func fetch() async throws -> [Order] }
class MockOrderService: OrderServiceProtocol {
    var stubOrders: [Order] = []
    func fetch() async throws -> [Order] { stubOrders }
}
```

```kotlin
// Kotlin (MockK)
val mockRepo = mockk<OrderRepository>()
coEvery { mockRepo.getOrders() } returns Result.success(listOf(order))
```

```dart
// Dart (mockito)
class MockOrderRepo extends Mock implements OrderRepository {}
when(() => mockRepo.getOrders()).thenAnswer((_) async => [order]);
```

## Parameterized tests

```kotlin
@ParameterizedTest
@ValueSource(doubles = [0.0, 0.1, 0.25])
fun `applies different tax rates`(rate: Double) {
    assertEquals(expected, calculator.calculateTotal(items, rate))
}
```

## Edge cases

```swift
func testEmptyOrders() {
    mockService.stubOrders = []
    let result = try await vm.loadOrders()
    XCTAssertTrue(result.isEmpty)
}
```
