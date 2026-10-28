# BI Tools Integration Guide

Connecting BI platforms to the rest of the stack: identity providers (SSO, SCIM, group sync), data warehouses and semantic layers, embedding analytics into products, collaboration tools (Slack, email, Teams), and the data pipeline (refresh triggers, lineage, exposures).

## Identity Provider Integration

### Single sign-on
| Tool | Protocols |
|---|---|
| Superset | OAuth2/OIDC, LDAP, remote user via Flask AppBuilder `AUTH_TYPE`; custom security manager for group-to-role mapping |
| Metabase | Google Sign-In and LDAP (all plans); SAML and JWT SSO (paid plans) |
| Looker | SAML, OIDC, Google |
| Power BI / Tableau | Microsoft Entra ID; Tableau supports SAML/OIDC |

Superset OIDC example (Flask AppBuilder):
```python
from flask_appbuilder.security.manager import AUTH_OAUTH

AUTH_TYPE = AUTH_OAUTH
OAUTH_PROVIDERS = [{
    "name": "okta",
    "icon": "fa-circle-o",
    "token_key": "access_token",
    "remote_app": {
        "client_id": os.environ["OIDC_CLIENT_ID"],
        "client_secret": os.environ["OIDC_CLIENT_SECRET"],
        "server_metadata_url": f"{os.environ['OIDC_ISSUER']}/.well-known/openid-configuration",
        "client_kwargs": {"scope": "openid email profile groups"},
    },
}]
AUTH_USER_REGISTRATION = True
AUTH_USER_REGISTRATION_ROLE = "Gamma"          # minimal default
AUTH_ROLES_MAPPING = {"bi-admins": ["Admin"], "bi-analysts": ["Alpha"], "bi-viewers": ["Gamma"]}
AUTH_ROLES_SYNC_AT_LOGIN = True
```
Group claims may need a custom `oauth_user_info` in a subclassed security manager depending on the IdP.

### Provisioning
- Use SCIM where supported (Looker, Tableau Cloud, Metabase paid plans, Power BI via Entra ID) so leavers lose access automatically.
- Map IdP groups to BI roles; avoid per-user grants.

## Warehouse and Semantic Layer

| Layer | Purpose | Examples |
|---|---|---|
| Warehouse/lakehouse | Storage and compute | Snowflake, BigQuery, Databricks SQL, Redshift, ClickHouse, Trino |
| Transformation | Curated marts | dbt |
| Semantic layer | Shared metric definitions, joins, access rules | dbt Semantic Layer (MetricFlow), Cube, LookML, Power BI semantic models, AtScale |
| BI | Visualization | Superset, Metabase, Tableau, Power BI, Looker |

Guidelines:
- Point BI at curated gold/mart schemas, not raw tables.
- Define metrics once (semantic layer or LookML/semantic model) so "revenue" means the same everywhere.
- Use a BI-specific read-only role and compute pool.
- Declare dashboards as dbt **exposures** so lineage shows which dashboards break when a model changes:
```yaml
exposures:
  - name: executive_sales_dashboard
    type: dashboard
    maturity: high
    url: https://bi.example.com/superset/dashboard/12/
    owner: { name: Sales Analytics, email: sales-analytics@example.com }
    depends_on: [ref('fct_orders'), ref('dim_customer')]
```

## Embedding Analytics in a Product

```
Browser -> Product backend (authenticates user, knows tenant)
        -> BI API: create short-lived embed token with tenant filter
        -> Browser renders iframe / SDK with token
```

| Tool | Embedding mechanism |
|---|---|
| Superset | Embedded SDK (`@superset-ui/embedded-sdk`) + guest tokens with RLS clauses |
| Metabase | Static embedding (signed JWT, locked parameters); interactive embedding / SDK on paid plans |
| Looker | Signed or cookieless embed |
| Power BI | Embed tokens ("app owns data") via service principal |
| Tableau | Connected apps (JWT) with Embedding API v3 |

```ts
import { embedDashboard } from "@superset-ui/embedded-sdk";

await embedDashboard({
  id: embeddedDashboardUuid,
  supersetDomain: "https://bi.example.com",
  mountPoint: document.getElementById("dashboard")!,
  fetchGuestToken: async () => (await fetch("/api/analytics/guest-token")).text(),  // your backend
  dashboardUiConfig: { hideTitle: true, filters: { expanded: false } },
});
```
Security rules:
- Tokens are created server-side, short-lived, and scoped to one resource.
- Tenant filters come from the server session, never from URL parameters the user can edit.
- Configure allowed embedding domains (CSP `frame-ancestors`, Superset allowed domains per embedded dashboard).

## Collaboration and Alerting
- Scheduled reports and alerts to email/Slack: Superset Alerts & Reports (Celery + headless browser), Metabase subscriptions and alerts, Looker schedules, Power BI subscriptions and Data Activator, Tableau subscriptions.
- Slack integration requires a bot token with minimal scopes (`chat:write`, `files:write`), stored as a secret.
- Avoid emailing full datasets; link to dashboards behind SSO.

## Pipeline Integration
| Integration | How |
|---|---|
| Refresh after ETL | Orchestrator task calls BI refresh API (Power BI dataset refresh, Tableau extract refresh) or invalidates/warms caches |
| Freshness display | Show `max(loaded_at)` from the mart on dashboards |
| Lineage | dbt exposures, OpenLineage, catalog integrations (DataHub, OpenMetadata support Superset, Looker, Tableau, Power BI, Metabase connectors) |
| Breaking-change detection | CI checks dashboards' referenced columns against changed dbt models |

```python
# Airflow task after dbt build
@task
def refresh_powerbi(dataset_id: str, workspace_id: str) -> None:
    token = get_pbi_token()   # MSAL client credentials, secret from backend
    r = requests.post(
        f"https://api.powerbi.com/v1.0/myorg/groups/{workspace_id}/datasets/{dataset_id}/refreshes",
        headers={"Authorization": f"Bearer {token}"}, json={"notifyOption": "NoNotification"}, timeout=30,
    )
    if r.status_code != 202:
        raise RuntimeError(f"Power BI refresh for dataset {dataset_id} failed: {r.status_code} {r.text}")
```

## Catalog and Governance Tools
Connect BI to the data catalog so users can find certified dashboards and owners, and so stewards can see dashboard usage and downstream impact.

## Checklist
- [ ] SSO enforced with IdP group-to-role mapping; SCIM where available
- [ ] BI connected to curated marts via read-only role
- [ ] Metrics defined in one semantic layer
- [ ] Embedding uses server-generated, short-lived, tenant-scoped tokens
- [ ] Dashboards registered as dbt exposures / in the catalog
- [ ] Refreshes triggered by pipeline completion
