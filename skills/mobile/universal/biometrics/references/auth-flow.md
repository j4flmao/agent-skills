# Biometric Authentication Flow

## Complete Authentication Flow

```
User triggers protected action
         │
         ▼
┌─────────────────────────────┐
│ Check biometric availability│
│ ─ BiometricManager (Android)│
│ ─ LAContext (iOS)           │
└──────────┬──────────────────┘
           │
     ┌─────┴─────┐
     │           │
  Available   Unavailable
     │           │
     ▼           ▼
┌──────────┐ ┌──────────────────┐
│ Show     │ │ Device credential│
│ biometric│ │ (PIN/Password)   │
│ prompt   │ │ available?       │
└────┬─────┘ └──┬───────┬───────┘
     │          │       │
     ▼       Yes       No
┌──────────┐  │        │
│ User     │  ▼        ▼
│ authentic│ ┌────────┐ ┌──────────────┐
└──┬───┬───┘ │Device  │ │App password │
   │   │     │cred.   │ │fallback     │
   ▼   │     │prompt  │ │(optional)   │
Success  │   └───┬────┘ └──────┬───────┘
   │     │       │             │
   ▼     ▼       ▼             ▼
┌──────────┐ ┌────────┐ ┌──────────────┐
│ Grant    │ │Retry   │ │Show error    │
│ access   │ │(max 5) │ │+ settings    │
└──────────┘ └───┬────┘ │redirect      │
                 │      └──────────────┘
                 5 failures
                 │
                 ▼
          ┌──────────────┐
          │ Lockout      │
          │ Force device │
          │ credential   │
          └──────────────┘
```

## Secure Storage with Biometric Protection

### Android — EncryptedSharedPreferences

```kotlin
val masterKey = MasterKey.Builder(context)
    .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
    .setUserAuthenticationRequired(true)         // biometric required
    .setUserAuthenticationValidityDurationSeconds(30) // cache after auth
    .setKeyNamespace("secure_prefs")
    .build()

val sharedPreferences = EncryptedSharedPreferences.create(
    context,
    "secure_prefs",
    masterKey,
    EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
    EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
)

// Write (no biometric required for write)
fun saveToken(token: String) {
    sharedPreferences.edit().putString("auth_token", token).apply()
}

// Read (requires biometric — must be called after successful auth)
fun getToken(): String? {
    return sharedPreferences.getString("auth_token", null)
}
```

### Android — Keystore CryptoObject

```kotlin
import java.security.KeyStore
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey

class BiometricCryptoManager(private val context: Context) {
    private val keyStore = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }

    fun createBiometricKey(keyName: String): SecretKey {
        val keyGenerator = KeyGenerator.getInstance(
            KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore"
        )
        keyGenerator.init(
            KeyGenParameterSpec.Builder(keyName,
                KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT
            )
                .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                .setUserAuthenticationRequired(true)
                .setInvalidatedByBiometricEnrollment(true)
                .build()
        )
        return keyGenerator.generateKey()
    }

    fun getCryptoObject(keyName: String): BiometricPrompt.CryptoObject? {
        val secretKey = keyStore.getEntry(keyName, null) as? KeyStore.SecretKeyEntry
        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        cipher.init(Cipher.ENCRYPT_MODE, secretKey?.secretKey)
        return BiometricPrompt.CryptoObject(cipher)
    }

    fun encrypt(keyName: String, data: String): ByteArray {
        val secretKey = keyStore.getEntry(keyName, null) as? KeyStore.SecretKeyEntry
        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        cipher.init(Cipher.ENCRYPT_MODE, secretKey?.secretKey)
        return cipher.doFinal(data.toByteArray())
    }

    fun decrypt(keyName: String, encryptedData: ByteArray): String {
        val secretKey = keyStore.getEntry(keyName, null) as? KeyStore.SecretKeyEntry
        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        cipher.init(Cipher.DECRYPT_MODE, secretKey?.secretKey)
        return String(cipher.doFinal(encryptedData))
    }
}
```

### iOS — Keychain with Biometric Protection

```swift
import Security
import LocalAuthentication

class BiometricKeychain {
    let service = "com.example.app"
    let account = "auth_token"

    func saveWithBiometrics(token: String) throws {
        guard let data = token.data(using: .utf8) else { throw KeychainError.invalidData }

        // Delete existing
        SecItemDelete([
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account,
        ] as CFDictionary)

        // Create access control with biometry
        guard let accessControl = SecAccessControlCreateWithFlags(
            nil,
            kSecAttrAccessibleWhenPasscodeSetThisDeviceOnly,
            .biometryCurrentSet,  // invalidated on new biometric enrollment
            nil
        ) else { throw KeychainError.accessControlFailed }

        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account,
            kSecValueData as String: data,
            kSecAttrAccessControl as String: accessControl,
            kSecUseAuthenticationContext as String: LAContext(),
        ]

        let status = SecItemAdd(query as CFDictionary, nil)
        guard status == errSecSuccess else { throw KeychainError.saveFailed(status) }
    }

    func readWithBiometrics() throws -> String? {
        let context = LAContext()
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account,
            kSecReturnData as String: true,
            kSecUseAuthenticationContext as String: context,
            kSecUseOperationPrompt as String: "Authenticate to access token",
        ]

        var result: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &result)
        guard status == errSecSuccess, let data = result as? Data else {
            if status == errSecUserCanceled { return nil }
            throw KeychainError.readFailed(status)
        }
        return String(data: data, encoding: .utf8)
    }

    enum KeychainError: Error {
        case invalidData
        case accessControlFailed
        case saveFailed(OSStatus)
        case readFailed(OSStatus)
    }
}
```

## Key Invalidation Behavior

| Event | Android (Keystore) | iOS (Keychain) |
|-------|-------------------|----------------|
| New biometric enrolled | Invalidated (if `setInvalidatedByBiometricEnrollment(true)`) | Invalidated (if `.biometryCurrentSet`) |
| All biometrics removed | Invalidated | Invalidated |
| Device passcode changed | Key survives (if enrolled) | Key survives |
| Device passcode removed | Key destroyed | Key destroyed |
| App reinstall | Key destroyed | Key survives (Keychain) |
| OS update | Key survives | Key survives |

## Migration on Invalidation

```kotlin
// When CryptoObject decryption fails → key was invalidated
fun migrateKeyOnInvalidation(context: Context, oldKeyName: String, newKeyName: String) {
    // 1. Authenticate with device credential (fallback)
    val promptInfo = BiometricPrompt.PromptInfo.Builder()
        .setTitle("Re-encrypt data")
        .setAllowedAuthenticators(BiometricManager.Authenticators.DEVICE_CREDENTIAL)
        .build()
    // 2. Decrypt with old app-level key (non-biometric fallback)
    // 3. Generate new biometric-protected key
    // 4. Re-encrypt with new key
    // 5. Delete old key from Keystore
}
```

No preamble. No postamble. No explanations.
