# iOS Testing (XCTest)

## Unit Tests
```swift
final class OrderServiceTests: XCTestCase {
    var sut: OrderService!
    var mockSession: MockURLSession!

    override func setUp() {
        mockSession = MockURLSession()
        sut = OrderService(session: mockSession)
    }

    func testFetchOrders() async throws {
        mockSession.stubData = orderJSON.data(using: .utf8)!
        let orders = try await sut.fetchOrders()
        XCTAssertEqual(orders.count, 2)
    }

    func testFetchOrdersFailure() async {
        mockSession.stubError = URLError(.notConnectedToInternet)
        do { _ = try await sut.fetchOrders(); XCTFail() }
        catch { XCTAssertEqual((error as? URLError)?.code, .notConnectedToInternet) }
    }
}
```

## UI Tests (XCUITest)
```swift
final class OrderListUITests: XCTestCase {
    let app = XCUIApplication()

    override func setUp() {
        app.launchEnvironment = ["TEST_MODE": "1"]
        continueAfterFailure = false
        app.launch()
    }

    func testOrderListShows() {
        XCTAssertTrue(app.navigationBars["Orders"].exists)
        XCTAssertTrue(app.staticTexts["Order #1"].waitForExistence(timeout: 5))
    }
}
```

## Snapshot Testing
```swift
// iOSSnapshotTestCase (formerly FBSnapshotTestCase)
class OrderViewSnapshotTests: FBSnapshotTestCase {
    override func setUp() {
        recordMode = false // Set true to record new reference
    }

    func testOrderView() {
        let view = OrderView(order: .mock)
        FBSnapshotVerifyView(view)
    }
}
```
