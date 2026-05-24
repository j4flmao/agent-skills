# Virtualization Security Reference

## Data Masking in Views

Data masking protects sensitive data in federated query results.

### View-Based Masking

```sql
-- Create views with data masking over federated tables
CREATE VIEW analytics.customers_masked AS
SELECT
    customer_id,
    customer_name,
    CASE
        WHEN current_role() IN ('admin', 'support_manager') THEN email
        ELSE CONCAT(SUBSTRING(email, 1, 3), '***@***', SUBSTRING(email, POSITION('.' IN email), LEN(email)))
    END AS email_masked,
    CASE
        WHEN current_role() IN ('admin', 'compliance') THEN phone
        ELSE CONCAT(SUBSTRING(phone, 1, 4), '******')
    END AS phone_masked,
    CASE
        WHEN current_role() IN ('admin') THEN ssn
        ELSE 'XXX-XX-XXXX'
    END AS ssn_masked,
    region,
    customer_tier,
    acquisition_date
FROM postgresql.analytics.customers;

-- Role-based column masking (PostgreSQL)
CREATE POLICY mask_pii ON analytics.customers_masked
    FOR SELECT
    USING (true)
    WITH CHECK (true);

-- Dynamic masking function
CREATE FUNCTION mask_email(email TEXT, user_role TEXT)
RETURNS TEXT AS $$
BEGIN
    IF user_role IN ('admin', 'compliance') THEN
        RETURN email;
    ELSE
        RETURN CONCAT(SUBSTRING(email, 1, 2), '****@****', SUBSTRING(email, POSITION('.' IN email)));
    END IF;
END;
$$ LANGUAGE PLpgSQL;
```

### Trino Masking (via Starburst)

```sql
-- Starburst column masking policies
CREATE MASK finance_spend_mask ON SELECT
    CASE
        WHEN current_user IN ('admin', 'finance_analyst') THEN amount
        WHEN current_user IN ('support_agent') THEN amount * 0.5
        WHEN current_user IN ('analyst') THEN ROUND(amount, -3)  -- Round to nearest 1000
        ELSE NULL
    END;

-- Apply mask to column
ALTER TABLE hive.analytics.orders ADD MASK spend_mask ON COLUMN amount;
```

## Row/Column-Level Security Across Sources

### Row-Level Security in Federation

```sql
-- Trino: row filtering via views or connector-level filtering

-- Approach 1: Create filtered views per role
CREATE VIEW analytics.orders_self AS
SELECT *
FROM postgresql.analytics.orders
WHERE customer_id = current_setting('session.user_id');

CREATE VIEW analytics.orders_region AS
SELECT *
FROM postgresql.analytics.orders
WHERE region IN (
    SELECT assigned_region
    FROM access_controls.user_regions
    WHERE user_id = current_setting('session.user_id')
);

-- Approach 2: Apply filter in query via session context
SET SESSION user_id = 'CUST-001';
SELECT *
FROM postgresql.analytics.orders
WHERE customer_id = current_setting('session.user_id');
```

### Cross-Source Access Control

```yaml
# Access control rules per source
access_control:
  postgresql:analytics.orders:
    roles:
      - name: analyst
        row_filter: "region IN (SELECT assigned_region FROM user_regions WHERE user_id = current_user)"
        column_mask:
          amount: "ROUND(amount, -3)"
      - name: admin
        row_filter: "true"
        column_mask: {}

  hive:analytics.customers:
    roles:
      - name: analyst
        row_filter: "true"
        columns: [customer_id, customer_name, region, segment]
      - name: support
        row_filter: "true"
        columns: [customer_id, customer_name, email, phone]
      - name: admin
        row_filter: "true"
        columns: []

  mongodb:payments.transactions:
    roles:
      - name: analyst
        row_filter: "{ 'status': 'completed' }"
      - name: admin
        row_filter: {}
```

## Credential Management

### Secure Credential Storage

```yaml
# Trino connector credentials with secrets
connector.name=postgresql
connection-url=jdbc:postgresql://${POSTGRES_HOST}:5432/${POSTGRES_DB}
connection-user=${POSTGRES_USER}
connection-password=${POSTGRES_PASSWORD}

# Use secrets manager
# ${POSTGRES_PASSWORD} = AWS Secrets Manager / Vault / env var
```

### Secret Management Patterns

```python
# Vault-based credential retrieval for connectors
import hvac

class ConnectorCredentialManager:
    """Manage connector credentials securely."""

    def __init__(self, vault_addr: str, vault_token: str):
        self.client = hvac.Client(url=vault_addr, token=vault_token)

    def get_connector_credentials(self, connector_name: str) -> dict:
        """Retrieve credentials from Vault."""
        secret = self.client.secrets.kv.v2.read_secret_version(
            path=f"connectors/{connector_name}"
        )
        return secret['data']['data']

    def rotate_credentials(self, connector_name: str):
        """Rotate credentials for a connector."""
        new_password = self._generate_password()
        self.client.secrets.kv.v2.create_or_update_secret(
            path=f"connectors/{connector_name}",
            secret={
                'username': self._get_current_username(),
                'password': new_password,
            }
        )
        self._update_connector_password(connector_name, new_password)
```

### Credential Rotation

```yaml
credential_policies:
  rotation:
    - connector_type: postgresql
      interval_days: 90
      notify_before_days: 14
    - connector_type: mongodb
      interval_days: 90
      notify_before_days: 14
    - connector_type: kafka
      interval_days: 180
      notify_before_days: 30

  access:
    - principle: "read-only queries"
      credential_type: "service_account"
    - principle: "metadata queries"
      credential_type: "read_only_user"
    - principle: "write operations"
      credential_type: "admin_user"
      mfa_required: true
```

## Audit for Virtualized Queries

### Audit Log Configuration

```properties
# Trino audit logging
event-listener.type=AUDIT_LOG
event-listener.event-types=QUERY_CREATED,QUERY_COMPLETED
event-listener.format=JSON

# Log to file or syslog
log.path=/var/log/trino/audit.log
log.max-size=500MB
log.max-history=30
```

### Audit Schema

```sql
CREATE TABLE trino_audit_log (
    event_id UUID,
    event_timestamp TIMESTAMP,
    query_id STRING,
    user_name STRING,
    source_address STRING,
    user_agent STRING,
    query_text STRING,
    catalog_used ARRAY<STRING>,
    schema_used ARRAY<STRING>,
    tables_accessed ARRAY<STRING>,
    execution_time_ms INT,
    cpu_time_ms INT,
    peak_memory_bytes BIGINT,
    total_memory_bytes BIGINT,
    bytes_scanned BIGINT,
    bytes_spilled BIGINT,
    rows_produced INT,
    error_code STRING,
    error_message STRING
);

-- Audit queries for compliance
SELECT
    user_name,
    COUNT(*) AS query_count,
    SUM(bytes_scanned) / 1e12 AS total_tb_scanned,
    AVG(execution_time_ms) AS avg_execution_ms,
    MAX(timestamp) AS last_query
FROM trino_audit_log
WHERE event_timestamp >= DATEADD('day', -7, CURRENT_TIMESTAMP)
GROUP BY user_name
ORDER BY total_tb_scanned DESC;

-- Sensitive data access audit
SELECT
    user_name,
    query_text,
    tables_accessed,
    event_timestamp
FROM trino_audit_log
WHERE query_text LIKE '%ssn%'
   OR query_text LIKE '%credit_card%'
   OR query_text LIKE '%password%'
ORDER BY event_timestamp DESC;
```

### Monitoring Suspicious Activity

```python
class SecurityMonitor:
    """Monitor federated query activity for security issues."""

    def check_anomalous_access(self, audit_logs: list[dict]) -> list[dict]:
        """Detect anomalous query patterns."""
        alerts = []

        for log in audit_logs:
            # Check for large data exports
            if log['bytes_scanned'] > 1e12:  # > 1TB
                if log['user_name'] not in self.whitelist_heavy_users:
                    alerts.append({
                        'type': 'large_scan',
                        'user': log['user_name'],
                        'source': log['source_address'],
                        'tables': log['tables_accessed'],
                        'bytes': log['bytes_scanned']
                    })

            # Check for sensitive table access
            sensitive_tables = ['customers', 'payments', 'pii_data']
            for table in sensitive_tables:
                if table in str(log['tables_accessed']).lower():
                    if log['user_name'] not in self.approved_sensitive_users:
                        alerts.append({
                            'type': 'unauthorized_sensitive_access',
                            'user': log['user_name'],
                            'table': table,
                            'query': log['query_text']
                        })

            # Check for unusual query patterns
            if 'SELECT *' in log['query_text'].upper():
                if log['tables_accessed'] and log['rows_produced'] > 100000:
                    alerts.append({
                        'type': 'full_table_scan',
                        'user': log['user_name'],
                        'tables': log['tables_accessed'],
                        'rows': log['rows_produced']
                    })

        return alerts
```

## Rules
- Mask PII columns in views based on user role
- Apply row-level security per data source and role
- Store connector credentials in secrets manager, never in config files
- Rotate credentials every 90 days minimum
- Log every federated query with user, source, tables accessed, and data volume
- Monitor for anomalous access patterns (large exports, sensitive table queries)
- Use read-only credentials for query connectors
- Separate connection credentials per non-functional scope
- Test security policies with automated test queries
- Review audit logs weekly for security anomalies
