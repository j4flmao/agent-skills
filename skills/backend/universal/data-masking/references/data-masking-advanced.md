# Data Masking Advanced Patterns

## Dynamic Data Masking

### Column-Level Database Masking
Apply masking rules at the database level so they are enforced regardless of application access path.

```sql
-- PostgreSQL dynamic masking (via extension or view)
CREATE VIEW users_masked AS
SELECT
  id,
  CASE WHEN current_setting('app.user_role') = 'admin'
    THEN email
    ELSE regexp_replace(email, '(.)(.*)(.@)', '\1***\3')
  END AS email,
  CASE WHEN current_setting('app.user_role') = 'admin'
    THEN ssn
    ELSE 'XXX-XX-' || substring(ssn, 8, 4)
  END AS ssn,
  name,
  created_at
FROM users;
```

### Proxy-Level Masking
Mask data at the proxy/API gateway level for centralized enforcement:

```typescript
// API Gateway response transformation
class GatewayMaskingPlugin {
  private maskingConfig: Record<string, MaskingRule[]> = {
    '/api/users': [
      { field: 'email', mask: 'partial_email' },
      { field: 'phone', mask: 'partial_phone' },
    ],
    '/api/orders': [
      { field: 'creditCard', mask: 'show_last_four' },
    ],
  };

  async transformResponse(path: string, body: any, user: UserContext): Promise<any> {
    const rules = this.maskingConfig[path];
    if (!rules) return body;
    return this.applyRules(body, rules, user);
  }
}
```

## Format-Preserving Encryption (FPE)

FPE encrypts data while preserving the original format. An SSN remains a 9-digit number, a credit card remains 16 digits.

```typescript
class FormatPreservingEncryption {
  private cipher: any; // FPE cipher (e.g., FF1 mode)

  encrypt(value: string, format: string): string {
    switch (format) {
      case 'ssn':
        // Preserve XXX-XX-XXXX format
        const digits = value.replace(/\D/g, '');
        const encrypted = this.cipher.encrypt(digits);
        return `${encrypted.slice(0, 3)}-${encrypted.slice(3, 5)}-${encrypted.slice(5)}`;
      case 'phone':
        // Preserve +X (XXX) XXX-XXXX format
        const phoneDigits = value.replace(/\D/g, '');
        const encPhone = this.cipher.encrypt(phoneDigits);
        return `+${encPhone[0]} (${encPhone.slice(1, 4)}) ${encPhone.slice(4, 7)}-${encPhone.slice(7)}`;
      default:
        return this.cipher.encrypt(value);
    }
  }
}
```

## Multi-Region Key Management

```typescript
class MultiRegionKeyManager {
  private regionKeys: Map<string, Buffer> = new Map();

  async getKeyForRegion(region: string): Promise<Buffer> {
    if (!this.regionKeys.has(region)) {
      // Fetch key from region-specific KMS
      const kms = this.getKmsForRegion(region);
      const key = await kms.getCurrentKey();
      this.regionKeys.set(region, key);
    }
    return this.regionKeys.get(region)!;
  }

  async encryptForRegion(plaintext: string, targetRegion: string): Promise<string> {
    const key = await this.getKeyForRegion(targetRegion);
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    // Tag ciphertext with region for routing
    const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
    return `${targetRegion}:${iv.toString('hex')}:${cipher.getAuthTag().toString('hex')}:${encrypted.toString('hex')}`;
  }
}
```

## Data Subject Access Request (DSAR) Workflow

### Automated DSAR Processing
```typescript
class DSARProcessor {
  async handleDeletionRequest(userId: string): Promise<void> {
    // 1. Anonymize user data
    await this.anonymizeUser(userId);
    
    // 2. Delete from search indexes
    await this.searchIndex.delete(`user:${userId}`);
    
    // 3. Mark event store events as anonymized
    await this.eventStore.anonymizeAggregate('user', userId);
    
    // 4. Notify downstream services
    await this.eventBus.publish(new UserDataDeletedEvent(userId));
    
    // 5. Log the deletion request
    await this.auditLog.write({
      action: 'GDPR_DELETION',
      userId,
      timestamp: new Date(),
    });
  }

  private async anonymizeUser(userId: string): Promise<void> {
    await this.db.query(`
      UPDATE users SET
        email = NULL,
        name = 'ANONYMIZED_USER',
        phone = NULL,
        anonymized_at = NOW()
      WHERE id = $1
    `, [userId]);
  }
}
```

## Differential Privacy

For analytics use cases, add noise to query results to prevent re-identification:

```typescript
class DifferentialPrivacyService {
  addNoise(value: number, epsilon: number = 0.1): number {
    // Laplace mechanism for differential privacy
    const scale = 1 / epsilon;
    const noise = this.laplaceSample(0, scale);
    return Math.round((value + noise) * 100) / 100;
  }

  private laplaceSample(mu: number, scale: number): number {
    const u = Math.random() - 0.5;
    return mu - scale * Math.sign(u) * Math.log(1 - 2 * Math.abs(u));
  }
}

// Usage
const actualCount = 1042;
const privatizedCount = dpService.addNoise(actualCount, 0.1);
// Result: ~1042 ± some noise, making individual records untraceable
```

## Key Rotation Strategy

### Rotation Without Downtime
```typescript
class KeyRotationService {
  async rotateKeys(): Promise<void> {
    const newVersion = await this.kms.createKey();
    const oldVersion = await this.kms.getCurrentKeyVersion();
    
    // Phase 1: Write new data with new key
    await this.kms.setCurrentKeyVersion(newVersion);
    
    // Phase 2: Re-encrypt existing data in batches
    await this.reEncryptInBatches(oldVersion, newVersion);
    
    // Phase 3: Retire old key
    await this.kms.disableKey(oldVersion);
  }

  private async reEncryptInBatches(oldVersion: string, newVersion: string): Promise<void> {
    const BATCH_SIZE = 1000;
    let offset = 0;
    
    while (true) {
      const records = await this.db.query(
        'SELECT id, email FROM users WHERE email_version = $1 LIMIT $2 OFFSET $3',
        [oldVersion, BATCH_SIZE, offset]
      );
      
      if (records.length === 0) break;
      
      for (const record of records) {
        const decrypted = await this.decryptWithVersion(record.email, oldVersion);
        const reEncrypted = await this.encryptWithKey(decrypted, newVersion);
        await this.db.query(
          'UPDATE users SET email = $1, email_version = $2 WHERE id = $3',
          [reEncrypted, newVersion, record.id]
        );
      }
      
      offset += BATCH_SIZE;
    }
  }
}
```

## Testing Masking Rules

### Automated Compliance Tests
```typescript
describe('Data Masking Compliance', () => {
  it('no PII appears in logs', async () => {
    const logSpy = jest.spyOn(logger, 'info');
    
    await handler.execute(createUserCommand);
    
    for (const call of logSpy.mock.calls) {
      const logString = JSON.stringify(call);
      expect(logString).not.toMatch(PII_PATTERNS.email);
      expect(logString).not.toMatch(PII_PATTERNS.phone);
      expect(logString).not.toMatch(PII_PATTERNS.ssn);
    }
  });

  it('masks emails in API response for non-admin users', async () => {
    const response = await request(app)
      .get('/users/me')
      .set('Authorization', `Bearer ${userToken}`);
    
    expect(response.body.email).toMatch(/^\w\*+@/);
  });

  it('does not expose encryption keys in memory dumps', () => {
    const heap = process.memoryUsage();
    // Key material should be in isolated memory (e.g., SafeBuffer)
  });
});
```
