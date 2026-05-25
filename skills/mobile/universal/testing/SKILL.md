---
name: mobile-testing
description: >
  Use this skill when the user asks about mobile testing strategies, unit tests,
  widget tests, component tests, integration tests, E2E, golden/snapshot tests,
  mocking, or CI test integration.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [mobile, testing, phase-4, universal]
---

# Mobile Testing

## Purpose
Design comprehensive mobile test strategies following the test pyramid — unit, widget/component, integration, and E2E — with proper mocking, golden tests, and CI integration.

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

### Response Format
No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

——

### Max Response Length
4096 tokens

## Workflow

### Step 1: Define Test Strategy
Apply the mobile test pyramid: many unit/widget tests, medium integration tests, few E2E critical journeys.

### Step 2: Write Unit Tests
Cover business logic, use cases, repositories, and utilities with mocked dependencies and parameterized edge cases.

### Step 3: Write Widget/Component Tests
Test UI components with mock data, verify rendering, interactions, and state transitions.

### Step 4: Write Integration Tests
Test feature flows combining multiple components, real API mocking, and database interactions.

### Step 5: Write E2E Tests
Cover critical user journeys (login, purchase, order flow) on real devices or emulators.

### Step 6: Integrate in CI
Run unit + widget tests on every PR, integration nightly, E2E before release.

## Rules

- Unit tests cover business logic — never test framework behavior
- Mock external dependencies (network, DB, platform channels) in unit tests
- One test file per source file — mirror the source structure
- Widget tests verify states: loading, error, empty, data
- Golden/snapshot tests for visual regression on critical screens
- E2E tests are for critical journeys only — max 5-10 per platform
- Tests must be deterministic — no time-dependent assertions without mocking time

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
- `references/integration-testing.md` — Integration Testing
- `references/mobile-testing-strategies.md` — Mobile Testing Strategies
- `references/ui-testing.md` — Ui Testing
- `references/unit-testing.md` — Unit Testing

## Handoff

No further handoff. Testing is integrated into the development loop.
