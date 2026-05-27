# Zero Trust Data

## Purpose

Zero Trust Data protection extends the "never trust, always verify" principle to data itself. Data is classified, tagged, encrypted, and access-controlled regardless of where it lives — in databases, object storage, APIs, files, or transit. This covers data classification, encryption at rest and in transit, data loss prevention (DLP), access control per data sensitivity, data tagging, audit logging, and data lineage.

## Data-Centric Zero Trust

### Core Principles

1. **Data is the perimeter** — security follows the data, not the network boundary
2. **Classify everything** — every data element has a sensitivity label
3. **Encrypt everywhere** — at rest (storage) and in transit (network)
4. **Access by need** — read access is granted per data element, not per bucket/share
5. **Audit everything** — every access to sensitive data is logged
6. **Never trust storage** — even authorized queries must be filtered by sensitivity

### Data Security Layers

```
+--------------------------------------------------+
|            Data Classification                    |
|  (Public, Internal, Confidential, Restricted)     |
+--------------------------------------------------+
|              Data Tagging & Labeling              |
|  (Column-level, row-level, file-level metadata)   |
+--------------------------------------------------+
|         Access Control (ABAC / RBAC)              |
|  (User identity + data sensitivity + context)     |
+--------------------------------------------------+
|           Encryption (At Rest / Transit)          |
|  (AES-256, envelope encryption, mTLS, TLS 1.3)   |
+--------------------------------------------------+
|           Audit Logging & Data Lineage            |
|  (Who accessed what, when, from where, why)       |
+--------------------------------------------------+
```

## Data Classification

### Classification Levels

| Level | Definition | Examples | Access Requirements |
|-------|------------|----------|-------------------|
| Public | No harm if disclosed | Product names, press releases | No auth required |
| Internal | Moderate harm | Internal docs, org charts | Authenticated user |
| Confidential | Significant harm | PII, financial data, source code | Auth + business need |
| Restricted | Severe harm | Trade secrets, classified, PHI | Auth + explicit approval + audit |

### Classification Schema

```yaml
# Data classification metadata
classification:
  schema_version: "1.0"
  levels:
    - id: public
      label: "PUBLIC"
      policy: "No restrictions"
      encryption: "None required"
      retention: "Indefinite"

    - id: internal
      label: "INTERNAL"
      policy: "Authenticated access only"
      encryption: "TLS 1.2+ in transit"
      retention: "3 years"

    - id: confidential
      label: "CONFIDENTIAL"
      policy: "Need-to-know basis, written approval"
      encryption: "AES-256 at rest, TLS 1.3 in transit"
      retention: "7 years"
      masking: "Required in non-production"
      drm: "Watermark displayed on view"

    - id: restricted
      label: "RESTRICTED"
      policy: "Explicit approval + JIT access + full audit"
      encryption: "AES-256 with HSM-backed keys"
      retention: "Indefinite"
      masking: "Masked by default, unmask on request"
      drm: "Screen capture blocked, watermark + fingerprint"
      air_gap: "No network egress"
```

### Automated Classification

```typescript
// Automated data classification based on content scanning
interface ClassificationRule {
  pattern: RegExp
  level: ClassificationLevel
  label: string
  action: 'mask' | 'encrypt' | 'block' | 'alert'
}

const classificationRules: ClassificationRule[] = [
  {
    pattern: /^\d{3}-\d{2}-\d{4}$/,  // SSN
    level: 'restricted',
    label: 'SSN',
    action: 'mask',
  },
  {
    pattern: /^[A-Z]{2}\d{6}[A-Z\d]{2}\d[A-Z\d]{3}$/,  // Passport
    level: 'restricted',
    label: 'PASSPORT',
    action: 'encrypt',
  },
  {
    pattern: /^\d{16}$/,  // Credit card number (PAN)
    level: 'confidential',
    label: 'PAN',
    action: 'mask',
  },
  {
    pattern: /^[\w.+-]+@[\w-]+\.[\w.-]+$/,  // Email
    level: 'internal',
    label: 'EMAIL',
    action: 'alert',
  },
]
```

## Data Tagging

### Column-Level Tagging

```sql
-- PostgreSQL — column comments for sensitivity
COMMENT ON COLUMN users.ssn IS 'SENSITIVITY:RESTRICTED;CLASSIFICATION:PII;ENCRYPT:AES256';
COMMENT ON COLUMN users.email IS 'SENSITIVITY:CONFIDENTIAL;CLASSIFICATION:PII;MASK:true';
COMMENT ON COLUMN users.phone IS 'SENSITIVITY:CONFIDENTIAL;CLASSIFICATION:PII;MASK:true';
COMMENT ON COLUMN users.name IS 'SENSITIVITY:INTERNAL;CLASSIFICATION:DEMOGRAPHIC';
```

### Row-Level Tagging with PostgreSQL Row Level Security

```sql
-- Enable row-level security
ALTER TABLE patient_records ENABLE ROW LEVEL SECURITY;

-- Add classification column per row
ALTER TABLE patient_records ADD COLUMN sensitivity_level TEXT NOT NULL DEFAULT 'internal';

-- RLS policy based on sensitivity + user role
CREATE POLICY patient_access ON patient_records
  USING (
    sensitivity_level = 'public'
    OR (sensitivity_level = 'internal' AND current_user = 'app_user')
    OR (sensitivity_level = 'confidential'
        AND EXISTS (
          SELECT 1 FROM user_permissions
          WHERE user_id = current_user
            AND resource_type = 'patient_record'
            AND resource_id = patient_records.id
        ))
    OR (sensitivity_level = 'restricted'
        AND EXISTS (
          SELECT 1 FROM jit_access
          WHERE user_id = current_user
            AND resource_id = patient_records.id
            AND expires_at > now()
        ))
  );
```

### Tag Propagation

```yaml
# Tags propagate through the data pipeline
source:
  database: "PostgreSQL production"
  table: "users"
  columns:
    - name: "ssn"
      tags: ["pii", "restricted", "us-identity"]
    - name: "email"
      tags: ["pii", "confidential", "contact"]

etl:
  - source: "users.ssn"
    destination: "analytics.customers.ssn_tokenized"
    action: "tokenize"  # Replace with token, store mapping
    tags: ["tokenized", "pii-token"]

  - source: "users.email"
    destination: "analytics.customers.email_hash"
    action: "hash"       # SHA-256 hash
    tags: ["hashed", "pii-hash"]
```

## Encryption at Rest

### Database-Level Encryption (TDE)

```sql
-- PostgreSQL — cluster-level encryption (pg_tde or disk encryption)
-- Transparent Data Encryption at the storage layer

-- Column-level encryption with pgcrypto
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create encryption function with master key
CREATE OR REPLACE FUNCTION encrypt_ssn(ssn TEXT) RETURNS BYTEA AS $$
DECLARE
  key BYTEA;
BEGIN
  key := current_setting('app.encryption_key')::BYTEA;
  RETURN pgp_sym_encrypt(ssn, key);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Decryption function (audited)
CREATE OR REPLACE FUNCTION decrypt_ssn(encrypted BYTEA) RETURNS TEXT AS $$
DECLARE
  key BYTEA;
BEGIN
  PERFORM log_access('decrypt_ssn', current_user, now());
  key := current_setting('app.encryption_key')::BYTEA;
  RETURN pgp_sym_decrypt(encrypted, key);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Envelope Encryption (KMS)

```typescript
// AWS KMS envelope encryption
import { KMS } from '@aws-sdk/client-kms'

const kms = new KMS({ region: 'us-east-1' })

async function encryptSensitiveData(plaintext: string, context: Record<string, string>): Promise<Buffer> {
  const { CiphertextBlob } = await kms.encrypt({
    KeyId: process.env.KMS_KEY_ID,
    Plaintext: Buffer.from(plaintext, 'utf-8'),
    EncryptionContext: context,  // Additional authenticated data
  })
  return Buffer.from(CiphertextBlob!)
}

async function decryptSensitiveData(ciphertext: Buffer, context: Record<string, string>): Promise<string> {
  const { Plaintext } = await kms.decrypt({
    CiphertextBlob: ciphertext,
    EncryptionContext: context,
  })
  return Buffer.from(Plaintext!).toString('utf-8')
}

// Usage: encrypt with row-level context
const encryptedSSN = await encryptSensitiveData(user.ssn, {
  'department': 'hr',
  'resource': `user/${user.id}`,
  'purpose': 'payroll-processing',
})
```

### Object Storage Encryption

```yaml
# S3 bucket encryption
aws s3api put-bucket-encryption \
  --bucket confidential-data \
  --server-side-encryption-configuration '{
    "Rules": [
      {
        "ApplyServerSideEncryptionByDefault": {
          "SSEAlgorithm": "aws:kms",
          "KMSMasterKeyID": "arn:aws:kms:us-east-1:123456789:key/abc-123"
        },
        "BucketKeyEnabled": true
      }
    ]
  }'

# Bucket policy — deny unencrypted uploads
{
  "Effect": "Deny",
  "Principal": "*",
  "Action": "s3:PutObject",
  "Resource": "arn:aws:s3:::confidential-data/*",
  "Condition": {
    "StringNotEquals": {
      "s3:x-amz-server-side-encryption": "aws:kms"
    }
  }
}
```

## Encryption in Transit

### Service-to-Service Encryption

```yaml
# Istio — strict mTLS per namespace
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: strict-mtls
  namespace: production
spec:
  mtls:
    mode: STRICT

# Destinations that require TLS origination
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: external-db
spec:
  host: mydb.cluster-xyz.us-east-1.rds.amazonaws.com
  trafficPolicy:
    tls:
      mode: SIMPLE  # Originate TLS
    connectionPool:
      tcp:
        maxConnections: 100
  subsets:
    - name: v1
      labels:
        version: v1
```

### Database Connection Encryption

```typescript
// PostgreSQL — require TLS
const { Client } = require('pg')

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: true,      // Verify server certificate
    ca: fs.readFileSync('./ca.pem'),  // Custom CA
    cert: fs.readFileSync('./client-cert.pem'),  // Client cert for mTLS
    key: fs.readFileSync('./client-key.pem'),
  },
})
```

## Data Loss Prevention (DLP)

### API-Level DLP

```typescript
// Express middleware — DLP inspection on response bodies
import { DLP } from '@google-cloud/dlp'

const dlp = new DLP()

async function dlpMiddleware(req: Request, res: Response, next: NextFunction) {
  const originalSend = res.send.bind(res)

  res.send = async function (body: any): Promise<Response> {
    // Only inspect responses containing sensitive data
    if (res.getHeader('content-type')?.includes('json') && body) {
      const [response] = await dlp.inspectContent({
        parent: `projects/${process.env.GCP_PROJECT}`,
        item: { value: JSON.stringify(body) },
        inspectConfig: {
          infoTypes: [
            { name: 'US_SOCIAL_SECURITY_NUMBER' },
            { name: 'CREDIT_CARD_NUMBER' },
            { name: 'PHONE_NUMBER' },
            { name: 'EMAIL_ADDRESS' },
          ],
          minLikelihood: 'LIKELY',
          includeQuote: true,
        },
      })

      if (response.result?.findings?.length > 0) {
        console.warn('DLP finding in response:', {
          path: req.path,
          findings: response.result.findings.map(f => ({ type: f.infoType.name, likelihood: f.likelihood })),
        })
      }
    }
    return originalSend(body)
  }

  next()
}
```

### Database-Level DLP

```sql
-- Dynamic data masking in PostgreSQL
CREATE EXTENSION IF NOT EXISTS anon CASCADE;

-- Mask SSN — show only last 4 digits
SECURITY LABEL FOR anon ON COLUMN users.ssn
  IS 'MASKED WITH FUNCTION anon.partial(ssn, 0, $$***-**-$$, 4)';

-- Mask email — show first letter and domain
SECURITY LABEL FOR anon ON COLUMN users.email
  IS 'MASKED WITH FUNCTION anon.partial(email, 1, $$xxxxx@$$, 6)';

-- Mask phone — show only last 4 digits
SECURITY LABEL FOR anon ON COLUMN users.phone
  IS 'MASKED WITH FUNCTION anon.partial(phone, 0, $$***-***-$$, 4)';

-- Apply masking to non-privileged users
CREATE ROLE analyst;
GRANT SELECT ON users TO analyst;
SECURITY LABEL FOR anon ON ROLE analyst IS 'MASKED';
```

### File-Level DLP

```yaml
# S3 event notification → DLP inspection → quarantine
Notifications:
  - event: s3:ObjectCreated:*
    destination:
      type: Lambda
      function: dlp-inspector

Lambda: dlp-inspector:
  triggers:
    - s3:ObjectCreated:*
  actions:
    - Inspect file content for PII/PCI/PHI
    - If violation found:
        1. Copy file to quarantine bucket
        2. Tag original with `dlp-status: blocked`
        3. Alert security team
        4. Block public access

Quarantine:
  bucket: myorg-dlp-quarantine
  retention: "30 days"
  access: security-team-only
```

## Access Control by Data Sensitivity

### Attribute-Based Access Control (ABAC)

```typescript
interface AccessRequest {
  userId: string
  userRole: string
  userDepartment: string
  userClearance: ClassificationLevel
  resourceType: string
  resourceSensitivity: ClassificationLevel
  resourceTags: string[]
  action: 'read' | 'write' | 'masked_read' | 'export'
  context: {
    ip: string
    devicePosture: string
    timeOfDay: string
    location: string
    isJIT: boolean
  }
}

function evaluateAccess(request: AccessRequest): 'grant' | 'deny' | 'masked' | 'jit_required' {
  // Principle: sensitivity level must be <= clearance level
  const sensitivityOrder = ['public', 'internal', 'confidential', 'restricted']
  const userLevel = sensitivityOrder.indexOf(request.userClearance)
  const resourceLevel = sensitivityOrder.indexOf(request.resourceSensitivity)

  if (userLevel < resourceLevel) {
    return 'deny'  // User clearance insufficient
  }

  // Restricted data requires JIT approval
  if (request.resourceSensitivity === 'restricted' && !request.context.isJIT) {
    return 'jit_required'
  }

  // Confidential data outside work hours = masked
  if (request.resourceSensitivity === 'confidential'
    && (request.context.timeOfDay < '06:00' || request.context.timeOfDay > '20:00')) {
    return 'masked'
  }

  // Exporting confidential data requires specific permission
  if (request.action === 'export' && request.resourceSensitivity === 'confidential') {
    if (request.userRole !== 'data-admin') {
      return 'deny'
    }
  }

  return 'grant'
}
```

### Dynamic Access Control

```typescript
// Enforce access at query time
class SensitiveDataService {
  async queryUsers(filters: UserFilter, user: AuthenticatedUser): Promise<UserDTO[]> {
    const sensitivityLevel = user.clearance

    const users = await this.db.query(`
      SELECT
        id,
        name,
        email,
        CASE WHEN $1 >= 3 THEN ssn ELSE '***-**-****' END as ssn,
        CASE WHEN $1 >= 2 THEN phone ELSE '***-***-****' END as phone,
        created_at
      FROM users
    `, [sensitivityLevel])

    return users.map(u => ({
      ...u,
      // Additional masking based on context
      email: user.department === u.department ? u.email : this.maskEmail(u.email),
    }))
  }
}
```

## Audit Logging

### Immutable Audit Log

```sql
-- Append-only audit table
CREATE TABLE data_access_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp       TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_id         UUID NOT NULL,
  user_role       TEXT NOT NULL,
  action          TEXT NOT NULL,  -- 'read' | 'write' | 'export' | 'masked_read'
  resource_type   TEXT NOT NULL,
  resource_id     TEXT NOT NULL,
  sensitivity     TEXT NOT NULL,
  context_json    JSONB NOT NULL DEFAULT '{}',
  query_hash      TEXT,  -- Hash of the SQL query
  row_count       INTEGER,
  duration_ms     INTEGER,
  decision        TEXT NOT NULL,  -- 'granted' | 'denied' | 'masked' | 'jit_approved'
  -- Immutable constraint
  CONSTRAINT data_access_log_immutable CHECK (id IS NOT NULL)
);

-- Prevent any modification
CREATE RULE data_access_log_no_update AS
  ON UPDATE TO data_access_log DO INSTEAD NOTHING;
CREATE RULE data_access_log_no_delete AS
  ON DELETE TO data_access_log DO INSTEAD NOTHING;
```

### Structured Audit Events

```json
{
  "version": "1.0",
  "eventId": "evt_abc123",
  "timestamp": "2026-05-15T10:30:00.123Z",
  "type": "data.access",
  "user": {
    "id": "user_xyz",
    "email": "alice@company.com",
    "role": "analyst",
    "department": "marketing"
  },
  "resource": {
    "type": "database.table.column",
    "id": "production.users.ssn",
    "sensitivity": "restricted",
    "tags": ["pii", "us-identity", "payroll"]
  },
  "action": "read",
  "decision": "granted",
  "context": {
    "source_ip": "10.0.1.50",
    "application": "admin-portal",
    "session_id": "sess_789",
    "justification": "Payroll audit Q2 2026",
    "is_jit": true,
    "jit_approved_by": "manager_def",
    "device_posture": "compliant"
  },
  "lineage": {
    "query_hash": "sha256:a1b2c3...",
    "source_system": "postgresql-primary",
    "access_pattern": "direct-query"
  }
}
```

### Alerting on Audit Events

```yaml
# SIEM alert rules for data access
alerts:
  - name: "Restricted Data Access Outside Business Hours"
    filter: "data.access AND sensitivity:restricted AND time:22:00-06:00"
    severity: critical
    action: "PagerDuty notification + Slack #security"

  - name: "Bulk Data Export"
    filter: "data.access AND action:export AND row_count > 10000"
    severity: high
    action: "Slack #security + Email to data owner"

  - name: "Cross-Department Sensitive Data Access"
    filter: "data.access AND sensitivity:confidential AND user.department != resource.owner_department"
    severity: medium
    action: "Slack to data owner"

  - name: "Failed Access Attempts"
    filter: "data.access AND decision:denied"
    severity: medium
    group_by: "user.id"
    threshold: "5 attempts in 1 hour"
    action: "Temporarily suspend user + notify security"
```

## Data Lineage

### Lineage Tracking

```yaml
# OpenLineage — track data movement
producers:
  - name: "order-service"
    type: "application"
    namespace: "production"

runs:
  - run_id: "run-20260515-001"
    event_type: "COMPLETE"
    event_time: "2026-05-15T10:30:00Z"

inputs:
  - namespace: "production"
    name: "orders.public.orders"
    facets:
      columns:
        - name: "id"
        - name: "customer_id"
        - name: "total_amount"

outputs:
  - namespace: "analytics"
    name: "analytics.public.order_summary"
    facets:
      columns:
        - name: "date"
        - name: "total_revenue"
        - name: "order_count"

facets:
  documentation:
    description: "Daily order summary ETL from production to analytics"
  ownership:
    owners:
      - name: "data-engineering"
        type: "team"
  sensitivity:
    level: "internal"
```

## Key Points

- Classify all data into levels: public, internal, confidential, restricted.
- Tag data at column, row, and file level with sensitivity metadata.
- Encrypt data at rest (AES-256, envelope encryption with KMS) and in transit (mTLS, TLS 1.3).
- Use Attribute-Based Access Control (ABAC) — access decisions based on user attributes + data sensitivity + context.
- Mask sensitive data by default for non-privileged users.
- Implement DLP at API, database, and file storage layers.
- Maintain immutable audit logs for every data access with decision outcomes.
- Alert on restricted data access outside business hours, bulk exports, and cross-department access.
- Track data lineage to understand how sensitive data flows through the system.
- Apply zero trust to data regardless of location — database, object storage, or transit.
