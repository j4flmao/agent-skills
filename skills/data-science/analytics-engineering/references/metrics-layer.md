# Metrics Layer Reference

## Semantic Layer Concepts

### What is a Semantic Layer?
Abstracts business metrics from physical data models. Defines metrics once, exposes them to all BI tools via a unified API.

```yaml
Benefits:
  - Single source of truth for metric definitions
  - Consistent calculation across tools
  - Self-service for business users
  - Governance and access control
  - Time intelligence (period-over-period, YTD)
```

### Architecture
```
Data Warehouse → Semantic Layer → Metric API → BI Tools
     (dbt models)  (MetricFlow/    (REST/GraphQL)  (Tableau, Looker,
                     Cube.js)                       Mode, Metabase)
```

## dbt Metrics (Legacy — dbt < 1.6)

```yaml
# models/marts/schema.yml
version: 2

metrics:
  - name: total_revenue
    label: Total Revenue
    model: ref('fct_orders')
    description: "Sum of all completed order amounts"
    calculation_method: sum
    expression: total_amount
    timestamp: order_date
    time_grains: [day, week, month, quarter, year]
    dimensions:
      - product_category
      - region
      - customer_tier
    filters:
      - field: status
        operator: =
        value: completed

  - name: revenue_per_customer
    label: Revenue Per Customer
    description: "Average revenue per active customer"
    calculation_method: derived
    expression: "{{ metric('total_revenue') }} / {{ metric('active_customers') }}"
    timestamp: order_date
    time_grains: [month, quarter, year]

  - name: active_customers
    label: Active Customers
    description: "Unique customers with at least one completed order"
    calculation_method: count_distinct
    expression: customer_id
    model: ref('fct_orders')
    timestamp: order_date
    time_grains: [day, week, month, quarter, year]
    filters:
      - field: status
        operator: =
        value: completed
```

Calculation methods: `count`, `count_distinct`, `sum`, `avg`, `min`, `max`, `median`, `derived`.

## MetricFlow (dbt < 1.6+)

### Model Configuration
```yaml
# models/semantic_model.yml
version: 2
semantic_models:
  - name: orders
    model: ref('fct_orders')
    defaults:
      agg_time_dimension: order_date
    entities:
      - name: order_id
        type: primary
      - name: customer_id
        type: foreign
    dimensions:
      - name: order_date
        type: time
        type_params:
          time_granularity: day
      - name: status
        type: categorical
    measures:
      - name: total_amount
        agg: sum
        description: "Total order amount"
      - name: order_count
        agg: count
        expr: 1
        description: "Number of orders"
      - name: customer_count
        agg: count_distinct
        expr: customer_id
```

### Metric Definitions
```yaml
# models/metrics.yml
version: 2
metrics:
  - name: revenue
    label: Revenue
    type: simple
    type_params:
      measure: total_amount

  - name: revenue_growth
    label: Revenue Growth
    type: ratio
    type_params:
      numerator: revenue
      denominator: revenue
      offset: 1 day

  - name: revenue_by_customer_cohort
    label: Revenue by Customer Cohort
    type: cumulative
    type_params:
      measure: total_amount
      window: 28 days

  - name: avg_order_value
    label: Average Order Value
    type: simple
    type_params:
      numerator: total_amount
      denominator: order_count

  - name: conversion_rate
    label: Conversion Rate
    type: derived
    expr: buyers / unique_visitors
    depends_on:
      - name: buyers
      - name: unique_visitors
```

### Querying with MetricFlow
```python
from metricflow import MetricFlowEngine

mf = MetricFlowEngine(
    warehouse=connection,
    system_schema="mf_schema"
)

# Query revenue by month and region
result = mf.query(
    metrics=["revenue"],
    group_by=["metric_time__month", "region"],
    where=[("status", "=", "completed")]
)

# Time comparison
result = mf.query(
    metrics=["revenue", "revenue_growth"],
    group_by=["metric_time__month"]
)
```

## Cube.js

### Data Schema
```javascript
// schema/Orders.js
cube(`Orders`, {
  sql: `SELECT * FROM analytics.fct_orders`,

  measures: {
    revenue: {
      sql: `total_amount`,
      type: `sum`
    },
    order_count: {
      sql: `order_id`,
      type: `count`
    },
    avg_order_value: {
      sql: `${revenue} / ${orderCount}`,
      type: `number`
    },
    revenue_per_customer: {
      sql: `${revenue} / ${customerCount}`,
      type: `number`
    }
  },

  dimensions: {
    order_date: {
      sql: `order_date`,
      type: `time`
    },
    status: {
      sql: `status`,
      type: `string`
    },
    customer_id: {
      sql: `customer_id`,
      type: `number`
    },
    product_category: {
      sql: `product_category`,
      type: `string`
    }
  },

  segments: {
    completed: {
      sql: `${CUBE}.status = 'completed'`
    }
  },

  preAggregations: {
    main: {
      type: `rollup`,
      measureReferences: [revenue, order_count],
      dimensionReferences: [order_date, product_category, status],
      granularity: `day`
    }
  }
});
```

### Query API
```json
// GET /cubejs-api/v1/load
{
  "measures": ["Orders.revenue"],
  "dimensions": ["Orders.order_date", "Orders.product_category"],
  "timeDimensions": [{
    "dimension": "Orders.order_date",
    "granularity": "month",
    "dateRange": ["2026-01-01", "2026-06-30"]
  }],
  "filters": [{
    "member": "Orders.status",
    "operator": "equals",
    "values": ["completed"]
  }],
  "order": { "Orders.order_date": "asc" }
}

// Response
{
  "data": [
    { "Orders.order_date.month": "2026-01", "Orders.product_category": "Electronics", "Orders.revenue": 150000 },
    { "Orders.order_date.month": "2026-01", "Orders.product_category": "Clothing", "Orders.revenue": 85000 }
  ],
  "total": 12,
  "usedPreAggregations": true
}
```

### Caching and Pre-Aggregation
```yaml
# cube.js
module.exports = {
  orchestratorOptions: {
    preAggregations: true,
    rollupOnly: false
  },
  cacheAndQueries: {
    refreshKey: {
      every: '6 hours'
    }
  }
};
```

## Semantic Layer Design Principles

### Metric Definition Template
```yaml
Every metric should define:
  1. Name (machine readable): total_revenue
  2. Label (human readable): Total Revenue
  3. Description: "Sum of completed order amounts"
  4. Data source: ref('fct_orders')
  5. Aggregation: SUM(total_amount)
  6. Filters: status = 'completed'
  7. Time dimension: order_date (day grain)
  8. Dimensions: product_category, region, customer_tier
  9. Owner: analytics-team
  10. Tags: financial, kpi
```

### Dimensional Modeling
```yaml
Conformed dimensions:
  - Customer (customer_id, name, tier, segment)
  - Product (product_id, name, category, subcategory)
  - Time (date, day_of_week, month, quarter, year)
  - Geography (region, country, market)

Dimensions should be:
  - Shared across all fact tables
  - Consistent naming and definitions
  - Hierarchical (drill-down paths)
  - Slowly changing (type 1 or type 2)
```

### Metric Governance
```yaml
Lifecycle stages:
  1. Draft: proposed metric, under discussion
  2. Candidate: defined in YAML, not yet used in dashboards
  3. Published: in production, used by BI tools
  4. Deprecated: replaced, still available for backward compatibility
  5. Retired: removed from semantic layer

Approval process:
  - Metric proposed with definition doc
  - Reviewed by data team
  - Validated against production data
  - Published to semantic layer
  - Documented in data catalog
```

### Time Intelligence
```yaml
Common time comparisons:
  - Period-over-period: MoM, QoQ, YoY
  - Rolling periods: 7-day rolling, 28-day rolling
  - Cumulative: MTD, QTD, YTD
  - Same period last year: YoY comparison
  - Cohort: metrics grouped by first action date

Implementation in MetricFlow:
  - offset_window: compare to N periods ago
  - cumulative: running total from period start
  - period_over_period: built-in function
```

### Performance Optimization
```yaml
Pre-aggregation strategies:
  - Rollup: materialize aggregated metrics at lower granularity
  - Partitioning: by time grain for incremental refresh
  - Pre-join: join dimensions into metric tables

Cache strategies:
  - Time-based: refresh every N hours
  - Data-based: refresh when source data changes
  - Result-level: cache individual query results

Optimization rules:
  - Pre-aggregate to highest requested granularity
  - Use incremental refresh for daily metrics
  - Limit dimension cardinality (avoid high-cardinality dims in queries)
  - Create materialized views for complex derived metrics
```

### Tool Selection Guide
```yaml
dbt Metrics:
  - Pros: native dbt integration, free, simple definition
  - Cons: limited querying, legacy (replaced by MetricFlow)
  - Best for: teams already on dbt, simple metric needs

MetricFlow:
  - Pros: powerful querying, time intelligence, governance
  - Cons: additional infrastructure, steeper learning curve
  - Best for: dbt Cloud teams, complex metric needs

Cube.js:
  - Pros: best API/performance, caching, multi-source
  - Cons: separate schema definition, additional service
  - Best for: real-time dashboards, external metric APIs

Looker LookML:
  - Pros: mature, rich explore UI, permissions
  - Cons: proprietary, Looker dependency
  - Best for: Looker shops with existing LookML investment
```
