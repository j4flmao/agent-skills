# Analytics Debugging & Testing

## Debug Checklist

### Pre-Release
- [ ] Events fire in debug mode and appear in provider debug view
- [ ] Event names match tracking plan (case-sensitive)
- [ ] Each event has the correct required properties
- [ ] No PII in event properties (check in debugger/Charles)
- [ ] Screen views tracked automatically via navigation listener
- [ ] User properties set on login and update correctly
- [ ] Identity stitching tested: anonymous -> identified -> logout -> re-login
- [ ] Offline queue flushes when connectivity restores
- [ ] Batch timer fires events at correct interval
- [ ] Consent toggles block/allow events correctly
- [ ] ATT prompt appears on iOS 14.5+ (test with debug ATT state)
- [ ] No console errors from analytics SDK

## Testing Tools

### Provider Debug Tools
| Provider | Tool | How to Access |
|----------|------|---------------|
| Firebase | DebugView | Android: `adb shell setprop debug.firebase.analytics.app <pkg>`, iOS: Xcode -> Simulate -> Debug -> Open DebugView |
| Mixpanel | Live View | Dashboard -> View Events -> Live |
| Amplitude | Event Explorer | Dashboard -> Data -> Event Explorer |
| Sentry | Performance | Dashboard -> Performance -> Events |
| Custom | Charles Proxy | Filter for your analytics endpoint |

### Automated Testing Patterns

#### Unit Test (Event Emission)
```swift
func testCartAddEventFires() {
    let mockProvider = MockAnalyticsProvider()
    let service = AnalyticsService(provider: mockProvider)
    service.trackEvent("cart_add_item", properties: ["product_id": "123", "price": 29.99])
    XCTAssertEqual(mockProvider.events.last?.name, "cart_add_item")
    XCTAssertEqual(mockProvider.events.last?.properties["product_id"] as? String, "123")
}
```

#### Integration Test (Full Flow)
```kotlin
@Test
fun screenViewTrackedAutomatically() {
    val testRule = ActivityScenarioRule(MainActivity::class.java)
    testRule.scenario.onActivity { activity ->
        val navController = activity.findNavController(R.id.nav_host)
        navController.navigate(R.id.profileScreen)
    }
    // Wait for navigation callback
    Thread.sleep(1000)
    assert(mockProvider.events.any { it.name == "screen_view" && it.properties["screen_name"] == "Profile" })
}
```

## Common Issues

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| Events not appearing in dashboard | SDK not initialized | Verify init before first event fire |
| Events appear in debug not release | Debug/release key mismatch | Check build config per scheme |
| Duplicate screen_view events | Multiple navigation listeners | Ensure single listener registered |
| User properties reset | Not persisted across sessions | Store in SharedPreferences/UserDefaults |
| Events show "unknown" schema name | Schema not registered in provider | Create schema in provider dashboard |
| Offline events never arrive | Queue not flushed | Call `flush()` on `applicationDidEnterBackground` |
| Consent changes not reflected | Provider not reconfigured | Re-init provider after consent change |
| Event timestamps wrong | Clock skew | Use NTP sync, not device time |

## CI Integration

### Analytics Validation CI Step
```yaml
# .github/workflows/analytics-validation.yml
jobs:
  validate-events:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Validate tracking plan
        run: |
          python scripts/validate_tracking_plan.py \
            --plan tracking_plan.yaml \
            --source-dir src/
      - name: Run analytics tests
        run: |
          xcodebuild test -scheme App -testPlan AnalyticsTests
```

### Tracking Plan Validation Script
```python
# scripts/validate_tracking_plan.py
import yaml, re, sys

with open("tracking_plan.yaml") as f:
    plan = yaml.safe_load(f)

errors = []
for event_name, event_def in plan["events"].items():
    if len(event_name) > 40:
        errors.append(f"{event_name}: name exceeds 40 chars")
    if not re.match(r"^[a-z][a-z0-9_]*$", event_name):
        errors.append(f"{event_name}: must be snake_case")
    props = event_def.get("properties", {})
    if len(props) > 25:
        errors.append(f"{event_name}: exceeds 25 properties")

if errors:
    for e in errors:
        print(f"ERROR: {e}")
    sys.exit(1)
print("Tracking plan valid")
```
