---
name: mobile-testing
description: Cross-platform mobile testing strategies — unit, widget/component, integration, E2E, snapshot/golden, mocking, CI integration.
---

# Mobile Testing

## Agent Protocol

### Trigger
User request includes: `mobile test`, `mobile testing`, `unit test mobile`, `widget test`, `component test`, `ui test mobile`, `e2e mobile`, `golden test`, `snapshot test mobile`.

### Input Context
- Platform (iOS, Android, Flutter, React Native)
- Testing framework (XCTest, JUnit, flutter_test, Jest)
- CI provider (GitHub Actions, Bitrise, GitLab CI)

### Output Artifact
A markdown document containing:
- Test strategy (pyramid)
- Framework setup
- Key test examples
- CI pipeline integration

### Max Response Length
4096 tokens

## Test Pyramid (Mobile)

```
     ╱╲
    ╱E2E╲          Few — critical journeys only
   ╱─────╲
  ╱Integration╲    Medium — feature flows
 ╱─────────────╲
╱  Unit / Widget  ╲ Many — every class, every widget state
╱─────────────────╲
```

## Unit Tests — business logic

```dart
// Flutter
test('calculateTotal applies tax', () {
  final total = calculateTotal(items: [item1, item2], taxRate: 0.1);
  expect(total, closeTo(110.0, 0.01));
});
```

```swift
// XCTest
func testCalculateTotal() {
    let total = calculator.calculateTotal(items: [item1], taxRate: 0.1)
    XCTAssertEqual(total, 110.0, accuracy: 0.01)
}
```

```kotlin
// JUnit
@Test
fun `calculateTotal applies tax`() {
    val total = calculator.calculateTotal(listOf(item1), 0.1)
    assertEquals(110.0, total, 0.01)
}
```

## Widget / Component Tests

```dart
testWidgets('OrderCard shows customer name', (tester) async {
  await tester.pumpWidget(MaterialApp(home: OrderCard(order: tOrder)));
  expect(find.text('Alice'), findsOneWidget);
});
```

```typescript
it('renders customer name', () => {
  render(<OrderCard order={mockOrder} />);
  expect(screen.getByText('Alice')).toBeOnTheScreen();
});
```

## E2E Tests

```typescript
// Detox (RN)
describe('Order Flow', () => {
  it('creates order end-to-end', async () => {
    await element(by.id('add-order')).tap();
    await element(by.id('name-input')).typeText('Alice');
    await element(by.id('save')).tap();
    await expect(element(by.text('Alice'))).toBeVisible();
  });
});
```

```swift
// XCUITest
func testCreateOrder() {
    app.buttons["add-order"].tap()
    app.textFields["name-input"].typeText("Alice")
    app.buttons["save"].tap()
    XCTAssertTrue(app.staticTexts["Alice"].exists)
}
```

## References

### Reference Files
- `references/unit-testing.md` — mocking, parameterized tests, edge cases
- `references/ui-testing.md` — widget/component test patterns
- `references/integration-testing.md` — API mocking, DB testing, CI

### Related Skills
- `mobile/universal/patterns/SKILL.md` — architectures affecting testability

## Handoff

No further handoff. Testing is integrated into the development loop.
