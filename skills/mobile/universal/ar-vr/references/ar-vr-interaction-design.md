# AR/VR Interaction Design

## Overview

Interaction design for AR/VR differs fundamentally from traditional 2D UI. Users interact with virtual content in 3D space using gestures, gaze, voice, and spatial controllers. This reference covers interaction models, gesture sets, feedback systems, placement patterns, and usability guidelines for mobile AR/VR experiences.

## Interaction Model Fundamentals

### Input Modalities

```
AR/VR input can be categorized into:

1. Touch-based (mobile AR)
   ├── Direct touch: tap, long press, swipe on screen
   ├── Indirect manipulation: virtual joystick, gesture recognition
   └── Screen-space: 2D touch mapped to 3D world coordinates

2. Spatial (device motion + sensors)
   ├── Device tilt/rotation: viewport navigation
   ├── Device movement: positional tracking (6DOF)
   └── Environment interaction: AR placement via camera pose

3. Controller-based (VR, high-end AR)
   ├── Hand controllers: Meta Quest Touch, Apple Vision Pro
   ├── Hand tracking: Leap Motion, ARKit Hand Tracking
   └── Gaze + pinch: foveated pointing with confirmation

4. Voice (AR/VR with speech recognition)
   ├── Commands: "place table", "delete object"
   ├── Dictation: text input
   └── Confirmation: "yes", "no", "cancel"
```

### Interaction Modality Selection

```
Choose interaction modality based on context:

┌──────────────────────────────────────────────────────────────┐
│ Context                     │ Recommended Modality           │
├──────────────────────────────────────────────────────────────┤
│ Mobile AR, walking          │ Touch (tap, drag, pinch)       │
│ Mobile AR, seated           │ Touch + device tilt            │
│ Mobile AR, one-handed       │ Thumb zone gestures            │
│ VR, seated                  │ Controllers or hand tracking   │
│ VR, room-scale              │ Room-scale + controllers       │
│ AR glasses (Vision Pro)     │ Gaze + pinch + voice           │
│ Hands-occupied scenario     │ Voice commands only            │
│ Collaborative AR            │ Touch + spatial anchors        │
└──────────────────────────────────────────────────────────────┘
```

### Degrees of Freedom (DOF)

```
3DOF (rotation only): device orientation, no positional tracking
├── Used in: basic VR viewers, Google Cardboard
├── Interaction limited to gaze-based selection
└── Head rotation maps to camera rotation

6DOF (rotation + translation): full positional tracking
├── Used in: ARKit, ARCore, Meta Quest, Vision Pro
├── Allows walking around objects, leaning in
├── Positional tracking via SLAM or outside-in cameras
└── Requires: feature-rich environment for tracking

Hand tracking DOF:
├── 21-26 joints per hand (mediapipe, ARKit)
├── 6DOF per hand (wrist position + orientation)
├── 1-4DOF per finger (flexion, abduction)
└── Full hand pose estimation at 30-60fps
```

## Gesture Design

### AR Gesture Set

```
Standard AR gesture vocabulary:

Tap
├── Action: single finger, touch and release (<300ms)
├── Use: select object, confirm placement
├── Feedback: visual highlight + light haptic
├── Tolerance: 10px movement allowed during touch
└── Fail condition: movement >10px or duration >500ms

Double-tap
├── Action: two quick taps (<500ms apart)
├── Use: open context menu, toggle edit mode
├── Feedback: visual flash + medium haptic
├── Tolerance: 50px between tap positions
└── Fail condition: third tap within 500ms → triple tap

Long press
├── Action: single finger, hold >500ms
├── Use: initiate drag, show tooltip
├── Feedback: visual indicator after 300ms hold
├── Confirmation: subtle scale pulse at 500ms
└── Fail condition: movement >15px before threshold → cancel

Drag (pan)
├── Action: single finger, move after long press or immediate
├── Use: move objects in plane, rotate
├── Feedback: object follows finger with 1:1 mapping
├── Modes: horizontal plane drag, vertical plane drag
└── Fail condition: lift before 100ms movement → tap

Pinch
├── Action: two fingers, move toward/away
├── Use: scale objects
├── Feedback: object scales proportionally
├── Scale range: 0.1x to 10x
└── Fail condition: fingers cross → cancel

Rotate
├── Action: two fingers, circular motion
├── Use: rotate object around vertical axis
├── Feedback: object rotates with finger arc
├── Rotation snapping: 15° increments for grid alignment
└── Fail condition: single finger detected → drag

Swipe
├── Action: single finger, fast movement (>500px/s)
├── Use: navigate between AR scenes, dismiss objects
├── Feedback: object slides in direction of swipe
├── Direction detection: horizontal (left/right), vertical (up/down)
└── Fail condition: speed <500px/s → drag
```

### VR Gesture Set (Controller-Based)

```
Standard VR controller gestures:

Point + Trigger
├── Action: point controller, pull trigger
├── Use: select, confirm
├── Feedback: visual laser pointer + button press haptic
├── Laser: thin beam (1px), colored, ends at hit point
└── Fail condition: trigger released outside hit target

Grip
├── Action: squeeze grip button
├── Use: grab object, hold object
├── Feedback: object attaches to hand, vibration
├── Hold duration: until grip released
└── Fail condition: grip released while object held → drop

Thumbstick/Joystick
├── Action: push analog stick
├── Use: teleport, smooth locomotion, rotate
├── Feedback: movement indicator, speed proportional to deflection
├── Teleport: arc preview showing landing position
└── Fail condition: release without completing teleport → cancel

Button press
├── Action: press A/B/X/Y button
├── Use: secondary actions, menu open
├── Feedback: button press haptic
└── Context-dependent actions

Hand tracking gestures:
├── Pinch (thumb + index touch): select equivalent to trigger
├── Grab (all fingers curl): grip equivalent
├── Point (index extended): cursor or laser mode
├── Thumbs up: confirm, like
├── Wave: dismiss, cancel
└── Two-hand stretch: scale
```

### Gesture Conflict Resolution

```
Ambiguity handling when gestures overlap:

Scenario: Tap vs Long press vs Drag
├── Touch down → wait 100ms → is movement >10px?
│   ├── Yes → Drag mode
│   └── No → wait until 300ms → is still held?
│       ├── Yes → Long press mode
│       └── No → wait until touch up → Tap
└── Resolution: timeout-based state machine

Scenario: Pinch vs Two-finger drag
├── Two fingers touch → measure initial distance
├── Each frame: distance delta > 10%?
│   ├── Yes → Pinch (scale)
│   └── No → Two-finger drag (translate camera)
└── Resolution: distance-threshold heuristic

Scenario: Swipe vs Drag
├── Track velocity during movement
├── On touch up:
│   ├── Velocity > 500px/s? → Swipe
│   └── Velocity < 500px/s? → Drag
└── Resolution: velocity-based disambiguation

Implementation pattern:
├── gestureRecognizer = GestureDetector(minConfidence: 0.8)
├── gestureRecognizer.addTarget(self, action: #selector(handleGesture))
└── gestureRecognizer.delaysTouchesBegan = true (for long press)
```

## Placement Patterns

### Surface Detection

```
Types of surfaces for AR placement:

Horizontal surfaces:
├── Floor: large objects (furniture, characters)
├── Table: medium objects (decor, food)
├── Counter: small objects (tools, electronics)
└── Detection: ARPlaneAnchor alignment == horizontal

Vertical surfaces:
├── Walls: wall art, shelves, windows
├── Doors: portals, information overlays
└── Detection: ARPlaneAnchor alignment == vertical

Non-planar surfaces:
├── Corners: plants, lamps
├── Curved surfaces: advanced ARCore Depth API
└── Detection: mesh vertices + normal analysis
```

### Placement UX Flow

```
Standard placement flow:

Step 1: Scan
├── User moves device to scan environment
├── Show scanning indicator (corners rotating)
├── Display detected planes (wireframe overlay)
├── Highlight best plane (pulse animation)
└── Duration: until plane detected (typically 1-3s)

Step 2: Preview
├── Ghost object appears on detected plane
├── Semi-transparent (alpha 0.4-0.6)
├── Follows hit-test point in real-time
├── Green tint on valid surface, red on invalid
└── Rotation: follow camera facing or user-specified

Step 3: Confirm
├── User taps to place object
├── Animation: object drops in (scale 1.2→1.0, 200ms)
├── Haptic feedback (medium impact)
├── Shadow cast from object onto surface
└── Highlight flash on placement

Step 4: Adjust
├── Object remains selected for 2s after placement
├── Handles appear: rotate, scale, move
├── User can immediately manipulate
├── Double-tap to confirm position
└── Auto-deselect after 5s no interaction
```

### Advanced Placement Patterns

```
Snap placement:
├── Objects snap to grid (0.5m or 1m spacing)
├── Snap to other objects (edge alignment)
├── Visual grid overlay during placement
├── Preferred for: furniture arrangement
├── Snap distance threshold: 0.15m
└── Visual snap indicator (glow + snap animation)

Surface-aware placement:
├── Analyze hit-test surface normal
├── Tilt object to match surface angle
├── Slope limit: max 30° from horizontal
├── Steeper slopes → object slides off visually
├── Occlusion check: verify free space above object
└── Fail: object intersects existing geometry → show warning

Focus-based placement (gaze):
├── Show reticle at center of screen
├── Reticle changes: dot (no surface) → ring (surface detected)
├── Surface snap: reticle sticks to nearest plane
├── Confirm: tap or voice command
├── Reticle size: 20px dot, 40px ring
└── Color coding: gray = searching, blue = plane, green = valid placement

Multi-object placement:
├── Place first object → stays selected
├── Adjust position → confirm
├── Place second object → auto-snap relative to first
├── Group management: all placed objects share a parent anchor
└── Move group: drag any object in group moves all
```

### Placement Constraints

```
Physical constraints for realistic placement:

Gravity alignment:
├── All objects upright (Y-up) unless specificaly oriented
├── Objects with flat bottoms: align bottom to surface
├── Overhang: objects extending beyond surface edge are allowed
└── Prevents: floating objects without support

Collision detection:
├── Check against existing placed objects
├── Check against real environment (scene mesh)
├── Overlap allowed: show red collision warning
├── Hard limit: no overlap if physics mode enabled
└── Soft limit: allow overlap with warning for decoration mode

Scale constraints:
├── Minimum scale: 0.1x of original
├── Maximum scale: 5x of original
├── Grounded objects: scale from center bottom
├── Wall objects: scale from center
└── Scale relative to real-world reference (e.g., 1:1 for furniture)
```

## Feedback Systems

### Visual Feedback

```
Feedback hierarchy in AR/VR:

State indication:
├── Idle: normal object appearance
├── Hover/pointed: outline glow (2px, white or accent color)
├── Selected: bounding box + corner handles
├── Dragged: object slightly elevated (+0.05m), shadow below
├── Active: pulsing animation
└── Disabled: desaturated, reduced opacity

Animation feedback:
├── Placement: scale 0→1 (ease-out, 200ms)
├── Delete: scale 1→0 (ease-in, 150ms)
├── Selection: outline fade in (100ms)
├── Deselection: outline fade out (200ms)
├── Transform: immediate update with lerp smoothing
├── Error: shake (x-axis oscillation, 50ms period, 3 cycles)
└── Success: green flash + particle burst

Visual indicators:
├── Loading spinner: rotating circle (not ARKit indicator)
├── Searching: pulsing reticle with radar-like arc
├── Error: red X overlay on failed operation
├── Warning: yellow triangle with info
└── Ready: green checkmark or glow

Shadow feedback:
├── Ground shadow: always present when object placed
├── Shadow softness: proportional to light distance
├── Shadow during drag: offset below object
├── Shadow color: black with 30% alpha, Gaussian blur
└── Shadow shape: circle for simple, mesh-projected for detailed
```

### Haptic Feedback

```
Haptic patterns for AR/VR interactions:

System haptics (iOS UIFeedbackGenerator / Android HapticFeedback):

Selection changed:
├── iOS: UISelectionFeedbackGenerator().selectionChanged()
├── Android: View.performHapticFeedback(HapticFeedbackConstants.CLOCK_TICK)
├── Use: cycling through options, grid snap
└── Pattern: light tap (5ms)

Impact (light):
├── iOS: UIImpactFeedbackGenerator(style: .light).impactOccurred()
├── Android: performHapticFeedback(KEYBOARD_TAP)
├── Use: tap button, select object
└── Pattern: short burst (10ms)

Impact (medium):
├── iOS: UIImpactFeedbackGenerator(style: .medium).impactOccurred()
├── Android: performHapticFeedback(LONG_PRESS)
├── Use: place object, confirm action
└── Pattern: medium burst (20ms)

Impact (heavy):
├── iOS: UIImpactFeedbackGenerator(style: .heavy).impactOccurred()
├── Android: performHapticFeedback(CONFIRM)
├── Use: delete object, irreversible action
└── Pattern: strong burst (30ms)

Notification (success):
├── iOS: UINotificationFeedbackGenerator().notificationOccurred(.success)
├── Android: performHapticFeedback(GESTURE_END)
├── Use: task complete, placement confirmed
└── Pattern: sharp double tap

Notification (error):
├── iOS: UINotificationFeedbackGenerator().notificationOccurred(.error)
├── Android: performHapticFeedback(REJECTED)
├── Use: invalid operation, collision detected
└── Pattern: buzz (three pulses, 100ms)

VR controller haptics:
├── Light: trigger pull feedback (50Hz, 0.5 amplitude, 100ms)
├── Medium: object collision (100Hz, 0.7 amplitude, 150ms)
├── Heavy: heavy object, impact (150Hz, 1.0 amplitude, 200ms)
├── Continuous: hovering over object (80Hz, 0.3 amplitude)
└── Pulse: countdown, warning (3 pulses at 200ms interval)
```

### Audio Feedback

```
Audio cues for AR/VR:

Spatial audio positioning:
├── Audio source at object location in 3D space
├── Distance attenuation: inverse square law
├── HRTF (head-related transfer function) for directional audio
├── Reverb based on environment (room, outdoor, hall)
└── Obstruction: muffled when behind objects

Interaction sounds:
├── Tap/select: short click (100ms, 1kHz tone, 50ms fade)
├── Place: soft thump (200ms, 200Hz, with reverb tail)
├── Drag/transform: low continuous rumble (80Hz, 50ms gate)
├── Delete: whoosh down (300ms, 800→200Hz sweep)
├── Error: buzz (200ms, 200Hz square wave)
├── Success: chime (500ms, C5→E5→G5 arpeggio)
└── Snap: click (50ms, 2kHz tick)

Ambient audio:
├── Minimal: only use for essential feedback
├── No looping background music in AR (distracts from real world)
├── VR: optional ambient with volume control
└── Audio ducking: lower volume when AI or user speaks

Audio implementation:
├── Use 3D audio engine (FMOD, Unity Audio, iOS AVAudioEnvironmentNode)
├── Preload short audio clips (<500ms) into memory
├── One-shot instances: create and destroy, do not pool
├── Spatial blend: 3D for objects, 2D for UI
├── Volume scaling: relative to system volume
└── Test with headphones and speakers
```

## User Interface in AR/VR

### 2D UI in AR

```
Overlay UI (screen-space):
├── Always visible, does not occlude AR content
├── Use for: instructions, tooltips, status bar
├── Position: top/bottom of screen, edges
├── Transparency: 80% background blur (UIBlurEffectStyle)
└── Touch priority: UI intercepts touches before AR hit-test

World-space UI (billboarded):
├── UI element attached to 3D position
├── Always faces camera (billboard constraint)
├── Use for: object labels, contextual menus
├── Scale: maintain screen-space size regardless of distance
├── Occlusion: UI occluded by real objects → fade or move
└── Placement: offset from object (0.15m above or below)

Menu systems:
├── Radial menu: 4-8 options around thumb position
├── Bottom sheet: slides up from screen bottom
├── Floating panel: world-space panel at arm's length
├── Selection: tap to open 2D menu, then tap option
└── Dismiss: tap outside menu or back gesture
```

### 3D UI in VR

```
Spatial UI panels:
├── Placement: 1-2m from user, at eye level
├── Size: 0.5-1m width, 0.3-0.8m height
├── Curvature: slightly curved inward for readability
├── Text: minimum 12pt equivalent in world space
├── Color: dark background (RGBA 0.2, 0.2, 0.2, 0.9)
├── Interaction: laser pointer or hand ray
└── Distance: auto-adjust if user moves

Diegetic UI (in-world):
├── Integrated into the environment
├── Example: holographic screen on a virtual watch
├── Example: instructions written on a virtual whiteboard
├── Immersive but less flexible
└── No screen-space overlay needed

Non-diegetic UI (HUD):
├── Floating in user's fixed field of view
├── Use sparingly: health bar, ammo count, minimap
├── Position: peripheral (bottom 20% of view)
├── Fade out: after 3s of no change
├── Opacity: 40% default, 80% on attention
└── Avoid: text-heavy HUD elements in VR
```

## Common Interaction Patterns

### Object Manipulation

```
Transform gizmo:
├── Position: arrows at cardinal axes (X red, Y green, Z blue)
├── Rotation: arcs around axes (torus segments)
├── Scale: corner cubes (uniform) or edge cubes (non-uniform)
├── Handle size: 0.05m width, 0.15m length
├── Activation: tap arrow to begin drag
└── Precision: snap to grid (Ctrl/thumbstick held = fine mode, 0.1x increment)

Direct manipulation (mobile touch):
├── Move: touch object → drag to new position
├── Scale: touch + two-finger pinch → scale up/down
├── Rotate: touch object → two-finger rotate
├── Elevation: touch + vertical two-finger swipe → raise/lower
└── Reset transform: triple-tap → restore default position/rotation/scale

Physics-based manipulation:
├── Pick up: touch object → dynamic attachment (spring joint)
├── Carry: object follows with slight lag
├── Throw: flick gesture during release → apply velocity to object
├── Drop: release → physics fall to nearest surface
├── Stack: objects placed on top automatically settle
└── Collision: objects cannot occupy same space (rigid bodies)
```

### Navigation

```
AR navigation patterns:
├── Device motion: user physically moves device to explore
├── Teleport: tap on distant surface → camera moves to location
├── Peek: hold finger at screen edge → camera pans in that direction
├── Orbit: long press empty space + drag → camera rotates around focal point
├── Zoom: pinch on empty space → camera distance changes
└── Reset view: double-tap with three fingers → return to default position

VR locomotion:
├── Teleportation (best for comfort): point + trigger → instant move
│   ├── Arc trajectory: shows landing spot
│   ├── Preview: ghost at destination
│   └── Preferred for: most users, reduces motion sickness
├── Smooth locomotion (advanced): thumbstick push → continuous movement
│   ├── Speed: 1-4 m/s, configurable
│   ├── Vignette: tunnel vision during movement (reduces sickness)
│   └── Preferred for: experienced VR users
├── Arm-swing: swing arms while walking in place
│   ├── Swing detection: IMU data from controllers
│   ├── Step detection: accelerometer peaks
│   └── Preferred for: natural feeling, moderate sickness reduction
└── Snap turn: thumbstick left/right → instant 30-45° rotation
    ├── Comfort: reduces nausea from smooth rotation
    └── Preferred over smooth rotation for 80% of users

Rotation modes:
├── Snap rotation: 30-45° per increment
├── Smooth rotation: continuous, configurable speed (30-90°/s)
├── Physical rotation: user turns body (best for 6DOF)
└── Automatic follow: camera rotates to keep object centered (avoid)
```

### Selection Patterns

```
Ray-based selection (VR primary):
├── Origin: controller or head
├── Direction: along controller pointing direction
├── Length: 10m max, show laser beam
├── Hit test: nearest intersection with object bounding box
├── Visual: beam from origin to hit point
├── Hit point dot: 5px circle at intersection
├── Priority: nearest object along ray
└── Fallback: last valid distance (10m), fade beam

Gaze-based selection (AR glasses, hands-occupied):
├── Reticle: center of field of view
├── Dwell time: 1-2s for selection (configurable)
├── Progress indicator: ring fill around reticle
├── Confirmation: blink or voice "select"
├── Cancel: look away (reset dwell timer)
└── Accessible variant: reduce dwell to 500ms

Volume selection (multiple objects):
├── Lasso: finger-draw bounding box on screen
├── Area of effect: tap and hold to show radius circle
├── Expand: hold selected + tap to add to group
├── Multi-select: tap each object while holding modifier (two fingers)
├── Select all: long press empty space → "select all" button appears
└── Deselect: tap selected object or tap empty space
```

## Accessibility in AR/VR

### Design for Diverse Abilities

```
Visual impairments:
├── High contrast mode: bold outlines, increased text size
├── VoiceOver/TalkBack: announce object names and states
├── Audio cues: spatial audio for object locations
├── Reduce motion: disable animations, instant transitions
├── Large targets: minimum 60px touch targets (vs standard 44px)
└── Text scaling: support Dynamic Type up to 200%

Motor impairments:
├── Simplify gestures: single tap for all actions
├── Adjustable dwell time: 500ms to 3s
├── Reduced precision: expand hit targets 20%
├── Stabilization: smooth hand tremor in ray casting
├── Sticky modifiers: toggle mode for multi-finger gestures
└── Voice alternatives: speech-to-action for common commands

Hearing impairments:
├── Visual indicators: flash for audio cues
├── Captions: all audio feedback labeled with text
├── Haptic alternatives: pattern vibration instead of sound
└── Sign language support: optional sign detection

Cognitive accessibility:
├── Consistent interaction model across app
├── Clear affordances: objects look interactive if they are
├── Undo: last 10 actions accessible
├── Tutorial mode: step-by-step guides
├── Reduce options: 3-4 choices max per screen
└── Confirmation: always "are you sure?" before destructive actions
```

### Universal Design Principles for AR/VR

```
Principle 1: Predictable affordances
├── Interactive objects have consistent visual cues (glow, shadow)
├── Buttons look like buttons (raised, rounded, labeled)
├── Draggable objects show manipulation handles
└── Non-interactive objects have no highlight

Principle 2: Error prevention and recovery
├── Undo: shake device or button for last action undo
├── Confirm before destructive actions (delete, reset)
├── Preview changes before applying
├── Auto-save: every 30s or on significant action
└── Clear "exit" always available (X button in corner)

Principle 3: Consistency
├── Same gesture → same result everywhere in app
├── Same color coding: blue = interactive, red = delete, green = confirm
├── Same feedback pattern: every action has visual + haptic + optional audio
└── Same placement: common controls at predictable screen locations

Principle 4: Minimal cognitive load
├── Show only relevant actions per context
├── Hide advanced options behind secondary menu
├── Progressive disclosure: reveal complexity gradually
├── Default placement that works 80% of time
└── Tutorial: interactive first-use guide, not video
```

## State Management

### AR Session States

```
Session lifecycle states:

Unsupported
├── Device cannot run AR
├── Show friendly message with device requirements
├── Fallback: 2D viewer or web AR
└── "This feature requires an AR-capable device"

Not Authorized
├── Camera permission denied
├── Show settings redirect with explanation
├── Fallback: manual placement via position input
└── "AR needs camera access. Enable in Settings."

Ready
├── Session not started, waiting for trigger
├── Show "Point at a surface to start" prompt
├── Retain last known configuration
└── Preload models while waiting

Tracking (running)
├── Active AR session with tracking
├── Normal: high confidence tracking
├── Limited: low light, textureless surfaces
│   ├── Show "Move to better lit area" prompt
│   └── Reduce AR quality expectations
├── Relocalizing: tracking lost, recovering
│   ├── Show "Point camera at previous location"
│   └── Hold last known object positions
└── Interrupted: phone call, app backgrounded
    ├── Save ARWorldMap if supported
    └── Restore state on return

Paused
├── Session paused by user (menu open, settings)
├── Freeze AR content in current position
├── Continue tracking on resume
└── "Tap to resume AR" overlay

Ended
├── Session terminated
├── Clean up anchors and resources
├── Save to ARWorldMap (iOS) or snapshot (Android)
└── Return to previous screen
```

### Interaction State Machine

```
Per-object interaction states:

.idle
├── Object visible, no interaction
├── Ready for selection
└── Display: default material, grounded shadow

.hovered
├── Ray/gaze points at object
├── Transition: 100ms outline fade in
├── Display: outline glow, slight scale (1.02x)
└── Haptic: subtle continuous (80Hz, 0.3)

.selected
├── Object chosen for manipulation
├── Transition: 150ms bounding box + handles appear
├── Display: bounding box, transform gizmo
├── Other objects: dim (alpha 0.5), non-interactive
└── Haptic: medium impact on entry

.dragging
├── Object being moved in AR space
├── Transition: immediate, object follows input
├── Display: object slightly elevated (+0.05m), drop shadow
├── Collision check: real-time vs environment
├── Snap preview if near snap point
└── Haptic: continuous low (100Hz, 0.5)

.transforming
├── Object being scaled or rotated
├── Display: gizmo active axis highlighted
├── Constraint overlay: grid lines or angle guides
├── Live numeric readout (size, rotation angle)
└── Haptic: pulses per unit change (every 10° rotation, every 10% scale)

.confirmed
├── Object position finalized
├── Transition: 200ms settle animation
├── Display: brief highlight flash, then return to .idle
├── Shadow finalization
└── Haptic: medium impact + success chime

.error
├── Invalid operation attempted
├── Transition: 150ms shake animation
├── Display: red outline, warning icon
├── Duration: 2s auto-dismiss
├── Message: text tooltip explaining error
└── Haptic: error buzz pattern
```

## Testing Interaction Design

### Usability Testing

```
Test conditions:

1. Gutter test
├── User holds phone one-handed (right hand)
├── Thumb zone: reachable area
├── Dead zone: unreachable without regrip
├── Measure: are interactive elements in thumb zone?
└── Fix: move critical actions to bottom 40% of screen

2. One-handed test
├── Perform all interactions with one hand
├── No device regrip allowed
├── Can user place, select, transform, and delete?
└── If not: add alternative gesture or reposition UI

3. Walking test
├── User walks while using AR
├── Stability: does content stay in place?
├── Safety: does user need to watch screen or path?
├── Obstacle awareness: peripheral content visible?
└── Fix: pause tracking on rapid motion, safety warnings

4. Environmental test
├── Bright sunlight: screen visibility?
├── Dim interior: tracking quality?
├── Noisy background: audio cues audible?
├── Crowded space: surface detection working?
└── Fix: brightness adaptation, audio ducking

5. Cognitive load test
├── Can user perform primary task without instruction?
├── Time to complete: first attempt vs fifth attempt
├── Error rate per interaction
├── Confusion points: where do users hesitate?
└── Fix: simplify affected flow, add guidance
```

### Performance Metrics for Interaction

```
Quantitative interaction metrics:

Task success:
├── Placement success rate: target >95%
├── Selection accuracy: target >90% first attempt
├── Gesture recognition rate: target >98%
└── Task completion time: target <30s for common tasks

User effort:
├── Steps to complete task: target <5
├── Hand movement distance: track cumulative finger travel
├── Gaze shifts: number of times user looks away from task
└── Device regrips: target 0 for 80% of sessions

Satisfaction:
├── SUS (System Usability Scale): target >80
├── NPS (Net Promoter Score): target >50
├── User-reported fatigue: target <3/10
└── Willingness to use again: target >90%
```

## Platform-Specific Patterns

### iOS / ARKit Interaction

```
ARKit-specific interactions:

ARCoachingOverlayView:
├── Built-in coaching overlay for AR setup
├── Modes: basic (any surface), horizontal, vertical, geoTracking
├── Auto-activates on session interruption
└── Dismisses when tracking state is normal

ARQuickLook (USDZ preview):
├── System AR viewer for USDZ files
├── Standard: tap AR button on USDZ link
├── Custom: QLPreviewController with AR mode
├── Interaction: pinch (scale), drag (move), tap (info)
├── AllowedActions: .scaleToFit, .rotate
└── Limitations: limited customization, system UI only

RealityKit Entity gestures:
├── InstallGestures(.all, for: entity)
├── Gesture types: .rotation, .scale, .translation
├── Collision components required for gesture recognition
├── Custom gestures via EntityGestureRecognizer subclass
└── Collision shapes: generate convex hull from mesh vertices

ARKit hit-testing:
├── ARHitTestResult types: existingPlane, estimatedPlane, featurePoint
├── Preferred: existingPlaneUsingExtent (hits known plane bounds)
├── Fallback: estimatedHorizontalPlane (hits infinite plane)
├── Avoid: featurePoint (unstable)
└── raycastQuery (iOS 13+): more stable, screen-space to world
```

### Android / ARCore Interaction

```
ARCore-specific interactions:

HitResult types:
├── Plane: hit detected plane (preferred)
├── Point: hit feature point (less stable)
├── Depth: hit from Depth API (most accurate on supported devices)
└── InstantPlacement: place at estimated depth (no surface needed)

ARCore Gestures:
├── Tap gesture: `Session.onTap()` → `HitResult`
├── Drag gesture: `Session.update()` → compare HitResult per frame
├── Pinch: custom two-finger tracking → distance delta
├── Rotate: custom two-finger tracking → angle delta
└── Built-in: ARCore provides hit-test only, gestures are custom

SceneView (Sceneform replacement):
├── ViewRenderable: 2D Android views in 3D space
├── ModelRenderable: 3D models with material
├── Selection: Node.OnTapListener
├── TransformableNode: built-in move/rotate/scale
├── TranslationController: drag along plane
├── RotationController: one-finger rotate
└── ScaleController: two-finger pinch

ARCore Instant Placement:
├── Place object without plane detection
├── Depth estimate from device motion
├── Confirm placement, then refine with plane detection
├── Use for: quick placement, low-texture environments
└── Accuracy: ±0.3m initially, improves as session progresses
```

### Cross-Platform Patterns (ARFoundation / SceneView)

```
ARFoundation (Unity):
├── ARGestureIntercept: screen touch → AR raycast
├── ARPlacementInteractable: mount point for placed objects
├── ARSelectionInteractable: tap to select object
├── ARTranslationInteractable: drag to move
├── ARRotationInteractable: rotate gesture
├── ARScaleInteractable: pinch to scale
├── ARAnnotation: world-space labels
└── MARS for advanced environment understanding

SceneView (React Native):
├── GestureHandler: onStart / onMove / onEnd for touch events
├── HitTest: sceneView.hitTest(screenPoint, types)
├── Node events: onPress, onDrag, onScale, onRotate
├── Camera: default AR camera with gesture delegation
├── Light: default ambient + directional
└── Animation: SceneView.animate for smooth transitions
```

## Conclusion

Effective AR/VR interaction design prioritizes comfort, predictability, and feedback. Key principles:

1. Use consistent gesture vocabulary across your app
2. Always provide multi-modal feedback (visual + haptic + audio)
3. Match interaction modality to context (touch for mobile AR, controllers for VR)
4. Design for the lowest common denominator (one-handed, walking, varied lighting)
5. Implement undo for all destructive actions
6. Test on real devices with real users in realistic conditions
7. Surface detection + ghost preview + confirm = standard placement flow
8. Favor snap rotation over smooth rotation in VR
9. Keep UI minimal — show options contextually, not persistently
10. Support accessibility features from day one, not as an afterthought

## References

- Apple Human Interface Guidelines for AR: `developer.apple.com/design/human-interface-guidelines/technologies/augmented-reality`
- Google ARCore Design Guidelines: `developers.google.com/ar/design`
- Meta Quest VR Design Guidelines: `developer.oculus.com/resources/design`
- Apple Vision Pro Design: `developer.apple.com/design/human-interface-guidelines/spatial-computers`
- Unity AR Interaction Toolkit: `docs.unity3d.com/Packages/com.unity.xr.interaction.toolkit`
- Material Design for AR: `m3.material.io/augmented-reality`
- Nielsen Norman Group: 3D and AR UX: `nngroup.com/articles/augmented-reality-usability`
