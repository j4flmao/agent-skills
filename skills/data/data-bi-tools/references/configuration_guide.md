# BI Tools Configuration Guide

Production configuration for self-hosted BI platforms, with Apache Superset and Metabase as primary examples and notes for Looker, Power BI and Tableau. Covers metadata databases, caching, async query execution, connection pooling, query limits, feature flags and email/alerting.

## Configuration Principles
- Externalize everything environment-specific (URLs, secrets, database URIs) to environment variables or a secret store.
- Use a real metadata database (PostgreSQL/MySQL), never embedded SQLite/H2 in production.
- Set query timeouts and row limits so one dashboard cannot exhaust the warehouse.
- Keep config files in version control; review changes like code.

## Apache Superset

`superset_config.py` is loaded from `SUPERSET_CONFIG_PATH` or the Python path.

```python
from __future__ import annotations

import os

from celery.schedules import crontab

SECRET_KEY = os.environ["SUPERSET_SECRET_KEY"]                  # long random value; rotating it requires re-encrypting secrets
SQLALCHEMY_DATABASE_URI = os.environ["SUPERSET_METADATA_DB_URI"]  # postgresql+psycopg2://...

REDIS_URL = os.environ["REDIS_URL"]

CACHE_CONFIG = {                       # metadata and UI caching
    "CACHE_TYPE": "RedisCache",
    "CACHE_DEFAULT_TIMEOUT": 300,
    "CACHE_KEY_PREFIX": "superset_meta_",
    "CACHE_REDIS_URL": f"{REDIS_URL}/0",
}
DATA_CACHE_CONFIG = {                  # chart query results
    "CACHE_TYPE": "RedisCache",
    "CACHE_DEFAULT_TIMEOUT": 3600,
    "CACHE_KEY_PREFIX": "superset_data_",
    "CACHE_REDIS_URL": f"{REDIS_URL}/1",
}
FILTER_STATE_CACHE_CONFIG = {**CACHE_CONFIG, "CACHE_KEY_PREFIX": "superset_filter_"}
EXPLORE_FORM_DATA_CACHE_CONFIG = {**CACHE_CONFIG, "CACHE_KEY_PREFIX": "superset_explore_"}

class CeleryConfig:
    broker_url = f"{REDIS_URL}/2"
    result_backend = f"{REDIS_URL}/3"
    imports = ("superset.sql_lab", "superset.tasks.scheduler")
    worker_prefetch_multiplier = 1
    task_acks_late = True
    beat_schedule = {
        "reports.scheduler": {"task": "reports.scheduler", "schedule": crontab(minute="*", hour="*")},
        "reports.prune_log": {"task": "reports.prune_log", "schedule": crontab(minute=0, hour=0)},
    }

CELERY_CONFIG = CeleryConfig

FEATURE_FLAGS = {
    "ALERT_REPORTS": True,
    "EMBEDDED_SUPERSET": True,
    "DASHBOARD_RBAC": True,
}

SQLLAB_TIMEOUT = 300
SQLLAB_ASYNC_TIME_LIMIT_SEC = 3600
SUPERSET_WEBSERVER_TIMEOUT = 120
ROW_LIMIT = 50000
SQL_MAX_ROW = 100000

ENABLE_PROXY_FIX = True               # behind a reverse proxy / load balancer
TALISMAN_ENABLED = True               # security headers / CSP
WTF_CSRF_ENABLED = True

SMTP_HOST = os.environ.get("SMTP_HOST", "")
SMTP_PORT = 587
SMTP_STARTTLS = True
SMTP_USER = os.environ.get("SMTP_USER", "")
SMTP_PASSWORD = os.environ.get("SMTP_PASSWORD", "")
SMTP_MAIL_FROM = "bi-alerts@example.com"
WEBDRIVER_BASEURL = os.environ.get("SUPERSET_INTERNAL_URL", "http://superset:8088/")
```
Notes:
- Database connection passwords are encrypted in the metadata DB with `SECRET_KEY`; use `superset re-encrypt-secrets` when rotating (see the docs for `PREVIOUS_SECRET_KEY`).
- Alerts and reports need Celery workers, beat, and a headless browser (Playwright or Selenium) for screenshots.
- Per-database settings (in the UI or API): "Asynchronous query execution" for SQL Lab, cache timeout, "Allow DML" (keep off), allowed schemas for CSV upload (keep off unless needed).

## Metabase

Configured by environment variables:
```bash
MB_DB_TYPE=postgres
MB_DB_CONNECTION_URI=postgres://metabase-db:5432/metabase?user=metabase&password=...   # from a secret
MB_ENCRYPTION_SECRET_KEY=<random 32+ chars>     # encrypts stored DB credentials; set before first start
MB_SITE_URL=https://bi.example.com
MB_JETTY_PORT=3000
MB_PASSWORD_COMPLEXITY=strong
MB_SESSION_COOKIES=true
MB_EMAIL_SMTP_HOST=smtp.example.com
MB_EMAIL_SMTP_PORT=587
MB_EMAIL_SMTP_SECURITY=starttls
JAVA_OPTS="-Xmx4g"
```
In-app admin settings worth setting:
| Setting | Recommendation |
|---|---|
| Caching (Admin > Performance) | Enable; duration or schedule-based policies per database/question |
| Database sync and scan schedules | Off-peak; disable fingerprinting on huge tables if costly |
| Query timeout | Set on the warehouse side (statement timeout) |
| Public sharing | Off unless explicitly required |
| Embedding secret | Rotate if leaked; required for static embeds |

`MB_ENCRYPTION_SECRET_KEY` cannot be changed casually: rotating requires the documented rotate command, otherwise stored connection credentials become unreadable.

## Warehouse Connection Settings

| Setting | Why |
|---|---|
| Dedicated BI service account/role, read-only | Least privilege; isolate BI cost |
| Dedicated compute (Snowflake warehouse, BigQuery reservation, Databricks SQL warehouse) | Stops BI from starving ETL and vice versa |
| Statement timeout | Kills runaway queries (`STATEMENT_TIMEOUT_IN_SECONDS`, `statement_timeout`) |
| Query tags / labels | Attribute cost per dashboard/tool |
| Connection pool size | Match web/worker concurrency; avoid exhausting warehouse connection limits |
| TLS | Always on |

## Looker, Power BI, Tableau Notes
- **Looker**: configuration lives in LookML (models, explores, datagroups for cache policy, `persist_with`) under git; connection settings include max connections, PDT schema and PDT regeneration via datagroups.
- **Power BI**: storage mode per table (Import, DirectQuery, Dual, Direct Lake on Fabric), scheduled refresh windows, incremental refresh policies, gateway configuration for on-premises sources, workspace capacity assignment.
- **Tableau**: extract refresh schedules, data source certification, site-level settings for downloads and web authoring, backgrounder process count for refresh throughput.

## Environment Separation
| Environment | Purpose | Config differences |
|---|---|---|
| dev | Content authoring, experiments | Dev warehouse/database, no email delivery |
| staging | Validate upgrades and content imports | Prod-like data (masked), alerts to test channel |
| prod | Consumers | SSO enforced, backups, monitoring |

## Checklist
- [ ] External metadata DB with backups
- [ ] Encryption/secret keys set from a secret store and documented for rotation
- [ ] Results cache (Redis/in-app) configured with sensible TTLs
- [ ] Async execution and workers sized for long queries and reports
- [ ] Row limits and warehouse statement timeouts set
- [ ] Dedicated read-only BI role and compute
- [ ] Public sharing and DML disabled by default
