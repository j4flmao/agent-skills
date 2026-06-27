---
name: security-data-security
description: >
  Use this skill when implementing data security: encryption at rest/transit, key management (KMS, HSM), data masking (static, dynamic), column-level security, data privacy (GDPR, CCPA), data classification, data anonymization, tokenization.
  This skill enforces: encryption strategy selection, key management architecture, masking rules, column-level access controls, anonymization technique, compliance controls.
  Do NOT use for: network security (firewalls, VPCs), identity and access management (IAM), application security scanning.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [security, data, privacy, phase-11]
---

# Data Security Agent

## Purpose
Implements data security controls: encryption, key management, masking, column-level security, and data anonymization for regulatory compliance.

## Agent Protocol

### Trigger
User request includes: data security, data encryption, data masking, column-level security, data privacy, GDPR, CCPA, data classification, data anonymization, tokenization, key management, KMS, HSM.

### Protocol
1. Classify data by sensitivity level.
2. Design encryption strategy (at rest, in transit, in use).
3. Select key management approach (KMS, HSM, BYOK).
4. Implement data masking where applicable.
5. Configure column-level security.
6. Apply anonymization techniques for analytics.
7. Document compliance controls.

## Output
Data security framework with encryption strategy, key management, masking rules, compliance controls.

### Response Format
```
## Data Security Framework
### Classification
Levels: [{public, internal, confidential, restricted}]
Coverage: [{data asset: classification level}]

### Encryption
At Rest: {AES-256 / envelope encryption}
In Transit: {TLS 1.2+ / mTLS}
Key Management: {KMS / HSM / BYOK}
Key Rotation: {every N days / automatic}

### Data Masking
Static Masking: {target datasets, masking rules}
Dynamic Masking: {role-based, query-time}
Tokenization: {format-preserving / random / vault-based}

### Column-Level Security
Database: {PostgreSQL / BigQuery / Snowflake}
Method: {row-level security / column ACL / dynamic masking}
Roles: [{role: accessible columns}]

### Anonymization
Technique: {k-anonymity / l-diversity / differential privacy}
Parameters: {k=N / epsilon=N}
GDPR/CCPA: {right to deletion / portability / access}
```

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
- [ ] Data classification levels defined and applied to all data assets.
- [ ] Encryption strategy covers at rest, in transit, and key management.
- [ ] Key management architecture with rotation schedule.
- [ ] Data masking rules applied to non-production and sensitive columns.
- [ ] Column-level security configured per role.
- [ ] Anonymization technique selected and validated.
- [ ] GDPR/CCPA compliance controls documented.

## Workflow

### Step 1: Data Classification
Define classification levels: Public (no impact), Internal (minor), Confidential (moderate), Restricted (severe). Classify all data assets: databases, files, streams, backups. Tag classified data in catalog.

### Step 2: Encryption Strategy
- **At rest**: AES-256 with envelope encryption. Use KMS for key hierarchy. Encrypt databases, S3 buckets, EBS volumes, backups.
- **In transit**: TLS 1.2 minimum, prefer TLS 1.3. mTLS for service-to-service. Enforce on all connections.
- **In use**: Confidential computing (Intel SGX, AMD SEV) for sensitive workloads.

### Step 3: Key Management
- **KMS**: Managed service (AWS KMS, GCP Cloud KMS, Azure Key Vault). Automatic key rotation. Access control via IAM.
- **HSM**: Hardware security module (AWS CloudHSM, Azure Dedicated HSM). FIPS 140-2 Level 3. For regulatory requirements.
- **BYOK**: Import your own key to KMS. Control key material. Rotation rotates within KMS.

### Step 4: Data Masking
- **Static masking**: Create de-identified copies of production data for dev/test. Permanent transformation.
- **Dynamic masking**: Mask at query time based on role. No data modification. Use PostgreSQL `col_a > masking_column`.
- **Tokenization**: Replace sensitive data with tokens. Vault-based (lookup table) or format-preserving (algorithmic).

### Step 5: Column-Level Security
PostgreSQL: Row-Level Security (RLS) policies per table. BigQuery: column ACL on authorized views. Snowflake: dynamic data masking with masking policies. Grant access based on data classification and role.

### Step 6: Anonymization
- **k-anonymity**: Each record indistinguishable from k-1 others. Generalize or suppress quasi-identifiers.
- **l-diversity**: Each equivalence class has l distinct sensitive values. Prevents homogeneity attacks.
- **Differential privacy**: Add calibrated noise. Epsilon parameter controls privacy/utility trade-off.

### Step 7: Compliance
GDPR: right to access (data portability), right to deletion (erase records), right to rectification. CCPA: right to know, right to delete, right to opt-out. Document data processing activities. Maintain data flow maps.

## Data Classification Automation

### Classification Levels and Criteria

```yaml
classification_levels:
  public:
    description: "Data that can be freely shared with anyone"
    examples: ["Marketing content", "Published research", "Product documentation"]
    controls: ["No special controls beyond integrity"]
    access: "Unrestricted"
    
  internal:
    description: "Data that should not be publicly exposed but has limited impact if leaked"
    examples: ["Organizational charts", "Internal wikis", "Non-sensitive logs"]
    controls: ["Access control", "Basic encryption at rest"]
    access: "All employees by default"
    
  confidential:
    description: "Data that would cause moderate harm if exposed"
    examples: ["Customer PII", "Financial records", "Source code", "Business plans"]
    controls: ["Encryption at rest and transit", "Access logging", "Least privilege access", "Data masking in non-prod"]
    access: "Role-based, need-to-know basis"
    
  restricted:
    description: "Data that would cause severe harm if exposed"
    examples: ["Passwords", "Payment card numbers", "Health records", "Trade secrets"]
    controls: ["All confidential controls plus:", "Field-level encryption", "Strict access logging with alerting", "Quarterly access review", "HSM key management"]
    access: "Explicitly approved individuals, JIT access"
```

### Automated Classification Pipeline

```yaml
automated_classification:
  discovery:
    tools: ["Apache Atlas", "AWS Macie", "Microsoft Purview", "BigQuery Data Catalog"]
    scanning:
      - "Scan all data stores for sensitive data patterns (regex, ML classifiers)"
      - "Credit card numbers, SSN, email, phone, addresses, passport numbers"
      - "Custom patterns for business-specific sensitive data"
    output: "Data inventory with detected sensitivity labels"
    
  tagging:
    automated:
      - "Auto-tag databases, tables, columns based on scan results"
      - "Tag files and objects in object storage based on content scan"
      - "Tag streaming data at ingestion point based on schema analysis"
    manual:
      - "Data owners can override or refine automated classifications"
      - "Tagged data requires re-certification every 90 days"
      
  enforcement:
    preventive:
      - "Block writes of classified data to unapproved locations"
      - "Prevent export of confidential data to personal devices"
      - "Require approval for bulk access to restricted data"
    detective:
      - "Alert on unauthorized access attempts to classified data"
      - "Monitor data egress patterns for anomaly detection"
      - "Audit all access to restricted data with immutable logs"
```

### Privacy-by-Design Engineering Checklist

```yaml
privacy_by_design:
  system_design:
    - "Data minimization: only collect data needed for stated purpose"
    - "Purpose limitation: data collected for one purpose not reused without consent"
    - "Storage limitation: automated data deletion after retention period"
    - "Privacy impact assessment completed before implementation"
    
  user_rights:
    - "Right to access: API to retrieve all user data in portable format"
    - "Right to deletion: cascading delete across all systems and backups"
    - "Right to rectification: update user data across all stores"
    - "Right to portability: export data in machine-readable format"
    - "Right to object: opt-out mechanism for non-essential processing"
    
  consent_management:
    - "Consent captured at time of data collection — not blanket consent"
    - "Granular consent per purpose — separate toggles for different uses"
    - "Consent records stored with timestamp and version"
    - "Withdrawal mechanism equally accessible as giving consent"
    - "Consent refresh required if purpose changes"
    
  data_protection_impact_assessment_dpia:
    triggers: ["Processing sensitive data", "Large-scale monitoring", "Systematic profiling", "New technology deployment"]
    sections:
      - "System description and purpose"
      - "Data flow mapping"
      - "Privacy risk assessment"
      - "Mitigation measures"
      - "Compliance review sign-off"
```

### De-Identification Techniques Comparison

```yaml
de_identification:
  anonymization:
    k_anonymity:
      description: "Each record indistinguishable from k-1 others"
      example: "Generalize age to ranges (30-40) instead of exact age"
      strength: "Moderate — vulnerable to homogeneity attack"
      use_case: "Published datasets, analytics exports"
    l_diversity:
      description: "Each equivalence class has at least l distinct values for sensitive attribute"
      example: "Blood type distribution within each age-range group has at least 3 distinct values"
      strength: "Strong — prevents attribute disclosure"
      use_case: "Medical research data"
    differential_privacy:
      description: "Add calibrated noise to query results"
      example: "Add Laplace noise to query result: 'count of users > 30 = 1450 + noise'"
      strength: "Very strong — mathematical privacy guarantee"
      epsilon: "Lower ε = more privacy, less accuracy. ε=1: strong privacy, ε=10: weak privacy"
      use_case: "Statistical queries, aggregate analytics"
      
  pseudonymization:
    tokenization:
      description: "Replace identifier with token, mapping stored in secure vault"
      reversibility: "Reversible with vault access"
      format_preserving: "Token looks like original (same format, check digit)"
      use_case: "PCI data, test data generation"
    hashing:
      description: "One-way hash of identifier"
      reversibility: "Irreversible (assuming no rainbow table)"
      salting: "Add unique salt per column to prevent rainbow table attacks"
      use_case: "Event tracking, analytics without PII"
    encryption:
      description: "Encrypt identifier, decrypt only when needed"
      reversibility: "Reversible with key access"
      key_management: "Separate encryption key per data classification level"
      use_case: "Data that needs to be re-identified for legitimate business purpose"
```

## Data Security Implementation Examples

### PostgreSQL Column-Level Encryption
```sql
-- Enable pgcrypto extension
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Encrypted column storage
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    ssn BYTEA,  -- encrypted at rest
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Encrypt on insert
INSERT INTO users (email, ssn)
VALUES (
    'user@example.com',
    pgp_sym_encrypt('123-45-6789', current_setting('app.encryption_key'))
);

-- Decrypt with access check function
CREATE OR REPLACE FUNCTION decrypt_ssn(user_id UUID)
RETURNS TEXT AS $$
BEGIN
    IF current_setting('app.user_role') = 'admin' THEN
        RETURN (
            SELECT pgp_sym_decrypt(ssn, current_setting('app.encryption_key'))
            FROM users WHERE id = user_id
        );
    END IF;
    RAISE EXCEPTION 'Unauthorized';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### PostgreSQL Row-Level Security
```sql
-- Enable RLS on table
ALTER TABLE customer_records ENABLE ROW LEVEL SECURITY;

-- Policy: users can only see their own records
CREATE POLICY user_isolation ON customer_records
    FOR ALL
    USING (user_id = current_setting('app.user_id')::UUID);

-- Policy: admins can see all records
CREATE POLICY admin_access ON customer_records
    FOR ALL
    USING (current_setting('app.user_role') = 'admin');
```

### AWS KMS Envelope Encryption (Python)
```python
import boto3
from cryptography.fernet import Fernet
import base64

kms = boto3.client('kms', region_name='us-east-1')

def encrypt_data(plaintext: bytes) -> dict:
    # Generate a data key (envelope encryption)
    response = kms.generate_data_key(
        KeyId='alias/my-key',
        KeySpec='AES_256'
    )
    ciphertext_blob = response['CiphertextBlob']
    plaintext_key = response['Plaintext']
    
    # Encrypt data with data key
    f = Fernet(base64.urlsafe_b64encode(plaintext_key))
    encrypted = f.encrypt(plaintext)
    
    return {
        'encrypted_data': encrypted,
        'encrypted_key': ciphertext_blob
    }

def decrypt_data(encrypted_data: bytes, encrypted_key: bytes) -> bytes:
    # Decrypt data key with KMS
    response = kms.decrypt(CiphertextBlob=encrypted_key)
    plaintext_key = response['Plaintext']
    
    # Decrypt data
    f = Fernet(base64.urlsafe_b64encode(plaintext_key))
    return f.decrypt(encrypted_data)
```

### Dynamic Data Masking (Snowflake)
```sql
-- Create masking policy
CREATE MASKING POLICY email_mask AS (val STRING) RETURNS STRING ->
  CASE
    WHEN CURRENT_ROLE() IN ('ADMIN', 'COMPLIANCE') THEN val
    ELSE CONCAT(SUBSTR(val, 1, 2), '****@', SUBSTR(val, POSITION('@', val) + 1))
  END;

-- Apply masking policy to column
ALTER TABLE users MODIFY COLUMN email SET MASKING POLICY email_mask;
```

### Differential Privacy Example
```python
import numpy as np

def laplace_mechanism(true_value: float, epsilon: float, sensitivity: float = 1.0) -> float:
    """Add Laplace noise for differential privacy."""
    scale = sensitivity / epsilon
    noise = np.random.laplace(0, scale)
    return true_value + noise

# Query: count of users over 30
true_count = 1450
epsilon = 1.0  # lower = more privacy
private_count = laplace_mechanism(true_count, epsilon)
print(f"Private count: {private_count}")  # e.g., 1448.3
```

## Data Security Anti-Patterns

### Anti-Pattern: Encryption as Silver Bullet
Encrypting data at rest without controlling access to decryption keys provides false security. If an application has the key and is compromised, the attacker can decrypt all data. Defense in depth: encrypt + access control + audit + anomaly detection.

### Anti-Pattern: Ignoring In-Use Encryption
Encrypting at rest and in transit but processing data in plaintext in memory. Cold boot attacks, memory dumps, and compromised hosts can extract in-memory data. Use confidential computing (SGX, SEV, Nitro Enclaves) for sensitive processing. Minimize data in memory windows.

### Anti-Pattern: Same Encryption Key for Everything
Using a single key for all data means compromising one key compromises everything. Use separate keys per data classification level, per environment, and per tenant where applicable. Envelope encryption with KMS provides key hierarchy.

### Anti-Pattern: Static Masking Without Refresh
Creating masked copies of production data once but never refreshing them as production data changes. De-identified copies become stale and useless for testing. Refresh masked datasets on a schedule aligned with development cycles.

### Anti-Pattern: Tokenization Without Vault Security
Token vaults that are less secure than the original data store. Token vault must have stronger security than the systems it protects: HSM-backed encryption, strict network isolation, dedicated access policies, and comprehensive audit logging.

### Anti-Pattern: Anonymization Without Re-identification Testing
Applying k-anonymity or differential privacy without testing against known attack vectors (linkage attacks, homogeneity attacks, differencing attacks). Validate anonymization with the same techniques an adversary would use. Re-test when new data is added.

## Data Security Maturity Model

### Level 1: Basic
- Encryption at rest on databases (default cloud provider encryption)
- TLS for data in transit
- Basic firewall rules for data stores
- Manual data classification (spreadsheets)

### Level 2: Standardized
- Customer-managed encryption keys (CMK/KMS)
- Data classification levels defined and tagged
- Static data masking for non-production environments
- Column-level access control (RLS, views)
- Automated discovery of sensitive data

### Level 3: Advanced
- Envelope encryption with key hierarchy
- Dynamic data masking at query time
- Tokenization for PCI/HIPAA data
- Differential privacy for analytics exports
- Automated data classification and tagging
- Privacy-by-design in SDLC
- Automated retention and deletion policies

### Level 4: Optimized
- Confidential computing for sensitive workloads (SGX/SEV)
- Homomorphic encryption for cross-org computation
- Data security posture management (DSPM)
- Real-time data loss prevention (DLP) at scale
- Self-service data security with policy-as-code
- Automated breach notification systems

## Data Security Operations

### Daily Operations
- Monitor data access logs for anomalies
- Check encryption key status and rotation
- Verify DLP rules are active
- Review data classification alerts

### Weekly Operations
- Analyze data egress patterns
- Review access to restricted data
- Tune DLP rules for false positives
- Validate masking policies work correctly

### Monthly Operations
- Key rotation for high-value data
- Data classification re-certification
- Access review for privileged data roles
- Anonymization re-validation
- Privacy impact assessment updates

### Incident Response
1. Detect: DLP alert, anomalous data access, unauthorized data egress, encryption key compromise
2. Assess: what data was exposed, classification level, affected users, regulatory implications
3. Contain: revoke access, rotate keys, isolate affected data stores, block egress paths
4. Investigate: audit logs, access patterns, data flow analysis
5. Remediate: patch vulnerabilities, update policies, revoke credentials
6. Notify: regulatory bodies (GDPR 72h), affected users, data protection authority
7. Post-mortem: root cause analysis, policy updates, detection improvements

## Compliance Controls Mapping

| Control | GDPR | CCPA | PCI DSS | HIPAA | SOC 2 |
|---|---|---|---|---|---|
| Encryption at rest | Art. 32 | §1798.81.5 | Req 3.4 | §164.312(a)(1) | CC6.1 |
| Encryption in transit | Art. 32 | — | Req 4.1 | §164.312(e)(1) | CC6.1 |
| Access controls | Art. 25 | — | Req 7 | §164.312(a)(1) | CC6.2 |
| Data classification | Art. 30 | — | — | §164.514 | — |
| Data masking | Art. 25 | — | Req 3.4 | §164.514(b) | — |
| Anonymization | Recital 26 | §1798.140 | — | §164.514(a) | — |
| Breach notification | Art. 33 | §1798.29 | Req 12.10 | §164.404 | — |
| Retention limits | Art. 5(1)(e) | — | Req 3.1 | §164.316(b)(2)(i) | — |
| Right to deletion | Art. 17 | §1798.105 | — | — | — |
| Audit logging | Art. 30 | — | Req 10 | §164.312(b) | CC7.2 |

## Rules
- Encryption at rest is mandatory for all data containing PII
- TLS 1.0 and 1.1 are prohibited — enforce TLS 1.2 minimum
- Keys must be rotated at least annually
- Production data must never be used in non-production unmasked
- Column-level access must be enforced at database level — not just application
- Data classification must be applied before any security control
- Anonymization must be validated against re-identification risk
- Automate data classification discovery — manual classification doesn't scale
- Privacy-by-design must be integrated from system design phase, not retrofitted

## References
  - references/data-loss-prevention.md — Data Loss Prevention (DLP)
  - references/data-masking-classification.md — Data Masking, Classification & Compliance
  - references/data-privacy-compliance.md — Data Privacy Compliance
  - references/data-security-advanced.md — Data Security Advanced Topics
  - references/data-security-fundamentals.md — Data Security Fundamentals
  - references/encryption-key-mgmt.md — Encryption & Key Management
## Handoff
For infrastructure security controls, hand off to `devops-cloud-cost-optimization`. For data quality and governance, hand off to `data-quality`.
## Implementation Patterns

### Observer Pattern for Event Handling
`
interface EventObserver<T> {
  onEvent(event: T): Promise<void>;
}

class EventBus<T> {
  private observers: Set<EventObserver<T>> = new Set();
  subscribe(observer: EventObserver<T>): void {
    this.observers.add(observer);
  }
  unsubscribe(observer: EventObserver<T>): void {
    this.observers.delete(observer);
  }
  async emit(event: T): Promise<void> {
    const results = Array.from(this.observers).map(o => o.onEvent(event));
    await Promise.allSettled(results);
  }
}
`

### Configuration-Driven Approach
`
config:
  defaults:
    timeout: 30s
    retryCount: 3
  overrides:
    production:
      timeout: 60s
      retryCount: 5
    development:
      timeout: 300s
      retryCount: 1
`

## Production Considerations

### Deployment Checklist
- [ ] Configuration validated against schema before startup
- [ ] Health check endpoints registered and monitored
- [ ] Graceful shutdown with draining period (30s timeout)
- [ ] Resource limits configured (CPU, memory, file descriptors)
- [ ] Log level set appropriate for environment
- [ ] Metrics endpoint secured and exposed
- [ ] Rate limiting configured per-tier
- [ ] TLS certificates valid and auto-renewing
- [ ] Database migrations run as separate deployment step
- [ ] Feature flags ready for gradual rollout

### Monitoring and Alerting
| Metric | Threshold | Severity | Action |
|--------|-----------|----------|--------|
| Error rate | > 1% over 5min | Critical | Page on-call |
| p99 latency | > 2s over 5min | Warning | Investigate |
| Throughput drop | > 50% over 1min | Critical | Check upstream |
| Queue depth | > 1000 over 1min | Warning | Scale consumers |
| Disk usage | > 85% | Warning | Clean or expand |
| Memory usage | > 90% heap | Critical | Restart or scale |

## Anti-Patterns

| Anti-Pattern | Symptom | Root Cause | Solution |
|-------------|---------|------------|----------|
| Premature optimization | Complex code for no measured benefit | Guessing instead of profiling | Measure first, optimize based on data |
| Copy-paste reuse | Duplicate code across codebase | Lack of abstraction | Extract shared logic into libraries |
| Gold-plating | Features with no current requirement | Over-engineering | YAGNI — build what's needed now |
| Magical thinking | Assumptions without validation | Skipping error handling | Handle all failure modes explicitly |

## Performance Optimization

### Caching Strategy
Cache hierarchy: L1 (in-memory local) → L2 (distributed Redis/Memcached) → L3 (CDN/Edge).
Cache invalidation: TTL-based (simple, stale), event-based (complex, fresh), write-through (consistent, higher write latency), write-behind (fast writes, eventual consistency).

### Resource Pooling
- Database connections: Pool of reusable connections (HikariCP, pgBouncer)
- HTTP connections: Keep-alive + connection pooling for external calls
- Thread pool: Bounded thread pools for async task execution

### Profiling Methodology
1. Establish baseline with production traffic profile
2. Profile CPU with sampling profiler (pprof, perf, async-profiler)
3. Profile memory with heap dumps and allocation tracking
4. Profile I/O with strace/perf trace for syscall analysis
5. Profile latency with distributed tracing (OpenTelemetry)
6. Identify bottleneck, formulate hypothesis, implement fix
7. Re-profile to verify improvement, repeat

## Security Considerations

### Threat Modeling (STRIDE)
- Spoofing: Identity validation, authentication
- Tampering: Integrity checks, digital signatures
- Repudiation: Audit logs, non-repudiation
- Information disclosure: Encryption, access control
- Denial of service: Rate limiting, resource quotas
- Elevation of privilege: Principle of least privilege

### Supply Chain Security
- Dependency scanning: Snyk, Dependabot, Trivy
- SBOM generation: CycloneDX or SPDX format
- Signed commits: GPG or SSH commit signing
- Artifact verification: Checksum validation, signature verification

### Secrets Management
- Secrets never in code — always in secrets manager (Vault, AWS Secrets Manager)
- Rotation policy: Rotate database credentials every 90 days
- Access audit: Log every secrets access, alert on anomalies
- Encryption at rest and in transit for all secrets
- Principle of least privilege: each service gets only its own secrets

## Rules
- Default-deny security posture — allow only explicitly required access.
- All inputs validated, all outputs encoded, all errors handled.
- Defend in depth — multiple layers of security controls.
- Fail securely — errors default to safe behavior.
- Log security-relevant events for audit and investigation.
- Keep dependencies updated — automate vulnerability scanning.
- Design for observability from day one, not as an afterthought.
- Document all architectural decisions with rationale.
- Review code for security, performance, and correctness before merging.