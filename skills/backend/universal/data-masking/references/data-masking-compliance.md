# Data Masking Compliance

## Regulatory Data Protection Requirements

| Regulation | Scope | Masking Required | Key Requirements |
|-----------|-------|-----------------|------------------|
| GDPR | EU personal data | Yes | Pseudonymization (Art. 4(5)), data minimization (Art. 5) |
| CCPA/CPRA | California residents | Yes | Right to know, right to delete, opt-out of sale |
| HIPAA | US health data (PHI) | Yes | De-identification standard (§164.514), minimum necessary |
| PCI DSS | Cardholder data | Yes | Mask PAN when displayed (§3.3), truncation (§3.4) |
| LGPD | Brazil personal data | Yes | Anonymization (Art. 12), data protection by design |
| PIPEDA | Canada personal data | Yes | Safeguards principle, consent for collection |

## Data Classification Framework

```yaml
classifications:
  public:
    description: No harm if disclosed
    examples: [product_name, category, public_profile]
    protection: none
    masking: none

  internal:
    description: Internal business data
    examples: [employee_id, department, role]
    protection: access_control
    masking: none

  confidential:
    description: Business-sensitive
    examples: [revenue, pricing_strategy, contracts]
    protection: access_control + encryption_at_rest
    masking: mask_in_external_reports

  pii:
    description: Personal data
    examples: [email, phone, address, name]
    protection: encryption + access_control
    masking: mask_in_non_essential_contexts

  sensitive_pii:
    description: High-risk personal data
    examples: [ssn, passport, biometrics, health_records]
    protection: encryption + tokenization + audit
    masking: tokenize_or_encrypt_in_all_contexts

  pci:
    description: Payment card data
    examples: [pan, cvv, track_data, pin]
    protection: encryption + tokenization + audit + pci_dss_compliant
    masking: tokenize (never store PAN)
```

## GDPR Pseudonymization Implementation

```typescript
// GDPR Article 4(5) — Pseudonymization
class PseudonymizationService {
  private readonly algorithm = 'aes-256-gcm';
  private readonly key: Buffer;

  constructor(keyId: string) {
    this.key = kms.decrypt(keyId); // Key never touches disk
  }

  pseudonymize(value: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);
    const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();
    // Format: base64(iv):base64(authTag):base64(encrypted)
    return [
      iv.toString('base64'),
      authTag.toString('base64'),
      encrypted.toString('base64'),
    ].join(':');
  }

  // Re-identification requires access to the encryption key
  // Log every re-identification attempt for audit
  async repseudonymize(pseudonymizedValue: string): Promise<string> {
    auditLog.append({ eventType: 'pseudonym.reversal', timestamp: new Date() });
    const [iv, authTag, encrypted] = pseudonymizedValue
      .split(':').map(s => Buffer.from(s, 'base64'));
    const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);
    decipher.setAuthTag(authTag);
    return decipher.update(encrypted) + decipher.final('utf8');
  }
}
```

## HIPAA De-Identification

```typescript
// HIPAA Safe Harbor method — remove all 18 identifiers
function deidentifyForHipaa(record: PHIRecord): DeidentifiedRecord {
  return {
    ...record,
    // Direct identifiers — remove all
    name: undefined,
    geographicSubdivision: undefined,
    dates: this.shiftDates(record.dates, randomOffset),
    phone: undefined,
    fax: undefined,
    email: undefined,
    ssn: undefined,
    medicalRecordNumber: undefined,
    healthPlanId: undefined,
    accountNumber: undefined,
    certificateNumber: undefined,
    vehicleIdentifier: undefined,
    deviceIdentifier: undefined,
    url: undefined,
    ip: undefined,
    biometricId: undefined,
    photo: undefined,
    anyOtherUniqueId: undefined,
    ageOver89: record.age > 89 ? '90+' : record.age,
  };
}

// Expert determination method (§164.514(b)(1))
// Requires statistician to certify re-identification risk is very small
function applyExpertMethod(record: PHIRecord): DeidentifiedRecord {
  return {
    ...record,
    name: this.generalize(record.name, { type: 'random_replace' }),
    zip: this.generalize(record.zip, { type: 'truncate', keepLeft: 3 }), // 12345 → 123**
    dob: this.generalize(record.dob, { type: 'year_only' }), // 1985-06-15 → 1985
    diagnosis: this.generalize(record.diagnosis, { type: 'category', mapping: DIAGNOSIS_MAP }),
  };
}
```

## PCI DSS Masking Requirements

```yaml
pci_dss_masking:
  pan:
    display: "First 6 and last 4 digits only"
    example: "411111******1111"
    storage: "Must be tokenized or encrypted at rest"
    truncation: "Never store full PAN after authorization"
  cvv:
    display: "Never display or store"
    storage: "Prohibited after authorization"
  track_data:
    display: "Never display or store"
    storage: "Prohibited after authorization"
  pin:
    display: "Never display"
    storage: "Must be encrypted with hardware module"
```

## CCPA Deletion vs Anonymization

```typescript
// CCPA right to delete — anonymize, don't cascade delete
async function handleCCPADeletion(userId: string): Promise<void> {
  // 1. Anonymize the user record
  await db.query(`
    UPDATE users SET
      email = NULL,
      phone = NULL,
      name = concat('deleted_user_', substring(id::text, 1, 8)),
      address = NULL,
      deleted_at = NOW()
    WHERE id = $1 AND deleted_at IS NULL
  `, [userId]);

  // 2. Keep aggregate/analytics data anonymized
  await db.query(`
    UPDATE analytics SET
      user_id = NULL  -- break link, keep aggregated metric
    WHERE user_id = $1
  `, [userId]);

  // 3. Log the deletion (must be retained)
  await auditLog.append({
    eventType: 'ccpa.deletion',
    actorId: 'system',
    resourceType: 'user',
    resourceId: userId,
    action: 'delete',
    metadata: { regulation: 'CCPA', timestamp: new Date().toISOString() },
  });
}
```

## Environment-Based Masking Policy

| Environment | Data | Masking Level |
|-------------|------|---------------|
| Production | Real data | Mask on display, encrypt at rest |
| Staging | Masked real data | All PII masked, PCI tokenized |
| UAT | Masked real data | All PII masked, PCI tokenized |
| Test | Synthetic data | No real data allowed |
| Dev | Synthetic data | No real data allowed |
| Local | Synthetic data | No real data allowed |
