# Data Masking Performance

## Overview
Optimize data masking operations: efficient encryption, batch masking, indexed masked fields, and minimal performance impact on queries.

## Efficient Encryption

```typescript
import crypto from 'crypto';

class EfficientEncryption {
  private readonly algorithm = 'aes-256-gcm';
  private key: Buffer;
  private keyCache: Map<string, Buffer> = new Map();

  constructor() {
    this.key = this.loadKey();
  }

  encrypt(plaintext: string): string {
    const iv = crypto.randomBytes(12); // 96-bit IV for GCM
    const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return Buffer.concat([iv, authTag, encrypted]).toString('base64');
  }

  decrypt(ciphertext: string): string {
    const buffer = Buffer.from(ciphertext, 'base64');
    const iv = buffer.subarray(0, 12);
    const authTag = buffer.subarray(12, 28);
    const encrypted = buffer.subarray(28);
    const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);
    decipher.setAuthTag(authTag);
    return decipher.update(encrypted) + decipher.final('utf8');
  }

  // Deterministic encryption for indexed fields (e.g., email for lookups)
  encryptDeterministic(plaintext: string): string {
    const cipher = crypto.createCipheriv(
      'aes-256-cbc',  // CBC is deterministic (no IV randomness needed)
      this.key,
      Buffer.alloc(16, 0) // Fixed IV for deterministic output
    );
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    return encrypted.toString('hex');
  }
}
```

## Batch Masking

```typescript
class BatchMasker {
  private readonly BATCH_SIZE = 5000;

  async maskExistingData(tableName: string, columns: string[]): Promise<BatchResult> {
    let processed = 0;
    let failed = 0;
    let lastId = 0;

    while (true) {
      const records = await db.query(
        `SELECT * FROM ${tableName}
         WHERE id > $1
         ORDER BY id ASC
         LIMIT $2`,
        [lastId, this.BATCH_SIZE]
      );

      if (records.rows.length === 0) break;

      const updates = [];
      for (const record of records.rows) {
        try {
          const masked: Record<string, unknown> = {};
          for (const col of columns) {
            if (record[col]) {
              masked[col] = this.maskField(col, record[col]);
            }
          }

          if (Object.keys(masked).length > 0) {
            updates.push(
              db.query(
                `UPDATE ${tableName} SET ${Object.keys(masked).map((k, i) => `${k} = $${i + 2}`).join(', ')}, masked_at = NOW() WHERE id = $1`,
                [record.id, ...Object.values(masked)]
              )
            );
          }
          lastId = record.id;
          processed++;
        } catch (error) {
          failed++;
          await this.logFailure(tableName, record.id, error);
        }
      }

      if (updates.length > 0) {
        await Promise.all(updates);
      }
    }

    return { processed, failed, completedAt: new Date() };
  }
}
```

## Query Performance with Masked Fields

```typescript
class MaskedFieldIndex {
  // For fields that need both masking and querying (e.g., email uniqueness)
  private readonly deterministicEncryption: EfficientEncryption;

  constructor() {
    this.deterministicEncryption = new EfficientEncryption();
  }

  // Store both deterministic (for lookup) and non-deterministic (for display) encryption
  async storeEmail(recordId: string, email: string): Promise<void> {
    const deterministic = this.deterministicEncryption.encryptDeterministic(email);
    const nonDeterministic = this.deterministicEncryption.encrypt(email);

    await db.query(
      `INSERT INTO user_emails (user_id, email_hash, email_encrypted)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id) DO UPDATE SET email_hash = $2, email_encrypted = $3`,
      [recordId, deterministic, nonDeterministic]
    );
  }

  async findByEmail(email: string): Promise<string | null> {
    const hash = this.deterministicEncryption.encryptDeterministic(email);
    const result = await db.query(
      'SELECT user_id FROM user_emails WHERE email_hash = $1',
      [hash]
    );
    return result.rows[0]?.user_id || null;
  }

  async getDecryptedEmail(userId: string): Promise<string | null> {
    const result = await db.query(
      'SELECT email_encrypted FROM user_emails WHERE user_id = $1',
      [userId]
    );
    if (!result.rows[0]) return null;
    return this.deterministicEncryption.decrypt(result.rows[0].email_encrypted);
  }
}
```

## Masking Middleware Performance

```typescript
class MaskingMiddleware {
  private maskFunctions: Map<string, (value: string) => string> = new Map([
    ['email', (v) => {
      const [local, domain] = v.split('@');
      return `${local[0]}${'*'.repeat(local.length - 2)}${local[local.length - 1]}@${domain}`;
    }],
    ['phone', (v) => {
      const cleaned = v.replace(/\D/g, '');
      return `+${'*'.repeat(cleaned.length - 4)}${cleaned.slice(-4)}`;
    }],
    ['name', (v) => `${v[0]}${'*'.repeat(v.length - 1)}`],
    ['ssn', () => '***-**-****'],
    ['credit_card', (v) => `****-****-****-${v.replace(/\D/g, '').slice(-4)}`],
  ]);

  maskResponse(data: Record<string, unknown>, rules: MaskingRule[]): Record<string, unknown> {
    const start = Date.now();
    const result = { ...data };

    for (const rule of rules) {
      const value = result[rule.field];
      if (typeof value === 'string' && this.maskFunctions.has(rule.type)) {
        result[rule.field] = this.maskFunctions.get(rule.type)!(value);
      }
    }

    const duration = Date.now() - start;
    if (duration > 5) {
      metrics.recordSlowMasking(duration, rules.length);
    }

    return result;
  }
}
```

## Performance Benchmarks

```typescript
describe('Masking Performance', () => {
  it('masks 10,000 emails under 100ms', async () => {
    const emails = Array.from({ length: 10000 }, (_, i) => `user${i}@example.com`);
    const masker = new BatchMasker();

    const start = Date.now();
    for (const email of emails) {
      masker.maskField('email', email);
    }
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(100);
  });

  it('encrypts 1000 fields under 500ms', async () => {
    const encryption = new EfficientEncryption();
    const values = Array.from({ length: 1000 }, (_, i) => `sensitive-data-${i}`);

    const start = Date.now();
    for (const v of values) {
      encryption.encrypt(v);
    }
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(500);
  });

  it('deterministic lookup under 1ms', async () => {
    const index = new MaskedFieldIndex();
    const email = 'test@example.com';

    const start = Date.now();
    const hash = index.encryptDeterministic(email);
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(1);
    expect(hash).toBe(index.encryptDeterministic(email)); // Same input = same output
  });
});
```

## Key Points
- Use AES-256-GCM for non-deterministic encryption (display), AES-256-CBC for deterministic (lookup)
- Batch mask existing data in chunks of 5000 records with progress tracking
- Store deterministic hash for indexed fields to enable fast lookups
- Monitor masking middleware performance, alert on slow operations
- Benchmark masking operations to ensure sub-millisecond per-field performance
