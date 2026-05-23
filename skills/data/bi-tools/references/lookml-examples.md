# LookML Examples

## View Definition

```lookml
view: fct_orders {
  sql_table_name: analytics.fct_orders ;;

  dimension: order_id {
    type: string
    sql: ${TABLE}.order_id ;;
    primary_key: yes
    description: "Unique order identifier"
  }

  dimension: customer_id {
    type: string
    sql: ${TABLE}.customer_id ;;
  }

  dimension: status {
    type: string
    sql: ${TABLE}.status ;;
    allowed_value: { label: "Pending",    value: "pending" }
    allowed_value: { label: "Completed",  value: "completed" }
    allowed_value: { label: "Cancelled",  value: "cancelled" }
    allowed_value: { label: "Refunded",   value: "refunded" }
  }

  dimension_group: created {
    type: time
    timeframes: [date, week, month, quarter, year]
    sql: ${TABLE}.created_at ;;
  }

  measure: total_revenue {
    type: sum
    sql: ${TABLE}.total_amount ;;
    value_format_name: usd
  }

  measure: order_count {
    type: count
    drill_fields: [order_id, customer_id, total_revenue]
  }

  measure: avg_order_value {
    type: average
    sql: ${TABLE}.total_amount ;;
    value_format_name: usd
  }

  measure: revenue_cancelled {
    type: sum
    sql: CASE WHEN ${TABLE}.status = 'cancelled' THEN ${TABLE}.total_amount ELSE 0 END ;;
  }
}
```

## Explore Definition

```lookml
explore: fct_orders {
  join: dim_customers {
    sql_on: ${fct_orders.customer_id} = ${dim_customers.customer_id} ;;
    type: left_outer
    relationship: many_to_one
  }

  join: dim_products {
    sql_on: ${fct_orders.order_id} = ${dim_products.order_id} ;;
    type: left_outer
    relationship: many_to_many
  }

  always_filter: {
    filters: [fct_orders.status: "completed"]
  }

  access_filter: {
    field: dim_customers.region
    user_attribute: region
  }
}
```

## Model File

```lookml
connection: "bigquery_analytics"

include: "//views/fct_orders.view.lkml"
include: "//views/dim_customers.view.lkml"
include: "//views/dim_products.view.lkml"

datagroup: hourly_refresh {
  max_cache_age: "1 hour"
  sql_trigger: SELECT MAX(created_at) FROM analytics.fct_orders ;;
}
```

## Persistent Derived Table

```lookml
view: customer_metrics {
  derived_table: {
    sql:
      SELECT
        customer_id,
        COUNT(DISTINCT order_id) AS lifetime_orders,
        SUM(total_amount) AS lifetime_value,
        MAX(created_at) AS last_order_date
      FROM analytics.fct_orders
      GROUP BY 1 ;;
    persist_for: "24 hours"
    distribution_style: all
    sortkeys: ["customer_id"]
  }

  dimension: customer_id { type: string }

  measure: avg_lifetime_value {
    type: average
    sql: ${TABLE}.lifetime_value ;;
    value_format_name: usd
  }
}
```

## LookML Best Practices

- One view per table or derived table
- Use `primary_key` on every view for proper drill and explore behavior
- Prefix measure names with `count_`, `total_`, `avg_` for clarity
- Always add `description` to dimensions and measures — shows in Explore UI
- Use `access_filter` for row-level security per user attribute
- Set `datagroup` for cache invalidation — never hard-code cache TTL
- Keep explore joins shallow (max 3-4 levels) for query performance
