# Swift Testing

## 1. XCTest Framework
The standard testing framework integrated into Xcode.

```swift
import XCTest
@testable import MyApp

final class MathTests: XCTestCase {
    var calculator: Calculator!

    override func setUpWithError() throws {
        calculator = Calculator()
    }

    override func tearDownWithError() throws {
        calculator = nil
    }

    func testAddition() throws {
        let result = calculator.add(2, 2)
        XCTAssertEqual(result, 4, "Addition should work")
    }
}
```

## 2. Testing Async Code
Swift 5.5+ makes async testing incredibly simple. XCTest natively supports `async` test functions.

```swift
func testFetchUserAsync() async throws {
    let api = APIClient()
    let user = try await api.fetchUser(id: 1)
    XCTAssertEqual(user.name, "Alice")
}
```

## 3. UI Testing & ViewInspector
While Xcode has built-in UI Tests (XCUITest) which run black-box tests interacting with the simulator, modern SwiftUI testing often uses the **ViewInspector** library for fast, white-box unit testing of views.

```swift
import XCTest
import ViewInspector

func testProfileViewDisplaysName() throws {
    let view = ProfileView(name: "Alice")
    let text = try view.inspect().vStack().text(0).string()
    XCTAssertEqual(text, "Alice")
}
```
