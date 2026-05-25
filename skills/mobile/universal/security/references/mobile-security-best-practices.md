# Mobile Security Best Practices

## Local Storage

### Secure Storage
```typescript
// Use platform keychain/keystore
import * as SecureStore from 'expo-secure-store'

await SecureStore.setItemAsync('auth_token', token, {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
})
```

### Data Protection Levels
| Level | Storage | Content |
|-------|---------|---------|
| Critical | Keychain/Keystore | Auth tokens, API keys, biometric data |
| Sensitive | Encrypted DB | User data, financial info |
| Normal | SQLite/SharedPreferences | Preferences, cache |
| Public | Filesystem | Images, documents |

## Network Security

### Certificate Pinning
```typescript
// React Native with okhttp
val certificatePinner = CertificatePinner.Builder()
  .add("api.example.com", "sha256/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=")
  .build()

// iOS with URLSession
let security = AFSecurityPolicy(pinningMode: .certificate)
security.allowInvalidCertificates = false
security.validatesDomainName = true
```

### API Security
- Always use HTTPS (enforce via network security config)
- Implement certificate transparency checks
- Use short-lived tokens with refresh flow
- Validate all server responses
- Implement request signing for sensitive operations

## Authentication

### Biometric Authentication
```typescript
import * as LocalAuthentication from 'expo-local-authentication'

const compatible = await LocalAuthentication.hasHardwareAsync()
const enrolled = await LocalAuthentication.isEnrolledAsync()

if (compatible && enrolled) {
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: 'Authenticate to continue',
    cancelLabel: 'Use passcode',
    fallbackLabel: 'Enter passcode',
  })
}
```

### Session Management
- Token storage in secure enclave
- Automatic token refresh with retry
- Session timeout on inactivity
- Remote session invalidation support
- Biometric gate for sensitive actions

## OWASP Mobile Top 10

| Risk | Mitigation |
|------|------------|
| Improper platform usage | Follow platform security guidelines |
| Insecure data storage | Use keychain/keystore, encrypt files |
| Insecure communication | TLS 1.3, certificate pinning |
| Insecure authentication | Biometrics, 2FA, short-lived tokens |
| Insufficient cryptography | Use platform crypto APIs, not custom |
| Insecure authorization | Server-side authorization checks |
| Client code quality | Input validation, error handling |
| Code tampering | Code obfuscation, integrity checks |
| Reverse engineering | ProGuard/R8, string obfuscation |
| Extraneous functionality | Remove debug code before release |

## Runtime Protection

### Jailbreak/Root Detection
- Check for common jailbreak indicators
- Detect modded app store installations
- Verify app integrity on launch
- Implement progressive responses (warn → restrict → block)

### Anti-Tampering
- Verify code signature at runtime
- Implement integrity checks on critical files
- Use obfuscation for sensitive logic
- Monitor for debugger attachment
- Detect hooking frameworks (Frida, Xposed)
