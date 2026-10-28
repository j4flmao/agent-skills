# ETL Pipeline Security Best Practices

Securing data pipelines end to end: identities and least privilege, secrets, encryption, network isolation, handling of personal data (masking, tokenization, retention, deletion), supply-chain security for pipeline code, and auditing.

## Threats to Data Pipelines

| Threat | Example |
|---|---|
| Credential leakage | DB password in a DAG file or task log |
| Over-privileged service accounts | ETL role can drop production schemas or read all PII |
| Data exfiltration | Pipeline writes to an attacker-controlled bucket via config change |
| PII sprawl | Raw personal data copied into dev, notebooks, BI extracts |
| Injection | Untrusted values formatted into SQL or shell commands |
| Supply chain | Malicious or compromised Python package/provider |
| Tampering | Unauthorized changes to transformation logic or data |

## Identity and Least Privilege
- One service identity per pipeline or domain, not a shared "etl" superuser.
- Use workload identity instead of static keys: IAM roles for service accounts (EKS IRSA / EKS Pod Identity), GKE Workload Identity, Azure workload identity, Snowflake key-pair or OAuth, Databricks service principals.
- Grant read on sources and write only on target schemas; no DDL rights outside owned schemas.
- Separate roles for dev/staging/prod; developers do not hold prod write roles.

```sql
-- Snowflake example
CREATE ROLE etl_orders;
GRANT USAGE ON WAREHOUSE transform_m TO ROLE etl_orders;
GRANT USAGE ON DATABASE raw TO ROLE etl_orders;
GRANT SELECT ON ALL TABLES IN SCHEMA raw.shop TO ROLE etl_orders;
GRANT SELECT ON FUTURE TABLES IN SCHEMA raw.shop TO ROLE etl_orders;
GRANT USAGE, CREATE TABLE, CREATE VIEW ON SCHEMA analytics.orders TO ROLE etl_orders;
```

## Secrets Management
- Store secrets in Vault, AWS Secrets Manager, GCP Secret Manager or Azure Key Vault; wire them through the orchestrator's secrets backend.
- Never place secrets in DAG code, `profiles.yml`, notebooks, Docker images or environment files in git. Scan repos with gitleaks or trufflehog in CI.
- Prefer short-lived credentials (dynamic database credentials, OAuth tokens) and rotate long-lived ones.
- Airflow masks values of connections and variables whose names look sensitive in logs; do not print secrets anyway.

## Encryption
| Where | Practice |
|---|---|
| In transit | TLS for all connections (DB `sslmode=verify-full`, HTTPS APIs, Kafka TLS/SASL) |
| At rest | Cloud-managed encryption by default; customer-managed keys (KMS) for regulated data |
| Column-level | Encrypt or tokenize high-risk fields (national IDs, card data) before landing in shared layers |
| Backups and exports | Same encryption and access policy as source tables |

## Network Isolation
- Run workers in private subnets; reach SaaS warehouses via private endpoints (AWS PrivateLink, Private Service Connect, Azure Private Link).
- Egress allow-lists so workers cannot send data to arbitrary hosts.
- Restrict object storage with bucket policies (deny non-TLS, restrict to VPC endpoints, block public access).

## Personal Data Handling

### Classify and tag
Tag columns with sensitivity (e.g. `pii`, `sensitive`) in the catalog or dbt meta, and drive masking from tags.

```yaml
# dbt model properties
models:
  - name: dim_customer
    columns:
      - name: email
        meta: { sensitivity: pii }
        tests: [not_null]
```

### Masking and tokenization
```sql
-- Snowflake dynamic masking policy
CREATE MASKING POLICY mask_email AS (val STRING) RETURNS STRING ->
  CASE WHEN IS_ROLE_IN_SESSION('PII_READER') THEN val
       ELSE REGEXP_REPLACE(val, '^[^@]+', '****') END;
ALTER TABLE analytics.core.dim_customer MODIFY COLUMN email SET MASKING POLICY mask_email;
```
- Pseudonymize identifiers with keyed hashing (HMAC-SHA-256 with a key from KMS), not plain hashes, which are reversible by dictionary attack for low-entropy values like emails or phone numbers.
- Row-level security for multi-tenant or regional restrictions.
- Non-production environments get masked or synthetic data only.

### Retention and deletion
- Define retention per dataset; enforce with partition expiry and snapshot expiry (time travel keeps deleted data until expired).
- Support data-subject deletion: propagate deletes from source through bronze/silver/gold, expire old snapshots and backups per policy, and log completion.

## Safe Code Practices
- Parameterize SQL; never format untrusted values into SQL strings.
```python
cursor.execute("SELECT * FROM orders WHERE updated_at >= %s AND updated_at < %s", (start, end))
```
- Validate identifiers (table/column names) against an allow-list when they must be dynamic.
- No `shell=True` with interpolated values in subprocess calls.
- Treat files and API payloads as untrusted: schema-validate, size-limit, quarantine bad records.

## Supply Chain
- Pin dependencies with lock files (`uv.lock`, constraints files) and use private mirrors where required.
- Build pipeline images in CI, scan them (Trivy/Grype), sign them (cosign), and deploy by digest.
- Review new Airflow providers, dbt packages and connectors like any other dependency.

## Auditing and Monitoring
- Enable warehouse access history (Snowflake `ACCESS_HISTORY`, BigQuery audit logs, Databricks audit logs, CloudTrail for S3 data events where needed).
- Alert on unusual exports, grants to broad roles, public-sharing settings, and failed authentication spikes.
- Keep orchestrator audit logs (who triggered, cleared or changed what).
- Code changes to pipelines go through review; production deploys only from CI.

## Compliance Mapping (examples)
| Requirement | Pipeline control |
|---|---|
| GDPR/CCPA access and deletion | Lineage to locate data, deletion propagation |
| PCI DSS | Card data excluded or tokenized before analytics |
| HIPAA | BAA-covered services, PHI tagging, access logging |
| SOC 2 | Change management, least privilege, monitoring evidence |

## Checklist
- [ ] Per-pipeline identities with least privilege; workload identity over static keys
- [ ] Secrets in a manager, scanned for in CI
- [ ] TLS everywhere, private networking and egress control
- [ ] PII classified, masked/tokenized, minimized in non-prod
- [ ] Retention and deletion propagation implemented
- [ ] Parameterized SQL and validated inputs
- [ ] Dependencies pinned, images scanned and signed
- [ ] Access and change audit logs retained and alerted on
