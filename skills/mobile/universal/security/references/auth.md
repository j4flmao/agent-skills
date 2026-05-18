# Mobile Authentication

## OAuth 2.0 flow

```
App → Browser → Auth Server → callback → App (code)
App → Token Exchange → access_token + refresh_token
App → API calls with access_token
Token expires → refresh_token → new access_token
```

## JWT handling

```dart
// Decode JWT payload (never trust client-side validation for security)
Map<String, dynamic> decodeJWT(String token) {
  final parts = token.split('.');
  final payload = base64Url.decode(parts[1]);
  return jsonDecode(utf8.decode(payload));
}
```

## Biometric

```swift
// iOS
let context = LAContext()
if context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: nil) {
    context.evaluatePolicy(.deviceOwnerAuthenticationWithBiometrics,
        localizedReason: "Authenticate to view orders") { success, error in
        // handle
    }
}
```

## Token storage

```kotlin
// Store in EncryptedSharedPreferences
val tokenPrefs = EncryptedSharedPreferences.create(...)
tokenPrefs.edit().putString("access_token", token).apply()

// Never store in:
// - SharedPreferences (plaintext)
// - External storage
// - Logs
// - Bundle extras
```
