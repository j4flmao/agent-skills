# Test Automation Frameworks — Mobile

## Framework Comparison

| Framework | Platform | Language | Type | Pros | Cons |
|-----------|----------|----------|------|------|------|
| Appium | iOS + Android | Any (WebDriver) | E2E (cross-platform) | Cross-platform, large community, language agnostic | Slow, flaky, complex setup |
| Detox | iOS + Android | JavaScript/TS | E2E (gray-box) | Fast, stable, RN-native | React Native only, limited Android |
| XCTest / XCUITest | iOS | Swift/ObjC | UI (native) | Fastest iOS, native API, Xcode integrated | iOS only, Swift only |
| Espresso | Android | Kotlin/Java | UI (native) | Fast, reliable, Google-supported | Android only, Kotlin/Java only |
| Flutter Driver | Flutter | Dart | E2E (Flutter) | Flutter-native, cross-platform | Flutter only |
| Maestro | iOS + Android | YAML | E2E | Simple YAML, no code needed, fast | Limited complex logic |
| KIF | iOS | Swift/ObjC | Integration | KIF uses accessibility, fast | iOS only, less popular |
| Robolectric | Android | Kotlin/Java | Unit/Integration | Fast (no emulator), JVM-based | Limited UI testing |
| UI Automator | Android | Kotlin/Java | UI (cross-app) | Cross-app testing, system UI | Slow, Java only |
| EarlGrey | iOS | Swift/ObjC | UI (Google) | Google's iOS framework, synchronized | iOS only, complex setup |

## Appium

### Setup

```python
# requirements.txt
Appium-Python-Client==4.1.0
selenium==4.21.0
```

```python
import pytest
from appium import webdriver
from appium.options.ios import XCUITestOptions
from appium.options.android import UiAutomator2Options

class TestBase:
    @pytest.fixture
    def ios_driver(self):
        options = XCUITestOptions()
        options.platform_version = "17.4"
        options.device_name = "iPhone 15"
        options.app = "path/to/app.app"
        options.automation_name = "XCUITest"
        options.udid = "auto"

        driver = webdriver.Remote("http://localhost:4723", options=options)
        yield driver
        driver.quit()

    @pytest.fixture
    def android_driver(self):
        options = UiAutomator2Options()
        options.platform_version = "14"
        options.device_name = "Pixel_8"
        options.app = "path/to/app.apk"
        options.automation_name = "UiAutomator2"
        options.app_package = "com.example.app"
        options.app_activity = ".MainActivity"

        driver = webdriver.Remote("http://localhost:4723", options=options)
        yield driver
        driver.quit()
```

### Page Object Pattern

```python
class LoginPage:
    def __init__(self, driver):
        self.driver = driver
        self.username_field = (MobileBy.ACCESSIBILITY_ID, "username-input")
        self.password_field = (MobileBy.ACCESSIBILITY_ID, "password-input")
        self.login_button = (MobileBy.ACCESSIBILITY_ID, "login-button")
        self.error_message = (MobileBy.ACCESSIBILITY_ID, "error-label")

    def enter_username(self, text):
        self.driver.find_element(*self.username_field).send_keys(text)

    def enter_password(self, text):
        self.driver.find_element(*self.password_field).send_keys(text)

    def tap_login(self):
        self.driver.find_element(*self.login_button).click()

    def login(self, username, password):
        self.enter_username(username)
        self.enter_password(password)
        self.tap_login()

    def get_error(self):
        return self.driver.find_element(*self.error_message).text


class TestLogin:
    def test_successful_login(self, ios_driver):
        login_page = LoginPage(ios_driver)
        login_page.login("testuser", "password123")
        assert HomePage(ios_driver).is_displayed()

    def test_invalid_credentials(self, ios_driver):
        login_page = LoginPage(ios_driver)
        login_page.login("wrong", "credentials")
        assert "Invalid" in login_page.get_error()
```

## Detox (React Native)

### Setup

```javascript
// detox.config.js
module.exports = {
    testRunner: { args: { $0: 'jest', config: 'e2e/jest.config.js' } },
    apps: {
        'ios.debug': {
            type: 'ios.app',
            binaryPath: 'ios/build/Build/Products/Debug-iphonesimulator/App.app',
            build: 'xcodebuild -workspace ios/App.xcworkspace -scheme App -configuration Debug -sdk iphonesimulator -derivedDataPath ios/build'
        },
        'android.debug': {
            type: 'android.apk',
            binaryPath: 'android/app/build/outputs/apk/debug/app-debug.apk',
            build: 'cd android && ./gradlew assembleDebug assembleAndroidTest'
        }
    },
    devices: {
        simulator: {
            type: 'ios.simulator',
            device: { type: 'iPhone 15' }
        },
        emulator: {
            type: 'android.emulator',
            device: { avdName: 'Pixel_8_API_34' }
        }
    },
    configurations: {
        'ios.sim.debug': { device: 'simulator', app: 'ios.debug' },
        'android.emu.debug': { device: 'emulator', app: 'android.debug' }
    }
};
```

```javascript
// e2e/login.test.js
describe('Login Flow', () => {
    beforeEach(async () => {
        await device.reloadReactNative();
    });

    it('should login successfully', async () => {
        await element(by.id('username-input')).typeText('testuser');
        await element(by.id('password-input')).typeText('password123');
        await element(by.id('login-button')).tap();
        await expect(element(by.id('home-screen'))).toBeVisible();
    });

    it('should show error on invalid credentials', async () => {
        await element(by.id('username-input')).typeText('wrong');
        await element(by.id('password-input')).typeText('credentials');
        await element(by.id('login-button')).tap();
        await expect(element(by.id('error-label'))).toHaveText('Invalid credentials');
    });
});
```

## XCTest / XCUITest (iOS Native)

```swift
import XCTest

final class LoginTests: XCTestCase {
    let app = XCUIApplication()

    override func setUpWithError() throws {
        continueAfterFailure = false
        app.launch()
    }

    func testLoginSuccess() throws {
        let usernameField = app.textFields["username-input"]
        usernameField.tap()
        usernameField.typeText("testuser")

        let passwordField = app.secureTextFields["password-input"]
        passwordField.tap()
        passwordField.typeText("password123")

        app.buttons["login-button"].tap()

        XCTAssertTrue(app.otherElements["home-screen"].waitForExistence(timeout: 5))
    }

    func testSwipeAndScroll() throws {
        let collectionView = app.collectionViews["feed"]
        collectionView.swipeUp()
        collectionView.swipeDown()
    }

    func testPullToRefresh() throws {
        let firstCell = app.cells.element(boundBy: 0)
        let start = firstCell.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.1))
        let end = firstCell.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.6))
        start.press(forDuration: 0, thenDragTo: end)
    }
}
```

## Espresso (Android Native)

```kotlin
import androidx.test.espresso.Espresso.onView
import androidx.test.espresso.action.ViewActions.*
import androidx.test.espresso.assertion.ViewAssertions.matches
import androidx.test.espresso.matcher.ViewMatchers.*
import androidx.test.ext.junit.rules.ActivityScenarioRule
import androidx.test.ext.junit.runners.AndroidJUnit4
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class LoginTest {

    @get:Rule
    val activityRule = ActivityScenarioRule(MainActivity::class.java)

    @Test
    fun loginSuccess() {
        onView(withId(R.id.username_input))
            .perform(typeText("testuser"), closeSoftKeyboard())
        onView(withId(R.id.password_input))
            .perform(typeText("password123"), closeSoftKeyboard())
        onView(withId(R.id.login_button))
            .perform(click())

        onView(withId(R.id.home_screen))
            .check(matches(isDisplayed()))
    }

    @Test
    fun errorOnInvalidCredentials() {
        onView(withId(R.id.username_input))
            .perform(typeText("wrong"), closeSoftKeyboard())
        onView(withId(R.id.password_input))
            .perform(typeText("credentials"), closeSoftKeyboard())
        onView(withId(R.id.login_button))
            .perform(click())

        onView(withId(R.id.error_label))
            .check(matches(withText("Invalid credentials")))
    }
}
```

## Flutter Driver

```dart
import 'package:flutter_driver/flutter_driver.dart';
import 'package:test/test.dart';

void main() {
    late FlutterDriver driver;

    setUpAll(() async {
        driver = await FlutterDriver.connect();
    });

    tearDownAll(() async {
        driver?.close();
    });

    test('login flow', () async {
        await driver.tap(find.byValueKey('username-input'));
        await driver.enterText('testuser');

        await driver.tap(find.byValueKey('password-input'));
        await driver.enterText('password123');

        await driver.tap(find.byValueKey('login-button'));

        await driver.waitFor(find.byValueKey('home-screen'), timeout: Duration(seconds: 5));
    });
}
```

## Maestro

```yaml
# e2e/login.yaml
appId: com.example.app
---
- launchApp
- tapOn:
    id: "username-input"
- inputText: "testuser"
- tapOn:
    id: "password-input"
- inputText: "password123"
- tapOn:
    id: "login-button"
- assertVisible:
    id: "home-screen"
```

## Screenshot Testing

### iOS — XCTest with snapshot

```swift
func testScreenshotComparison() throws {
    let app = XCUIApplication()
    app.launch()

    let screenshot = app.windows.firstMatch.screenshot()
    let attachment = XCTAttachment(screenshot: screenshot)
    attachment.name = "Home Screen"
    attachment.lifetime = .keepAlways
    add(attachment)
}
```

### Android — Paparazzi (screenshot tests)

```kotlin
@RunWith(ParameterizedRunner::class)
class HomeScreenSnapshotTest {

    @get:Rule
    val paparazzi = Paparazzi(
        deviceConfig = DeviceConfig.PIXEL_8,
        theme = "Theme.App"
    )

    @Test
    fun homeScreenDefault() {
        paparazzi.snapshot {
            ComposeView(paparazzi.context).apply {
                setContent {
                    HomeScreen()
                }
            }
        }
    }
}
```

## Visual Regression Testing

### Percy

```javascript
import Percy from '@percy/appium-app';

describe('Visual Regression', () => {
    it('captures visual snapshot', async () => {
        await Percy.screenshot(driver, 'Login Screen');
        await element(by.id('login-button')).tap();
        await Percy.screenshot(driver, 'Home Screen');
    });
});
```

### Applitools Eyes

```javascript
import { Eyes, Target, ClassicRunner } from '@applitools/eyes-appium';

const eyes = new Eyes(new ClassicRunner());

async function visualTest(driver) {
    await eyes.open(driver, 'My App', 'Login Test', { width: 390, height: 844 });

    await eyes.check('Login Screen', Target.window());
    await element(by.id('login-button')).tap();
    await eyes.check('Home Screen', Target.window());

    await eyes.close();
}
```

## Parallel Execution

### Appium — Parallel with pytest

```python
# conftest.py
import pytest
from appium import webdriver

def pytest_addoption(parser):
    parser.addoption("--device", action="store", default="ios")

@pytest.fixture
def driver(request):
    device = request.config.getoption("--device")
    if device == "ios":
        options = XCUITestOptions()
        options.udid = "00008110-..."
        # ...
    else:
        options = UiAutomator2Options()
        options.udid = "emulator-5554"
        # ...
    driver = webdriver.Remote("http://localhost:4723", options=options)
    yield driver
    driver.quit()
```

```bash
# Run on multiple devices in parallel
pytest --device=ios --device=android -n 2
```

### Detox — Parallel

```javascript
// detox.config.js — multiple devices
devices: {
    'ios-1': { type: 'ios.simulator', device: { type: 'iPhone 15' } },
    'ios-2': { type: 'ios.simulator', device: { type: 'iPhone 15' } },
    'android-1': { type: 'android.emulator', device: { avdName: 'Pixel_8' } },
}
```

```bash
detox test --configuration ios.sim.debug --workers 2
```

## Device Farm Integration

### Firebase Test Lab

```bash
gcloud firebase test android run \
    --type instrumentation \
    --app app-debug.apk \
    --test app-debug-test.apk \
    --device model=Pixel8,version=34,locale=en,orientation=portrait \
    --device model=SamsungS24,version=34,locale=en,orientation=portrait \
    --timeout 30m
```

### AWS Device Farm

```python
import boto3

client = boto3.client('devicefarm')

response = client.schedule_run(
    projectArn='arn:aws:devicefarm:us-west-2:...:project/...',
    appArn='arn:aws:devicefarm:us-west-2:...:upload/...',
    devicePoolArn='arn:aws:devicefarm:us-west-2:...:devicepool/...',
    test={
        'type': 'APPIUM_PYTHON',
        'testPackageArn': 'arn:aws:devicefarm:us-west-2:...:upload/...'
    },
    executionConfiguration={
        'jobTimeoutMinutes': 30
    }
)
```

## Test Reporting

### Allure Framework

```python
import allure
import pytest

@allure.feature("Login")
@allure.story("Successful authentication")
@allure.severity(allure.severity_level.CRITICAL)
def test_login_success():
    with allure.step("Enter credentials"):
        login_page.enter_username("testuser")
        login_page.enter_password("password123")

    with allure.step("Submit login form"):
        login_page.tap_login()

    with allure.step("Verify home screen is displayed"):
        assert home_page.is_displayed()
```

### Report generation

```bash
# Generate Allure report
allure generate allure-results --clean -o allure-report
allure open allure-report
```

### XCResult (iOS)

```bash
# Convert XCResult to readable format
xcrun xcresulttool get --path TestResults.xcresult --format json > test_results.json

# Generate HTML report
xcparse TestResults.xcresult test_report.html
```

## CI Integration Best Practices

- Run unit tests on every PR commit (fast, <5 min)
- Run widget/component tests on every PR (medium, <10 min)
- Run integration tests nightly (slow, <30 min)
- Run E2E tests on release branches only (slowest, <1 hour)
- Parallelize across devices in CI
- Cache build artifacts between runs
- Retry flaky tests (max 2 retries)
- Set test timeouts to prevent hung jobs
- Upload test artifacts (screenshots, logs, video) on failure
