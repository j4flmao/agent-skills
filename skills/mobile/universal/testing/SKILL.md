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
No preamble. No postamble. No explanations.

### Max Response Length
4096 tokens

## Decision Trees

### Test Type Selection
```
What are you testing?
├── Business logic (UseCase, calculator, validator)
│   └── Unit test — pure logic, no UI, fast, deterministic
├── ViewModel state management (state transitions, events)
│   └── Unit test with mocked dependencies — no UI rendering
├── UI component rendering (displays correct data in states)
│   ├── Flutter → Widget test (pumpWidget, find, expect)
│   ├── SwiftUI → ViewInspector / snapshot tests
│   ├── Jetpack Compose → compose-test with semijson tree
│   └── React Native → React Native Testing Library
├── Visual regression (design fidelity)
│   └── Golden/snapshot test — compare rendered UI to reference image
├── Feature flow (login → navigate → action)
│   ├── Integration test — multiple components, mocked API/DB
│   └── Avoid full E2E for speed
└── Critical user journey (checkout, signup, payment)
    └── E2E test — real device/emulator, real API/staging
```

### Mock Strategy
```
What needs mocking?
├── Network calls → Mock API responses (Mockito/mocktail/OHHTTPStubs)
├── Database/DAO → In-memory database or mock DAO
├── Platform channels (Flutter) → Mock channel handlers
├── System services (location, camera, biometrics)
│   ├── Mock per test (unit) OR fake service (integration)
│   └── Avoid mocking what you don't own (platform SDKs)
└── Time/date → Inject clock dependency, use fake timers
```

### CI Test Strategy
```
What CI stage?
├── Every PR (fast, <10min) → Unit + widget/component tests
├── Nightly (slow, <60min) → Integration tests + golden tests
├── Pre-release (manual trigger) → Full E2E suite on device farm
└── Post-release → Smoke tests on production (canary)
```

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
- Code coverage threshold: 80% unit, 70% widget, 60% integration
- Never test private methods directly — test through public API
- Test boundary conditions: empty lists, null values, max values

## Test Pyramid

```
      ╱╲
     ╱E2E╲          Few — critical journeys only (5-10)
    ╱─────╲
   ╱Integration╲    Medium — feature flows (20-50)
  ╱─────────────╲
╱  Unit / Widget  ╲ Many — every class, every widget state (200+)
╱─────────────────╲
```

## Unit Tests

### Android — JUnit + MockK
```kotlin
class GetOrdersUseCaseTest {
  private val repository = mockk<OrderRepository>()
  private val useCase = GetOrdersUseCase(repository)

  @Test
  fun `returns orders from repository`() = runTest {
    val orders = listOf(Order("1", "Test"))
    coEvery { repository.getOrders() } returns Result.success(orders)

    val result = useCase()

    assertTrue(result.isSuccess)
    assertEquals(orders, result.getOrNull())
  }

  @Test
  fun `returns error when repository fails`() = runTest {
    coEvery { repository.getOrders() } returns Result.failure(NetworkException("timeout"))

    val result = useCase()

    assertTrue(result.isFailure)
    assertTrue(result.exceptionOrNull() is NetworkException)
  }

  @Test
  fun `handles empty list`() = runTest {
    coEvery { repository.getOrders() } returns Result.success(emptyList())

    val result = useCase()

    assertTrue(result.isSuccess)
    assertTrue(result.getOrNull()!!.isEmpty())
  }
}
```

### iOS — XCTest
```swift
import XCTest
@testable import MyApp

final class GetOrdersUseCaseTests: XCTestCase {
  var useCase: GetOrdersUseCase!
  var mockRepository: MockOrderRepository!

  override func setUp() {
    mockRepository = MockOrderRepository()
    useCase = GetOrdersUseCase(repository: mockRepository)
  }

  func testReturnsOrders() async throws {
    let expected = [Order(id: "1", title: "Test")]
    mockRepository.stubbedOrders = expected

    let orders = try await useCase()
    XCTAssertEqual(orders, expected)
  }

  func testThrowsOnNetworkError() async {
    mockRepository.stubbedError = NetworkError.timeout

    await XCTAssertThrowsError(try await useCase())
  }
}
```

### Flutter — flutter_test + mocktail
```dart
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

class MockOrderRepo extends Mock implements OrderRepository {}

void main() {
  late GetOrdersUseCase useCase;
  late MockOrderRepo repo;

  setUp(() {
    repo = MockOrderRepo();
    useCase = GetOrdersUseCase(repo);
  });

  test('returns orders', () async {
    final orders = [Order(id: '1', title: 'Test')];
    when(() => repo.getOrders()).thenAnswer((_) async => orders);

    final result = await useCase();

    expect(result, orders);
  });

  test('throws on error', () async {
    when(() => repo.getOrders()).thenThrow(NetworkException('timeout'));

    expect(() => useCase(), throwsA(isA<NetworkException>()));
  });
}
```

### React Native — Jest
```typescript
import { renderHook, act } from '@testing-library/react-hooks';
import { useOrderStore } from './orderStore';

jest.mock('../api/orderApi');

describe('useOrderStore', () => {
  it('loads orders', async () => {
    (orderApi.getOrders as jest.Mock).mockResolvedValue(mockOrders);

    const { result } = renderHook(() => useOrderStore());

    await act(async () => {
      await result.current.loadOrders();
    });

    expect(result.current.orders).toEqual(mockOrders);
    expect(result.current.isLoading).toBe(false);
  });

  it('handles error state', async () => {
    (orderApi.getOrders as jest.Mock).mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useOrderStore());

    await act(async () => {
      await result.current.loadOrders();
    });

    expect(result.current.error).toBe('Network error');
    expect(result.current.isLoading).toBe(false);
  });
});
```

## ViewModel Tests

### Android — ViewModel Test
```kotlin
@OptIn(ExperimentalCoroutinesApi::class)
class OrderViewModelTest {
  @get:Rule
  val mainDispatcherRule = MainDispatcherRule()

  private val useCase = mockk<GetOrdersUseCase>()
  private lateinit var vm: OrderViewModel

  @Before
  fun setup() {
    vm = OrderViewModel(useCase)
  }

  @Test
  fun `load orders sets loading then data`() = runTest {
    val orders = listOf(Order("1", "Test"))
    coEvery { useCase() } returns Result.success(orders)

    vm.onAction(OrderAction.Refresh)

    // Loading state
    assertEquals(true, vm.state.value.isLoading)
    // Advance past loading
    advanceUntilIdle()
    // Data state
    assertEquals(orders, vm.state.value.orders)
    assertEquals(false, vm.state.value.isLoading)
  }

  @Test
  fun `load orders sets error on failure`() = runTest {
    coEvery { useCase() } returns Result.failure(NetworkException("timeout"))

    vm.onAction(OrderAction.Refresh)
    advanceUntilIdle()

    assertNotNull(vm.state.value.error)
    assertEquals(false, vm.state.value.isLoading)
  }
}
```

### iOS — ViewModel Test
```swift
@MainActor
final class OrderViewModelTests: XCTestCase {
  var vm: OrderViewModel!
  var mockUseCase: MockGetOrdersUseCase!

  override func setUp() {
    mockUseCase = MockGetOrdersUseCase()
    vm = OrderViewModel(getOrdersUseCase: mockUseCase)
  }

  func testLoadSetsOrders() async {
    let expected = [Order(id: "1", title: "Test")]
    mockUseCase.stubbedResult = expected

    await vm.loadOrders()

    XCTAssertEqual(vm.orders, expected)
    XCTAssertFalse(vm.isLoading)
  }

  func testLoadSetsError() async {
    mockUseCase.stubbedError = NetworkError.timeout

    await vm.loadOrders()

    XCTAssertNotNil(vm.error)
    XCTAssertFalse(vm.isLoading)
  }
}
```

## Widget / Component Tests

### Flutter — Widget Test
```dart
testWidgets('OrderCard displays all states', (tester) async {
  // Data state
  await tester.pumpWidget(MaterialApp(home: OrderCard(order: tOrder)));
  expect(find.text('Alice'), findsOneWidget);
  expect(find.text('\$50.00'), findsOneWidget);

  // Loading state
  await tester.pumpWidget(MaterialApp(home: OrderCard(isLoading: true)));
  expect(find.byType(CircularProgressIndicator), findsOneWidget);

  // Error state
  await tester.pumpWidget(MaterialApp(home: OrderCard(error: 'Failed to load')));
  expect(find.text('Failed to load'), findsOneWidget);

  // Empty state
  await tester.pumpWidget(MaterialApp(home: OrderCard(order: null)));
  expect(find.text('No order found'), findsOneWidget);
});

testWidgets('OrderCard tap triggers callback', (tester) async {
  var tapped = false;
  await tester.pumpWidget(MaterialApp(
    home: OrderCard(order: tOrder, onTap: () => tapped = true),
  ));
  await tester.tap(find.text('Alice'));
  expect(tapped, isTrue);
});
```

### React Native — Testing Library
```typescript
import { render, fireEvent } from '@testing-library/react-native';

describe('OrderCard', () => {
  it('renders order data', () => {
    const { getByText } = render(<OrderCard order={mockOrder} />);
    expect(getByText('Alice')).toBeOnTheScreen();
    expect(getByText('$50.00')).toBeOnTheScreen();
  });

  it('shows loading spinner when loading', () => {
    const { getByTestId } = render(<OrderCard isLoading />);
    expect(getByTestId('loading-spinner')).toBeOnTheScreen();
  });

  it('calls onPress when tapped', () => {
    const onPress = jest.fn();
    const { getByText } = render(<OrderCard order={mockOrder} onPress={onPress} />);
    fireEvent.press(getByText('Alice'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
```

### Jetpack Compose — compose-ui-test
```kotlin
@Test
fun orderCardDisplaysCustomerName() {
  composeTestRule.setContent {
    OrderCard(order = testOrder)
  }
  composeTestRule.onNodeWithText("Alice").assertIsDisplayed()
  composeTestRule.onNodeWithText("$50.00").assertIsDisplayed()
}

@Test
fun orderCardTapTriggersCallback() {
  var tapped = false
  composeTestRule.setContent {
    OrderCard(order = testOrder, onTap = { tapped = true })
  }
  composeTestRule.onNodeWithText("Alice").performClick()
  assertTrue(tapped)
}
```

## Golden / Snapshot Tests

### Flutter — Golden Test
```dart
testWidgets('OrderCard golden test', (tester) async {
  await tester.binding.setSurfaceSize(const Size(400, 200));
  await tester.pumpWidget(MaterialApp(home: OrderCard(order: tOrder)));
  await expectLater(
    find.byType(OrderCard),
    matchesGoldenFile('goldens/order_card.png'),
  );
});
```

### iOS — iOSSnapshotTestCase
```swift
func testOrderCardSnapshot() {
  let card = OrderCard(order: testOrder)
  let vc = UIHostingController(rootView: card)
  vc.view.frame = CGRect(x: 0, y: 0, width: 400, height: 200)
  FBSnapshotVerifyView(vc.view)
}
```

### Android — Paparazzi
```kotlin
@Test
fun orderCardSnapshot() {
  paparazzi.snapshot {
    OrderCard(order = testOrder)
  }
}
```

## Integration Tests

### Flutter — Integration Test
```dart
// test_driver/app_test.dart
void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  testWidgets('create order flow', (tester) async {
    await tester.pumpWidget(MyApp());
    await tester.tap(find.byKey(const Key('add-order')));
    await tester.enterText(find.byKey(const Key('name-input')), 'Alice');
    await tester.tap(find.byKey(const Key('save')));
    await tester.pumpAndSettle();
    expect(find.text('Alice'), findsOneWidget);
  });
}
```

### Android — Compose Test (Integration)
```kotlin
@Test
fun createOrderFlow() {
  composeTestRule.setContent {
    MyApp()
  }
  composeTestRule.onNodeWithTag("add-order").performClick()
  composeTestRule.onNodeWithTag("name-input").performTextInput("Alice")
  composeTestRule.onNodeWithTag("save").performClick()
  composeTestRule.onNodeWithText("Alice").assertIsDisplayed()
}
```

## E2E Tests

### Detox (React Native)
```typescript
describe('Order Flow', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true });
  });

  it('creates order end-to-end', async () => {
    await element(by.id('add-order')).tap();
    await element(by.id('name-input')).typeText('Alice\n');
    await element(by.id('save')).tap();
    await expect(element(by.text('Alice'))).toBeVisible();
  });

  it('handles network error gracefully', async () => {
    await device.setURLBlacklist(['.*api.example.com.*']);
    await element(by.id('add-order')).tap();
    await element(by.id('save')).tap();
    await expect(element(by.text('Network error'))).toBeVisible();
  });
});
```

### XCUITest (iOS)
```swift
final class OrderFlowTests: XCTestCase {
  let app = XCUIApplication()

  override func setUp() {
    continueAfterFailure = false
    app.launch()
  }

  func testCreateOrder() {
    app.buttons["add-order"].tap()
    let nameField = app.textFields["name-input"]
    nameField.tap()
    nameField.typeText("Alice")
    app.buttons["save"].tap()
    XCTAssertTrue(app.staticTexts["Alice"].waitForExistence(timeout: 5))
  }

  func testEmptyNameShowsError() {
    app.buttons["add-order"].tap()
    app.buttons["save"].tap()
    XCTAssertTrue(app.staticTexts["Name is required"].exists)
  }
}
```

### Espresso (Android) + Compose
```kotlin
@Test
fun createOrderE2E() {
  composeTestRule.onNodeWithTag("add-order").performClick()
  composeTestRule.onNodeWithTag("name-input").performTextInput("Alice")
  composeTestRule.onNodeWithTag("save").performClick()
  composeTestRule.onNodeWithText("Alice").assertIsDisplayed()
}
```

### Maestro (Cross-platform E2E)
```yaml
# .maestro/create-order.yaml
appId: com.example.app
---
- tapOn: "add-order"
- inputText: "Alice"
- tapOn: "save"
- assertVisible: "Alice"
```

## CI Integration

### GitHub Actions — Flutter
```yaml
name: Tests
on: [pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: subosito/flutter-action@v2
        with:
          flutter-version: '3.x'
      - run: flutter pub get
      - run: flutter analyze
      - run: flutter test --coverage --machine > report.log
      - uses: VeryGoodOpenSource/very_good_coverage@v2
        with:
          path: ./coverage/lcov.info
          min_coverage: 80
```

### GitHub Actions — Android
```yaml
name: Android Tests
on: [pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with:
          distribution: 'temurin'
          java-version: '17'
      - run: ./gradlew testDebugUnitTest
      - run: ./gradlew ktlintCheck
      - uses: actions/upload-artifact@v4
        with:
          path: app/build/reports/tests
```

### GitHub Actions — iOS
```yaml
name: iOS Tests
on: [pull_request]
jobs:
  test:
    runs-on: macos-14
    steps:
      - uses: actions/checkout@v4
      - run: xcodebuild test -scheme App -destination 'platform=iOS Simulator,name=iPhone 16'
      - run: swiftlint
```

### GitHub Actions — React Native
```yaml
name: RN Tests
on: [pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm test -- --coverage
      - run: npx eslint .
```

## Code Coverage

### Configuration
```kotlin
// Android — build.gradle.kts
android {
  testOptions {
    unitTests.all {
      jacoco {
        includeNoLocationClasses = true
      }
    }
  }
}

tasks.register("jacocoTestReport", JacocoReport::class) {
  dependsOn("testDebugUnitTest")
  reports { xml.required.set(true) }
}
```

```swift
// iOS — scheme configuration
// Edit Scheme > Test > Options > Code Coverage
// Or xccov:
// xcrun xccov view --report --json DerivedData/*.xcresult
```

### Threshold Enforcement
```yaml
# Flutter: very_good_coverage
min_coverage: 80
exclude:
  - "**/*.g.dart"
  - "**/*.freezed.dart"
  - "**/generated/**"
```

## Testing Anti-Patterns
- **Testing implementation details**: Tests break when refactoring. Test behavior, not internal state
- **Over-mocking**: Mocking 10+ dependencies means the test verifies mocks, not real code. Use fakes for complex deps
- **No edge case coverage**: Only testing happy path. Include empty, error, loading, boundary, and timeout cases
- **Flaky tests from shared mutable state**: Tests leak state between runs. Use `setUp`/`tearDown` for clean state
- **UI tests that depend on timing**: `waitFor` instead of `sleep`. Never use fixed delays
- **Endless E2E tests**: 100 E2E tests = CI takes 2 hours. Keep 5-10 critical paths only
- **No golden test review process**: Golden images merged blindly catch no regressions. Require human review
- **Skipping widget tests for "fast iteration"**: UI regressions multiply. At minimum test critical widgets
- **Testing framework code**: Verifying Room DAO SQL generation or Compose rendering is framework's job
- **No CI test enforcement**: Tests that pass locally but not on CI are worse than no tests. Enforce on every PR
- **Gitignoring test reports**: CI test failures need debugging. Upload reports as CI artifacts
- **Ignoring flaky tests**: Marking flaky tests as "known" lets them pile up. Fix or remove

## Performance Testing
```kotlin
// Android — Macrobenchmark for startup/scrolling
@RunWith(AndroidJUnit4::class)
class StartupBenchmark {
  @get:Rule
  val benchmarkRule = MacrobenchmarkRule()

  @Test
  fun startup() = benchmarkRule.measureRepeated(
    packageName = "com.example.app",
    metrics = listOf(StartupTimingMetric()),
    iterations = 5,
    startupMode = StartupMode.COLD,
  ) {
    startActivityAndWait()
  }
}
```

```swift
// iOS — XCTMetric for performance
func testScrollPerformance() {
  let metric = XCTOSSignpostMetric.scrolling
  measure(metrics: [metric]) {
    app.tables.element.swipeUp()
  }
}
```

## Accessibility Testing
```dart
testWidgets('OrderCard has accessibility labels', (tester) async {
  await tester.pumpWidget(MaterialApp(home: OrderCard(order: tOrder)));
  expect(find.bySemanticsLabel('Order for Alice'), findsOneWidget);
});
```

```swift
func testAccessibilityLabels() {
  XCTAssertTrue(app.buttons["add-order"].exists)
  XCTAssertTrue(app.staticTexts["order-status"].label == "Pending")
}
```

## References
- `references/integration-testing.md` — Mobile Integration Testing
- `references/manual-testing.md` — Manual Testing — Mobile
- `references/mobile-testing-strategies.md` — Mobile Testing Strategies
- `references/test-automation-frameworks.md` — Test Automation Frameworks
- `references/ui-testing.md` — Mobile UI Testing
- `references/unit-testing.md` — Mobile Unit Testing

## Handoff
After testing setup, hand off to:
- `mobile/universal/performance` — Performance benchmarking tests
- `mobile/universal/security` — Security testing, penetration testing
- `mobile/universal/deployment` — CI/CD pipeline integration for tests
- `mobile/universal/analytics` — Test analytics for flaky detection
- `mobile/android` — Espresso, Robolectric, Compose test
- `mobile/ios` — XCUITest, XCTest, snapshot testing
- `mobile/flutter` — flutter_test, integration_test
- `mobile/react-native` — Jest, Detox, React Native Testing Library
