# BI Security Best Practices

Securing BI platforms and the data they expose: authentication, role design, row- and column-level security, embedding security, data export controls, credentials, network and platform hardening, and auditing.

## Threat Model

| Threat | Example |
|---|---|
| Over-broad access | Every employee can query the full customer table through SQL Lab |
| Tenant data leakage | Embedded dashboard filter changed in the URL shows another customer's data |
| Exfiltration via exports | Bulk CSV downloads of personal data |
| Credential exposure | Warehouse admin credentials stored in BI connection settings |
| Public links | "Public sharing" left on for dashboards with sensitive data |
| Platform vulnerabilities | Default `SECRET_KEY`, unpatched versions, exposed admin endpoints |
| Injection | Custom SQL with templated parameters concatenated unsafely |

## Authentication
- Enforce SSO (OIDC/SAML) and MFA at the IdP; disable local password logins except a break-glass admin stored securely.
- Short session lifetimes for sensitive deployments; secure, HTTP-only cookies.
- SCIM or group sync so deprovisioning in the IdP removes BI access.

## Role Design

| Role | Can do | Typical members |
|---|---|---|
| Viewer | View dashboards shared with them | Most business users |
| Explorer | Build charts on certified datasets | Analysts |
| SQL user | Ad-hoc SQL on approved schemas | Data analysts/engineers |
| Content admin | Manage collections/folders, certify content | Analytics leads |
| Platform admin | Settings, connections, users | Small platform team |

Rules:
- Grant by IdP group, never per user.
- Limit SQL Lab / native query access to approved schemas; most users should use curated datasets.
- Separate database connections for sensitive domains (HR, finance) with their own warehouse roles.
- Superset: built-in roles (Admin, Alpha, Gamma, sql_lab) plus custom roles with dataset-level permissions; enable `DASHBOARD_RBAC` to control access per dashboard. Never assign Admin as the default registration role.

## Row-Level and Column-Level Security

Enforce in the warehouse when possible, so every tool and query path is covered; add BI-level rules for convenience.

### Warehouse enforcement
```sql
-- Snowflake row access policy using a mapping table
CREATE ROW ACCESS POLICY sales_region_policy AS (region STRING) RETURNS BOOLEAN ->
  EXISTS (
    SELECT 1 FROM security.region_access m
    WHERE m.role_name = CURRENT_ROLE() AND m.region = region
  );
ALTER TABLE marts.fct_sales ADD ROW ACCESS POLICY sales_region_policy ON (region);
```
BigQuery row-level access policies and policy tags (column-level), Databricks Unity Catalog row filters and column masks, and PostgreSQL RLS offer the same.

Caveat: BI tools usually connect with one service account, so warehouse RLS based on `CURRENT_ROLE()` does not distinguish BI users unless you use per-user OAuth passthrough (supported by some tool/warehouse pairs, e.g. Tableau or Power BI with Snowflake/Databricks OAuth) or pass user context securely.

### BI-level enforcement
| Tool | Feature |
|---|---|
| Superset | Row Level Security filters (regular or base) per role and dataset; guest token RLS clauses for embedding |
| Metabase | Row and column security (formerly data sandboxes) by user attributes, paid plans |
| Looker | `access_filter` with user attributes; `required_access_grants` for fields/explores |
| Power BI | RLS roles with DAX filters (`[Region] = USERPRINCIPALNAME()` mapping), object-level security |
| Tableau | User filters, entitlement tables with `USERNAME()`, virtual connections with data policies |

```lookml
explore: orders {
  access_filter: { field: orders.region  user_attribute: allowed_region }
}
```
Test RLS with "view as" features and automated checks for each role.

## Embedding Security
- Generate embed/guest tokens server-side only; short expiry (minutes); scope to a single dashboard.
- Tenant and user filters are set by the server from the authenticated session, "locked" so the client cannot change them (Metabase locked parameters, Superset guest-token RLS, Power BI effective identity with RLS roles).
- Restrict framing to your domains (`frame-ancestors` CSP; Superset per-dashboard allowed domains).
- Rotate embedding secrets if exposed; never ship them to the browser.

## Data Export and Sharing Controls
- Disable or restrict CSV/Excel downloads and raise row limits only for roles that need them.
- Disable public links/public sharing globally unless there is an approved use case; review existing public links regularly.
- Scheduled reports: restrict recipients to company domains; prefer links over attachments for sensitive data.
- Watermark or label sensitive dashboards; respect data classification tags from the catalog.

## Credentials and Connections
- BI service accounts are read-only, limited to curated schemas, with statement timeouts.
- Prefer key-pair or OAuth authentication to warehouses over passwords; store in the BI tool encrypted at rest (Superset `SECRET_KEY`, Metabase `MB_ENCRYPTION_SECRET_KEY`) and source those keys from a secret manager.
- Disable DML/DDL on BI connections (Superset "Allow DML" off).
- Templated SQL (Jinja in Superset, Metabase variables): use the tool's parameter binding; never concatenate user input into SQL.

## Platform Hardening
- Change all default secrets before first start (Superset refuses to start in production with the default `SECRET_KEY` in recent versions).
- Keep versions patched; subscribe to security advisories (Superset and Metabase have had critical CVEs in the past).
- TLS at the ingress; HSTS; security headers (Superset Talisman).
- Restrict admin endpoints and metrics to internal networks.
- Run containers as non-root with read-only filesystems where supported.
- Separate metadata DB credentials; encrypt and back up the metadata DB.

## Auditing
| Event | Source |
|---|---|
| Logins, failed logins | IdP + BI audit logs |
| Dashboard views and query executions | Superset logs table / event logger, Metabase usage analytics (paid), Looker System Activity, Power BI activity log, Tableau Admin Insights |
| Exports/downloads | BI audit logs |
| Permission and connection changes | BI audit logs; alert on them |
| Warehouse queries by BI service account | Query history with tags |

Ship audit logs to the SIEM and review high-risk events (bulk exports, new public links, role escalations).

## Compliance Notes
- Personal data in dashboards falls under GDPR/CCPA: minimize fields, mask by default, honor deletion via upstream pipelines.
- Keep evidence of access reviews (quarterly) for SOC 2 and similar audits.

## Checklist
- [ ] SSO + MFA enforced; local logins disabled except break-glass
- [ ] Group-based roles; SQL access limited
- [ ] RLS/CLS enforced in the warehouse or BI with tested role views
- [ ] Embed tokens server-side, short-lived, locked filters, frame-ancestors set
- [ ] Exports and public sharing restricted and reviewed
- [ ] Read-only BI service accounts; secrets from a secret manager
- [ ] Platform patched and hardened; audit logs in SIEM
