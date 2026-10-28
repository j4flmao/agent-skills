# Privacy and Compliance in the Lake: Erasure, PII Handling and Retention

How to meet privacy obligations (GDPR/CCPA-style erasure, minimization, retention limits) on immutable-file lake tables, where a logical DELETE does not physically remove data until old files are cleaned up. Storage hardening is in `security-best-practices.md`; access control in `lake-gov-access.md`.

## The Core Problem

Table formats are versioned. `DELETE FROM t WHERE user_id = 42` creates a new version without the row, but older data files (and time travel to them) still contain it until:
- Delta: `VACUUM` removes files older than the retention window.
- Iceberg: `expire_snapshots` drops snapshots referencing the old files, then the files are deleted; delete files (MoR) must be compacted first so the row is not only masked.
- Hudi: cleaner removes old file slices; MoR needs compaction.

Erasure SLA therefore = time to run the delete + time until the next compaction + retention window + cleanup run.

## Erasure Workflow

```
request intake --> locate subject's data (catalog tags + lineage) --> delete in every table (bronze..gold)
  --> compact affected files (apply deletes physically) --> expire/vacuum after retention
  --> verify (time-travel query returns nothing past horizon) --> record evidence
```

```sql
-- 1. Logical delete in all tables containing the subject
DELETE FROM lake.silver.customers WHERE customer_id IN (SELECT id FROM lake.ops.erasure_batch);
DELETE FROM lake.silver.orders    WHERE customer_id IN (SELECT id FROM lake.ops.erasure_batch);

-- 2. Iceberg: physically rewrite files that still hold deleted rows (MoR tables)
CALL lake.system.rewrite_data_files(table => 'silver.orders',
     options => map('delete-file-threshold', '1'));

-- 3. Expire snapshots older than the erasure horizon
CALL lake.system.expire_snapshots(table => 'silver.orders',
     older_than => TIMESTAMP '2026-10-20 00:00:00', retain_last => 1);
```

Delta equivalent: `DELETE`, `REORG TABLE t APPLY (PURGE)` if deletion vectors are enabled, then `VACUUM t RETAIN 168 HOURS` once the retention has passed.

Batch erasure requests (daily/weekly) to avoid rewriting the same files repeatedly.

## Reducing Erasure Cost by Design

| Technique | Effect |
|---|---|
| Keep raw PII only in few, known tables | Fewer tables to rewrite |
| Pseudonymize early (surrogate key; mapping table holds the identity) | Delete the mapping row to de-link analytics data |
| Crypto-shredding (per-subject key encrypts PII columns) | Destroy the key to make data unreadable; legal acceptance varies — confirm with counsel |
| Cluster by subject ID (or bucket) | Deletes touch fewer files |
| Short time-travel retention on PII tables | Faster physical erasure |

Pseudonymized data is still personal data under GDPR if re-identification is possible; it reduces, not removes, obligations.

## PII Handling in Layers

| Zone | Rule |
|---|---|
| Landing/bronze | Raw PII allowed, strict access, shortest retention possible |
| Silver | Tokenized/pseudonymized identifiers; raw PII columns only where needed, masked by default |
| Gold | Aggregated or pseudonymized; no direct identifiers unless business-justified |

Hashing identifiers (e.g. email) without a secret is reversible by dictionary attack; use keyed hashing (HMAC-SHA-256 with a key in a KMS/secret manager) or tokenization.

```python
import hmac, hashlib

def pseudonymize(value: str, key: bytes) -> str:
    return hmac.new(key, value.strip().lower().encode("utf-8"), hashlib.sha256).hexdigest()
```

Rotate keys with a plan: rotation changes all tokens, which breaks joins with historical data.

## Retention Enforcement

```sql
-- Iceberg/Delta: drop data past the retention period, then cleanup removes the files
DELETE FROM lake.bronze.clickstream WHERE event_date < date_sub(current_date(), 395);
```

- Partition by date so retention deletes drop whole partitions/files (metadata-only in Iceberg when the predicate aligns with partitions).
- Object store lifecycle rules apply to landing zones only; never expire objects under a table directly (breaks table metadata).

## Auditing and Evidence

- Log erasure requests, affected tables, row counts, delete commit IDs, and cleanup run IDs.
- Keep a query that proves absence (including at the oldest retained snapshot) as evidence.
- Lineage shows downstream copies (extracts, ML feature stores, BI caches) that also need erasure.

## Data Residency

- Separate buckets/catalogs per region for regulated data; replication rules must not copy it out of region.
- Catalog metadata (column stats with min/max values) can contain PII; it resides with the table.

## Pitfalls
- Assuming `DELETE` satisfies erasure while time travel still returns the row.
- MoR delete files never compacted: deleted rows physically remain in data files.
- Object Lock or long version retention on PII tables, making erasure impossible within SLA.
- Unkeyed hashes treated as anonymization.
- Forgetting copies: dev clones, exports, model training snapshots.

## Checklist
- [ ] PII inventory by table/column with tags
- [ ] Erasure runbook covering delete, physical rewrite, expiry and verification
- [ ] Time-travel retention on PII tables compatible with erasure SLA
- [ ] Keyed pseudonymization with managed keys
- [ ] Retention deletes aligned with partitions
- [ ] Evidence recorded for each request
