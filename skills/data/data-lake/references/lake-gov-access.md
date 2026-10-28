# Lake Governance and Access Control

Controlling who can read and write which lake data: catalog-level permissions, row filters and column masks, credential vending, tagging and auditing. Storage-level hardening is in `security-best-practices.md`; privacy and deletion obligations are in `security_best_practices.md`.

## Layers of Control

| Layer | Mechanism | Granularity |
|---|---|---|
| Storage | IAM policies, bucket policies, ACLs | bucket / prefix |
| Catalog | GRANTs on catalogs, schemas, tables, views | table / column / row (engine-enforced) |
| Engine | Policy plugins (Ranger, Trino access control, Spark with Unity Catalog) | query |
| Credential vending | Catalog issues short-lived, table-scoped storage credentials | table location |

Catalog-level control is only meaningful if users cannot bypass it by reading files directly: deny direct storage access to humans and to engines that are not catalog-enforced.

## Governance Catalog Options

| Platform | Notes |
|---|---|
| Unity Catalog (Databricks; OSS version available) | GRANTs, row filters, column masks, lineage, tags |
| AWS Lake Formation | Grants on Glue catalog objects, LF-tags (tag-based access control), data filters (row/cell), credential vending to Athena/EMR/Redshift |
| Apache Polaris (Iceberg REST) | Principal roles + catalog roles, privileges per namespace/table, credential vending |
| Apache Ranger | Policy engine for Hive/Trino/Spark (via plugins), masking and row filters |
| Google BigLake / Dataplex | Fine-grained access on BigLake tables, policy tags for columns |

## Unity Catalog SQL Examples

```sql
GRANT USE CATALOG ON CATALOG lake TO `analysts`;
GRANT USE SCHEMA, SELECT ON SCHEMA lake.gold TO `analysts`;

CREATE FUNCTION lake.gov.mask_email(email STRING)
RETURN CASE WHEN is_account_group_member('pii_readers') THEN email
            ELSE regexp_replace(email, '^[^@]+', '***') END;
ALTER TABLE lake.silver.customers ALTER COLUMN email SET MASK lake.gov.mask_email;

CREATE FUNCTION lake.gov.region_filter(region STRING)
RETURN is_account_group_member('global_ops') OR region = 'EU';
ALTER TABLE lake.silver.orders SET ROW FILTER lake.gov.region_filter ON (region);
```

## Lake Formation Tag-Based Access (CLI)

```bash
aws lakeformation create-lf-tag --tag-key classification --tag-values public internal pii
aws lakeformation add-lf-tags-to-resource \
  --resource '{"Table":{"DatabaseName":"silver","Name":"customers"}}' \
  --lf-tags '[{"TagKey":"classification","TagValues":["pii"]}]'
aws lakeformation grant-permissions \
  --principal DataLakePrincipalIdentifier=arn:aws:iam::123456789012:role/analyst \
  --permissions SELECT \
  --resource '{"LFTagPolicy":{"ResourceType":"TABLE","Expression":[{"TagKey":"classification","TagValues":["public","internal"]}]}}'
```

Tag-based policies scale better than per-table grants: new tables inherit access from their tags.

## Polaris (Iceberg REST) Model

```
principal  --assigned-->  principal role  --granted-->  catalog role  --privileges-->  catalog / namespace / table
                                                           (TABLE_READ_DATA, TABLE_WRITE_DATA, NAMESPACE_CREATE, ...)
```

Engines authenticate with OAuth client credentials; the catalog vends storage credentials scoped to the table's location for the duration of the request.

## Role Design

| Role | Access |
|---|---|
| `ingest_<source>` | Write bronze tables of that source only |
| `transform_<domain>` | Read bronze, write silver/gold of the domain |
| `analyst_<domain>` | Read gold (masked PII) |
| `pii_readers` | Unmasked PII columns, time-bound, audited |
| `lake_admin` | Maintenance, grants; break-glass with approval |

Grant to groups/roles, never to individual users; manage grants as code (Terraform providers for Databricks, Lake Formation, Snowflake; SQL migrations) and review in pull requests.

## Classification and Tagging

- Tag columns at creation: `classification=pii|confidential|internal|public`, `retention=...`, `owner=...`.
- Automate PII discovery scans and require owner review of findings.
- Propagate tags through lineage (where the platform supports it) so derived tables inherit sensitivity.

## Auditing

- Catalog audit logs (Unity Catalog system tables, CloudTrail for Lake Formation/Glue, Polaris event logs).
- Storage access logs (S3 server access logs or CloudTrail data events) to detect bypass.
- Review: who read PII tables, grants changed, direct storage reads by non-engine principals.

## Pitfalls
- Granting `s3:GetObject` on the lake bucket to analysts: bypasses masks and row filters.
- Views used for security on engines that let users query base tables directly.
- Manual grants in consoles; no review history.
- Masking in gold only while silver with raw PII is broadly readable.

## Checklist
- [ ] Direct storage access restricted to catalog/engine service principals
- [ ] Access managed via roles/groups and tags, defined as code
- [ ] PII columns masked by default, unmasked access audited and time-bound
- [ ] Row filters for regional/tenant restrictions
- [ ] Catalog and storage audit logs retained and reviewed
