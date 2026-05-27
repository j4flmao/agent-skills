# Warehouse Security

## Security Architecture
Cloud data warehouse security requires defense in depth: network security, identity and access management, data protection, and audit capabilities.

## Network Security

### Private Connectivity
```yaml
# Snowflake private connectivity
network_policy:
  name: prod_network_policy
  allowed_ip_list:
    - "10.0.0.0/8"
    - "172.16.0.0/12"
  blocked_ip_list:
    - "0.0.0.0/0"

# AWS PrivateLink setup
privatelink:
  - service: "com.amazonaws.vpce.us-east-1.vpce-svc-xxxxx"
    vpc_endpoint: "vpce-xxxxx"
    allowed_principals:
      - "arn:aws:iam::123456789012:role/DataEngineerRole"
```

### VPC Configuration
```hcl
resource "snowflake_network_policy" "prod" {
  name                = "prod_policy"
  allowed_ip_list     = var.allowed_cidr_blocks
  blocked_ip_list     = ["0.0.0.0/0"]
  comment             = "Production network policy"
}

resource "snowflake_network_policy_attachment" "prod" {
  network_policy_name = snowflake_network_policy.prod.name
  users               = ["data_engineer", "analyst_prod"]
}
```

## Authentication and Access Control

### RBAC Implementation
```sql
-- Role hierarchy
CREATE ROLE data_engineer;
CREATE ROLE analyst;
CREATE ROLE bi_user;
CREATE ROLE read_only;

-- Warehouse access
GRANT USAGE ON WAREHOUSE analytics_wh TO ROLE analyst;
GRANT OPERATE ON WAREHOUSE analytics_wh TO ROLE data_engineer;

-- Database access
GRANT USAGE ON DATABASE analytics_db TO ROLE analyst;
GRANT CREATE SCHEMA ON DATABASE analytics_db TO ROLE data_engineer;

-- Schema access
GRANT USAGE ON SCHEMA analytics_db.public TO ROLE analyst;
GRANT SELECT ON ALL TABLES IN SCHEMA analytics_db.public TO ROLE bi_user;

-- Future grants
GRANT SELECT ON FUTURE TABLES IN SCHEMA analytics_db.public TO ROLE bi_user;

-- Role assignment
GRANT ROLE analyst TO USER alice;
GRANT ROLE data_engineer TO USER bob;
```

### MFA Enforcement
```sql
-- Set MFA for production users
ALTER USER alice SET MINS_TO_UNLOCK = 60;
ALTER USER bob SET MINS_TO_MFA_EXPIRATION = 1440;
ALTER USER charlie SET MINS_TO_UNLOCK = 60;
```

## Data Protection

### Column-Level Security
```sql
-- Dynamic data masking
CREATE OR REPLACE MASKING POLICY email_mask AS (val STRING) RETURNS STRING ->
  CASE
    WHEN CURRENT_ROLE() IN ('DATA_ENGINEER', 'COMPLIANCE_OFFICER')
      THEN val
    ELSE CONCAT(SUBSTR(val, 1, 3), '***@***', SUBSTR(val, INSTR(val, '.') - 2))
  END;

-- Apply masking policy
ALTER TABLE customers MODIFY COLUMN email
  SET MASKING POLICY email_mask;
```

### Row-Level Security
```sql
-- Snowflake row-level security
CREATE OR REPLACE SECURE VIEW customer_data AS
SELECT *
FROM raw_customers
WHERE
  region = CURRENT_ACCOUNT()  -- Restrict by region
  OR CURRENT_ROLE() IN ('DATA_ENGINEER', 'ADMIN');
```

## Audit and Compliance

### Audit Logging
```sql
-- Query audit trail
SELECT
    query_id,
    query_text,
    user_name,
    role_name,
    warehouse_name,
    database_name,
    schema_name,
    start_time,
    total_elapsed_time / 1000 as elapsed_seconds,
    rows_produced,
    bytes_scanned
FROM snowflake.account_usage.query_history
WHERE start_time >= DATEADD('day', -7, CURRENT_TIMESTAMP())
  AND query_type = 'SELECT'
  AND user_name != 'SYSTEM'
ORDER BY start_time DESC;
```

### Access History
```sql
-- Table access audit
SELECT
    user_name,
    objects_accessed,
    query_text,
    start_time
FROM snowflake.account_usage.access_history
WHERE
    start_time >= DATEADD('day', -30, CURRENT_TIMESTAMP())
    AND ARRAY_SIZE(objects_accessed) > 0
ORDER BY start_time DESC
LIMIT 100;
```

## Key Points
- Implement network policies restricting access to trusted IP ranges
- Use private connectivity (AWS PrivateLink, Azure Private Link, GCP Private Service Connect)
- Apply RBAC with least privilege principle
- Enable MFA for all production users
- Use dynamic data masking for PII/PHI columns
- Implement row-level security for multi-tenant isolation
- Enable and monitor audit logging
- Regular access reviews and permission cleanup
- Encrypt data at rest and in transit
- Use key rotation and customer-managed keys where required
