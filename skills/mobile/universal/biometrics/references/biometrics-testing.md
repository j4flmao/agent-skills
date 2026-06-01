# Biometrics Testing Guide

## Test Device Matrix

| Device | Biometric Type | Purpose |
|--------|---------------|---------|
| iPhone with Face ID (iPhone X+) | Face ID | Face ID flow, TrueDepth camera |
| iPhone with Touch ID (iPhone SE) | Touch ID | Touch ID flow |
| Android with ultrasonic fingerprint (Samsung S23+) | Fingerprint (Class 3) | Strong biometric, wet finger test |
| Android with optical fingerprint (Pixel 6+) | Fingerprint (optical) | Optical sensor behavior |
| Android with face unlock (budget phone) | Face unlock (Class 2) | Weak biometric path |
| Android without biometric hardware | None | Fallback path |
| iOS Simulator | Simulated Face ID | Development testing |
| Android Emulator | Simulated fingerprint | Development testing |

## Test Scenarios

### Success Path
| # | Scenario | Expected Result |
|---|----------|----------------|
| 1 | Enrolled biometric, prompt shown, user authenticates | Auth succeeds, access granted |
| 2 | Biometric cached (validity duration) | No prompt shown, access granted |
| 3 | Device credential fallback | User enters PIN, access granted |
| 4 | Logout + re-login with biometric | Fresh biometric prompt, access granted |

### Failure Paths
| # | Scenario | Expected Result |
|---|----------|----------------|
| 1 | Unrecognized fingerprint/face (1-4 attempts) | Retry prompt, increment counter |
| 2 | 5 failed attempts | Lockout biometric, force device credential |
| 3 | No biometric enrolled | Skip biometric, show device credential or disable |
| 4 | Biometric hardware absent | Show other auth method, no biometric UI |
| 5 | Sensor dirty/wet | Error message, retry after cleaning |
| 6 | User cancels prompt | Return to previous state, no error |
| 7 | App backgrounds during prompt | Cancel auth, re-prompt on return |

### Edge Cases
| # | Scenario | Expected Result |
|---|----------|----------------|
| 1 | Biometric enrolled between sessions | On next auth, biometric now available |
| 2 | Biometric removed between sessions | On next auth, biometric now unavailable, handle gracefully |
| 3 | New biometric enrolled (finger added, new face) | Key invalidation: stored data inaccessible, re-encrypt |
| 4 | Device passcode changed | Key invalidation: stored data inaccessible |
| 5 | Biometric + device credential both unavailable | Show emergency app password (if configured) |
| 6 | Lockout -> device credential success -> next auth | Biometric reset, fresh biometric prompt |
| 7 | Rapid repeated auth attempts | Rate-limited, lockout after 5 in 60 seconds |

## Automated Testing

### Unit Tests
```swift
class BiometricAuthServiceTests: XCTestCase {
    var service: BiometricAuthService!
    var mockContext: MockLAContext!

    override func setUp() {
        mockContext = MockLAContext()
        service = BiometricAuthService(context: mockContext)
    }

    func testSuccessPath() {
        mockContext.shouldSucceed = true
        let expectation = expectation(description: "auth callback")
        service.authenticate(reason: "Test") { result in
            if case .success = result {
                expectation.fulfill()
            }
        }
        wait(for: [expectation], timeout: 1)
    }

    func testLockout() {
        mockContext.shouldFail = true
        mockContext.errorCode = LAError.biometryLockout.rawValue
        let expectation = expectation(description: "lockout callback")
        service.authenticate(reason: "Test") { result in
            if case .failure(let error) = result {
                XCTAssertEqual(error, .lockout)
                expectation.fulfill()
            }
        }
        wait(for: [expectation], timeout: 1)
    }
}
```

### Android UI Tests (BiometricPrompt)
```kotlin
@RunWith(AndroidJUnit4::class)
class BiometricAuthTest {
    @Test
    fun biometricPrompt_dismissed_onCancel() {
        val scenario = ActivityScenario.launch(MainActivity::class.java)
        scenario.onActivity { activity ->
            activity.showBiometricPrompt()
        }
        // Simulate cancel
        onView(withText("Cancel")).perform(click())
        // Verify fallback shown
        onView(withText("Enter PIN")).check(matches(isDisplayed()))
    }
}
```

## CI Integration

```yaml
jobs:
  biometric-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run unit tests
        run: ./gradlew testDebugUnitTest --tests *Biometric*
      - name: Run UI tests on emulator
        uses: reactivecircus/android-emulator-runner@v2
        with:
          api-level: 33
          target: google_apis
          script: ./gradlew connectedDebugAndroidTest --tests *Biometric*
```

## Security Testing Checklist

- [ ] Biometric data never leaves the device (verify with network proxy)
- [ ] Keys invalidated on biometric enrollment change
- [ ] Key attestation certificate validates hardware-backed key creation
- [ ] No biometric bypass via intent injection (Android)
- [ ] Biometric prompt cannot be spoofed by overlay attacks
- [ ] Lockout enforced after 5 failed attempts
- [ ] Keychain/Keystore items require biometric re-auth after app restart
- [ ] Server verifies biometric challenge-response (if implemented)
- [ ] Store only hashed/encrypted auth tokens, never biometric data
- [ ] NSFaceIDUsageDescription present in Info.plist (iOS)
- [ ] USE_BIOMETRIC or BIOMETRIC permission in AndroidManifest
- [ ] Accessibility: VoiceOver/TalkBack reads biometric prompt content
