# BI Tool Selection

## Metabase

### Overview
Open-source (Apache 2.0). Self-hosted or Metabase Cloud.
Best for: small to medium teams under 50 users.
No-code query builder accessible to non-technical users.
Native SQL editor with snippet library for analysts.

### Key Features
Question builder: no-code aggregation, filtering, custom columns.
Dashboard: embedded filters, auto-refresh, click-through details.
Models: curated data tables with metric definitions.
Subscriptions: email and Slack delivery on schedule.
Embedding: signed JWT embed with row-level restrictions.
Permissions: group-based access, collection-level control.
Drivers: PostgreSQL, MySQL, BigQuery, Snowflake, Redshift,
MongoDB, Druid, Spark, Presto, SQL Server.

### Limitations
No RLS in open-source version (Enterprise only).
Limited viz types, no custom charting.
No version control for dashboards.
Performance degrades beyond 100 concurrent users.

### When to Choose
Team under 50, limited budget, simple analytics needs.
Quick setup in minutes, minimal maintenance.
Startups and small teams needing self-serve analytics.

## Superset

### Overview
Open-source (Apache 2.0). Self-hosted or Preset Cloud.
Best for: data teams and analysts, 50-500 users.
SQL Lab for ad-hoc queries with multi-tab support.

### Key Features
SQL Lab: multi-tab editor, query history, schema browser.
Visualization: 60+ chart types including deck.gl geospatial.
Custom chart plugins, cross-filtering dashboards.
Tabbed layout, markdown support, custom CSS.
Semantic layer: virtual datasets with computed columns.
RBAC: viewer, explorer, admin, sql_lab roles.
RLS: data source filters per role.
Embedding: iframe with guest token and JWT auth.
Alerting: scheduled email reports with chart attachments.

### Limitations
Steep learning curve, complex infrastructure setup.
Celery workers, Redis cache, metadata database.
Performance tuning required for large deployments.
Dashboard migration between instances is manual.

### When to Choose
Medium-large teams with SQL-skilled analysts.
Custom visualization needs and ad-hoc exploration.

## Looker

### Overview
Proprietary, Google-owned. Cloud-only.
Best for: enterprise organizations over 100 users.
Core: LookML semantic layer as single source of truth.

### Key Features
LookML: git-backed, version-controlled modeling.
Metrics defined once, reused across all dashboards.
Prevents inconsistent numbers across the org.
Developer framework: parameterized extends, liquid templating.
Embedding: SSO embed URL, Looker API for custom integration.
Permissions: folder-based, attribute-based RLS.
REST API for metadata, data, and content management.
Native BigQuery integration, any SQL database.
Scheduling to email, Slack, S3, SFTP.

### Limitations
Expensive with per-user pricing and minimum seats.
LookML learning curve for SQL developers.
Cloud-only, no on-premise option.
Query performance depends on underlying warehouse.

### When to Choose
Enterprise with centralized data governance.
Git-based metric definitions.
Large teams needing consistent, trustworthy metrics.

## Tableau
Proprietary, Salesforce-owned. Desktop + Server/Cloud.
Best for: advanced visual analytics. Core: VizQL.
Desktop authoring, complex calculations, set actions.
Prep Builder for no-code ETL.
Server/Cloud for content management.
Ask Data natural language querying.
Embedding via JS API. Extensions for custom viz.
Expensive (Creator + Viewer licensing).
Desktop-only authoring, limited version control.

## PowerBI
Proprietary, Microsoft. Desktop + Service.
Best for: Microsoft ecosystem organizations.
Excel and Teams integration. Power Query M language.
DAX formula language for complex measures.
Embedding via REST API with Azure AD.

## Comparison Matrix
| Feature | Metabase | Superset | Looker | Tableau | PowerBI |
|---|---|---|---|---|---|
| License | Open-source | Open-source | Proprietary | Proprietary | Proprietary |
| Hosting | Self/Cloud | Self/Cloud | Cloud | Self/Cloud | Cloud |
| Team size | <50 | 50-500 | 100+ | 10+ | 10+ |
| SQL skill needed | Low | Medium | High (LookML) | Low | Medium |
| Semantic layer | Basic | Basic | Advanced | None | Basic |
| Row-level security | Limited | Yes | Yes | Yes | Yes |
| Embedding | JWT | Guest token | SSO | JS API | REST API |
| Version control | No | No | Git-backed | Limited | Limited |
| Viz types | 30+ | 60+ | 40+ | 100+ | 50+ |

## Semantic Layer Design

### Principle
One source of truth for business metrics.
Defined once in semantic layer, consumed by all dashboards.
Prevents SQL spaghetti and inconsistent numbers across org.

### Implementation
Looker: LookML files in git with CI/CD testing.
Metabase: Models with saved metric definitions.
Superset: virtual datasets with computed columns.
Naming: business-friendly snake_case convention.
`total_revenue`, `active_users_30d`, `customer_lifetime_value`.

### Metric Documentation
Every metric has: name, description, formula, owner, freshness SLA.
Example: `revenue_growth = (current_period - previous_period) / previous_period * 100`.
Document assumptions: what counts as revenue, how refunds are handled,
timezone for daily metrics, exclusion criteria.
