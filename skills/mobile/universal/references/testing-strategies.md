# Mobile Testing Strategies

A layered test strategy for mobile apps: what to test at each level, the frameworks per platform, handling device fragmentation, flakiness control, and CI integration.

## Test Pyramid

```text
             ┌────────────┐
             │ E2E / UI   │  few: critical journeys on real devices/emulators
             ├────────────┤
             │ integration│  screens with fake data layer, DB/network integration
             ├────────────┤
             │ unit       │  many: ViewModels, use cases, mappers, reducers
             └────────────┘
   + snapshot/screenshot tests for UI regressions
   + manual exploratory testing for UX and device-specific behaviour
```

## Frameworks

| Level | iOS | Android | Flutter | React Native |
|-------|-----|---------|---------|--------------|
| Unit | Swift Testing (`@Test`, `#expect`), XCTest | JUnit 4/5, kotlinx-coroutines-test, Turbine | `test` package | Jest/Vitest |
| UI component | ViewInspector (SwiftUI, third-party), XCUITest | Compose UI test (`createComposeRule`), Robolectric | `flutter_test` widget tests | React Native Testing Library |
| Screenshot | swift-snapshot-testing | Paparazzi, Roborazzi, Compose Preview Screenshot Testing | golden tests (`matchesGoldenFile`) | Storybook + visual testing, jest snapshots (logic only) |
| E2E | XCUITest | Espresso / UI Automator, Compose tests on device | `integration_test`, Patrol | Detox, Maestro |
| Cross-platform black-box | Maestro, Appium | Maestro, Appium | Maestro, Appium | Maestro, Appium |

## Unit Tests

### ViewModel with coroutines (Android)
```kotlin
class OrdersViewModelTest {
    @get:Rule val mainDispatcherRule = MainDispatcherRule()   // sets Dispatchers.Main to a TestDispatcher

    @Test
    fun `refresh failure exposes error and stops loading`() = runTest {
        // Arrange
        val repo = FakeOrderRepository().apply { failNext = IOException("offline") }
        val vm = OrdersViewModel(repo)

        // Act
        vm.refresh()
        advanceUntilIdle()

        // Assert
        val state = vm.state.value
        assertFalse(state.isLoading)
        assertEquals("offline", state.error)
    }
}
```

Use Turbine (`flow.test { awaitItem() }`) to assert sequences of emissions.

### Swift Testing
```swift
import Testing
@testable import Orders

@MainActor
struct OrdersViewModelTests {
    @Test func refreshLoadsOrders() async throws {
        let repo = FakeOrderRepository(orders: [.fixture(id: "1")])
        let model = OrdersViewModel(repo: repo)

        await model.refresh()

        #expect(model.orders.map(\.id) == ["1"])
        #expect(model.errorMessage == nil)
    }

    @Test(arguments: [URLError(.notConnectedToInternet), URLError(.timedOut)])
    func refreshShowsErrorOnNetworkFailure(error: URLError) async {
        let model = OrdersViewModel(repo: FakeOrderRepository(error: error))
        await model.refresh()
        #expect(model.errorMessage != nil)
    }
}
```

## Fakes over Mocks

- Provide in-memory fakes for repositories and clients (`FakeOrderRepository`) that implement the real interface. They are reusable across unit, UI and integration tests.
- Use mocking libraries (MockK, Mockito-Kotlin, mocktail, Jest mocks) for verifying specific interactions at boundaries.
- Network: MockWebServer (OkHttp), `URLProtocol` stubs, `http_mock_adapter`/custom `HttpClient` in Dart, MSW for RN.

## UI Tests

```kotlin
@get:Rule val compose = createComposeRule()

@Test fun showsRetryOnError() {
    compose.setContent { OrdersScreen(state = OrdersUiState(error = "offline"), onRetry = {}) }
    compose.onNodeWithText("Try again").assertIsDisplayed()
}
```

```dart
testWidgets('shows retry on error', (tester) async {
  await tester.pumpWidget(ProviderScope(
    overrides: [orderRepositoryProvider.overrideWithValue(FailingOrderRepository())],
    child: const MaterialApp(home: OrdersPage()),
  ));
  await tester.pumpAndSettle();
  expect(find.text('Try again'), findsOneWidget);
});
```

Prefer stateless screen composables/widgets/views that take state + callbacks; they are trivial to test and preview.

## E2E Tests

Cover a handful of journeys that make money or break trust: onboarding/sign-in, core action, purchase, settings that affect data.

```yaml
# Maestro flow: flows/sign_in.yaml
appId: com.example.app
---
- launchApp:
    clearState: true
- tapOn: "Sign in"
- inputText: ${TEST_USER_EMAIL}
- tapOn: "Password"
- inputText: ${TEST_USER_PASSWORD}
- tapOn: "Continue"
- assertVisible: "Your orders"
```

Run against a dedicated test backend with seeded accounts; never against production user data.

## Flakiness Control

| Cause | Mitigation |
|-------|-----------|
| Animations | Disable animations on test devices/emulators; `IdlingResource`/Compose idling sync |
| Real network | Stub or point to a stable test environment |
| Time | Inject clocks; use `runTest` virtual time, `fakeAsync` in Dart |
| Test order dependency | Clear app state per test (`clearState`, Android Test Orchestrator with `clearPackageData`) |
| Arbitrary sleeps | Wait for conditions, not durations |

Track flaky tests, quarantine with an owner and deadline, do not retry silently forever.

## Device Coverage

- Emulators/simulators for PR checks; real devices (in-house or device farms such as Firebase Test Lab, AWS Device Farm, BrowserStack) for release candidates.
- Matrix: minimum supported OS, latest OS, a low-end Android device, a small-screen and a large-screen/tablet configuration, RTL locale, large font size/dynamic type, dark mode.
- Accessibility checks: Android Accessibility Test Framework (enabled via Espresso/Compose checks), Xcode Accessibility Inspector, Flutter `meetsGuideline` matchers.

## CI Integration

| Stage | Runs |
|-------|------|
| Pull request | Lint, unit, screenshot tests (JVM/host-side), fast UI tests |
| Main | Instrumented/XCUITest suites on emulators/simulators |
| Release candidate | E2E on device farm, performance benchmarks |

Android emulators in CI need hardware acceleration (KVM on Linux runners); Gradle Managed Devices define emulator configs in the build. iOS UI tests require macOS runners with a pinned Xcode and simulator runtime.

## Checklist

- [ ] Unit tests for every ViewModel/use case path including errors (AAA structure)
- [ ] Fakes shared across test levels; network stubbed
- [ ] Screenshot tests for design-system components and key screens
- [ ] E2E limited to critical journeys on a seeded test backend
- [ ] Flaky tests tracked and fixed; animations disabled, clocks injected
- [ ] Device/OS/accessibility matrix covered before release
