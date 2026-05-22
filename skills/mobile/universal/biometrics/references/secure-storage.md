# Secure Storage with Biometrics

## Android — EncryptedSharedPreferences

```kotlin
val masterKey = MasterKey.Builder(context)
  .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
  .setUserAuthenticationRequired(true) // biometric required to access key
  .setUserAuthenticationValidityDurationSeconds(30) // cache for 30s after auth
  .build()

val sharedPreferences = EncryptedSharedPreferences.create(
  context,
  "secure_prefs",
  masterKey,
  EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
  EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
)

// Write
sharedPreferences.edit().putString("api_token", token).apply()

// Read (inside biometric callback)
val token = sharedPreferences.getString("api_token", null)
```

## Android — Keystore with CryptoObject

```kotlin
val keyGenParameterSpec = KeyGenParameterSpec.Builder(
  "biometric_key",
  KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT
)
  .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
  .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
  .setUserAuthenticationRequired(true)
  .setInvalidatedByBiometricEnrollment(true) // invalidate on new fingerprint
  .build()

val keyGenerator = KeyGenerator.getInstance(
  KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore"
)
keyGenerator.init(keyGenParameterSpec)
keyGenerator.generateKey()
```

## iOS — Keychain with Biometric Protection

```swift
let access = SecAccessControlCreateWithFlags(
  nil,
  kSecAttrAccessibleWhenPasscodeSetThisDeviceOnly,
  .biometryCurrentSet, // invalidated on new biometric enrollment
  nil
)

let query: [String: Any] = [
  kSecClass as String: kSecClassGenericPassword,
  kSecAttrService as String: "com.app.auth",
  kSecAttrAccount as String: "api_token",
  kSecValueData as String: tokenData,
  kSecAttrAccessControl as String: access as Any,
]

SecItemAdd(query as CFDictionary, nil)
```

## Key Invalidation Behavior

| Event | Biometric Key State |
|-------|-------------------|
| New fingerprint/Face enrolled | Invalidated (iOS biometryCurrentSet, Android setInvalidatedByBiometricEnrollment) |
| All biometrics deleted | Invalidated |
| Device passcode changed | Key remains valid (for `kSecAttrAccessibleWhenPasscodeSet`) |
| Device passcode removed | Key destroyed |

## Migration on Key Invalidation

When biometric key is invalidated, re-encrypt data with new key:
1. Authenticate with device credential (fallback)
2. Decrypt data using old app-level key (non-biometric)
3. Generate new biometric-protected key
4. Re-encrypt data with new key
5. Delete old key from Keystore/Keychain
