# BI Platform Deployment Strategies

Deploying and upgrading BI platforms and promoting BI content safely: self-hosted Superset and Metabase on Kubernetes or containers, managed SaaS options, content-as-code workflows (Superset exports, Metabase serialization, LookML, Power BI PBIP and deployment pipelines), and upgrade/rollback procedures.

## Hosting Options

| Option | Examples | Trade-off |
|---|---|---|
| SaaS | Preset (managed Superset), Metabase Cloud, Looker, Power BI service, Tableau Cloud | Least ops; vendor limits on customization and networking |
| Self-hosted containers | Superset, Metabase, Lightdash, Redash on Kubernetes or VMs | Full control; you own upgrades, scaling, backups, security |
| Hybrid | SaaS BI with private connectivity (PrivateLink, gateways) to private warehouses | Network setup and governance overhead |

## Self-Hosted Architecture (Superset)

```
             Ingress (TLS, SSO redirect)
                    |
            Superset web (stateless, N replicas)
              |                 |
   PostgreSQL metadata DB    Redis (cache + Celery broker)
                                 |
                  Celery workers (async queries, alerts/reports)  + Celery beat (1 replica)
                                 |
                          Warehouse(s)
```
- Web pods are stateless and scale horizontally; sessions and caches live in Redis/DB.
- Celery beat must run as exactly one replica.
- Metadata DB backups are critical: dashboards, charts, permissions and encrypted connection credentials live there.

### Helm
```bash
helm repo add superset https://apache.github.io/superset
helm upgrade --install superset superset/superset \
  --namespace bi --create-namespace \
  -f values-prod.yaml --version <pinned-chart-version>
```
```yaml
# values-prod.yaml (excerpt)
image:
  repository: registry.example.com/bi/superset     # custom image with DB drivers baked in
  tag: "5.0.0-build.12"
supersetNode:
  replicaCount: 3
  resources:
    requests: { cpu: "1", memory: 2Gi }
    limits: { memory: 4Gi }
supersetWorker:
  replicaCount: 2
supersetCeleryBeat:
  enabled: true
postgresql:
  enabled: false                 # use managed PostgreSQL
redis:
  enabled: false                 # use managed Redis
extraSecretEnv: {}               # inject via existingSecret / External Secrets instead
configOverrides:
  prod: |
    import os
    SQLALCHEMY_DATABASE_URI = os.environ["SUPERSET_METADATA_DB_URI"]
```
Pin the chart and image versions; build a custom image that installs the warehouse drivers you need (e.g. `snowflake-sqlalchemy`, `sqlalchemy-bigquery`, `psycopg2-binary`).

### Autoscaling
```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: superset-web
  namespace: bi
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: superset
  minReplicas: 3
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
```
Scale Celery workers on queue length (KEDA with a Redis list scaler) rather than CPU.

## Metabase Deployment
- Single JVM application with an external PostgreSQL app database; run 2+ replicas behind a load balancer for availability (Metabase supports multiple instances sharing one app DB).
- Health check: `GET /api/health`.
- Upgrades run app-DB migrations on startup: back up the app DB first, and upgrade one instance before scaling others back up.

```yaml
services:
  metabase:
    image: metabase/metabase:<pinned-version>
    environment:
      MB_DB_TYPE: postgres
      MB_DB_CONNECTION_URI_FILE: /run/secrets/mb_db_uri
      MB_ENCRYPTION_SECRET_KEY_FILE: /run/secrets/mb_encryption_key
      MB_SITE_URL: https://bi.example.com
      JAVA_OPTS: -Xmx4g
    secrets: [mb_db_uri, mb_encryption_key]
    healthcheck:
      test: ["CMD-SHELL", "curl -fsS http://localhost:3000/api/health || exit 1"]
      interval: 30s
      retries: 5
secrets:
  mb_db_uri: { file: ./secrets/mb_db_uri }
  mb_encryption_key: { file: ./secrets/mb_encryption_key }
```
Metabase supports `_FILE` suffixed variables for many settings; confirm for each variable in the docs for your version.

## Content as Code

| Tool | Mechanism | Promotion |
|---|---|---|
| Superset | `superset export-dashboards` / `import-dashboards` (ZIP of YAML), REST export/import, or tools like `preset-cli` | Export from dev, commit, import to prod in CI; replace database UUIDs/connection per env |
| Metabase | Serialization (`export`/`import` commands, Pro/Enterprise) | Git-tracked YAML; import into prod instance |
| Looker | LookML in git; dev mode branches; deploy webhook or API to production | PR review, LookML validator and content validator in CI |
| Power BI | PBIP/TMDL project files in git (Fabric Git integration); deployment pipelines (dev -> test -> prod) | Deployment rules swap data source parameters per stage |
| Tableau | Workbooks/data sources published via REST API or `tabcmd` | Scripted publish with environment-specific connections |
| Lightdash / dbt-native BI | Metrics and charts defined alongside dbt models | Deploy with dbt CI/CD |

CI checks for BI content:
- LookML validation (`sdk.validate_project`), Power BI Best Practice Analyzer (Tabular Editor), Superset import into a staging instance.
- Broken-reference checks after dbt model changes (column renames break charts); dbt exposures declare which dashboards depend on which models.

## Upgrades
1. Read release notes for breaking changes (deprecated chart types, removed feature flags, config renames).
2. Back up the metadata/app database.
3. Upgrade staging with a copy of prod metadata; run smoke tests on top dashboards, embedding and alerts.
4. Production: Superset runs `superset db upgrade` then `superset init` (the Helm chart runs an init job); Metabase migrates on start.
5. Keep the previous image tag and the DB backup for rollback; schema migrations are usually not reversible, so rollback means restoring the DB snapshot.

## Disaster Recovery
| Asset | Protection |
|---|---|
| Metadata/app DB | Automated backups, point-in-time recovery, cross-region copies for critical BI |
| Secrets (`SECRET_KEY`, `MB_ENCRYPTION_SECRET_KEY`) | Stored in secret manager; without them encrypted credentials are lost |
| Content exports in git | Rebuild path if the DB is lost |
| Cache (Redis) | Disposable |

## Checklist
- [ ] Pinned chart/image versions with drivers baked into the image
- [ ] External, backed-up metadata DB and Redis
- [ ] Stateless web tier autoscaled; single beat scheduler
- [ ] Content promoted from git via CI, not hand-edited in prod
- [ ] Upgrade rehearsed on staging with prod metadata copy
- [ ] Secrets needed for DR stored and tested
