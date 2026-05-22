# BI Tool Selection

## Metabase

### Overview
- Open-source: Apache 2.0 license
- Self-hosted or cloud (Metabase Cloud)
- Best for: small to medium teams (<50 users)
- Ease of use: no-code query builder
- SQL support: native query editor with snippet library

### Key Features
- Question builder: no-code aggregation, filtering, custom columns
- Dashboard: embedded filters, auto-refresh, click-through
- Models: curated data tables with metric definitions
- Subscriptions: email and Slack dashboard delivery
- Embedding: signed JWT embed for customer-facing analytics
- Permissions: data access by group, collection-level access control

### Limitations
- No row-level security in open-source version
- Limited visualization types (no custom charting)
- No version control for dashboards
- Performance degrades with >100 concurrent users

### When to Choose
Team <50, limited budget, simple analytics needs. Quick setup, minimal maintenance. Good for startups and small teams.

## Superset

### Overview
- Open-source: Apache 2.0 license
- Self-hosted or managed (Preset Cloud)
- Best for: data teams, analysts, 50-500 users
- Advanced SQL: SQL Lab for ad-hoc queries

### Key Features
- SQL Lab: multi-tab query editor, query history, sharing
- Visualization: rich chart library (60+ types), custom plugins
- Dashboard: cross-filtering, tabbed layout, markdown support
- Semantic layer: virtual datasets with computed columns
- Role-based access: viewer, explorer, admin roles
- Row-level security: data source-level filter configuration
- Embedding: iframe with guest token auth

### Limitations
- Steeper learning curve than Metabase
- Complex setup (Celery workers, Redis, database)
- Performance tuning required for large deployments
- Dashboard migration between instances is manual

### When to Choose
Medium-to-large teams with SQL-skilled analysts. Custom visualization needs. Good for data platform teams.

## Looker

### Overview
- Proprietary, acquired by Google
- Cloud-only (Looker original), or via Google Cloud
- Best for: enterprise organizations (>100 users)
- Core concept: LookML semantic layer

### Key Features
- LookML: git-backed, version-controlled modeling layer
- Semantic layer: metrics defined once, reused everywhere
- Developer framework: parameterized extends, liquid templating
- Embedding: single sign-on (SSO) embed, Looker API
- Permissions: folder-based, attribute-based row-level security
- API: extensive REST API for metadata and data operations
- Integration: native BigQuery integration, pulls from any SQL database

### Limitations
- Expensive (per-user pricing)
- LookML learning curve for SQL developers
- Cloud-only (no on-premise option)
- Query performance depends on underlying warehouse

### When to Choose
Enterprise with centralized data governance. Git-based metric definitions. Large teams needing consistent metrics.

## Tableau

### Overview
- Proprietary, Salesforce-owned
- Desktop and Server/Cloud
- Best for: advanced visual analytics
- Core strength: drag-and-drop visual exploration

### Key Features
- Desktop: rich visual authoring, complex calculations
- VizQL: visual query language, drag-drop analytics
- Prep Builder: no-code ETL for data preparation
- Server/Cloud: centralized content management
- Parameters: interactive dashboard controls
- Set actions: click-based data selection and filtering
- Ask Data: natural language querying

### Limitations
- Expensive (Creator + Viewer licensing model)
- Desktop-only authoring (no web-based creation)
- Version control: limited (.twbx files in git)
- Scalability: requires Tableau Server architecture

### When to Choose
Advanced visual analytics needs. Design-heavy dashboards. Teams with dedicated Tableau authors.

## Comparison Matrix

| Feature | Metabase | Superset | Looker | Tableau |
|---------|----------|----------|--------|---------|
| License | Open-source | Open-source | Proprietary | Proprietary |
| Hosting | Self/Cloud | Self/Cloud | Cloud | Self/Cloud |
| Team size | <50 | 50-500 | 100+ | 10+ |
| SQL skill needed | Low | Medium | High (LookML) | Low (Desktop) |
| Semantic layer | Basic (Models) | Basic (virtual datasets) | Advanced (LookML) | None (calc fields) |
| Row-level security | Limited | Yes | Yes | Yes |
| Embedding | JWT | Guest token | SSO | JS API |
| Version control | No | No | Git-backed | Limited |
| Visualization | 30+ types | 60+ types | 40+ types | 100+ types |
| Best for | Quick analytics | Data teams | Enterprise governance | Visual analytics |

## Semantic Layer Design

### Principle
One source of truth for business metrics. Metrics defined in semantic layer, consumed by all dashboards. Prevents "SQL spaghetti" and inconsistent numbers.

### Implementation
Looker: LookML files in git with CI/CD. Metabase: Models with metric definitions and descriptions. Superset: virtual datasets with computed columns. Naming convention: business names in snake_case — `total_revenue`, `active_users_30d`, `customer_lifetime_value`.

### Metric Documentation
Every metric has: name, description, formula, owner, freshness SLA. Example: `revenue_growth = (current_period_revenue - previous_period_revenue) / previous_period_revenue * 100`.
