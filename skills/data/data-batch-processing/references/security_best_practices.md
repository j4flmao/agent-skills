# Security Best Practices for Batch Data Pipelines

Batch pipelines read from production systems and write to analytical stores that many people query, which makes them a prime path for data exposure. This reference covers identity and access, secrets, encryption, sensitive data handling, network isolation, supply chain and auditing for Spark-style batch jobs.

## Threats

| Threat | Example |
|--------|---------|
| Over-privileged job identity | Job role can read every bucket and write any table |
| Credential leakage | Database password in job config, Spark UI, logs or notebooks |
| Sensitive data sprawl | PII copied unmasked into gold tables, extracts and CSV exports |
| Unauthorized access to outputs | Analysts query raw PII through a broad catalog grant |
| Supply-chain compromise | Malicious or vulnerable dependency in the job image or wheel |
| Tampering | Unauthorized change to job code or data in raw layer |

## Identity and Access

- Each pipeline (or domain) runs under its own workload identity: IAM role for EMR/Glue/EKS (IRSA or EKS Pod Identity), GCP service account via Workload Identity, Azure managed identity / Entra Workload ID.
- Grant least privilege per job: read only its input prefixes/tables, write only its output tables.
- Separate environments by account/project/subscription or at least by catalog and bucket, with no cross-environment write permissions.
- Humans get read access to curated layers by default; raw and PII-bearing tables require explicit, time-bound grants.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {"Effect": "Allow", "Action": ["s3:GetObject"], "Resource": "arn:aws:s3:::lake/raw/orders/*"},
    {"Effect": "Allow", "Action": ["s3:ListBucket"], "Resource": "arn:aws:s3:::lake",
     "Condition": {"StringLike": {"s3:prefix": ["raw/orders/*", "gold/daily_revenue/*"]}}},
    {"Effect": "Allow", "Action": ["s3:PutObject", "s3:DeleteObject", "s3:GetObject"],
     "Resource": "arn:aws:s3:::lake/gold/daily_revenue/*"}
  ]
}
```

Where a governed catalog is used (Lake Formation, Unity Catalog, Polaris, BigLake), grant table-level permissions there and avoid also granting broad storage-level access that bypasses it.

## Secrets

- Fetch database credentials and API keys at runtime from a secret manager (AWS Secrets Manager, GCP Secret Manager, Azure Key Vault, HashiCorp Vault) using the job's workload identity.
- Prefer IAM database authentication or short-lived dynamic credentials (Vault database secrets engine) over static passwords.
- Never pass secrets via `--conf` or command-line arguments: they appear in the Spark UI, event logs, process lists and orchestrator logs.
- Databricks: use secret scopes (`dbutils.secrets.get`), whose values are redacted in notebook output.
- Rotate secrets and verify jobs pick up new values without redeploy.

```python
import json, boto3

def jdbc_credentials(secret_id: str) -> dict:
    sm = boto3.client("secretsmanager")
    secret = json.loads(sm.get_secret_value(SecretId=secret_id)["SecretString"])
    return {"user": secret["username"], "password": secret["password"]}
```

## Encryption

| Layer | Control |
|-------|---------|
| At rest, object storage | Default encryption with KMS keys (SSE-KMS / CMEK); bucket policies requiring encryption |
| At rest, cluster disks | Encrypted volumes for local shuffle and spill (EMR security configuration, encrypted node disks) |
| In transit, external | TLS to databases (`sslmode=verify-full` for PostgreSQL JDBC), HTTPS to object storage |
| In transit, internal | Spark RPC authentication and encryption (`spark.authenticate`, `spark.network.crypto.enabled`), shuffle encryption where required by policy |
| Column-level | Parquet modular encryption or application-level encryption for highly sensitive columns |

Spark's internal encryption is off by default; managed platforms often provide it through their own security configuration.

## Sensitive Data Handling

- **Classify** columns (PII, financial, health, secrets) in the catalog with tags.
- **Minimize**: do not ingest columns you do not need.
- **Pseudonymize** identifiers early (raw to silver): keyed hashing (HMAC-SHA-256 with a secret key in a KMS/secret manager) for join keys; plain unsalted hashes of emails or phone numbers are reversible by dictionary attack.
- **Mask or tokenize** in curated layers; expose clear values only through controlled views.
- **Row- and column-level security** in the catalog: row filters and column masks (Unity Catalog, Lake Formation data filters, BigQuery policy tags).
- **Retention and deletion**: GDPR/CCPA deletion requests must reach every layer; table formats support row-level deletes (Delta/Iceberg `DELETE`), followed by snapshot expiry and vacuum so deleted data is physically removed.

```python
import hashlib
import hmac

import pandas as pd
from pyspark.sql import functions as F

def make_pseudonymizer(key: bytes):
    # key loaded from a secret manager by the caller, never hardcoded
    @F.pandas_udf("string")
    def pseudonymize(values: pd.Series) -> pd.Series:
        return values.map(
            lambda v: None if v is None
            else hmac.new(key, v.strip().lower().encode("utf-8"), hashlib.sha256).hexdigest()
        )
    return pseudonymize

pseudonymize = make_pseudonymizer(hmac_key)
pseudo = df.withColumn("customer_key", pseudonymize(F.col("email"))).drop("email")
```

Do not build keyed hashes as `sha2(concat(secret, value))`: that is not an HMAC. Rotating the key changes all pseudonyms, so version the key and record which version produced each table.

## Logging Hygiene

- Do not log rows or DataFrame samples containing personal data (`df.show()` in production jobs writes to driver logs).
- Restrict access to Spark event logs and History Server: plans and configs can reveal schema, paths and sometimes literal values.
- Configure `spark.redaction.regex` and `spark.sql.redaction.string.regex` to mask sensitive patterns in UI and logs as a defense in depth.

## Network Isolation

- Run clusters in private subnets; reach object storage through private endpoints (VPC gateway endpoints, Private Service Connect, Private Link).
- Restrict egress to required destinations; batch jobs rarely need general internet access.
- Databases accessed by jobs allow connections only from the job subnets or via private connectivity.

## Supply Chain

- Build job images from minimal, pinned base images; scan with Trivy or Grype in CI.
- Pin Python and JVM dependencies with lock files; mirror packages through an internal repository.
- Avoid `--packages` resolution from public Maven at runtime in production; bake JARs into images or use an internal mirror.
- Sign images (Sigstore cosign) and enforce verification at admission where the platform supports it.

## Auditing and Integrity

- Enable data access audit logs (S3 data events / CloudTrail Lake, GCS Data Access logs, Azure Storage diagnostics, catalog audit logs).
- Make the raw layer append-only for pipeline identities; use object lock or retention policies where tampering is a concern.
- Code changes go through review; production deployments only from CI with recorded artifact versions.

## Checklist

- [ ] One least-privilege workload identity per pipeline; no static cloud keys
- [ ] Secrets from a secret manager at runtime, never in configs or arguments
- [ ] Encryption at rest with managed keys; TLS to all sources
- [ ] PII classified, pseudonymized or masked before curated layers
- [ ] Row/column security in the catalog; deletion requests propagate and are vacuumed
- [ ] No personal data in logs; Spark UI and event logs access-controlled
- [ ] Private networking and restricted egress
- [ ] Images and dependencies pinned, scanned and signed
