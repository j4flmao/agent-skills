# Biometric Security — Liveness, Spoofing, and Template Protection

## Liveness Detection

### iOS — Attention-Awareness
```swift
import LocalAuthentication

class LivenessManager {
    func authenticateWithLiveness(reason: String) async throws -> Bool {
        let context = LAContext()

        // On Face ID devices, attention awareness is enabled by default
        // The user must look at the device with eyes open
        // Disabling reduces security:
        // context.localizedAuthenticationFallbackTitle = "Enter Passcode"

        // Check if attention is required
        guard context.isProtectedByBiometrics() else { return false }

        let canEvaluate = context.canEvaluatePolicy(
            .deviceOwnerAuthenticationWithBiometrics, error: nil
        )

        return try await withCheckedThrowingContinuation { continuation in
            context.evaluatePolicy(
                .deviceOwnerAuthenticationWithBiometrics,
                localizedReason: reason
            ) { success, error in
                if success {
                    // Liveness confirmed — user was looking at device
                    continuation.resume(returning: true)
                } else {
                    continuation.resume(throwing: error ?? BiometricError.unknown)
                }
            }
        }
    }
}
```

### Android — Biometric Strength Classes
```kotlin
class LivenessChecker(private val context: Context) {

    fun isStrongBiometricAvailable(): Boolean {
        val biometricManager = BiometricManager.from(context)
        return biometricManager.canAuthenticate(BIOMETRIC_STRONG) ==
            BiometricManager.BIOMETRIC_SUCCESS
    }

    // Android does not have built-in liveness API
    // Third-party SDKs for anti-spoofing:
    // - Google Play Services' Face API with liveness
    // - AWS Rekognition Liveness
    // - ID.me Liveness
    // - iProov
    // - Jumio Liveness

    // For Class 2/1 biometrics, consider adding:
    // - Eye blink detection
    // - Head movement challenge (turn left, smile)
    // - Random challenge-response
    private val livenessThreshold = 0.95f

    fun evaluateLivenessScore(confidence: Float): Boolean {
        // Confidence from on-device ML model
        return confidence >= livenessThreshold
    }
}
```

## Presentation Attack Detection (Spoofing)

### Attack Types and Mitigations
| Attack Vector | Description | Mitigation |
|---|---|---|
| Print attack | Photo/printed face presented to camera | Liveness detection (eye blink, depth) |
| Replay attack | Video replay on screen | Motion challenge, texture analysis |
| 3D mask | Silicone or 3D-printed mask | Depth sensing (Face ID, LiDAR) |
| Latex finger | Molded fingerprint | Subsurface scattering detection |
| Gelatin finger | Gelatin/playdoh print | Capacitive vs optical sensor detection |
| Master prints | Partial prints that match many | Minutiae count thresholds |
| Deepfake/video | AI-generated face video | Random challenge-response |

### Biometric Spoof Resistance
```
Sensor Quality     Spoof Resistance
─────────────────────────────────────────────
IR depth camera     High (Face ID, LiDAR)
Ultrasonic          High (Qualcomm 3D Sonic)
Capacitive          Medium (Touch ID)
Optical             Low (cheap Android sensors)
Camera (2D)         Low (basic face unlock)
```

## Matching Thresholds

### Face Matching
```swift
// iOS — Face ID matching is OS-controlled
// No configurable threshold
// False match rate: 1 in 1,000,000 (with attention)
// False match rate: 1 in 50,000 (Touch ID)

// Custom face matching with CoreImage + Vision
import Vision

func compareFaces(_ image1: CGImage, _ image2: CGImage) throws -> Float {
    let request1 = VNDetectFaceCaptureQualityRequest()
    let request2 = VNDetectFaceCaptureQualityRequest()

    let handler1 = VNImageRequestHandler(cgImage: image1, options: [:])
    let handler2 = VNImageRequestHandler(cgImage: image2, options: [:])

    try handler1.perform([request1])
    try handler2.perform([request2])

    guard let face1 = request1.results?.first,
          let face2 = request2.results?.first else {
        throw FaceMatchError.noFaceDetected
    }

    // Face quality score
    let quality1 = face1.faceCaptureQuality
    let quality2 = face2.faceCaptureQuality

    // Custom matching with facial landmarks
    // (Not production-ready — use dedicated SDK)
    return (quality1 + quality2) / 2.0
}
```

### Fingerprint Matching
```kotlin
// Android — fingerprint matching handled by OS
// Internal to TEE (Trusted Execution Environment)
// No direct API access to fingerprint templates
// FAR (False Accept Rate): as configured by device OEM
// FRR (False Reject Rate): device-specific, typically <5%

// BiometricPrompt with CryptoObject limits to Class 3
```

## Template Storage

### iOS — Secure Enclave
```swift
import Security

class SecureEnclaveManager {
    // Biometric templates stored in Secure Enclave
    // protected by BiometricAuthentication

    func createBioProtectedKey() throws -> SecKey {
        let access = SecAccessControlCreateWithFlags(
            nil,
            kSecAttrAccessibleWhenPasscodeSetThisDeviceOnly,
            .biometryCurrentSet,  // Invalidated on biometric enrollment change
            nil
        )

        let attributes: [String: Any] = [
            kSecAttrKeyType as String: kSecAttrKeyTypeECSECPrimeRandom,
            kSecAttrKeySizeInBits as String: 256,
            kSecAttrTokenID as String: kSecAttrTokenIDSecureEnclave,
            kSecPrivateKeyAttrs as String: [
                kSecAttrIsPermanent as String: true,
                kSecAttrAccessControl as String: access!,
            ] as [String: Any],
        ]

        var error: Unmanaged<CFError>?
        guard let privateKey = SecKeyCreateRandomKey(attributes as CFDictionary, &error) else {
            throw KeychainError.keyCreationFailed(error?.takeRetainedValue() as Error?)
        }
        return privateKey
    }

    // To invalidate on new biometric enrollment:
    // - Use .biometryCurrentSet flag (not .biometryAny)
    // - Current set = templates enrolled at time of key creation
    // - Any = any current or future enrolled biometric
}
```

### Android — TEE & Key Store
```kotlin
import java.security.KeyStore
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.BiometricPromptify

class AndroidKeystoreBiometricManager {
    private val keyStore = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }
    private val keyGen = KeyGenerator.getInstance("AES", "AndroidKeyStore")

    fun createBiometricProtectedKey(keyName: String) {
        val spec = KeyGenParameterSpec.Builder(
            keyName,
            KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT
        )
            .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
            .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
            .setUserAuthenticationRequired(true)          // Biometric required
            .setUserAuthenticationValidityDurationSeconds(0) // 0 = every use
            .setInvalidatedByBiometricEnrollment(true)    // Invalidate on new biometric
            .build()
        keyGen.init(spec)
        keyGen.generateKey()
    }

    fun getCryptoObjectForDecryption(keyName: String): BiometricPrompt.CryptoObject {
        val secretKey = keyStore.getKey(keyName, null) as SecretKey
        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        cipher.init(Cipher.DECRYPT_MODE, secretKey)
        return BiometricPrompt.CryptoObject(cipher)
    }
}
```

### Template Storage Security Levels
```
Storage        Platform    Attacker Access    Recovery
────────────── ──────────  ───────────────── ─────────────────
Secure Enclave iOS         Hardware-isolated Destroy on wipe
TEE (TrustZone) Android    Hardware-isolated Destroy on wipe
KeyStore (SW)  Android     Root access possible Destroy or roll
SharedPrefs    Both        Trivial (plaintext) Never do this
```

## Privacy Considerations

| Requirement | iOS | Android |
|---|---|---|
| Biometric data leaves device | Never | Never (OS-managed) |
| Template storage | Secure Enclave | TEE/TrustZone |
| Server-side matching | Not allowed | Not allowed |
| User consent | Required | Required |
| Data collection disclosure | Info.plist | Privacy policy |
| GDPR compliance | Explicit opt-in | Explicit opt-in |

## Security Best Practices

- Always pair biometric auth with server-side session management
- Implement rate limiting: 5 biometric failures → force device credential
- Monitor for `ERROR_LOCKOUT` (Android) and `biometryLockout` (iOS)
- Key invalidation on enrollment change protects against enrolled-after-theft
- Use `setInvalidatedByBiometricEnrollment(true)` / `.biometryCurrentSet`
- For high-security apps: require both biometric + device credential
- Never use biometric as sole auth for financial transactions
- Log auth events (without PII) for security audits
