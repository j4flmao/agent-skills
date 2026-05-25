# Data Masking Techniques

## Masking Techniques Overview

| Technique | Reversible | Format Preserving | Use Case |
|-----------|-----------|-------------------|----------|
| Redaction | No | No | Remove sensitive data entirely |
| Substitution | No | Yes | Replace with realistic fake data |
| Shuffling | No | Yes | Anonymize by permuting values |
| Masking (partial) | No | Yes | Show first/last characters only |
| Nulling | No | No | Set to NULL or empty |
| Tokenization | Yes (vault) | Yes | Replace with token, store in vault |
| Encryption | Yes (key) | No | Field-level encryption |
| Hashing | No (one-way) | No | Consistent pseudonymization |
| Differential Privacy | No | No | Add statistical noise |

## Partial Masking Patterns

```typescript
function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (local.length <= 2) return `${local[0]}***@${domain}`;
  return `${local[0]}${'*'.repeat(local.length - 2)}${local[local.length - 1]}@${domain}`;
  // john.doe@example.com → j*******e@example.com
}

function maskPhone(phone: string): string {
  return phone.replace(/\d(?=\d{4})/g, '*');
  // +1-555-123-4567 → +1-***-***-4567
}

function maskCreditCard(card: string): string {
  return card.replace(/\d{12}/, '****-****-****');
  // 4111-1111-1111-1111 → ****-****-****-1111
}

function maskSSN(ssn: string): string {
  return ssn.replace(/^\d{3}-\d{2}/, '***-**');
  // 123-45-6789 → ***-**-6789
}
```

## Substitution Data Generation

```typescript
// Generate realistic fake data for test environments
class DataSubstitutor {
  private names = ['Alice', 'Bob', 'Carol', 'Dave'];
  private cities = ['Springfield', 'Riverside', 'Fairview'];

  substitute(record: UserRecord): UserRecord {
    return {
      ...record,
      name: this.randomFrom(this.names),
      email: `${record.id}@anonymized.example.com`,
      address: {
        street: `${Math.floor(Math.random() * 9999)} Anon St`,
        city: this.randomFrom(this.cities),
        zip: '00000',
      },
    };
  }

  private randomFrom<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
  }
}
```

## Tokenization Architecture

```
Application
    │
    ├─ Sensitive data → Token Vault → Returns token
    │                        │
    │                   ┌────┴────┐
    │                   │  Token  │
    │                   │  Store  │
    │                   │(KMS/HSM)│
    │                   └─────────┘
    │
    └─ Stores token in application database
       (sensitive data never touches app DB)
```

```typescript
class TokenizationService {
  constructor(private vault: VaultClient) {}

  async tokenize(plaintext: string, context: string): Promise<string> {
    // Check if already tokenized
    const existing = await this.vault.findByPlaintext(plaintext, context);
    if (existing) return existing.token;

    // Generate new token
    const token = `tok_${crypto.randomUUID()}`;
    await this.vault.store(token, { plaintext, context, createdAt: new Date() });
    return token;
  }

  async detokenize(token: string): Promise<string | null> {
    const entry = await this.vault.read(token);
    return entry?.plaintext ?? null;
  }
}
```

## Database-Level Masking

```sql
-- PostgreSQL dynamic masking with extension
CREATE EXTENSION IF NOT EXISTS anon CASCADE;
SELECT anon.init();

-- Declare masked users
SECURITY LABEL FOR anon ON COLUMN users.email
  IS 'MASKED WITH FUNCTION anon.partial(email, 2, $$****$$)';
SECURITY LABEL FOR anon ON COLUMN users.phone
  IS 'MASKED WITH FUNCTION anon.partial(phone, 4, $$***-***-$$)';
SECURITY LABEL FOR anon ON COLUMN users.ssn
  IS 'MASKED WITH FUNCTION anon.partial(ssn, 4, $$***-**-$$)';

-- Apply masking for non-privileged roles
CREATE ROLE app_readonly;
SECURITY LABEL FOR anon ON ROLE app_readonly IS 'MASKED';
```

## Application-Level Masking Middleware

```typescript
function maskingInterceptor(maskConfig: MaskConfig): NestInterceptor {
  return {
    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
      return next.handle().pipe(
        map((response) => {
          if (!response?.data) return response;
          const masked = applyMasking(response.data, maskConfig);
          return { ...response, data: masked };
        }),
      );
    },
  };
}

// Configuration
const maskConfig: MaskConfig = {
  fields: {
    'user.email': { type: 'partial', prefixVisible: 1, suffixVisible: 1, padChar: '*' },
    'user.phone': { type: 'partial', suffixVisible: 4, padChar: '*' },
    'payment.cardNumber': { type: 'partial', suffixVisible: 4, prefix: '****-****-****-' },
    'user.ssn': { type: 'redact', replacement: '***-**-****' },
  },
};
```

## Technique Selection Matrix

| Data Type | Classification | DEV/TEST | UAT/Staging | Production API |
|-----------|---------------|----------|-------------|----------------|
| Email | PII | Substitute | Mask | Mask (need-to-know) |
| Phone | PII | Substitute | Mask | Mask |
| SSN | Sensitive PII | Tokenize | Tokenize | Encrypt + Mask |
| Credit Card | PCI | Tokenize | Tokenize | Tokenize |
| Address | PII | Substitute | Substitute | Mask |
| Diagnosis | PHI | Substitute | Encrypt | Encrypt |
| Name | PII | Substitute | Mask | Mask |
| IP Address | PII | Null/Substitute | Mask | Mask |
