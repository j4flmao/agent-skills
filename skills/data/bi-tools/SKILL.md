---
name: data-bi-tools
description: >
  Use this skill when asked about BI, dashboard, Metabase, Superset, Looker, Tableau, PowerBI, reporting, data visualization, business intelligence, KPI dashboards, semantic layer, embedded analytics, or LookML. This skill enforces: tool selection based on team size and use case, semantic layer design with business-friendly metrics, dashboard layout patterns (KPI, trend, comparison, funnel), embedded analytics via SDK/iFrame, data source configuration, caching strategy, permissions model with row-level security, and scheduling. Do NOT use for: data warehouse schema design, ETL pipeline configuration, or ad-hoc SQL queries.
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
Select BI tools (Metabase, Superset, Looker, Tableau, PowerBI),
design semantic layers and dashboard layouts
(KPI, trend, comparison, funnel), configure embedded analytics
via iFrame/SDK, set up data source connections with caching,
and build permission models with row-level security.

## Agent Protocol

### Trigger
Exact user phrases: "BI", "dashboard", "Metabase", "Superset",
"Looker", "Tableau", "PowerBI", "reporting", "data visualization",
"business intelligence", "KPI dashboard", "BI tool",
"semantic layer", "embedded analytics", "BI dashboard design",
"LookML", "chart", "analytics dashboard", "BI permissions".

### Input Context
Before activating, verify:
- Team size and technical skill level
- Data warehouse platform
- Number of dashboards and refresh frequency
- Authentication provider (SSO, SAML, OIDC)
- Embedding requirements (customer-facing vs internal)
- Budget range (open-source vs enterprise SaaS)

### Output Artifact
BI strategy with tool comparison, semantic layer design,
dashboard mockup description as YAML and markdown.

### Response Format
```yaml
# Tool comparison matrix
# Semantic layer config
# Dashboard layout spec
# Permission model
# Cache policy
```

No preamble. No postamble. No explanations. No filler/hedging/transitions.
Compress output — why use many token when few do trick.

### Completion Criteria
- [ ] BI tool selected based on evaluation criteria
- [ ] Semantic layer defined with business-friendly metric names
- [ ] Dashboard layout with hierarchy (executive → operational → tactical)
- [ ] Embedded analytics integration approach documented
- [ ] Permission model with row-level security configured
- [ ] Performance optimization for dashboard load times
- [ ] Data source configuration and caching policy defined
- [ ] Dashboard scheduling and alerting configured

### Max Response Length
250 lines of configuration and design.

## Workflow

### Step 1: Tool Selection
Metabase: open-source, no-code query builder.
Best for teams under 50 users.
Quick setup, minimal maintenance.

Superset: open-source, 60+ chart types.
SQL Lab for analyst ad-hoc queries.
Best for 50-500 users with SQL skills.

Looker: enterprise, LookML semantic layer.
Git-backed, version-controlled metrics.
Best for over 100 users needing governance.

Tableau: proprietary, desktop authoring.
Rich visual analytics with VizQL.
Best for design-heavy dashboards.

PowerBI: Microsoft ecosystem, Excel integration.
Tight Teams and SharePoint integration.
Best for Windows-first organizations.

Decision matrix: compare license, hosting,
semantic layer depth, RLS, embedding, pricing.
Match to team size, budget, and capability.

### Step 2: Data Source Configuration
Connections: JDBC or ODBC per warehouse.
Auth: service account with read-only access.
IAM roles for cloud data warehouses.

Schema exposure: analytics schema only.
Marts and views, never raw source tables.
SSL/TLS encryption enforced.

Connection pooling: max 10 per BI tool.
VPN for on-premise via Bastion host.
Validate with sample query during setup.

### Step 3: Semantic Layer Design
Define business metrics in one place:

Revenue: SUM(order_total) WHERE status != cancelled.
Active users: COUNT DISTINCT user_id with event in 30d.
Churn rate: users lost divided by users at start.
NRR: (renewals + upgrades - downgrades) / starting revenue.
CAC: total sales cost / new customers acquired.

Looker: LookML files with dimension, measure, view, explore.
Version controlled in git with CI/CD testing.
Metabase: Models with saved metric definitions.
Superset: virtual datasets with computed columns.

Naming: business-friendly snake_case.
`total_revenue`, `active_users_weekly`, `customer_lifetime_value`.

Documentation: name, description, formula, owner, freshness SLA.
No raw SQL in dashboards — always use semantic layer.

### Step 3a: LookML Examples

```lookml
view: fct_orders {
  sql_table_name: analytics.fct_orders ;;
  dimension: order_id { type: string sql: ${TABLE}.order_id ;; primary_key: yes }
  dimension: status { type: string sql: ${TABLE}.status ;;
    allowed_value: { value: "pending" } { value: "completed" }
    allowed_value: { value: "cancelled" } { value: "refunded" } }
  dimension_group: created { type: time timeframes: [date,week,month] sql: ${TABLE}.created_at ;; }
  measure: total_revenue { type: sum sql: ${TABLE}.total_amount ;; value_format_name: usd }
  measure: order_count { type: count drill_fields: [order_id, total_revenue] }
  measure: avg_order_value { type: average sql: ${TABLE}.total_amount ;; value_format_name: usd }
}

explore: fct_orders {
  join: dim_customers {
    sql_on: ${fct_orders.customer_id} = ${dim_customers.customer_id} ;;
    type: left_outer relationship: many_to_one
  }
  access_filter: { field: dim_customers.region user_attribute: region }
}
```

```lookml
view: customer_metrics {
  derived_table: {
    sql:
      SELECT customer_id, COUNT(DISTINCT order_id) AS lifetime_orders,
             SUM(total_amount) AS lifetime_value
      FROM analytics.fct_orders GROUP BY 1 ;;
    persist_for: "24 hours"
  }
  measure: avg_lifetime_value { type: average sql: ${TABLE}.lifetime_value ;; }
}
```

### Step 4: Dashboard Layout Patterns
Executive dashboard:
Top 5-7 KPIs as cards with sparklines.
Revenue, active users, churn, gross margin, NPS.
Trend charts below (12-month area chart).
Comparison: budget versus actual.
Brief data table for top items.

Operational dashboard:
Daily metrics: orders, avg value, fulfillment rate.
Hourly bar chart: today versus yesterday.
Status breakdown as donut chart.
Recent orders table with 30s auto-refresh.

Tactical dashboard:
Funnel steps with drop-off percentages.
Cohort analysis: retention heatmap.
Geographic breakdown: map and table.
Drill-down to transaction detail.

Design rules: KPI cards on top always visible.
Trend charts below, detail tables at bottom.
Max 10 visualizations per dashboard.
Consistent color scheme.
Filters: date range plus top 3 dimensions.

### Step 4a: Superset and Metabase Examples

```json
{
  "superset_chart_api": {
    "POST /api/v1/chart/": {
      "dashboard_id": 5,
      "datasource_id": 12,
      "datasource_type": "table",
      "slice_name": "Revenue by Month",
      "viz_type": "echarts_timeseries_bar",
      "params": {
        "metrics": ["SUM(total_amount)"],
        "time_range": "LAST_12_MONTHS",
        "groupby": ["status"],
        "row_limit": 10000
      }
    }
  },
  "metabase_question": {
    "POST /api/card": {
      "name": "Monthly Active Users",
      "dataset_query": {
        "database": 3,
        "type": "query",
        "query": {
          "source_table": 47,
          "aggregation": [["count", ["distinct", ["field", "user_id", null]]]],
          "breakout": [["field", "event_month", {"temporal-unit": "month"}]],
          "filter": ["time-interval", ["field", "event_at", null], -30, "day"]
        }
      },
      "display": "line",
      "visualization_settings": {}
    }
  }
}
```

```yaml
# dashboard-as-code YAML spec
dashboard:
  title: Executive Summary
  tags: [executive, revenue, weekly]
  refresh_interval: 3600
  filters:
    - field: date_range
      type: date
      default: LAST_30_DAYS
    - field: region
      type: dropdown
      default: ALL
  charts:
    - title: Total Revenue
      type: kpi
      metric: total_revenue
      sparkline: true
    - title: Revenue Trend
      type: timeseries
      metric: total_revenue
      dimensions: [created_month, region]
      granularity: month
    - title: Orders by Status
      type: donut
      metric: order_count
      dimension: status
    - title: Top Customers
      type: table
      columns: [customer_id, lifetime_value, last_order_date]
      limit: 25
```

### Step 5: Embedded Analytics
Metabase: signed JWT embed with row-level security.
Backend generates token with resource and params.
Frontend renders in iframe.

Superset: guest token with RLS clauses.
CORS restricted to allowed origins.

Looker: SSO embed URL with embed_domain.
Looker API for custom integration.

Tableau: JS API with trusted authentication.
PowerBI: REST API with service principal and Azure AD.

Short-lived embed token (1 hour max).
Cache server-side, refresh on expiry.
Restrict CORS, implement CSP for iframe sources.

### Step 6: Permissions Model
Roles: admin (manage users and settings),
developer (create and edit dashboards),
viewer (view only, no export),
restricted (specific dashboards only).

Row-level security:
Data source filter: WHERE region = current_user_region().
Attribute-based: map JWT claim to data column.

Metabase: data sandboxing (Enterprise).
Superset: data source filters per role.
Looker: access grants with user attributes.

Auth: SSO via SAML or OIDC.
SCIM for user provisioning and deprovisioning.

Audit: dashboard views, query executions, data exports.
Monthly access review, quarterly permission audit.

### Step 7: Caching and Performance
Materialized views for all dashboard source tables.
BI caching: dashboard cache (1 hour), query cache (1 hour),
context cache (24 hours). Invalidate on refresh.

Query limits: 10K rows returned max, 60s timeout max.
Refresh schedule: executive every 4 hours,
operational every 1 hour, tactical on-demand.

Cache warming: pre-load before business hours.
Monitor: load time under 5s, query duration, cache hit rate over 80%.

### Step 8: Scheduling and Alerts
Subscriptions: email (PDF, CSV, charts), Slack (formatted).
Schedule: daily, weekly, monthly with timezone support.

Alerts: metric drops below threshold, anomaly detection.
Delivery by role and department.
Review subscriptions quarterly, remove stale.

## Rules
- One semantic layer, many dashboards
- Dashboard load under 5 seconds with caching
- Row-level security enforced at data source, not application
- Every dashboard has a purpose, owner, and refresh schedule
- No raw SQL in dashboards — use semantic layer
- Executive dashboards show trends, not raw numbers
- Cache aggressively — stale better than slow
- Export controls prevent data leakage
- Embed tokens short-lived (1 hour max)

## References
  - references/bi-security-governance.md — BI Security and Governance
  - references/bi-tools-architecture.md — BI Tools Architecture
  - references/bi-tools-performance.md — BI Tools Performance Optimization
  - references/dashboard-design.md — Dashboard Design
  - references/embedding-analytics.md — Embedded Analytics
  - references/lookml-examples.md — LookML Examples
  - references/semantic-layer-patterns.md — Semantic Layer Patterns
  - references/tool-selection.md — BI Tool Selection
## Handoff
`data-data-warehouse` for optimizing warehouse for BI queries
`data-data-quality` for validating dashboard data accuracy
