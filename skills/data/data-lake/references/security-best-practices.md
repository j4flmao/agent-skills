# Storage and Infrastructure Security for Data Lakes

Hardening the storage and compute layer under lake tables: bucket configuration, encryption, identity, network paths and credential handling. Catalog permissions are in `lake-gov-access.md`; privacy/deletion obligations in `security_best_practices.md`.

## Threats

| Threat | Control |
|---|---|
| Public or over-broad bucket access | Block public access, least-privilege policies |
| Leaked static credentials | Workload identity, short-lived and vended credentials |
| Catalog bypass via direct file reads | Deny storage reads except to engine/catalog roles |
| Data exfiltration to foreign accounts | VPC endpoint policies, bucket policies restricting principals/networks |
| Tampering / ransomware deletion | Versioning, Object Lock (where appropriate), separate backup account |
| Unencrypted data at rest or in transit | SSE-KMS / CMEK, TLS-only policies |

## S3 Baseline

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "DenyInsecureTransport",
      "Effect": "Deny",
      "Principal": "*",
      "Action": "s3:*",
      "Resource": ["arn:aws:s3:::acme-lake-prod", "arn:aws:s3:::acme-lake-prod/*"],
      "Condition": {"Bool": {"aws:SecureTransport": "false"}}
    },
    {
      "Sid": "DenyOutsideVpce",
      "Effect": "Deny",
      "Principal": "*",
      "Action": ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"],
      "Resource": "arn:aws:s3:::acme-lake-prod/*",
      "Condition": {
        "StringNotEquals": {"aws:SourceVpce": "vpce-0abc123def4567890"},
        "ArnNotLike": {"aws:PrincipalArn": "arn:aws:iam::123456789012:role/lake-break-glass"}
      }
    }
  ]
}
```

Plus: S3 Block Public Access on account and bucket, Object Ownership = bucket owner enforced (ACLs disabled), default encryption SSE-KMS with a customer-managed key and S3 Bucket Keys enabled to reduce KMS request cost.

Test deny statements carefully: a VPC-endpoint deny also blocks managed services that access the bucket from outside your VPC unless you exempt them.

## Encryption

| Layer | Option |
|---|---|
| At rest (object store) | SSE-KMS (AWS), CMEK (GCS), customer-managed keys (ADLS) |
| Per-domain separation | Separate KMS keys per zone/domain; key policy limits decrypt to domain roles |
| In transit | TLS enforced by bucket policy; TLS to catalogs and metastores |
| Column-level | Parquet modular encryption (supported by Spark with key management integration); Iceberg table encryption is newer — check engine support |

Key rotation: enable automatic rotation on KMS keys; data does not need re-encryption for KMS rotation.

## Identity for Engines

| Platform | Mechanism |
|---|---|
| EKS | IRSA or EKS Pod Identity per job service account |
| EMR / Glue | Job execution roles; EMR runtime roles for per-job isolation |
| GKE | Workload Identity Federation |
| AKS | Microsoft Entra Workload ID |
| Any engine via Iceberg REST | Catalog-vended, table-scoped temporary credentials |

Each pipeline gets its own role scoped to the prefixes of the tables it writes; read-only roles for consumers.

## Write Isolation by Prefix

```json
{
  "Effect": "Allow",
  "Action": ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"],
  "Resource": "arn:aws:s3:::acme-lake-prod/warehouse/silver.db/orders/*"
}
```

Delete permission is required for maintenance (vacuum/expire/orphan removal); give it to the maintenance role, and keep the ingestion role's scope to its own tables.

## Protection Against Destructive Changes

- Bucket versioning with lifecycle rules expiring noncurrent versions after a recovery window (keeps storage cost bounded).
- Replicate critical zones to a separate account/region (S3 Replication) with different administrators.
- Object Lock in governance/compliance mode only for data that must be immutable; it conflicts with GDPR erasure and table maintenance, so do not apply it to whole lakes by default.
- MFA/approval for bucket policy changes; alert on `PutBucketPolicy`, `DeleteBucket*`, KMS key disable/schedule deletion.

## Network

- Private connectivity: S3 gateway/interface endpoints, GCS Private Service Connect, ADLS private endpoints.
- Catalog and metastore endpoints private; expose REST catalogs only through authenticated gateways.
- Egress control on compute subnets to prevent exfiltration to arbitrary internet hosts.

## Secrets

- No access keys in Spark configs, notebooks or code; use instance/workload identity.
- OAuth client secrets for catalogs stored in a secret manager and injected at runtime.
- Scan repositories and notebooks for secrets in CI.

## Monitoring

- CloudTrail data events (or S3 server access logs) on lake buckets, analyzed for unusual principals and volumes.
- Amazon Macie / Cloud DLP scans for unexpected PII in non-PII zones.
- Alerts on public access configuration changes and anomalous `DeleteObject` spikes.

## Checklist
- [ ] Public access blocked; TLS-only bucket policies
- [ ] SSE-KMS/CMEK with per-domain keys and rotation
- [ ] Workload identity per pipeline; no static keys
- [ ] Direct storage access limited to engine/catalog roles
- [ ] Versioning + cross-account replication for critical zones
- [ ] Audit logging and alerts on policy and deletion anomalies
