# Mobile Network Security

## SSL Pinning

### Android (OkHttp)

```kotlin
val certificatePinner = CertificatePinner.Builder()
    .add("api.example.com", "sha256/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=")
    .build()

val client = OkHttpClient.Builder()
    .certificatePinner(certificatePinner)
    .build()
```

### iOS (URLSession)

```swift
func urlSession(_ session: URLSession, didReceive challenge: URLAuthenticationChallenge) async -> (URLSession.AuthChallengeDisposition, URLCredential?) {
    guard let trust = challenge.protectionSpace.serverTrust,
          let cert = SecTrustGetCertificateAtIndex(trust, 0) else {
        return (.cancelAuthenticationChallenge, nil)
    }
    let remoteHash = // compute SHA-256 of cert
    guard pinnedHashes.contains(remoteHash) else {
        return (.cancelAuthenticationChallenge, nil)
    }
    return (.useCredential, URLCredential(trust: trust))
}
```

## Proxy prevention

```xml
<!-- Android: Detect proxy -->
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
```

```swift
// iOS: Disable NSURLConnection proxy
let config = URLSessionConfiguration.ephemeral
config.connectionProxyDictionary = [:]
```

## Certificate validation

Always validate certificate chain. Never disable in production:

```swift
// NEVER DO THIS:
// challenge.sender?.performDefaultHandling?(for: challenge)  // Bypasses validation
```
