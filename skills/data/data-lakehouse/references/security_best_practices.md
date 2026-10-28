# Lakehouse Data Protection: Encryption, Network, Erasure, Audit

Protecting the data itself: encryption at rest and in transit, network isolation, physically deleting data for privacy requests, and auditing access. Access control (grants, masks, row filters) is in `security-best-practices.md`.

## 1. Encryption at Rest

| Layer | Option | Notes |
|---|---|---|
| Object storage | SSE-S3 / SSE-KMS (AWS), Microsoft-managed or customer-managed keys (Azure), Google-managed or CMEK (GCP) | Baseline; CMEK gives key revocation control and key-usage audit |
| Table format | Parquet modular encryption (column keys); Iceberg table encryption in newer releases | Protects data even from storage admins; key management is complex |
| Platform | Databricks customer-managed keys for managed storage and workspace | Platform-specific |

```properties
# Iceberg S3FileIO with KMS
spark.sql.catalog.lake.s3.sse.type=kms
spark.sql.catalog.lake.s3.sse.key=arn:aws:kms:eu-west-1:111122223333:key/<key-id>
```

Bucket policy denying unencrypted uploads and enforcing TLS:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {"Sid": "DenyInsecureTransport", "Effect": "Deny", "Principal": "*", "Action": "s3:*",
     "Resource": ["arn:aws:s3:::lake-prod", "arn:aws:s3:::lake-prod/*"],
     "Condition": {"Bool": {"aws:SecureTransport": "false"}}},
    {"Sid": "DenyWrongKMS", "Effect": "Deny", "Principal": "*", "Action": "s3:PutObject",
     "Resource": "arn:aws:s3:::lake-prod/*",
     "Condition": {"StringNotEquals": {"s3:x-amz-server-side-encryption": "aws:kms"}}}
  ]
}
```

Use S3 Bucket Keys with SSE-KMS to reduce KMS request volume and cost.

## 2. Network Isolation

- Compute in private subnets; storage reached via VPC/private endpoints (S3 gateway endpoint, Azure Private Link, GCP Private Service Connect).
- Bucket policies restrict access to specific VPC endpoints (`aws:SourceVpce`) or networks.
- Catalog and SQL endpoints behind private connectivity or IP access lists; no public admin interfaces.
- Egress control on compute to prevent exfiltration to arbitrary hosts.

## 3. Sensitive Data Handling Across Layers

| Layer | Practice |
|---|---|
| Bronze | Raw PII may land; restrict to pipeline identities; shortest practical retention |
| Silver | Tokenize or hash direct identifiers (keyed HMAC-SHA-256, not plain hashes) where analytics do not need raw values; keep a separate restricted mapping table if re-identification is required |
| Gold | Aggregated or masked; no raw identifiers unless the use case requires them |

Classify columns (PII, sensitive, public) with catalog tags so masks, retention, and erasure jobs can target them.

## 4. Right to Erasure (GDPR/CCPA) on Immutable Files

Table-format deletes are logical until old files are removed. Physical erasure needs three steps:

Iceberg:

```sql
DELETE FROM lake.silver.customers WHERE customer_id IN (SELECT customer_id FROM ops.erasure_requests WHERE status = 'approved');
-- merge-on-read tables: rewrite so deleted rows are gone from data files
CALL lake.system.rewrite_data_files(table => 'silver.customers', options => map('delete-file-threshold', '1'));
-- drop snapshots that still reference old files
CALL lake.system.expire_snapshots(table => 'silver.customers', older_than => TIMESTAMP '2026-10-27 00:00:00', retain_last => 1);
CALL lake.system.remove_orphan_files(table => 'silver.customers');
```

Delta:

```sql
DELETE FROM silver.customers WHERE customer_id IN (SELECT customer_id FROM ops.erasure_requests WHERE status = 'approved');
REORG TABLE silver.customers APPLY (PURGE);   -- materialize deletion vectors
VACUUM silver.customers;                      -- after deletedFileRetentionDuration
```

Also handle: every layer and copy (bronze, silver, gold, shares, ML feature tables), change feeds (CDF files retain deleted rows until vacuumed), backups and replicas, branches/tags that pin old snapshots. Track each request through completion in an erasure log. Time travel cannot reach deleted data after this, which is the point.

Crypto-shredding alternative: encrypt each subject's PII with a per-subject key and delete the key to render data unreadable; useful when data spans many systems.

## 5. Audit Logging

| Source | Captures |
|---|---|
| Catalog audit (Unity Catalog `system.access.audit`, Lake Formation via CloudTrail, Polaris events) | Grants, table access, policy changes |
| Object storage (CloudTrail data events, Azure Storage logs, GCS data access logs) | Direct file access, including bypass attempts |
| Engine query logs (Trino event listener, Databricks query history, Athena history) | Who ran which query |
| Pipeline logs | Which job wrote which snapshot (set snapshot properties / commitInfo user metadata) |

```python
(df.writeTo("lake.silver.orders")
   .option("snapshot-property.job", "silver_orders_merge")
   .option("snapshot-property.run_id", run_id)
   .append())
```

Delta equivalent: `.option("userMetadata", f"silver_orders_merge:{run_id}")` (appears in `DESCRIBE HISTORY`).

Ship audit logs to a separate, append-only account/project with longer retention than operational logs.

## 6. Backup and Integrity

- Enable object versioning or replication on production buckets; table snapshots do not protect against bucket deletion or ransomware.
- Object Lock (WORM) or immutable storage for compliance-critical data.
- Test restores of a table from storage backups by re-registering metadata in the catalog.

## Pitfalls

- Treating `DELETE` as erasure while snapshots, CDF files, and backups retain the data.
- Hashing emails with an unkeyed hash; easily reversed with lookup tables.
- Storage logs disabled, so direct access via leaked keys is invisible.
- CMEK enabled without a key-rotation and break-glass process.

## Checklist

- [ ] Encryption at rest with managed or customer keys; TLS enforced.
- [ ] Private network paths to storage and catalog.
- [ ] PII classified and tagged; identifiers tokenized where possible.
- [ ] Erasure procedure covers all layers, change feeds, snapshots, backups.
- [ ] Catalog, storage, and engine audit logs retained centrally.
- [ ] Backups/versioning tested with restore drills.
