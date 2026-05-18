# APNs Guide

## Endpoints

| Environment | Host |
|-------------|------|
| Production | `api.push.apple.com:443` |
| Development | `api.sandbox.push.apple.com:443` |

## Authentication

### Token-Based (Recommended)
- Generate `.p8` key from Apple Developer portal (team-scoped, not app-scoped)
- JWT header: `{ "alg": "ES256", "kid": "<KEY_ID>" }`
- JWT claims: `{ "iss": "<TEAM_ID>", "iat": <now> }`
- Reuse token for up to 30 min (cache until 401 response)

### Certificate-Based
- Export `.p12` from Keychain
- Passphrase-protected
- Legacy — prefer token auth for new projects

## Payload Size
- **4,096 bytes** (APNs default)
- **5,000 bytes** for VoIP / background pushes

## Headers

| Header | Purpose |
|--------|---------|
| `apns-topic` | App bundle ID (e.g. `com.example.app`) |
| `apns-priority` | `10` (send immediately) or `5` (throttled, power save) |
| `apns-expiration` | UNIX epoch; 0 = no store-and-forward |
| `apns-push-type` | `alert`, `background`, `voip`, `complication`, `fileprovider`, `mdm` |
| `apns-collapse-id` | Groups multiple notifications into one |

## Token Registration

```swift
func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
    let token = deviceToken.map { String(format: "%02.2hhx", $0) }.joined()
    // Send to your server — 2-byte hex string, 64 chars
}
```

## Error Responses (HTTP 400/410)

| Code | Meaning |
|------|---------|
| `BadDeviceToken` | Token invalid or unregistered |
| `Unregistered` | App uninstalled — stop sending to this token |
| `PayloadTooLarge` | Exceeds 4KB limit |
| `TooManyRequests` | Back off with exponential retry |
| `TopicDisallowed` | `apns-topic` doesn't match app's push type capability |

## VoIP Pushes
- Requires `com.apple.developer.pushkit.voip` entitlement
- Payload limited to 5 KB
- No user-visible alert; app must call `reportNewIncomingCall` within 30s
- iOS 13+ enforces pushkit for VoIP only — use regular push + `content-available` for non-VoIP wake
