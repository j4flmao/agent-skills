# AR/VR Testing Guide

## Testing Prerequisites

AR/VR must be tested on real devices with varied environmental conditions. Simulators do not provide camera feed, real sensors, or accurate performance metrics.

### Required Device Matrix
| Device Type | Reason |
|-------------|--------|
| LiDAR iPad / iPhone 12+ Pro | Test LiDAR-specific features |
| Non-LiDAR iPhone (iPhone 11, SE) | Test camera-only AR |
| High-end Android (Pixel 8, Galaxy S23) | Test ARCore Depth API |
| Budget Android (Moto G, Galaxy A series) | Test minimal hardware path |
| iPhone with TrueDepth (iPhone X+) | Test face tracking |
| Device with A12+ Bionic | Test motion capture, body tracking |

## Test Scenarios

### Lighting Conditions
| Condition | What to Test | Expected Behavior |
|-----------|-------------|-------------------|
| Bright sunlight (50,000+ lux) | Tracking stability, exposure | Auto-exposure adjusts, tracking may be limited |
| Indoor ambient (300-500 lux) | Ideal conditions | Full tracking, plane detection within 1-2s |
| Dim room (10-50 lux) | Low light behavior | Low light prompt, tracking limited |
| Near darkness (<10 lux) | Fallback behavior | "Need more light" prompt |
| Mixed lighting (sunlight + shadow) | Shadow rendering | Realistic shadows from virtual objects |
| Flickering light (fluorescent, LED) | Tracking jitter | Should be stable, may need 60Hz matching |

### Surface Types
| Surface | Test |
|---------|------|
| Textured (carpet, grass, gravel) | Excellent tracking |
| Low texture (white wall, desk) | Tracking may be limited |
| Reflective (glass, mirror, water) | Feature points may be unreliable |
| Moving (water, leaves, people) | Dynamic content handling |
| Transparent (glass table) | May not detect plane |

### User Interaction
| Action | Expected Result |
|--------|----------------|
| Tap empty area | Hit-test -> no anchor placed |
| Tap detected plane | Anchor placed at hit point |
| Drag finger quickly | Ghost preview follows |
| Pinch zoom in/out | Object scales uniformly |
| Rotate with one finger | Object rotates around y-axis |
| Long press + drag | Object moves along plane |
| Double-tap object | Context menu appears |
| Walk around object | Object remains in place (tracking check) |
| Walk far from object (>10m) | Object culled or LOD switch |
| Background app | Session pauses, resumes on foreground |

## Performance Testing

### Metrics to Capture
| Metric | Tool | Target |
|--------|------|--------|
| Frame rate | Xcode GPU Report / Android GPU Inspector | 60fps sustained |
| GPU utilization | Metal System Trace / GPU Inspector | <80% |
| Memory (total) | Xcode Memory Report / Android Profiler | <500MB |
| Anchor count | Custom logging | <50 active |
| Draw calls | Xcode Frame Debugger / RenderDoc | <100 |
| Poly count | SceneKit debugger / Unity Stats | <300k |
| Load time per model | Instrumentation | <2s |
| Battery drain | Instruments Energy Log / BatteryHistorian | <500mW |
| CPU usage | Time Profiler / CPU Profiler | <30% |
| Tracking state duration | Custom breadcrumbs | >95% Normal |

## Automated Testing

### UI Automation Limitations
AR interactions cannot be fully automated via standard UI testing (Espresso, XCUITest) because they require real camera input and physical device movement. Use:

1. **Unit tests**: Test AR model loading, hit-testing math, anchor management logic
2. **Integration tests**: Test AR session lifecycle callbacks with mock data
3. **Snapshot testing**: Compare rendered frames against reference images
4. **Instruments automation**: Record/playback AR interaction scripts in Xcode

### Mock ARSession (Testing)
```swift
class MockARSession: ARSession {
    var mockFrame: ARFrame?
    override var currentFrame: ARFrame? { mockFrame }
    var anchors: [ARAnchor] = []
    override func run(_ configuration: ARConfiguration, options: ARSession.RunOptions = []) {
        // No-op, don't actually start camera
    }
}
```

## CI Integration

```yaml
# .github/workflows/ar-testing.yml
jobs:
  ar-tests:
    runs-on: macos-latest
    strategy:
      matrix:
        device: [iPhone-15-Pro, iPad-Pro-12.9-6th-gen]
    steps:
      - uses: actions/checkout@v4
      - name: Build for testing
        run: xcodebuild build-for-testing -scheme App -destination "platform=iOS Simulator,name=${{ matrix.device }}"
      - name: Test AR unit tests
        run: xcodebuild test-without-building -scheme App -destination "platform=iOS Simulator,name=${{ matrix.device }}" -only-testing:ARTests
      - name: Deploy to real device farm
        run: |
          # Upload to Firebase Test Lab for real-device AR testing
          gcloud firebase test ios run \
            --test build/App.zip \
            --device model=iphone14pro,version=17.0
```

## Production Verification

Pre-release checklist:
- [ ] AR session starts and maintains tracking on supported devices
- [ ] Graceful fallback on unsupported devices (show 2D content)
- [ ] All 3D models load within 2 seconds
- [ ] FPS stays above 55 for sustained sessions (>5 min)
- [ ] Memory stays under 500MB after loading all scene content
- [ ] App recovers from session interruption (background->foreground)
- [ ] Camera permission denied shows clear messaging
- [ ] Battery drain under 500mW sustained
- [ ] No tracking drift after 5-minute session
- [ ] Haptic + visual feedback for all user interactions
