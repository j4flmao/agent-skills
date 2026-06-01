# Deep Linking Security Guide

## Threat Model

Deep links are external entry points into your app, making them a prime attack vector. Attackers can:

1. **Spoof links** — Create fake universal links that mimic your domain
2. **Inject parameters** — Add malicious query params to deep link URLs
3. **Register same URL scheme** — Malicious app intercepts your custom scheme
4. **Open redirect** — Use your deep link as an open redirect to phishing sites
5. **Extract sensitive data** — Read auth tokens or PII from deep link URLs
6. **Craft malicious payloads** — Send malformed data to crash or exploit your app

## Mitigation Strategies

### 1. Validate Originating Domain

```swift
func application(_ application: UIApplication,
                 continue userActivity: NSUserActivity,
                 restorationHandler: @escaping ([UIUserActivityRestoring]) -> Void) -> Bool {
    guard let url = userActivity.webpageURL else { return false }

    // Validate domain
    let allowedDomains = ["app.example.com", "www.example.com"]
    guard let host = url.host, allowedDomains.contains(host) else {
        Analytics.logEvent("deep_link_invalid_domain", parameters: ["host": host ?? "nil"])
        return false
    }

    return DeepLinkRouter.shared.handle(url: url)
}
```

### 2. Parameter Sanitization

```typescript
interface SanitizedParams {
  [key: string]: string | number | boolean;
}

function sanitizeDeepLinkParams(raw: Record<string, string>): SanitizedParams {
  const sanitized: SanitizedParams = {};

  for (const [key, value] of Object.entries(raw)) {
    // Reject non-printable characters
    if (/[\x00-\x08\x0E-\x1F]/.test(value)) continue;

    // Reject excessively long values (>200 chars)
    if (value.length > 200) continue;

    // Type coercion
    if (/^\d+$/.test(value)) {
      sanitized[key] = parseInt(value, 10);
    } else if (/^\d+\.\d+$/.test(value)) {
      sanitized[key] = parseFloat(value);
    } else if (value === 'true') {
      sanitized[key] = true;
    } else if (value === 'false') {
      sanitized[key] = false;
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

// Validate enum values
function validateEnumParam<T extends Record<string, string>>(
  value: string, allowed: T
): T[keyof T] | null {
  const values = Object.values(allowed) as string[];
  return values.includes(value) ? value as T[keyof T] : null;
}
```

### 3. Never Pass Secrets in URLs

```typescript
// DANGEROUS — Never do this:
const badLink = `https://app.example.com/login?token=${authToken}`;
// Auth tokens appear in: server logs, browser history, referrer headers, shared screenshots

// SAFE — Use a session-based approach:
// 1. Generate one-time session code on server
const sessionCode = generateOneTimeCode()
// 2. Pass only the session code in the URL
const safeLink = `https://app.example.com/login?code=${sessionCode}`
// 3. App exchanges session code for auth token via secure API call
```

### 4. Deep Link Allowlist

```kotlin
class DeepLinkSecurity {
    private val allowedPatterns = listOf(
        Regex("^/home$"),
        Regex("^/profile/\\d+$"),
        Regex("^/orders/ORD-\\d+$"),
        Regex("^/product/[a-zA-Z0-9-]+$"),
        Regex("^/settings$")
    )

    private val blockedPatterns = listOf(
        Regex("^/admin/.*"),
        Regex("^/api/.*"),
        Regex("^/delete-account"),
        Regex("^/users/\\d+/email"),
    )

    fun isPathAllowed(path: String): Boolean {
        // First check blocklist
        if (blockedPatterns.any { it.matches(path) }) return false
        // Then check allowlist
        return allowedPatterns.any { it.matches(path) }
    }
}
```

### 5. Rate Limiting

```swift
class DeepLinkRateLimiter {
    private var recentLinks: [Date] = []
    private let maxLinksPerSecond = 1
    private let maxLinksPerMinute = 10

    func allowProcessing() -> Bool {
        let now = Date()
        // Remove entries older than 1 minute
        recentLinks = recentLinks.filter { now.timeIntervalSince($0) < 60 }
        // Check per-second
        let lastSecond = recentLinks.filter { now.timeIntervalSince($0) < 1 }
        if lastSecond.count >= maxLinksPerSecond { return false }
        // Check per-minute
        if recentLinks.count >= maxLinksPerMinute { return false }

        recentLinks.append(now)
        return true
    }
}
```

### 6. Custom URL Scheme Risks

Custom URL schemes are inherently insecure:
- Any app can register the same scheme — no exclusivity
- iOS shows no dialog for some scheme invocations
- Android allows multiple apps to register the same scheme

**Mitigation**: Use custom schemes ONLY for development/debugging. In production, use universal/App Links exclusively. If you must use custom schemes, add a cryptographic signature parameter:

```swift
// Signed custom URL scheme
func generateSignedSchemeURL(path: String) -> URL {
    let expiry = Date().addingTimeInterval(300).timeIntervalSince1970
    let payload = "\(path):\(Int(expiry))"
    let signature = hmac(key: APP_SECRET, data: payload)
    return URL(string: "myapp://\(path)?sig=\(signature)&exp=\(Int(expiry))")!
}

func validateSchemeURL(_ url: URL) -> Bool {
    guard let components = URLComponents(url: url, resolvingAgainstBaseURL: true),
          let sig = components.queryItems?.first(where: { $0.name == "sig" })?.value,
          let expStr = components.queryItems?.first(where: { $0.name == "exp" })?.value,
          let exp = TimeInterval(expStr) else { return false }
    // Check expiry
    guard Date().timeIntervalSince1970 < exp else { return false }
    // Validate signature
    let path = url.path
    let payload = "\(path):\(Int(exp))"
    let expectedSig = hmac(key: APP_SECRET, data: payload)
    return sig == expectedSig
}
```

### 7. Universal Link Spoofing Prevention

Universal links should be resistant to spoofing, but attackers can still:
- Use HTTP instead of HTTPS (redirect to their site)
- Create lookalike domains (examp1e.com vs example.com)

**Mitigations**:
- Always validate URL scheme is HTTPS (`url.scheme == "https"`)
- Check host against exact domain list
- Use HSTS preloading for your domain
- Monitor for certificate anomalies

```swift
guard url.scheme == "https",
      let host = url.host,
      allowedDomains.contains(host) else {
    return false
}
```

### 8. Server Log Exposure

Deep link URLs appear in server access logs. If they contain sensitive data, it's exposed to anyone with log access.

```nginx
# Server log entry — DO NOT include query strings containing sensitive data
log_format security '$remote_addr - $remote_user [$time_local] '
                    '"$request_method $uri $http_version" $status';
# Use $uri instead of $request_uri to strip query params from logs
```

## Security Testing Checklist

- [ ] All deep link parameters validated (type, length, range)
- [ ] URL scheme protocol validated (reject non-HTTPS)
- [ ] Domain validated against allowlist
- [ ] Path validated against allowlist (reject admin/internal paths)
- [ ] Input sanitized: reject non-printable characters, escape special chars
- [ ] Rate limiting applied to deep link processing
- [ ] No PII, auth tokens, or secrets in deep link URLs
- [ ] Universal/App Links used for production (not custom schemes)
- [ ] Custom schemes cryptographically signed if used
- [ ] Deep link cannot be used for open redirect
- [ ] No SQL injection, XSS, or command injection vectors from params
- [ ] Auth-gated links properly queued (not silently navigated)
- [ ] Deferred deep link SDK properly configured for privacy
- [ ] Link expiry enforced for sensitive operations
- [ ] AASA/assetlinks files use correct paths and app IDs
