---
name: data-bi-tools
description: >
  Use this skill when asked about BI, dashboard, Metabase, Superset, Looker, Tableau, reporting, data visualization, business intelligence, or KPI dashboards. This skill enforces: tool selection based on team size and use case, semantic layer design, dashboard layout patterns, embedded analytics via SDK, and row-level permission models. Do NOT use for: data warehouse schema design, ETL pipeline configuration, or ad-hoc SQL queries.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [data, analytics, phase-10]
---

# Data BI Tools

## Purpose
Select BI tools, design semantic layers and dashboards, configure embedded analytics, and set up permission models for business intelligence.

## Agent Protocol

### Trigger
Exact user phrases: "BI", "dashboard", "Metabase", "Superset", "Looker", "Tableau", "reporting", "data visualization", "business intelligence", "KPI dashboard", "BI tool", "semantic layer", "embedded analytics", "BI dashboard design", "LookML", "chart", "analytics dashboard".

### Input Context
Before activating, verify:
- Team size and technical skill level (analysts, engineers, executives)
- Data warehouse platform (Snowflake, BigQuery, Redshift, DuckDB)
- Number of dashboards and refresh frequency
- Authentication provider (SSO, SAML, OIDC)
- Embedding requirements (customer-facing vs internal)

### Output Artifact
BI strategy with tool comparison, semantic layer design, dashboard mockup description as YAML and markdown.

### Response Format
```yaml
# Tool comparison matrix
# Semantic layer config
# Dashboard layout spec
# Permission model
```

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
- [ ] BI tool selected based on evaluation criteria
- [ ] Semantic layer defined with business-friendly metric names
- [ ] Dashboard layout created with hierarchy (executive → operational → tactical)
- [ ] Embedded analytics integration approach documented
- [ ] Permission model with row-level security configured
- [ ] Performance optimization for dashboard load times

### Max Response Length
250 lines of configuration and design.

## Workflow

### Step 1: Tool Selection
Metabase: self-hosted, open-source, best for small-medium teams, no-code dashboards, simple SQL. Superset: open-source, rich visualization, SQL Lab for analysts, good for data teams. Looker: enterprise, LookML semantic layer, git-backed modeling, best for large orgs with centralized governance. Tableau: rich desktop authoring, best for advanced visual analytics, expensive. Default: Metabase for <50 users, Looker for >100 users or complex semantic layer.

### Step 2: Semantic Layer
Define business metrics in one place: revenue (SUM of order_total where status != cancelled), active users (COUNT DISTINCT user_id with event in last 30d), churn rate (users lost / users at start). Looker: LookML with `dimension`, `measure`, `view` files. Metabase: Models with metric definitions. Naming: business-friendly, consistent across all dashboards — `revenue`, `revenue_growth`, `active_users_weekly`.

### Step 3: Dashboard Design
Hierarchy: executive (top 5 KPIs, company health), operational (per-team metrics, daily refresh), tactical (detailed exploration, weekly refresh). Layout: KPI cards on top (current value, trend, sparkline), trend charts below (time series aggregated), detail tables bottom (raw data with pagination). Max: 10 visualizations per dashboard, 3 categories. Filters: date range, dimension pickers (region, team, product).

### Step 4: Embedded Analytics
Metabase: iframe embed with signed tokens, public links for external. Superset: iframe embed with JWT auth, guest tokens. Looker: SSO embed URL, Looker API for custom embedding. Tableau: Tableau JS API for embedding. Pattern: backend generates signed embed URL with row-level restrictions, frontend renders in iframe. Cache: embed token expires after 1 hour, dashboard data cached by BI tool.

### Step 5: Permission Model
Roles: admin (manage users, settings, connections), developer (create/edit dashboards, models), viewer (view dashboards, no edit). Row-level: region-based access (US team sees US data only), customer-based (each customer sees own data). Authentication: SSO via SAML/OIDC, SCIM for user provisioning. Audit: dashboard access logs, query audit trails, export/limit controls.

### Step 6: Performance Optimization
Materialized views or aggregations for dashboard tables. BI tool caching: 1 hour for dashboards, 24 hours for static reference queries. Query limits: max 10000 rows returned, max 60 second query timeout. Refresh: executive dashboards every 4 hours, operational every 1 hour. Avoid: cross-joins, unaggregated raw queries, too many filters.

## Rules
- One semantic layer, many dashboards
- Dashboard load under 5 seconds with caching
- Row-level security enforced at data source, not application
- Every dashboard has a purpose, owner, and refresh schedule
- No raw SQL in dashboards — use models/semantic layer
- Executive dashboards show trends, not raw numbers
- Cache aggressively — stale dashboard is better than slow dashboard
- Export controls prevent data leakage

## References
- `references/tool-selection.md` — Metabase, Superset, Looker, Tableau comparison, semantic layer design
- `references/dashboard-design.md` — KPI selection, layout patterns, embedding, permissions, performance

## Handoff
`data-data-warehouse` for optimizing warehouse for BI queries
`data-data-quality` for validating dashboard data accuracy
