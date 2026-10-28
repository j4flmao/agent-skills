# BI Tools API Reference (Superset, Metabase, Looker, Power BI, Tableau)

The programmatic interfaces of common BI platforms: authentication, managing dashboards and datasets, running queries, refreshing data and generating embed tokens. Use these APIs for automation (provisioning, CI/CD of content, cache warming, embedding) rather than scraping the UI.

## Quick Comparison

| Tool | API style | Auth for automation | Embedding token |
|---|---|---|---|
| Apache Superset | REST `/api/v1/*` (OpenAPI at `/swagger/v1`) | Login endpoint returns JWT access token (DB or LDAP provider); OAuth via the web flow | Guest token (`/api/v1/security/guest_token/`) for the Embedded SDK |
| Metabase | REST `/api/*` | API keys (`x-api-key` header) or session token (`X-Metabase-Session`) | Signed JWT for static embedding; SSO for interactive embedding (paid plans) |
| Looker (Google Cloud core) | REST API 4.0 + official SDKs | API client ID/secret (OAuth2 client credentials) | Signed/SSO embed URLs, cookieless embed |
| Power BI | REST `api.powerbi.com/v1.0/myorg` | Microsoft Entra ID service principal (MSAL) | Embed token (`GenerateToken`) |
| Tableau Server/Cloud | REST API + `tableauserverclient` (Python) | Personal access token or connected app JWT | Connected app JWT |

## Apache Superset

```python
from __future__ import annotations

import os

import requests

BASE = os.environ["SUPERSET_URL"]
s = requests.Session()

login = s.post(f"{BASE}/api/v1/security/login", json={
    "username": os.environ["SUPERSET_USER"],
    "password": os.environ["SUPERSET_PASSWORD"],
    "provider": "db",
    "refresh": True,
}, timeout=10)
login.raise_for_status()
s.headers["Authorization"] = f"Bearer {login.json()['access_token']}"

csrf = s.get(f"{BASE}/api/v1/security/csrf_token/", timeout=10).json()["result"]
s.headers["X-CSRFToken"] = csrf          # required for state-changing calls when CSRF is enabled

dashboards = s.get(f"{BASE}/api/v1/dashboard/", params={"q": "(page:0,page_size:50)"}, timeout=10).json()["result"]
```

| Resource | Endpoints |
|---|---|
| Dashboards | `GET/POST /api/v1/dashboard/`, `GET/PUT/DELETE /api/v1/dashboard/{id}`, `GET /api/v1/dashboard/export/?q=!(id1,id2)`, `POST /api/v1/dashboard/import/` |
| Charts | `/api/v1/chart/`, `POST /api/v1/chart/data` (run a chart query) |
| Datasets | `/api/v1/dataset/`, `PUT /api/v1/dataset/{id}/refresh` (sync columns) |
| Databases | `/api/v1/database/`, `POST /api/v1/database/test_connection/` |
| SQL Lab | `POST /api/v1/sqllab/execute/` |
| Embedding | `POST /api/v1/dashboard/{id}/embedded` (enable), `POST /api/v1/security/guest_token/` |

Query parameters use Rison encoding (`q=(filters:!((col:dashboard_title,opr:ct,value:sales)))`).

### Guest token for embedding
```python
token = s.post(f"{BASE}/api/v1/security/guest_token/", json={
    "user": {"username": "embed_user", "first_name": "Embed", "last_name": "User"},
    "resources": [{"type": "dashboard", "id": embedded_uuid}],
    "rls": [{"clause": f"tenant_id = {int(tenant_id)}"}],
}, timeout=10).json()["token"]
```
Generate guest tokens server-side only; the RLS clause must come from your authenticated session, never from the browser.

## Metabase

```bash
# API key created in Admin > Settings > Authentication > API keys
curl -s "$MB_URL/api/dashboard/42" -H "x-api-key: $MB_API_KEY"
curl -s -X POST "$MB_URL/api/card/17/query/json" -H "x-api-key: $MB_API_KEY"   # results as JSON
```

| Resource | Endpoints |
|---|---|
| Questions (cards) | `GET/POST /api/card`, `POST /api/card/:id/query`, `POST /api/card/:id/query/:export-format` |
| Dashboards | `GET/POST /api/dashboard`, `PUT /api/dashboard/:id` |
| Databases | `GET /api/database`, `POST /api/database/:id/sync_schema` |
| Collections | `GET /api/collection/tree` |
| Users/groups | `/api/user`, `/api/permissions/group` |

### Static (signed) embedding
```python
import time
import jwt  # PyJWT

payload = {
    "resource": {"dashboard": 42},
    "params": {"tenant_id": tenant_id},      # locked parameters enforced server-side
    "exp": int(time.time()) + 10 * 60,
}
token = jwt.encode(payload, os.environ["METABASE_EMBEDDING_SECRET_KEY"], algorithm="HS256")
iframe_url = f"{os.environ['MB_URL']}/embed/dashboard/{token}#bordered=false&titled=true"
```

## Looker

```python
import looker_sdk
from looker_sdk import models40 as models

sdk = looker_sdk.init40()   # reads LOOKERSDK_BASE_URL, LOOKERSDK_CLIENT_ID, LOOKERSDK_CLIENT_SECRET

rows = sdk.run_inline_query(
    result_format="json",
    body=models.WriteQuery(model="ecommerce", view="orders",
                           fields=["orders.created_date", "orders.total_revenue"],
                           filters={"orders.created_date": "7 days"}, limits="500"),
)
```
Other common calls: `sdk.all_dashboards()`, `sdk.run_look(look_id, "csv")`, `sdk.create_sso_embed_url(...)`, `sdk.update_session(...)`, `sdk.validate_project(project_id)` (LookML validation in CI), `sdk.create_query_task(...)` for async queries.

## Power BI

```python
import msal
import requests

app = msal.ConfidentialClientApplication(
    client_id=os.environ["PBI_CLIENT_ID"],
    client_credential=os.environ["PBI_CLIENT_SECRET"],
    authority=f"https://login.microsoftonline.com/{os.environ['PBI_TENANT_ID']}",
)
token = app.acquire_token_for_client(scopes=["https://analysis.windows.net/powerbi/api/.default"])["access_token"]
H = {"Authorization": f"Bearer {token}"}
API = "https://api.powerbi.com/v1.0/myorg"

# Trigger a semantic model (dataset) refresh
r = requests.post(f"{API}/groups/{ws_id}/datasets/{dataset_id}/refreshes",
                  headers=H, json={"notifyOption": "NoNotification"}, timeout=30)
r.raise_for_status()          # 202 Accepted; poll GET .../refreshes?$top=1
```
| Operation | Endpoint |
|---|---|
| List reports | `GET /groups/{ws}/reports` |
| Refresh history | `GET /groups/{ws}/datasets/{id}/refreshes` |
| Execute DAX | `POST /datasets/{id}/executeQueries` |
| Embed token | `POST /GenerateToken` (multi-resource) or `POST /groups/{ws}/reports/{id}/GenerateToken` |
| Deployment pipelines | `POST /pipelines/{id}/deploy` |

The service principal must be allowed in tenant settings and added to the workspace. "Datasets" in the API are called semantic models in the product.

## Tableau

```python
import tableauserverclient as TSC

auth = TSC.PersonalAccessTokenAuth(os.environ["TAB_PAT_NAME"], os.environ["TAB_PAT_SECRET"], site_id="analytics")
server = TSC.Server(os.environ["TAB_URL"], use_server_version=True)
with server.auth.sign_in(auth):
    ds = server.datasources.get_by_id(os.environ["TAB_DS_ID"])
    job = server.datasources.refresh(ds)                  # extract refresh job
    server.jobs.wait_for_job(job)
```

## Automation Use Cases
| Use case | Approach |
|---|---|
| Content as code | Export/import dashboards (Superset ZIP/YAML, Metabase serialization on paid plans, LookML git, Power BI PBIP/TMDL, Tableau workbooks) |
| Refresh after ETL | Orchestrator task calls refresh API after upstream models succeed |
| Cache warming | Run key queries after loads |
| Usage audits | Pull query/usage logs via API or system tables |
| User provisioning | SCIM from the IdP where supported; else API |

## Checklist
- [ ] Service accounts or API keys with minimal roles; secrets from a secret store
- [ ] Embed tokens generated server-side with short expiry and server-enforced filters
- [ ] API calls have timeouts and retry only on transient errors
- [ ] Refresh triggered by pipeline completion, not fixed clock times
- [ ] Content exported to version control
