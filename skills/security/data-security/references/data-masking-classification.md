# Data Masking, Classification & Compliance

## Data Masking

### Static Data Masking
Create de-identified copies of production data for non-production environments. Irreversible transformation.

```sql
-- PostgreSQL static masking
UPDATE customers
SET
  email = CONSPLIT_PART(email, '@', 1) || '@masked.com',
  phone = REGEXP_REPLACE(phone, '\d(?=\d{4})', '*'),
  ssn = '***-**-' || RIGHT(ssn, 4)
WHERE environment = 'dev';
```

### Dynamic Data Masking
Mask at query time based on user role. No persistent data modification.

```sql
-- PostgreSQL column-level masking
CREATE MASKING POLICY email_mask AS (val STRING) RETURNS STRING ->
  CASE
    WHEN CURRENT_ROLE() IN ('data_engineer', 'compliance') THEN val
    ELSE REGEXP_REPLACE(val, '(.)(.*)(@.*)', '***')
  END;

ALTER TABLE customers ALTER COLUMN email SET MASKING POLICY email_mask;
```

### Tokenization

| Method | Description | Reversible | Use Case |
|--------|-------------|-----------|----------|
| Vault-based | Replace with random token, store mapping in vault | Yes | Credit cards, SSN |
| Format-preserving | Algorithmic, same format as original | Yes | Payment processing |
| Hash-based | One-way hash (SHA-256) | No | Analytics, lookups |

## Column-Level Security

### PostgreSQL Row-Level Security

```sql
CREATE POLICY tenant_isolation ON orders
  USING (tenant_id = current_setting('app.tenant_id')::UUID);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders FORCE ROW LEVEL SECURITY;
```

### PostgreSQL Column Security

```sql
-- Create view with restricted columns
CREATE VIEW customer_public AS
SELECT id, name, city
FROM customers;

GRANT SELECT ON customer_public TO analyst_role;

-- Use column-level privileges
GRANT SELECT (id, name, email) ON customers TO support_role;
```

### BigQuery Column ACL

```sql
-- Authorized view
CREATE VIEW `project.dataset.customers_public` AS
SELECT id, name, region
FROM `project.dataset.customers`;

-- Grant access to view, not underlying table
GRANT `roles/bigquery.dataViewer`
ON `project.dataset.customers_public`
TO "group:analysts@company.com";
```

## Anonymization Techniques

### k-Anonymity
Each record is indistinguishable from at least k-1 other records. Achieved by generalizing quasi-identifiers (age → range, ZIP → first 3 digits).

| Original | k=5 Anonymized |
|----------|---------------|
| Age: 29, ZIP: 94105 | Age: 25-34, ZIP: 9410X |
| Age: 31, ZIP: 94103 | Age: 25-34, ZIP: 9410X |
| Age: 28, ZIP: 94107 | Age: 25-34, ZIP: 9410X |

### l-Diversity
Each equivalence class has at least l distinct values for sensitive attributes. Prevents homogeneity attacks.

### Differential Privacy
Add calibrated noise to query results. Epsilon (ε) controls privacy-utility trade-off.

```python
import numpy as np

def differentially_private_count(true_count: int, epsilon: float) -> int:
    """Add Laplace noise for differential privacy."""
    noise = np.random.laplace(0, 1/epsilon)
    return max(0, int(true_count + noise))

# ε = 1.0: strong privacy, moderate noise
# ε = 0.1: very strong privacy, high noise
# ε = 10.0: weak privacy, low noise
```

## GDPR/CCPA Compliance

### Right to Access / Data Portability

```sql
-- Export all data for a user
SELECT json_agg(row_to_json(t)) FROM (
  SELECT * FROM orders WHERE customer_email = 'user@example.com'
  UNION ALL
  SELECT * FROM support_tickets WHERE customer_email = 'user@example.com'
) t;
```

### Right to Deletion

```sql
-- Anonymize, don't delete (preserve referential integrity)
UPDATE customers
SET
  email = 'deleted-' || id || '@redacted.com',
  name = 'REDACTED',
  phone = NULL,
  deleted_at = NOW()
WHERE email = 'user@example.com';
```

### Right to Rectification
Implement audit trail for data corrections. Track before/after values with timestamp and user.

## Data Classification Framework

| Level | Examples | Encryption | Masking | Access |
|-------|----------|-----------|---------|--------|
| Public | Product names, blog posts | Not required | None | Anyone |
| Internal | Internal docs, metrics | At rest | None | Employees |
| Confidential | Customer data, financials | At rest + transit | Sensitive columns | Need-to-know |
| Restricted | PII, payment, health data | At rest + transit + in use | All sensitive | Compliance-approved |

## Audit & Monitoring

Log all access to classified data. Monitor anomalous query patterns. Alert on bulk exports of sensitive data. Regular compliance reviews.
