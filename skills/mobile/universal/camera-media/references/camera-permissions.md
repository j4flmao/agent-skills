# Camera Permissions — iOS & Android

## iOS Camera Permissions

### Info.plist Usage Description Keys

iOS requires explicit usage description strings in Info.plist for all privacy-sensitive capabilities. Three keys are relevant for camera/media:

| Key | Required For | String Example |
|-----|-------------|----------------|
| `NSCameraUsageDescription` | All camera capture | "App needs camera to scan QR codes and take photos" |
| `NSPhotoLibraryUsageDescription` | Saving photos/videos to gallery | "App saves photos to your library" |
| `NSPhotoLibraryAddUsageDescription` | Write-only gallery access (no read) | "App saves edited photos to your library" |
| `NSMicrophoneUsageDescription` | Video recording with audio | "App needs microphone for video recording" |

`NSPhotoLibraryAddUsageDescription` is preferred when the app only writes to the photo library without reading. This avoids the full photo library permission prompt.

### Runtime Permission Flow (iOS)

1. **Pre-permission check**: `AVCaptureDevice.authorizationStatus(for: .video)` returns `.notDetermined`, `.restricted`, `.denied`, or `.authorized`
2. **Request**: `AVCaptureDevice.requestAccess(for: .video)` triggers the system permission dialog
3. **Callback**: Completion handler receives `Bool` — true = granted, false = denied
4. **Post-denial**: If denied, show custom alert directing user to Settings > Privacy > Camera
5. **Settings deep link**: `UIApplication.openSettingsURLString` opens the app's settings page

```swift
import AVFoundation

enum CameraPermissionState {
    case undetermined, granted, denied, restricted
}

func checkCameraPermission() -> CameraPermissionState {
    let status = AVCaptureDevice.authorizationStatus(for: .video)
    switch status {
    case .notDetermined: return .undetermined
    case .authorized: return .granted
    case .denied: return .denied
    case .restricted: return .restricted
    @unknown default: return .denied
    }
}

func requestCameraPermission() async -> Bool {
    return await AVCaptureDevice.requestAccess(for: .video)
}

func openSettings() {
    guard let url = URL(string: UIApplication.openSettingsURLString) else { return }
    if UIApplication.shared.canOpenURL(url) {
        UIApplication.shared.open(url)
    }
}
```

### Permission Rationale UI (iOS)

Never request camera permission without context. Show a rationale dialog first explaining why camera access is needed.

```swift
func presentCameraRationale(on viewController: UIViewController) {
    let alert = UIAlertController(
        title: "Camera Access Needed",
        message: "This app uses the camera to scan QR codes for product lookup. Photos are not stored without your explicit action.",
        preferredStyle: .alert
    )
    alert.addAction(UIAlertAction(title: "Cancel", style: .cancel))
    alert.addAction(UIAlertAction(title: "Continue", style: .default) { _ in
        Task { await requestCameraPermission() }
    })
    viewController.present(alert, animated: true)
}
```

## Android Camera Permissions

### Manifest Declarations

Android permission model changed significantly with API 33 (Android 13):

```xml
<!-- All Android versions -->
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.RECORD_AUDIO" />

<!-- Android 13+ (API 33) granular media permissions -->
<uses-permission android:name="android.permission.READ_MEDIA_IMAGES" />
<uses-permission android:name="android.permission.READ_MEDIA_VIDEO" />

<!-- Android 12 and below -->
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE"
    android:maxSdkVersion="32" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE"
    android:maxSdkVersion="29" />
```

The `android:maxSdkVersion` attribute is critical — it prevents the legacy permission from appearing on newer API levels where it's not needed (and would be ignored or cause confusion).

### Runtime Permission Flow (Android)

Android requires runtime permission requests with the Activity Result API (preferred) or the legacy `requestPermissions()` method.

```kotlin
import androidx.activity.result.contract.ActivityResultContracts
import androidx.fragment.app.Fragment

class CameraFragment : Fragment() {

    private val cameraLauncher = registerForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { isGranted: Boolean ->
        if (isGranted) {
            openCamera()
        } else {
            showPermissionDeniedUI()
        }
    }

    private fun requestCamera() {
        when {
            ContextCompat.checkSelfPermission(
                requireContext(), Manifest.permission.CAMERA
            ) == PackageManager.PERMISSION_GRANTED -> {
                openCamera()
            }
            shouldShowRequestPermissionRationale(Manifest.permission.CAMERA) -> {
                showCameraRationale {
                    cameraLauncher.launch(Manifest.permission.CAMERA)
                }
            }
            else -> {
                cameraLauncher.launch(Manifest.permission.CAMERA)
            }
        }
    }
}
```

### Multiple Permission Requests

For video recording, both CAMERA and RECORD_AUDIO must be requested:

```kotlin
private val videoLauncher = registerForActivityResult(
    ActivityResultContracts.RequestMultiplePermissions()
) { permissions: Map<String, Boolean> ->
    val cameraGranted = permissions[Manifest.permission.CAMERA] == true
    val audioGranted = permissions[Manifest.permission.RECORD_AUDIO] == true
    if (cameraGranted && audioGranted) {
        startVideoRecording()
    } else {
        showInsufficientPermissionsUI()
    }
}

private fun requestVideoPermissions() {
    videoLauncher.launch(
        arrayOf(Manifest.permission.CAMERA, Manifest.permission.RECORD_AUDIO)
    )
}
```

### Granular Media Permissions (Android 13+)

Android 13 introduced `READ_MEDIA_IMAGES` and `READ_MEDIA_VIDEO` to replace `READ_EXTERNAL_STORAGE`. These are granular permissions — request only what you need.

```kotlin
class MediaPickerFragment : Fragment() {

    private val readImagesLauncher = registerForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { isGranted ->
        if (isGranted) openGallery()
        else showGalleryFallback()
    }

    fun pickFromGallery() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            readImagesLauncher.launch(Manifest.permission.READ_MEDIA_IMAGES)
        } else {
            readImagesLauncher.launch(Manifest.permission.READ_EXTERNAL_STORAGE)
        }
    }
}
```

## Cross-Platform Permission Handling

### Capacitor

```typescript
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';

async function takePhoto() {
    const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: true,
        resultType: CameraResultType.Uri,
        source: CameraSource.Camera
    });
    return image.webPath;
}
```

Capacitor handles permission requests internally. Check permission state with:

```typescript
import { Camera } from '@capacitor/camera';

async function checkPermissions() {
    const permission = await Camera.checkPermissions();
    // permission.camera: 'prompt' | 'prompt-with-rationale' | 'granted' | 'denied'
    if (permission.camera === 'granted' || permission.camera === 'prompt') {
        return true;
    }
    const result = await Camera.requestPermissions();
    return result.camera === 'granted';
}
```

### Flutter (image_picker)

```dart
import 'package:image_picker/image_picker.dart';

final picker = ImagePicker();

Future<void> takePhoto() async {
    final permission = await ImagePicker().platformSupports(
        ImageSourceOption.camera
    );
    if (!permission) return;

    final XFile? photo = await picker.pickImage(
        source: ImageSource.camera,
        maxWidth: 1920,
        maxHeight: 1920,
        imageQuality: 85,
    );
}
```

### React Native (react-native-vision-camera)

```typescript
import { Camera, useCameraPermission } from 'react-native-vision-camera';

function CameraView() {
    const { hasPermission, requestPermission } = useCameraPermission();

    useEffect(() => {
        if (!hasPermission) {
            requestPermission();
        }
    }, []);

    if (!hasPermission) {
        return <PermissionRationale onRequestPermission={requestPermission} />;
    }

    return <Camera style={StyleSheet.absoluteFill} device={backCamera} />;
}
```

## Privacy Manifest (iOS)

Starting with Xcode 15 and iOS 17, Apple requires a privacy manifest (`PrivacyInfo.xcprivacy`) for apps that use certain APIs. Camera-related entries:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
  "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>NSPrivacyAccessedAPITypes</key>
    <array>
        <dict>
            <key>NSPrivacyAccessedAPIType</key>
            <string>NSPrivacyAccessedAPICategoryCamera</string>
            <key>NSPrivacyAccessedAPITypeReasons</key>
            <array>
                <string>CA92.1</string>
            </array>
        </dict>
        <dict>
            <key>NSPrivacyAccessedAPIType</key>
            <string>NSPrivacyAccessedAPICategoryPhotoLibrary</string>
            <key>NSPrivacyAccessedAPITypeReasons</key>
            <array>
                <string>0C7C.1</string>
            </array>
        </dict>
    </array>
</dict>
</plist>
```

## Permission State Management

Maintain a centralized permission state to avoid redundant requests:

```typescript
interface PermissionState {
    camera: 'unknown' | 'granted' | 'denied' | 'restricted';
    microphone: 'unknown' | 'granted' | 'denied' | 'restricted';
    photoLibrary: 'unknown' | 'granted' | 'denied' | 'restricted' | 'limited';
}

class PermissionManager {
    private state: PermissionState = {
        camera: 'unknown',
        microphone: 'unknown',
        photoLibrary: 'unknown',
    };

    private listeners: Set<(state: PermissionState) => void> = new Set();

    subscribe(listener: (state: PermissionState) => void): () => void {
        this.listeners.add(listener);
        listener(this.state);
        return () => this.listeners.delete(listener);
    }

    async refreshCameraStatus(): Promise<void> {
        const status = await checkCameraPermission();
        this.state.camera = status;
        this.notify();
    }

    private notify(): void {
        this.listeners.forEach(fn => fn(this.state));
    }
}
```

## Camera Access Lifecycle

Camera access has specific lifecycle constraints:

1. **Foreground only**: iOS camera access is foreground-only. Background camera access is not permitted.
2. **Session interruption**: Phone calls, alarms, and other high-priority events interrupt camera sessions.
3. **Multitasking**: iOS can preserve camera session during app suspension but will release it under memory pressure.
4. **Android lifecycle**: CameraX is lifecycle-aware and automatically starts/stops with the activity lifecycle.
5. **Simulator limitations**: iOS simulator supports camera via Continuity Camera (macOS 13+). Android emulator uses virtual camera.

```swift
// iOS session interruption handling
NotificationCenter.default.addObserver(
    self,
    selector: #selector(sessionWasInterrupted),
    name: .AVCaptureSessionWasInterrupted,
    object: session
)

NotificationCenter.default.addObserver(
    self,
    selector: #selector(sessionInterruptionEnded),
    name: .AVCaptureSessionInterruptionEnded,
    object: session
)

@objc func sessionWasInterrupted(_ notification: Notification) {
    guard let reason = notification.userInfo?[AVCaptureSessionInterruptionReasonKey]
            as? AVCaptureSession.InterruptionReason else { return }

    switch reason {
    case .videoDeviceNotAvailableWithMultipleForegroundApps:
        showCameraUnavailableBanner("Camera unavailable — another app is using it")
    case .audioDeviceInUseByAnotherClient:
        showCameraUnavailableBanner("Microphone in use by another app")
    default:
        break
    }
}
```

## Best Practices Summary

- Always check permission state before attempting camera access
- Request permissions in context — never on app launch
- Show rationale dialog before the system permission dialog
- Handle denial gracefully with settings redirect
- Test permission flows: first-time, grant, deny, re-grant from settings
- Handle permission revocation while app is in background
- Use minimum required permissions — don't request camera if only photo picker is needed
- iOS 17+ privacy manifest required for camera and photo library API usage
- Android 13+ granular media permissions replace READ_EXTERNAL_STORAGE
- Never cache permission state across app launches — re-check each time
