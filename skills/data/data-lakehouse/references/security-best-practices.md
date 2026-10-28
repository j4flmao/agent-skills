# Lakehouse Access Control: Grants, Row Filters, Column Masks

How to control who can read and write lakehouse data: catalog-level privileges, fine-grained row and column security, service identities, and credential vending. Encryption, network, deletion, and audit are covered in `security_best_practices.md`.

## 1. Principles

- Enforce access in the catalog, not in object-storage paths. Users and BI tools never hold bucket credentials.
- Grant to groups, not individuals; manage group membership in the identity provider (SCIM).
- Separate human and workload identities. Pipelines run as service principals with only the privileges their tables need.
- Manage grants as code and review changes like any other code.

## 2. Unity Catalog Privileges

Hierarchy: metastore → catalog → schema → table/view/volume/function/model. A user needs `USE CATALOG` and `USE SCHEMA` on parents plus the object privilege.

```sql
-- Analysts read gold
GRANT USE CATALOG ON CATALOG prod TO `analysts`;
GRANT USE SCHEMA ON SCHEMA prod.gold TO `analysts`;
GRANT SELECT ON SCHEMA prod.gold TO `analysts`;           -- inherited by current and future tables

-- Pipeline writes silver
GRANT USE CATALOG ON CATALOG prod TO `sp-silver-etl`;
GRANT USE SCHEMA, CREATE TABLE ON SCHEMA prod.silver TO `sp-silver-etl`;
GRANT SELECT, MODIFY ON SCHEMA prod.silver TO `sp-silver-etl`;
GRANT SELECT ON SCHEMA prod.bronze TO `sp-silver-etl`;

-- Review
SHOW GRANTS ON SCHEMA prod.gold;
```

Object ownership: transfer table ownership to a group or service principal (`ALTER TABLE ... OWNER TO`), not a person.

## 3. Row Filters and Column Masks (Unity Catalog)

```sql
CREATE FUNCTION prod.security.region_filter(region STRING)
RETURN is_account_group_member('global_sales') OR region = current_user_region();

ALTER TABLE prod.gold.sales SET ROW FILTER prod.security.region_filter ON (region);

CREATE FUNCTION prod.security.mask_email(email STRING)
RETURN CASE WHEN is_account_group_member('pii_readers') THEN email
            ELSE regexp_replace(email, '^[^@]+', '***') END;

ALTER TABLE prod.silver.customers ALTER COLUMN email SET MASK prod.security.mask_email;
```

`current_user_region()` stands for your own lookup (for example a mapping table joined inside the function). Keep filter functions simple; they run per row on every query. Attribute-based policies with governed tags (where available) apply masks to every column carrying a tag instead of per-table setup.

## 4. AWS Lake Formation

```bash
aws lakeformation grant-permissions \
  --principal DataLakePrincipalIdentifier=arn:aws:iam::111122223333:role/analysts \
  --resource '{"Table":{"DatabaseName":"gold","Name":"sales"}}' \
  --permissions SELECT

# Column-level
aws lakeformation grant-permissions \
  --principal DataLakePrincipalIdentifier=arn:aws:iam::111122223333:role/support \
  --resource '{"TableWithColumns":{"DatabaseName":"silver","Name":"customers","ColumnNames":["customer_id","country"]}}' \
  --permissions SELECT
```

- Row-level security via data filters (`create-data-cells-filter`).
- LF-Tags (tag-based access control) scale better than per-table grants.
- Register S3 locations with Lake Formation and remove direct S3 access for analysts, or grants are bypassable.

## 5. Iceberg REST Catalog RBAC (Polaris example)

Polaris model: principals → principal roles → catalog roles → privileges on catalog/namespace/table.

```
principal: sp-silver-etl ──► principal role: etl
catalog role: silver_writer (catalog: analytics)
  privileges: TABLE_WRITE_DATA, TABLE_READ_DATA, TABLE_CREATE on namespace silver
grant catalog role silver_writer to principal role etl
```

Combined with credential vending, the catalog issues storage credentials scoped to the table's location only, so engines cannot read other paths with them.

## 6. Engines Outside the Catalog's Policy Layer

Fine-grained policies (masks, row filters) are enforced by the engine. If an engine does not integrate with the catalog's policy layer:
- Do not give it access to protected tables, or
- Publish secure views/derived tables with the protection applied, and grant those instead, or
- Use a policy engine integrated with that engine (Apache Ranger plugins for Trino/Spark, Starburst built-in access control, Immuta/Privacera).

## 7. Workload Identities

| Platform | Mechanism |
|---|---|
| Databricks | Service principals with OAuth M2M; job "run as" service principal |
| AWS | IAM roles for EMR/Glue/EKS (IRSA or EKS Pod Identity) |
| GCP | Service accounts with Workload Identity Federation |
| Azure | Managed identities; Unity Catalog access connectors |
| Iceberg REST | OAuth2 client credentials per pipeline |

No long-lived personal access tokens in pipelines; rotate client secrets or use federated (OIDC) credentials.

## 8. Access Reviews

- Quarterly review of grants on sensitive schemas; remove unused privileges (audit logs show last access).
- Alert on grants to broad groups (`account users`, `public`) for silver/bronze.
- Track ownership: every schema has an owning team.

## Pitfalls

- Analysts with read access to the bucket: catalog permissions become decorative.
- Masks defined but an unsupported engine reads the raw table.
- Grants to individuals that outlive role changes.
- `ALL PRIVILEGES` granted to pipelines for convenience.

## Checklist

- [ ] All access through the catalog; direct storage access removed for humans.
- [ ] Group-based grants managed as code.
- [ ] PII columns masked; row filters where required.
- [ ] Pipelines run as dedicated service identities with least privilege.
- [ ] Engines reading protected data enforce the policies or read secured views.
- [ ] Periodic access reviews.
