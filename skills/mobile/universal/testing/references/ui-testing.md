# Mobile UI Testing

## Flutter widget tests

```dart
testWidgets('displays loading state', (tester) async {
  await tester.pumpWidget(MaterialApp(home: OrderListScreen()));
  expect(find.byType(CircularProgressIndicator), findsOneWidget);
});

testWidgets('displays orders after load', (tester) async {
  await tester.pumpWidget(MaterialApp(home: OrderListScreen()));
  await tester.pumpAndSettle();
  expect(find.text('Order #1'), findsOneWidget);
});
```

## RNTL component tests

```typescript
it('shows empty state', () => {
  (useOrders as jest.Mock).mockReturnValue({ data: [], isLoading: false });
  render(<OrderListScreen />);
  expect(screen.getByText('No orders yet')).toBeOnTheScreen();
});
```

## iOS XCUITest

```swift
func testNavigation() {
    app.tables.cells.element(boundBy: 0).tap()
    XCTAssertTrue(app.staticTexts["Order Detail"].waitForExistence(timeout: 5))
}
```

## UI test assertions

```kotlin
// Compose UI Test
composeTestRule.onNodeWithText("Alice").assertIsDisplayed()
composeTestRule.onNodeWithContentDescription("Order icon").assertExists()
```
