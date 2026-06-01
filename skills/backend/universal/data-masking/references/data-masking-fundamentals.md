# Data Masking Fundamentals

## What is Data Masking?

Data masking is the process of hiding or obscuring sensitive data to protect it from unauthorized access. Unlike encryption (which is reversible with a key), masking often produces irreversible transformations meant for display or non-production use.

## Protection Types

### Masking (Irreversible)
Shows a partial view of data. Used for display purposes where the full value is not needed.

| Original | Masked | Use Case |
|----------|--------|----------|
| john.doe@email.com | j*******@email.com | Customer support UI |
| 1234-5678-9012-3456 | ****-****-****-3456 | Order confirmation |
| +1 (555) 123-4567 | +1 (***) ***-4567 | User profile display |
| John Doe | J*** D** | Public directory |

### Encryption (Reversible)
Transforms data using a cryptographic algorithm and key. The original value can be recovered with the correct key. Used for data at rest.

### Tokenization (Reversible with Vault)
Replaces sensitive data with a surrogate (token) stored in a secure vault. The original value can only be retrieved through the vault. Used for PCI-DSS compliance.

### Anonymization (Irreversible)
Removes or transforms data so it cannot be linked to an individual. Used for analytics and data sharing.

### Redaction (Complete Removal)
Removes the data entirely from the output. Used for logs and error messages.

## PII Detection

### Automated Detection Patterns
```python
import re

PII_PATTERNS = {
    'email': r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}',
    'phone_us': r'\+?1?\s*\(?[0-9]{3}\)?[\s.-]?[0-9]{3}[\s.-]?[0-9]{4}',
    'ssn': r'\b\d{3}-\d{2}-\d{4}\b',
    'credit_card': r'\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b',
    'ip_address': r'\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b',
}

def detect_pii(text: str) -> list[dict]:
    findings = []
    for pattern_name, pattern in PII_PATTERNS.items():
        for match in re.finditer(pattern, text):
            findings.append({
                'type': pattern_name,
                'value': match.group(),
                'position': match.span(),
            })
    return findings
```

## Compliance Requirements

### GDPR (Europe)
- Right to be forgotten (Article 17)
- Data portability (Article 20)
- Consent management (Article 7)
- Breach notification (Article 33)

### CCPA (California)
- Right to know what data is collected
- Right to delete personal information
- Right to opt-out of sale
- Non-discrimination for exercising rights

### HIPAA (Healthcare)
- Protected Health Information (PHI) must be encrypted at rest
- Audit controls for all PHI access
- Integrity controls to prevent unauthorized modification

### PCI-DSS (Payment Cards)
- Primary Account Number (PAN) must be tokenized or encrypted
- Encryption keys must be managed per PCI requirements
- Cardholder data cannot be stored after authorization

## Implementation Approaches

### Application-Level Masking
```typescript
// Interceptor/service that masks sensitive fields in API responses
class DataMaskingInterceptor {
  maskResponse(data: any, user: UserContext): any {
    if (user.role === 'admin' || user.role === 'owner') {
      return data; // Full access
    }
    return this.applyMaskingRules(data, this.getMaskingRules(user.role));
  }

  private getMaskingRules(role: string): MaskingRule[] {
    const rules = {
      agent: [
        { field: 'email', mask: 'partial_email' },
        { field: 'phone', mask: 'partial_phone' },
      ],
      customer: [
        { field: 'email', mask: 'full' },
        { field: 'phone', mask: 'partial_phone' },
        { field: 'name', mask: 'first_name_only' },
      ],
      public: [
        { field: 'email', mask: 'full' },
        { field: 'phone', mask: 'full' },
        { field: 'name', mask: 'full' },
      ],
    };
    return rules[role] || [];
  }
}
```

### Database-Level Encryption
```sql
-- PostgreSQL pgcrypto extension for transparent encryption
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Encrypt at insert
INSERT INTO users (id, email, ssn)
VALUES (
  1,
  pgp_sym_encrypt('user@example.com', current_setting('app.encryption_key')),
  pgp_sym_encrypt('123-45-6789', current_setting('app.encryption_key'))
);

-- Decrypt on read (with appropriate permissions)
SELECT
  pgp_sym_decrypt(email, current_setting('app.encryption_key')) AS email
FROM users WHERE id = 1;
```

## Log Sanitization

### Structured Logging with PII Stripping
```typescript
class PiiSafeLogger {
  private piiFields = ['email', 'phone', 'ssn', 'creditCard', 'password'];

  info(message: string, context?: Record<string, any>): void {
    const sanitized = this.stripPii(context);
    logger.info(message, sanitized);
  }

  private stripPii(context?: Record<string, any>): Record<string, any> | undefined {
    if (!context) return undefined;
    const result = { ...context };
    for (const key of Object.keys(result)) {
      if (this.piiFields.includes(key)) {
        result[key] = '[REDACTED]';
      }
      if (typeof result[key] === 'string' && this.containsPii(result[key])) {
        result[key] = this.maskPii(result[key]);
      }
    }
    return result;
  }
}
```

## Testing Data Masking

### Verification Tests
```typescript
describe('DataMaskingService', () => {
  it('masks email for basic user role', () => {
    const result = maskingService.maskUser(userData, { role: 'basic' });
    expect(result.email).not.toContain('john');
    expect(result.email).toMatch(/^j\*+@/);
  });

  it('does not mask for admin role', () => {
    const result = maskingService.maskUser(userData, { role: 'admin' });
    expect(result.email).toBe('john.doe@example.com');
  });

  it('audits access to sensitive fields', () => {
    maskingService.maskUser(userData, { role: 'basic' });
    expect(auditLog.write).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'READ_SENSITIVE_FIELD' })
    );
  });
});
```
