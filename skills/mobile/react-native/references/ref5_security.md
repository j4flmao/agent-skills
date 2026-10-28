# React Native Security

Defensive security for React Native apps, mapped to the OWASP Mobile Top 10 (2024) and MASVS. The core assumption: the app binary and JS bundle are in the attacker's hands. Anything shipped can be read, modified and replayed, so authority lives on the server.

## Threat Model Summary

| Risk (OWASP Mobile 2024) | React Native angle | Control |
|--------------------------|-------------------|---------|
| M1 Improper credential usage | API keys in JS bundle / `EXPO_PUBLIC_*` | Backend proxies paid APIs; per-user tokens only |
| M2 Inadequate supply chain security | npm deps, native SDKs, OTA channel | Lockfiles, audit, signed OTA updates |
| M3 Insecure authentication/authorization | Client-side role checks | Server enforces every permission |
| M4 Insufficient input/output validation | Deep link params, WebView messages | Schema validation, allow-lists |
| M5 Insecure communication | HTTP, weak TLS, user-installed CAs | HTTPS only, ATS, network security config, optional pinning |
| M6 Inadequate privacy controls | PII in logs/analytics | Data minimisation, scrubbing |
| M7 Insufficient binary protections | Readable bundle | Hermes bytecode, R8, server-side checks, attestation |
| M8 Security misconfiguration | Debuggable builds, exported components | Release config review |
| M9 Insecure data storage | Tokens in AsyncStorage | Keychain/Keystore |
| M10 Insufficient cryptography | Home-made crypto, `Math.random` | Platform crypto, CSPRNG |

## Secrets and Configuration

- Everything in the JS bundle is public, including values from `.env` inlined at build time. Hermes bytecode is not encryption.
- Keep third-party API keys that cost money or grant data access on your backend; the app calls your backend with a user token.
- Restrict unavoidable client keys (Maps, Firebase) by bundle ID/package + SHA-256 signing cert and API restrictions in the provider console.

## Secure Storage

```ts
import * as SecureStore from 'expo-secure-store';

await SecureStore.setItemAsync('refresh_token', token, {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
});
const stored = await SecureStore.getItemAsync('refresh_token');
```

| Data | Store |
|------|-------|
| Refresh token, private keys | Keychain/Keystore (`expo-secure-store`, `react-native-keychain`) |
| Access token | Memory only |
| Sensitive cached data | Encrypted SQLite (SQLCipher via `op-sqlite`) or MMKV with an encryption key held in Keychain/Keystore |
| Non-sensitive settings | MMKV / AsyncStorage |

Use `requireAuthentication` (biometric-gated items) for high-value secrets. Exclude sensitive files from iCloud/Android auto-backup (`android:allowBackup="false"` or backup rules; `NSURLIsExcludedFromBackupKey`).

## Network Security

- iOS App Transport Security: keep defaults; no `NSAllowsArbitraryLoads` in release.
- Android: `network_security_config.xml` with `cleartextTrafficPermitted="false"`; do not trust user CAs in release.

```xml
<network-security-config>
  <base-config cleartextTrafficPermitted="false">
    <trust-anchors><certificates src="system" /></trust-anchors>
  </base-config>
</network-security-config>
```

### Certificate Pinning (optional)

Pinning protects against mis-issued or user-installed CAs but can brick the app on certificate rotation.
- Pin SPKI hashes of the CA or intermediate plus a backup key, never only the leaf.
- Ship with an expiry and a remote kill switch or fallback.
- Libraries: `react-native-ssl-public-key-pinning` (TrustKit/OkHttp under the hood), or native config (`<pin-set>` in Android network security config).

## Authentication

- OAuth 2.0/OIDC Authorization Code + PKCE via the system browser (RFC 8252).
- Short-lived access tokens; rotating refresh tokens with reuse detection on the server.
- Biometrics (`expo-local-authentication`) gate access to a Keychain item; a JS boolean "biometric passed" is bypassable.
- Server-side session revocation on logout and password change.

## Input Validation

- Deep links and push payloads: parse with a schema; allow-list routes; never execute actions (payments, deletions) directly from a link without user confirmation.
- WebViews (`react-native-webview`):
  - `originWhitelist` restricted to your domains; `javaScriptEnabled` only if needed.
  - Validate every `onMessage` payload; never pass tokens into untrusted pages.
  - Block navigation to unknown hosts with `onShouldStartLoadWithRequest`.
  - Do not enable file access (`allowFileAccess`, `allowUniversalAccessFromFileURLs`) for remote content.

## Platform Configuration Review

| Check | Where |
|-------|-------|
| `android:debuggable` false in release | Gradle build type (default) |
| No unintended `exported="true"` activities/receivers | `AndroidManifest.xml` |
| Minimal permissions | Manifest / `Info.plist` usage strings |
| `FLAG_SECURE` on screens showing secrets | Native module or `expo-screen-capture` |
| Hide app content in app switcher | Overlay on `AppState` inactive |
| Dev menu and Metro access absent in release | Release build |

## App Integrity and Attestation

- Use Play Integrity API (Android) and App Attest / DeviceCheck (iOS) to let the backend verify requests come from a genuine app on a genuine device.
- Root/jailbreak detection libraries (e.g. `jail-monkey`) are bypassable signals; feed them into risk scoring, do not rely on them for authorization.
- Obfuscation raises effort only; it is not a control.

## Supply Chain

- Commit lockfiles; install with `npm ci` / `pnpm install --frozen-lockfile`.
- Review native dependencies' permissions and network calls.
- Sign OTA updates (EAS Update code signing) and restrict who can publish to production channels.
- Run dependency scanning (Dependabot/Renovate + OSV/Snyk) and secret scanning in CI.

## Privacy

- Never log tokens, passwords or full PII; scrub in Sentry `beforeSend`.
- iOS privacy manifest (`PrivacyInfo.xcprivacy`) listing required-reason APIs and collected data; Expo config supports `ios.privacyManifests`.
- Honour App Tracking Transparency before cross-app tracking.

## Cryptography

- Random values: `expo-crypto` `getRandomBytes` or `crypto.getRandomValues` (polyfilled by `react-native-get-random-values`); never the non-cryptographic `Math.random` for tokens.
- Hashing/encryption: platform APIs or audited libraries (`react-native-quick-crypto`, libsodium bindings); AES-GCM or ChaCha20-Poly1305 only.

## Checklist

- [ ] No privileged secrets in the bundle; client keys restricted by app identity
- [ ] Refresh tokens in Keychain/Keystore; access tokens in memory
- [ ] Cleartext disabled; user CAs not trusted in release
- [ ] Pinning (if used) has backup pins and a kill switch
- [ ] Deep link, push and WebView inputs validated and allow-listed
- [ ] Release manifest/plist reviewed (debuggable, exported, permissions)
- [ ] Attestation verified server side for sensitive endpoints
- [ ] OTA updates signed; publish rights restricted
- [ ] Logs and crash reports scrubbed of PII
