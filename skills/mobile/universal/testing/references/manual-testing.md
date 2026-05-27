# Manual Testing — Mobile

## Overview

Manual testing remains essential for mobile apps despite automation advances. Exploratory testing, usability validation, real-world network conditions, and hardware-specific behaviors require human judgment that automated tests cannot replicate.

## Test Planning

### Test Plan Structure

A comprehensive mobile test plan covers these dimensions:

1. **Functional testing** — Feature correctness according to requirements
2. **UI/UX testing** — Visual consistency, interaction patterns, accessibility
3. **Device compatibility** — Screen sizes, OS versions, hardware capabilities
4. **Network conditions** — Connectivity states, bandwidth, latency
5. **Performance** — Startup time, memory, battery, rendering
6. **Interruption handling** — Calls, notifications, multitasking
7. **Localization** — Language accuracy, RTL layout, date/number formats
8. **Regression** — Existing features unaffected by new changes
9. **Security** — Data storage, network communication, authentication

### Test Case Design Template

```
ID: TC-001
Title: User can capture photo from camera
Priority: P1 (Critical)
Preconditions:
  - App installed on device with camera
  - Camera permission not yet granted
Steps:
  1. Launch app
  2. Navigate to camera screen
  3. Tap capture button
  4. Review captured photo
  5. Tap "Use Photo"
  6. Verify photo appears in the editor
Expected Results:
  - Camera permission dialog appears at step 2
  - Photo captures with correct orientation
  - Photo displays in editor at step 6
Test Data: N/A
Environment: iPhone 14, iOS 17.4
Test Type: Functional
```

### Test Case Prioritization

| Priority | Description | Coverage Target | Examples |
|----------|-------------|----------------|----------|
| P1 | Critical path — block if fails | 100% | Login, purchase, data loss prevention |
| P2 | Important feature — high impact | 90% | Profile editing, search, settings |
| P3 | Standard feature — moderate impact | 70% | Filters, sorting, secondary actions |
| P4 | Edge case — low impact | 40% | Tooltips, animations, error messages |

## Device Matrix

### Device Selection Criteria

Select devices covering these dimensions:

1. **OS version** — Latest (iOS 18), previous major (iOS 17), one older (iOS 16)
2. **Screen size** — Small (iPhone SE), Medium (iPhone 15), Large (iPhone 15 Pro Max), Tablet (iPad)
3. **Hardware capability** — High-end (latest flagship), Mid-range, Low-end (budget Android)
4. **Display type** — Notch, Dynamic Island, punch-hole, bezel
5. **Architecture** — ARM64, x86 (emulators only)
6. **Density** — Low dpi, medium dpi, high dpi, extra-high dpi

### Sample Device Matrix

| Device | OS | Screen | RAM | Storage | Market Share |
|--------|----|--------|-----|---------|-------------|
| iPhone 15 Pro Max | iOS 17 | 6.7" OLED | 8GB | 256GB | High |
| iPhone 14 | iOS 16 | 6.1" OLED | 6GB | 128GB | High |
| iPhone SE (3rd gen) | iOS 17 | 4.7" LCD | 4GB | 64GB | Medium |
| Google Pixel 8 | Android 14 | 6.2" OLED | 8GB | 128GB | Medium |
| Samsung Galaxy S24 | Android 14 | 6.8" OLED | 8GB | 256GB | High |
| Samsung Galaxy A14 | Android 13 | 6.6" LCD | 4GB | 64GB | High (budget) |
| Motorola Moto G Power | Android 12 | 6.5" LCD | 4GB | 64GB | Medium (budget) |

### OS Version Testing

Focus testing on:
- **Latest OS**: Primary testing — new features, new API behaviors
- **Previous major OS**: Secondary testing — regression, behavioral differences
- **N-2 OS**: Minimal testing — critical paths only
- **Beta OS**: Early compatibility testing — report issues before public release

Market share data should guide prioritization. As of 2026:
- iOS: 90%+ on iOS 17+ within 6 months of release
- Android: ~60% on latest 2 major versions, long tail fragmentation

## Exploratory Testing

### Session-Based Testing

Structure exploratory testing in timed sessions:

1. **Charter** — Define mission: "Explore the checkout flow for edge cases with invalid inputs"
2. **Timebox** — 45-90 minute focused sessions
3. **Note-taking** — Record observations, bugs, and ideas
4. **Debrief** — Review findings, categorize, file bugs

### Heuristic Evaluation Checklist

Apply these heuristics during exploration:

1. **Visibility of system status** — Does the app show loading, progress, errors?
2. **Match with real world** — Do icons and labels match user expectations?
3. **User control and freedom** — Can user undo, go back, cancel?
4. **Consistency** — Do patterns repeat across screens?
5. **Error prevention** — Are destructive actions confirmed?
6. **Recognition over recall** — Are options visible, not buried in menus?
7. **Flexibility** — Does the app support power users + beginners?
8. **Aesthetic design** — Is the interface clean and intentional?
9. **Error recovery** — Are error messages helpful? Can user recover?
10. **Help** — Is documentation accessible when needed?

## Network Condition Testing

### Network Profiles

Test each feature against these profiles:

| Profile | Bandwidth | Latency | Packet Loss | Use Case |
|---------|-----------|---------|-------------|----------|
| WiFi | 50 Mbps | 10ms | 0% | Ideal conditions |
| 5G | 100 Mbps | 20ms | 0.1% | High-speed cellular |
| 4G LTE | 20 Mbps | 50ms | 0.5% | Typical cellular |
| 3G | 5 Mbps | 150ms | 1% | Slow cellular |
| 2G | 200 Kbps | 500ms | 5% | Minimum connectivity |
| Weak WiFi | 1 Mbps | 100ms | 2% | Far from router |
| Airplane Mode | Offline | N/A | N/A | No connectivity |
| Network flaky | Varies | Varies | Spikes | Intermittent connection |

### Testing Network Edge Cases

1. **Cold start with no network** — App should show cached data or offline state
2. **Network loss mid-operation** — Upload fails → show retry, queue for later
3. **Network restore mid-session** — Auto-sync queued operations
4. **Slow network** — Show loading indicators, timeout appropriately
5. **Network switch** — WiFi → Cellular → WiFi mid-session
6. **Proxy/VPN** — Corporate networks, ad blockers, VPNs
7. **Captive portal** — WiFi networks requiring login page

### iOS Network Link Conditioner

Enable via Settings > Developer > Network Link Conditioner:
- Built-in profiles: Very Bad, Bad, Average, Good, High
- Custom profiles: Configure specific bandwidth, delay, and loss values
- Enable before testing, disable after (affects all apps)

### Android Network Simulation

Using Facebook's Augmented Traffic Control (ATC) or built-in emulator controls:
```bash
# Android emulator — set network speed
adb shell settings put global download_manager_max_connections 1
# Use emulator UI: Extended Controls > Cellular > Network type > Edge/GPRS
```

## Battery and Performance Testing

### Battery Impact Testing

1. **Background activity** — Check for excessive wake locks, background CPU usage
2. **Network polling** — Frequency of background network calls
3. **Location updates** — GPS usage in background
4. **Animations** — GPU rendering time per frame
5. **Overdraw** — Excessive view rendering
6. **Idle drain** — Battery drain with app in background for 1 hour

### Performance Testing Checklist

| Metric | iOS Tool | Android Tool | Target |
|--------|----------|-------------|--------|
| Cold start time | Xcode Organizer | Android Vitals | <2 seconds |
| Warm start time | Xcode Organizer | Android Vitals | <1 second |
| Memory usage | Instruments (Allocations) | Android Profiler | <200MB |
| CPU usage | Instruments (Time Profiler) | Android Profiler | <20% idle |
| Frame rate | Xcode FPS debugger | GPU Profiler | 60fps stable |
| Network latency | Charles Proxy | Network Profiler | <500ms API |
| Disk usage | Xcode | Android Studio | <100MB cache |
| ANR rate | N/A | Android Vitals | <0.1% sessions |

## Localization Testing

### Language Testing Checklist

1. **UI truncation** — German text is ~30% longer than English
2. **Character encoding** — CJK, Cyrillic, Arabic characters render correctly
3. **RTL layout** — Arabic/Hebrew layouts mirror correctly
4. **Date formats** — MM/DD/YYYY vs DD/MM/YYYY vs YYYY-MM-DD
5. **Time formats** — 12h vs 24h clock
6. **Number formats** — 1,000.50 vs 1.000,50
7. **Currency formats** — $10 vs 10€ vs 10 USD
8. **Plural rules** — "1 item" vs "2 items" vs Russian/Czech plural forms
9. **Sorting order** — Alphabetical differs per language
10. **Keyboard types** — Email, number, URL keyboards for appropriate fields

### Testing RTL Layout

Key areas to verify for RTL:
- Text alignment (left-to-right reversed)
- Navigation transitions (slide from left instead of right)
- Image direction (arrows, progress indicators, back buttons)
- Tab order (right-to-left)
- Bi-directional text (mixed LTR numbers in RTL text)

## Regression Test Suites

### Smoke Test Suite

Run before every release (15-30 minutes):

1. Launch app — cold start
2. Login / authentication flow
3. Home screen loads with correct data
4. Navigate to main feature screens
5. Perform primary action (e.g., create order, send message)
6. Logout
7. Background → foreground resume
8. Kill app → relaunch

### Full Regression Suite

Run before major releases (2-4 hours):

1. All smoke test scenarios
2. Every screen renders correctly on reference devices
3. Every form submits and validates correctly
4. All navigation paths work end-to-end
5. All API integrations return correct data
6. Push notifications display and navigate correctly
7. Offline mode — cached content available
8. Data persists across app restarts
9. Permission flows — grant, deny, re-grant
10. Deep links resolve to correct screens
11. Interruption handling — call, SMS, alarm during app use
12. Background → foreground after 30 minutes

## Bug Reporting Templates

### Bug Report Structure

```
Title: [Area] Brief description of the issue

Environment:
  Device: iPhone 15 Pro Max
  OS: iOS 17.4 (build 21E213)
  App Version: 2.3.1 (build 456)
  Network: WiFi (50 Mbps)
  Account: testuser@example.com

Steps to Reproduce:
  1. Launch app
  2. Tap "Camera" tab
  3. Grant camera permission
  4. Tap capture button
  5. Tap "Use Photo"

Actual Result:
  Photo appears upside down in the editor.

Expected Result:
  Photo appears with correct orientation.

Frequency: 10/10 attempts

Severity: Major (P2) — feature partially broken

Attachments:
  - screen recording: orientation_bug.mov
  - device logs: orientation_logs.txt

Notes:
  Only affects front-facing camera. Back camera works correctly.
```

### Bug Severity Classification

| Severity | Definition | Response Time | Fix Target |
|----------|-----------|---------------|------------|
| Critical (P0) | App crash, data loss, security issue | Immediate | Within 24 hours |
| Major (P1) | Feature completely broken | Within 4 hours | Next release |
| Moderate (P2) | Feature partially broken, workaround exists | Within 24 hours | Next release |
| Minor (P3) | Cosmetic issue, edge case | Within 1 week | Future release |
| Trivial (P4) | Nitpick, enhancement suggestion | Within 1 month | Backlog |

## Test Environment Management

### Real Device Testing

Advantages:
- True hardware behavior (camera, sensors, GPS, biometrics)
- Real network conditions
- Actual performance characteristics
- Notch, Dynamic Island, and other hardware-specific UI

Minimum real device set:
- 1 latest iPhone (Pro Max recommended)
- 1 mid-range iPhone (SE or standard)
- 1 latest Android flagship (Pixel or Galaxy S)
- 1 budget Android device (Galaxy A or Moto G)

### Emulator Testing

Advantages:
- Easy to configure and reset
- Multiple device configurations without physical hardware
- Test various OS versions without device availability
- CI/CD integration

Limitations:
- No camera (uses virtual camera feed)
- GPS simulation only
- Performance not representative
- Biometrics limited
- Push notifications unreliable

### Cloud Device Farms

AWS Device Farm, Firebase Test Lab, BrowserStack App Automate:

- Run tests on 100+ real devices in parallel
- Geographic distribution testing
- Carrier-specific testing
- Screen recording and logs captured automatically
- Pay per minute of test execution
