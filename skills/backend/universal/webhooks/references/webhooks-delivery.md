# Webhook Security

## Signature Methods

| Method | Algorithm | Best For | Notes |
|--------|-----------|----------|-------|
| HMAC-SHA256 | `sha256(payload + secret)` | Most use cases | Standard, fast, supported everywhere |
| HMAC-SHA512 | `sha512(payload + secret)` | High-security | Stronger but same approach |
| RSA-SHA256 | `RSA.sign(payload, privateKey)` | Public webhook providers | Asymmetric, no shared secret needed |
| JWS (JSON Web Signature) | JWT format | Structured signatures | Standardized, includes header metadata |

## HMAC Signature Implementation

### Signing (Producer)

```typescript
function signPayload(payload: object, secret: string): string {
  const payloadStr = JSON.stringify(payload);
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(payloadStr);
  return `sha256=${hmac.digest('hex')}`;
}
```

### Verification (Consumer)

```typescript
function verifySignature(
  payload: object,
  signatureHeader: string,
  secret: string,
): boolean {
  const expected = signPayload(payload, secret);
  try {
    return crypto.timingSafeEqual(
      Buffer.from(signatureHeader),
      Buffer.from(expected),
    );
  } catch {
    return false; // Buffer length mismatch
  }
}
```

## Timestamp-Based Replay Prevention

```typescript
function verifyWithTimestamp(
  payload: object,
  signatureHeader: string,
  timestampHeader: string,
  secret: string,
  toleranceMs: number = 300000, // 5 minutes
): { valid: boolean; reason?: string } {
  // Check timestamp freshness
  const timestamp = parseInt(timestampHeader);
  if (isNaN(timestamp)) {
    return { valid: false, reason: 'Invalid timestamp' };
  }

  const age = Date.now() - timestamp * 1000;
  if (age > toleranceMs) {
    return { valid: false, reason: 'Signature expired' };
  }
  if (age < -60000) {
    // Allow 60s clock skew in the future
    return { valid: false, reason: 'Timestamp in the future' };
  }

  // Verify signature
  const payloadStr = timestamp + '.' + JSON.stringify(payload);
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(payloadStr);
  const expected = `sha256=${hmac.digest('hex')}`;

  if (!crypto.timingSafeEqual(Buffer.from(signatureHeader), Buffer.from(expected))) {
    return { valid: false, reason: 'Signature mismatch' };
  }

  return { valid: true };
}
```

## IP Allowlisting

```typescript
class IPAllowlist {
  private allowedRanges: string[] = [];
  private updatedAt: Date | null = null;

  constructor() {
    this.refreshAllowlist();
    setInterval(() => this.refreshAllowlist(), 3600000); // Refresh hourly
  }

  private async refreshAllowlist(): Promise<void> {
    try {
      // Fetch from well-known endpoint or config
      const response = await fetch('https://webhook-provider.com/ips.json');
      const data = await response.json();
      this.allowedRanges = data.ipv4.concat(data.ipv6);
      this.updatedAt = new Date();
    } catch {
      // Keep existing list on failure
    }
  }

  isAllowed(ip: string): boolean {
    return this.allowedRanges.some(range => ipaddr.parse(ip).match(ipaddr.parseCIDR(range)));
  }
}
```

## Secret Rotation

```typescript
class SecretRotationManager {
  constructor(private secretStore: SecretStore) {}

  async rotateSecret(subscriptionId: string): Promise<void> {
    const newSecret = crypto.randomBytes(32).toString('hex');

    // Stage 1: Add new secret alongside old (dual acceptance window)
    await this.secretStore.addSecret(subscriptionId, newSecret);
    await this.notifyConsumer(subscriptionId, newSecret);

    // Stage 2: After grace period, remove old secret
    setTimeout(async () => {
      await this.secretStore.clearOldSecrets(subscriptionId);

      // Send alert if consumer is still using old secret
      const recentFailures = await this.getRecentAuthFailures(subscriptionId);
      if (recentFailures > 0) {
        await this.alertService.send({
          severity: 'warning',
          message: `Consumer ${subscriptionId} still using old secret after rotation`,
        });
      }
    }, 7 * 24 * 3600000); // 7 day grace period
  }

  private async notifyConsumer(subscriptionId: string, newSecret: string): Promise<void> {
    // Send notification out-of-band (dashboard, email, or separate webhook)
    await this.notificationService.send({
      to: this.getSubscriptionOwner(subscriptionId),
      subject: 'Webhook secret rotated',
      body: `New secret: ${newSecret}\nUpdate your webhook verification within 7 days.`,
    });
  }
}
```

## HTTPS Enforcement

```typescript
function validateWebhookUrl(url: string): { valid: boolean; reason?: string } {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:') {
      return { valid: false, reason: 'HTTPS is required for webhook endpoints' };
    }
    if (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') {
      return { valid: false, reason: 'Localhost endpoints are not allowed' };
    }
    if (parsed.hostname.endsWith('.internal') || parsed.hostname.endsWith('.local')) {
      return { valid: false, reason: 'Internal network endpoints are not allowed' };
    }
    return { valid: true };
  } catch {
    return { valid: false, reason: 'Invalid URL format' };
  }
}

// Verify endpoint before saving subscription
async function verifyEndpoint(url: string): Promise<{ reachable: boolean; statusCode?: number }> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(url, {
      method: 'OPTIONS',
      signal: controller.signal,
    });
    clearTimeout(timeout);

    return { reachable: true, statusCode: response.status };
  } catch {
    return { reachable: false };
  }
}
```

## Security Checklist

```yaml
security_checks:
  signing:
    - "All outgoing payloads signed with HMAC-SHA256"
    - "Timestamp included in signature to prevent replay"
    - "Timing-safe comparison for signature verification"
    - "Secrets are unique per consumer"
    - "Secrets stored encrypted at rest"

  verification:
    - "Incoming signatures verified on every request"
    - "Timestamp tolerance window: 5 minutes"
    - "Replay detection: reject duplicate webhook IDs"
    - "HTTPS enforced for all endpoints"
    - "IP allowlist maintained for known providers"

  secrets:
    - "Secrets rotated every 90 days"
    - "Grace period for dual secret acceptance"
    - "Consumer notified before rotation"
    - "Compromised secret: immediate rotation + alert"

  monitoring:
    - "Log all verification failures"
    - "Alert on rapid signature failures (possible attack)"
    - "Monitor for unusual delivery patterns"
    - "Track secret age and rotation compliance"
```

## Common Attack Mitigations

| Attack | Mitigation | Implementation |
|--------|------------|----------------|
| Replay attack | Timestamp + webhook ID dedup | Verify timestamp < 5min, store processed IDs |
| Man-in-the-middle | HTTPS + HMAC | Enforce HTTPS, verify HMAC signature |
| Secret leak | Regular rotation | Rotate every 90 days, separate per consumer |
| Timing attack | Timing-safe comparison | Use `crypto.timingSafeEqual` |
| DOS via retry | Rate limiting | Cap retries, alert on flood |
| SSRF via URL | URL validation | Block internal URLs, require HTTPS |
| Payload tampering | Signature verification | Verify HMAC before processing |
