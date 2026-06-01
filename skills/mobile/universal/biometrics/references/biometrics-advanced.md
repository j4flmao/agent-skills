# Advanced Biometric Patterns

## Cryptographic Key Management with Biometrics

### AES Key Generation (Android Keystore)
```kotlin
fun generateBiometricKey(keyName: String): SecretKey {
    val keyGenerator = KeyGenerator.getInstance(
        KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore"
    )
    val spec = KeyGenParameterSpec.Builder(keyName, KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT)
        .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
        .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
        .setUserAuthenticationRequired(true)
        .setUserAuthenticationValidityDurationSeconds(30) // 30 second auth cache
        .setInvalidatedByBiometricEnrollment(true)
        .build()
    keyGenerator.init(spec)
    return keyGenerator.generateKey()
}
```

### ECDSA Signing Key (iOS Secure Enclave)
```swift
func generateBiometricKey(tag: String) -> SecKey {
    let accessControl = SecAccessControlCreateWithFlags(
        nil,
        kSecAttrAccessibleWhenPasscodeSetThisDeviceOnly,
        [.biometryCurrentSet, .privateKeyUsage],
        nil
    )!
    let attributes: [String: Any] = [
        kSecAttrKeyType as String: kSecAttrKeyTypeECSECPrimeRandom,
        kSecAttrKeySizeInBits as String: 256,
        kSecAttrTokenID as String: kSecAttrTokenIDSecureEnclave,
        kSecPrivateKeyAttrs as String: [
            kSecAttrIsPermanent as String: true,
            kSecAttrApplicationTag as String: tag.data(using: .utf8)!,
            kSecAttrAccessControl as String: accessControl,
        ]
    ]
    var error: Unmanaged<CFError>?
    return SecKeyCreateRandomKey(attributes as CFDictionary, &error)! as SecKey
}
```

## Server-Side Biometric Verification

For high-security scenarios, prove biometric authentication to the server:

### Challenge-Response Protocol
1. Server generates random nonce (16 bytes), sends to app
2. App shows biometric prompt
3. On biometric success, sign the nonce with biometric-protected private key
4. App sends signature + public key to server
5. Server verifies signature with stored public key
6. Server issues short-lived auth token

```swift
func signChallenge(_ challenge: Data) -> (signature: Data, publicKey: Data)? {
    let context = LAContext()
    context.localizedReason = "Sign in to your account"

    guard let privateKey = loadBiometricKey(),
          let signature = SecKeyCreateSignature(
              privateKey,
              .ecdsaSignatureMessageX962SHA256,
              challenge as CFData,
              nil
          ) as? Data,
          let publicKey = SecKeyCopyPublicKey(privateKey),
          let publicKeyData = SecKeyCopyExternalRepresentation(publicKey, nil) as? Data
    else { return nil }

    return (signature, publicKeyData)
}
```

```kotlin
fun signChallenge(challenge: ByteArray, keyName: String): SignatureResult? {
    try {
        val privateKey = keyStore.getKey(keyName, null) as PrivateKey
        val signature = Signature.getInstance("SHA256withECDSA")
        signature.initSign(privateKey)
        signature.update(challenge)
        val sigBytes = signature.sign()
        val publicKey = keyStore.getCertificate(keyName).publicKey
        return SignatureResult(sigBytes, publicKey.encoded)
    } catch (e: KeyPermanentlyInvalidatedException) {
        // Biometric changed — key invalidated
        return null
    }
}
```

## Secure Enclave & TEE Integration

### iOS Secure Enclave
- Hardware isolated from main processor
- Stores biometric template data (Face ID, Touch ID)
- Performs biometric matching inside Secure Enclave
- App never receives raw biometric data
- Keys marked `.biometryCurrentSet` are destroyed on biometric enrollment change
- Keys marked `.biometryAny` survive enrollment changes (use with caution)

### Android TEE (Trusted Execution Environment)
- ARM TrustZone isolates sensitive operations
- Biometric data stored and matched in TEE
- Android Keystore keys bound to biometric via `setUserAuthenticationRequired`
- Key attestation proves key was generated in hardware: `KeyStore.getCertificate(keyName)`
- Attestation certificate chain proves key security properties to server

## Advanced Multi-Factor Flows

### Tiered Security
```kotlin
sealed class AuthResult {
    data class Granted(val level: SecurityLevel) : AuthResult()
    data class Denied(val reason: String) : AuthResult()
}

enum class SecurityLevel {
    LOW,        // App unlock
    MEDIUM,     // Profile view
    HIGH,       // Payment
    CRITICAL    // Account deletion
}

fun authenticate(operation: SecurityLevel, callback: (AuthResult) -> Unit) {
    when (operation) {
        SecurityLevel.LOW -> biometricOnly(callback)
        SecurityLevel.MEDIUM -> biometricWithFallback(callback)
        SecurityLevel.HIGH -> biometricThenOTP(callback)
        SecurityLevel.CRITICAL -> biometricThenOTPThenPin(callback)
    }
}
```

## Accessibility Considerations

### Biometric Alternatives
For users who cannot use biometrics (physical disability, facial differences, worn fingerprints):
- Always provide device credential fallback (PIN/password)
- Support long-press duration adjustment for fingerprint sensors
- Allow voice-over/TalkBack to read biometric prompt content
- Configurable biometric timeout (no timeout vs. cached for session)
- Support external authenticators (hardware security keys) on Android

### Known Limitations
- Face ID doesn't work with face masks (iOS 15.5+ added mask support with Apple Watch)
- Fingerprint sensors fail with wet/dirty fingers
- Face unlock fails in direct sunlight or complete darkness
- Some users cannot enroll certain biometrics due to medical conditions
- Respect user choice to not use biometrics without penalizing app functionality
