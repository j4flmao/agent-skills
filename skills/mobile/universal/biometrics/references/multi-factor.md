# Mobile Multi-Factor Authentication

## FIDO2 / WebAuthn

### WebAuthn Registration (Mobile Client)
```swift
import AuthenticationServices

class WebAuthnManager: NSObject, ASAuthorizationControllerDelegate,
                          ASAuthorizationControllerPresentationContextProviding {

    func registerPasskey(domain: String, challenge: Data, userId: Data, userName: String) {
        let provider = ASAuthorizationPlatformPublicKeyCredentialProvider(
            relyingPartyIdentifier: domain
        )
        let request = provider.createCredentialRegistrationRequest(
            challenge: challenge,
            name: userName,
            userID: userId
        )

        let controller = ASAuthorizationController(authorizationRequests: [request])
        controller.delegate = self
        controller.presentationContextProvider = self
        controller.performRequests()
    }

    func authorizationController(
        _ controller: ASAuthorizationController,
        didCompleteWithAuthorization authorization: ASAuthorization
    ) {
        if let credential = authorization.credential as? ASAuthorizationPlatformPublicKeyCredentialRegistration {
            // credential.rawID: credential ID
            // credential.rawClientDataJSON: client data
            // credential.rawAttestationObject: attestation
            sendToServer(credential)
        }
    }

    func authorizationController(
        _ controller: ASAuthorizationController,
        didCompleteWithError error: Error
    ) {
        handleError(error)
    }
}
```

### WebAuthn Authentication (Mobile Client)
```kotlin
import androidx.credentials.CredentialManager
import androidx.credentials.PublicKeyCredential
import androidx.credentials.GetCredentialRequest
import androidx.credentials.provider.PublicKeyCredentialOption

class WebAuthnAuth(private val context: Context) {
    private val credentialManager = CredentialManager.create(context)

    suspend fun authenticateWithPasskey(
        domain: String,
        challenge: ByteArray,
        allowCredentials: List<ByteArray>
    ): PublicKeyCredential {
        val getRequest = GetCredentialRequest(
            listOf(
                PublicKeyCredentialOption(
                    requestJson = buildAuthRequestJson(
                        domain, challenge, allowCredentials
                    )
                )
            )
        )

        val result = credentialManager.getCredential(context, getRequest)
        return result.credential as PublicKeyCredential
    }
}
```

## Passkeys

### Passkey Provider (iOS)
```swift
// Passkeys are auto-synced via iCloud Keychain
// Cross-platform: QR code or proximity (AirDrop)

class PasskeyAuthorizationController {
    func authorizePasskey(domain: String, challenge: Data) async throws -> Bool {
        let provider = ASAuthorizationPlatformPublicKeyCredentialProvider(
            relyingPartyIdentifier: domain
        )
        let request = provider.createCredentialAssertionRequest(
            challenge: challenge
        )

        return try await withCheckedThrowingContinuation { continuation in
            let controller = ASAuthorizationController(authorizationRequests: [request])
            controller.delegate = PasskeyDelegate(continuation: continuation)
            controller.performRequests()
        }
    }
}
```

### Passkey Provider (Android)
```kotlin
// Passkeys on Android are managed by Google Password Manager
// Synced across devices with Google account
// Backup codes available in account recovery

class PasskeyProvider(private val context: Context) {
    private val credentialManager = CredentialManager.create(context)

    // Check passkey availability
    suspend fun isPasskeyAvailable(): Boolean {
        return credentialManager.isCredentialSupported(
            CreateCredentialRequest(
                CreatePublicKeyCredentialRequest(
                    requestJson = testRequestJson()
                )
            )
        )
    }

    // Create passkey
    suspend fun createPasskey(requestJson: String): CreateCredentialResponse {
        val request = CreateCredentialRequest(
            CreatePublicKeyCredentialRequest(requestJson = requestJson)
        )
        return credentialManager.createCredential(context, request)
    }
}
```

## TOTP (Time-Based One-Time Password)

### TOTP Generation
```kotlin
import javax.crypto.Mac
import javax.crypto.spec.SecretKeySpec

class TotpGenerator {
    companion object {
        private const val TIME_STEP = 30L
        private const val DIGITS = 6

        fun generateTOTP(secret: ByteArray, time: Long = System.currentTimeMillis() / 1000): String {
            val counter = time / TIME_STEP
            val counterBytes = ByteArray(8).apply {
                var c = counter
                for (i in 7 downTo 0) {
                    this[i] = (c and 0xFF).toByte()
                    c = c shr 8
                }
            }

            val mac = Mac.getInstance("HmacSHA1")
            val keySpec = SecretKeySpec(secret, "HmacSHA1")
            mac.init(keySpec)
            val hash = mac.doFinal(counterBytes)

            val offset = hash[hash.size - 1].toInt() and 0xF
            val binary = ((hash[offset].toInt() and 0x7F) shl 24) or
                ((hash[offset + 1].toInt() and 0xFF) shl 16) or
                ((hash[offset + 2].toInt() and 0xFF) shl 8) or
                (hash[offset + 3].toInt() and 0xFF)

            val otp = binary % Math.pow(10.0, DIGITS.toDouble()).toInt()
            return String.format("%0${DIGITS}d", otp)
        }

        fun generateSecret(): String {
            val random = SecureRandom()
            val bytes = ByteArray(20)
            random.nextBytes(bytes)
            return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes)
        }
    }
}
```

### TOTP URI Format
```
otpauth://totp/Example:user@example.com
  ?secret=JBSWY3DPEHPK3PXP
  &issuer=Example
  &algorithm=SHA1
  &digits=6
  &period=30

// QR code content for authenticator app
// Use ZXing (Android) / CoreImage CIFilter (iOS) to display QR
```

## Push MFA (Multi-Factor Authentication)

### Push Notification MFA Flow
```swift
class PushMFAProvider {
    // 1. Server sends push notification with challenge
    // 2. App processes notification in background
    // 3. User approves/rejects via notification action
    // 4. Response sent to server

    func handleMFANotification(_ userInfo: [AnyHashable: Any]) {
        guard let challengeId = userInfo["challenge_id"] as? String,
              let action = userInfo["action"] as? String else { return }

        // Show local notification with approve/deny
        let content = UNMutableNotificationContent()
        content.title = "Approve Login?"
        content.body = "A login attempt was made from \(userInfo["location"] ?? "unknown location")"
        content.userInfo = ["challenge_id": challengeId]
        content.categoryIdentifier = "MFA_APPROVAL"

        let request = UNNotificationRequest(
            identifier: UUID().uuidString,
            content: content,
            trigger: nil
        )
        UNUserNotificationCenter.current().add(request)
    }

    // Notification actions
    func approveChallenge(_ challengeId: String) async throws {
        let response = try await api.approveMFA(challengeId: challengeId)
        // Notify server of approval
    }
}
```

## SMS Fallback

```swift
class SMSAuthProvider {
    // SMS-based OTP delivery (less secure, use only as fallback)
    // NIST SP 800-63B deprecates SMS OTP — use for legacy only

    func requestSMSCode(phoneNumber: String) async throws {
        let code = try await api.requestSMSCode(phone: phoneNumber)

        // Use SMS User Verification (iOS) / SMS Retriever API (Android)
        // for auto-fill

        // iOS 12+ — AutoFill with SMS code
        // Enable in Info.plist: supportsSMSUserVerification
    }

    // iOS — SMS code auto-fill
    // Implement UITextField's textField(_:shouldChangeCharactersIn:replacementString:)
    // Or use ASAuthorizationController for domain-bound codes
}
```

```kotlin
// Android — SMS Retriever API
val smsRetriever = SmsRetriever.getClient(context)

// Start SMS retrieval
smsRetriever.startSmsRetriever()
    .addOnSuccessListener {
        // SMS retriever started
    }

// In BroadcastReceiver
class SmsReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (SmsRetriever.SMS_RETRIEVED_ACTION == intent.action) {
            val extras = intent.extras
            if (extras.getInt(SmsRetriever.EXTRA_STATUS) == SmsRetriever.STATUS_SUCCESS) {
                val message = extras.getString(SmsRetriever.EXTRA_SMS_MESSAGE)
                // Extract OTP code from message
                val otp = extractOTP(message)
                autoFillOtpField(otp)
            }
        }
    }
}
```

## Recovery Codes

```swift
struct RecoveryCodeManager {
    // Generate recovery codes during MFA setup
    // Each code is single-use
    // Store encrypted on device AND print/user record

    func generateRecoveryCodes(count: Int = 10) -> [String] {
        var codes: [String] = []
        for _ in 0..<count {
            let bytes = (0..<6).map { _ in
                UInt8.random(in: 0...9)
            }
            let code = bytes
                .chunked(into: 3)
                .map { $0.map(String.init).joined() }
                .joined(separator: "-")
            codes.append(code)
        }
        return codes
    }

    func storeRecoveryCodeHashes(_ codes: [String]) {
        // Store bcrypt/SHA-256 hashes for later verification
        // NEVER store plaintext codes on server
        let hashes = codes.map { code in
            SHA256.hash(data: Data(code.utf8))
        }
        KeychainHelper.save(hashes, forKey: "recovery_codes")
    }
}
```

## MFA Method Comparison

| Method | Security | UX | Offline | Cost |
|---|---|---|---|---|
| FIDO2/Passkey | High | Excellent (no typing) | Yes | Free |
| Push MFA | High | Good (one tap) | No | Server infra |
| TOTP app | Medium-High | Moderate (type code) | Yes | Free |
| SMS | Low | Moderate (auto-fill) | No | Per-message |
| Recovery codes | High | Poor (manual entry) | Yes | Free |

## Best Practices

- Offer at least 2 MFA methods per user
- Passkeys are the recommended default on modern devices
- TOTP as standard fallback (works without internet)
- SMS as last resort only (NIST deprecation)
- Always provide recovery codes during enrollment
- Rate limit OTP/MFA attempts: 5 attempts → 30s cooldown → 5min lockout
- Session binding: MFA approval tied to specific session token
- Biometric bind MFA approval to local biometric on the device
