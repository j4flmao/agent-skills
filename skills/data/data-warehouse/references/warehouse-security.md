# Data Warehouse Security

Access control and data protection for Snowflake, BigQuery, and Redshift: role design, least privilege, row- and column-level security, masking, network controls, encryption, and auditing.

## Role Design

Separate **access roles** (privileges on objects) from **functional roles** (job functions) and grant access roles to functional roles.

```
Users / service identities
   └─ Functional roles: ANALYST_FINANCE, ENGINEER_DATA, SVC_DBT, SVC_BI
        └─ Access roles: MARTS_FINANCE_READ, MARTS_SALES_READ, STAGING_RW, RAW_STRIPE_READ
             └─ Privileges on databases / schemas / tables
```

### Snowflake

```sql
CREATE ROLE marts_finance_read;
GRANT USAGE ON DATABASE analytics TO ROLE marts_finance_read;
GRANT USAGE ON SCHEMA analytics.finance TO ROLE marts_finance_read;
GRANT SELECT ON ALL TABLES IN SCHEMA analytics.finance TO ROLE marts_finance_read;
GRANT SELECT ON FUTURE TABLES IN SCHEMA analytics.finance TO ROLE marts_finance_read;

CREATE ROLE analyst_finance;
GRANT ROLE marts_finance_read TO ROLE analyst_finance;
GRANT USAGE ON WAREHOUSE bi_wh TO ROLE analyst_finance;
GRANT ROLE analyst_finance TO ROLE sysadmin;     -- keep the role hierarchy rooted for administration
```

- Use managed access schemas (`WITH MANAGED ACCESS`) so only the schema owner/security admin grants privileges, not individual object owners.
- Reserve `ACCOUNTADMIN` for a few named humans with MFA; never for services.

### BigQuery

- Grant IAM roles at the dataset (or table) level: `roles/bigquery.dataViewer` on a dataset, `roles/bigquery.jobUser` on the project where queries run.
- Use groups, not individual users; service accounts per workload; avoid project-wide `bigquery.admin`.
- Authorized views/datasets expose curated results without granting access to underlying tables.

### Redshift

```sql
CREATE ROLE finance_reader;
GRANT USAGE ON SCHEMA finance TO ROLE finance_reader;
GRANT SELECT ON ALL TABLES IN SCHEMA finance TO ROLE finance_reader;
ALTER DEFAULT PRIVILEGES IN SCHEMA finance GRANT SELECT ON TABLES TO ROLE finance_reader;
GRANT ROLE finance_reader TO "IAM:analyst-jane";
```

Use IAM Identity Center / federated identities instead of database passwords.

## Row-Level Security

| Platform | Mechanism |
|----------|-----------|
| Snowflake | Row access policies |
| BigQuery | Row-level access policies |
| Redshift | RLS policies attached to tables and roles |

```sql
-- Snowflake: tenants see only their rows via a mapping table
-- name the argument distinctly so it cannot be confused with the mapping table's column
CREATE ROW ACCESS POLICY tenant_rap AS (row_tenant_id STRING) RETURNS BOOLEAN ->
  IS_ROLE_IN_SESSION('DATA_ADMIN')
  OR EXISTS (SELECT 1 FROM security.role_tenant_map m
             WHERE m.role_name = CURRENT_ROLE() AND m.tenant_id = row_tenant_id);
ALTER TABLE analytics.marts.fct_orders ADD ROW ACCESS POLICY tenant_rap ON (tenant_id);
```

```sql
-- BigQuery
CREATE ROW ACCESS POLICY emea_only ON `acme.marts.fct_orders`
GRANT TO ("group:emea-analysts@acme.com")
FILTER USING (region = 'EMEA');
```

Mapping-table-driven policies scale better than hard-coding roles in policy bodies.

## Column-Level Security and Masking

```sql
-- Snowflake dynamic masking
CREATE MASKING POLICY email_mask AS (val STRING) RETURNS STRING ->
  CASE WHEN IS_ROLE_IN_SESSION('PII_READER') THEN val
       ELSE REGEXP_REPLACE(val, '^[^@]+', '***') END;
ALTER TABLE analytics.marts.dim_customer MODIFY COLUMN email SET MASKING POLICY email_mask;
```

- Snowflake tag-based masking: attach policies to tags (`pii_email`) and tag columns, so new columns inherit protection.
- BigQuery: policy tags (Data Catalog taxonomy) for column-level access, plus data masking rules on policy tags.
- Redshift: dynamic data masking policies attached to columns and roles.

## Classification

- Tag columns by sensitivity (public, internal, confidential, restricted/PII) using native tagging or a catalog.
- Automated classification (Snowflake classification, Google Sensitive Data Protection, Amazon Macie for S3 sources) helps find unlabeled PII; review results.

## Network Controls

| Platform | Controls |
|----------|---------|
| Snowflake | Network policies/rules (IP allow-lists), AWS PrivateLink / Azure Private Link / GCP Private Service Connect |
| BigQuery | VPC Service Controls perimeters to stop exfiltration to other projects |
| Redshift | VPC deployment, private subnets, security groups, enhanced VPC routing |

Restrict service identities to known egress IPs or private connectivity.

## Authentication

- SSO (SAML/OIDC) with MFA for humans; SCIM provisioning to sync groups.
- Services: key-pair or OAuth (Snowflake), workload identity federation / service accounts without downloaded keys (BigQuery), IAM roles (Redshift).
- Snowflake is retiring single-factor password authentication; migrate users to SSO/MFA and services to key-pair or OAuth.

## Encryption

- All three encrypt at rest by default with provider-managed keys.
- Customer-managed keys: Snowflake Tri-Secret Secure (Business Critical edition), BigQuery CMEK via Cloud KMS, Redshift with AWS KMS CMKs.
- TLS for all client connections; enforce minimum TLS versions where configurable.

## Auditing and Monitoring

| Platform | Source |
|----------|--------|
| Snowflake | `ACCOUNT_USAGE.ACCESS_HISTORY`, `LOGIN_HISTORY`, `QUERY_HISTORY`, `GRANTS_TO_ROLES` |
| BigQuery | Cloud Audit Logs (Admin Activity, Data Access), `INFORMATION_SCHEMA.JOBS` |
| Redshift | Audit logging to S3/CloudWatch, `SYS_QUERY_HISTORY`, CloudTrail |

Alert on: grants of admin roles, policy removal, large exports (`COPY INTO @stage`, `UNLOAD`, `EXPORT DATA`), logins from new locations, failed login spikes.

## Data Exfiltration Controls

- Restrict who can create external stages/storage integrations and unload to arbitrary buckets (Snowflake: `PREVENT_UNLOAD_TO_INLINE_URL`, storage integrations with allowed locations).
- BigQuery VPC-SC prevents copying data to projects outside the perimeter.
- Limit result downloads in BI tools for restricted datasets.

## Pitfalls

- Granting on `ALL TABLES` but forgetting `FUTURE TABLES` / default privileges, so new tables are inaccessible (or worse, broadly accessible through ownership chains).
- Service accounts with owner/admin privileges.
- Masking only in BI tools while analysts query the warehouse directly.
- PII copied into dev environments without masking.

## Checklist

- [ ] Access roles vs functional roles; groups not individuals
- [ ] Admin roles limited, MFA enforced, no service admin accounts
- [ ] Row access and masking policies on sensitive data, tag-driven where possible
- [ ] Private connectivity / IP restrictions / VPC-SC
- [ ] Customer-managed keys where policy requires
- [ ] Audit logs retained and alerting on grants and exports
- [ ] Dev environments use masked or synthetic data
