# Semantic Layer Patterns

## Metric Definition Template

```yaml
metrics:
  - name: total_revenue
    description: "Gross revenue from completed orders"
    label: "Total Revenue"
    type: measure
    sql: SUM(CASE WHEN status = 'completed' THEN total_amount ELSE 0 END)
    model: fct_orders
    timestamp: created_at
    time_grains: [day, week, month, quarter, year]
    dimensions: [status, region, product_category]
    filters:
      - field: status
        operator: "="
        value: completed

  - name: active_customers
    description: "Customers with at least one event in trailing 30 days"
    label: "Active Customers (30d)"
    type: measure
    sql: COUNT(DISTINCT customer_id)
    model: fct_events
    timestamp: event_at
    time_grains: [day, week, month]
    filters:
      - field: event_at
        operator: ">="
        value: "CURRENT_DATE - 30"

  - name: customer_lifetime_value
    description: "Average LTV across all customers"
    label: "Customer LTV"
    type: ratio
    numerator: total_revenue
    denominator: customer_count
    time_grains: [month, quarter, year]
```

## Cross-Tool Pattern Mapping

| Concept | Looker (LookML) | dbt Metrics | Metabase | Superset |
|---------|----------------|-------------|----------|----------|
| Dimension | `dimension` | `column` | Field | Column |
| Measure | `measure` | `measure` | Metric | Metric |
| Derived metric | `measure: ratio` | `type: ratio` | Custom expression | Saved metric |
| Time grain | `timeframes` | `time_grains` | Bucket | Time range |
| Filter | `always_filter` | `filters` | Filter | Ad-hoc |
| Join | `explore > join` | `ref()` | Model query | Virtual dataset |

## Naming Conventions

| Pattern | Example | Tool |
|---------|---------|------|
| `snake_case` | `total_revenue` | All |
| Prefix with grain | `daily_active_users` | dbt, Looker |
| Verb prefix for actions | `churned_customers` | All |
| Unit suffix | `revenue_usd`, `latency_ms` | All |
| Status suffix | `order_completed`, `payment_pending` | All |
| Avoid abbreviations | `customer_lifetime_value` not `clv` | All |

## Cache and Refresh Strategy

```yaml
semantic_layer_cache:
  materialized_views:
    refresh: every 1 hour
    warehouse: analytics
  bi_tool_cache:
    dashboard: 1 hour
    query: 30 minutes
    context: 24 hours
  warmup:
    schedule: "0 5 * * *"
    queries:
      - SELECT * FROM dashboard_exec_summary
      - SELECT * FROM dashboard_ops_summary
  invalidation:
    on_data_change: true
    max_stale: 4 hours
```

## Semantic Layer Rules

- One metric definition, reused across all dashboards and tools
- Raw SQL never appears in dashboards — always reference the semantic layer
- Every metric has: name, description, formula, owner, freshness SLA, and grain
- Time grains are explicit (daily, weekly, monthly) — never ambiguous
- Dimensions are shared across metrics for consistent drill-down
- Version-controlled in git with peer review for metric changes
- Test every metric : compare BI output against raw SQL query
