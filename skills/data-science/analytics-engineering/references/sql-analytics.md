# SQL for Analytics Reference

## Window Functions

### Ranking Functions
```sql
-- ROW_NUMBER: unique sequential number (no ties)
SELECT
    customer_id, order_date, total_amount,
    ROW_NUMBER() OVER (
        PARTITION BY customer_id
        ORDER BY order_date DESC
    ) AS order_recency_rank
FROM fct_orders;

-- RANK: same value = same rank, gaps
SELECT
    product_id, total_revenue,
    RANK() OVER (ORDER BY total_revenue DESC) AS revenue_rank
FROM daily_revenue
WHERE order_date = CURRENT_DATE - 1;

-- DENSE_RANK: same value = same rank, no gaps
SELECT
    product_id,
    DENSE_RANK() OVER (ORDER BY total_revenue DESC) AS revenue_rank
FROM daily_revenue;

-- NTILE: divide into N buckets
SELECT
    customer_id, lifetime_value,
    NTILE(5) OVER (ORDER BY lifetime_value DESC) AS value_quintile
FROM dim_customers;
```

### Aggregate Window Functions
```sql
-- Running total
SELECT
    order_date,
    total_revenue,
    SUM(total_revenue) OVER (ORDER BY order_date) AS running_revenue
FROM daily_revenue;

-- Moving average (7-day)
SELECT
    order_date,
    total_revenue,
    AVG(total_revenue) OVER (
        ORDER BY order_date
        ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
    ) AS ma_7d
FROM daily_revenue;

-- Year-to-date
SELECT
    order_date,
    total_revenue,
    SUM(total_revenue) OVER (
        PARTITION BY EXTRACT(YEAR FROM order_date)
        ORDER BY order_date
    ) AS revenue_ytd
FROM daily_revenue;

-- Group-level percentage
SELECT
    region,
    SUM(revenue) AS revenue,
    SUM(SUM(revenue)) OVER () AS total_revenue,
    SUM(revenue) / SUM(SUM(revenue)) OVER () * 100 AS pct_of_total
FROM daily_revenue
GROUP BY region;
```

### Offset Functions
```sql
-- LAG: previous value
SELECT
    order_date,
    total_revenue,
    LAG(total_revenue, 1) OVER (ORDER BY order_date) AS prev_day_revenue,
    total_revenue - LAG(total_revenue, 1) OVER (ORDER BY order_date) AS daily_change,
    (total_revenue - LAG(total_revenue, 1) OVER (ORDER BY order_date))
        / NULLIF(LAG(total_revenue, 1) OVER (ORDER BY order_date), 0) * 100 AS daily_change_pct
FROM daily_revenue;

-- LEAD: next value
SELECT
    order_date,
    total_revenue,
    LEAD(total_revenue, 7) OVER (ORDER BY order_date) AS revenue_7d_ahead
FROM daily_revenue;

-- YoY comparison
SELECT
    DATE_TRUNC('month', order_date) AS month,
    SUM(total_revenue) AS revenue,
    LAG(SUM(total_revenue), 12) OVER (ORDER BY DATE_TRUNC('month', order_date)) AS revenue_last_year,
    (SUM(total_revenue) - LAG(SUM(total_revenue), 12) OVER (ORDER BY DATE_TRUNC('month', order_date)))
        / NULLIF(LAG(SUM(total_revenue), 12) OVER (ORDER BY DATE_TRUNC('month', order_date)), 0) * 100 AS yoy_growth
FROM daily_revenue
GROUP BY month;

-- FIRST_VALUE / LAST_VALUE
SELECT
    customer_id,
    order_date,
    total_amount,
    FIRST_VALUE(order_date) OVER (
        PARTITION BY customer_id
        ORDER BY order_date
    ) AS first_purchase_date,
    LAST_VALUE(order_date) OVER (
        PARTITION BY customer_id
        ORDER BY order_date
        ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
    ) AS last_purchase_date
FROM fct_orders;
```

## Common Table Expressions (CTEs)

### Basic CTE Pattern
```sql
WITH customer_orders AS (
    SELECT
        customer_id,
        COUNT(*) AS order_count,
        SUM(total_amount) AS total_spent,
        MIN(order_date) AS first_order,
        MAX(order_date) AS last_order
    FROM fct_orders
    GROUP BY customer_id
),
customer_rank AS (
    SELECT *,
        ROW_NUMBER() OVER (ORDER BY total_spent DESC) AS rank
    FROM customer_orders
)
SELECT * FROM customer_rank WHERE rank <= 100;
```

### Recursive CTE (Date Spine)
```sql
WITH RECURSIVE date_spine AS (
    SELECT DATE('2026-01-01') AS date
    UNION ALL
    SELECT DATE_ADD(date, INTERVAL 1 DAY)
    FROM date_spine
    WHERE date < DATE('2026-12-31')
)
SELECT
    date,
    EXTRACT(YEAR FROM date) AS year,
    EXTRACT(MONTH FROM date) AS month,
    EXTRACT(DAY FROM date) AS day
FROM date_spine;
```

### CTE for Funnel Analysis
```sql
WITH
page_views AS (
    SELECT user_id, MIN(timestamp) AS first_view
    FROM events WHERE event_type = 'page_view'
    GROUP BY user_id
),
signups AS (
    SELECT user_id, MIN(timestamp) AS first_signup
    FROM events WHERE event_type = 'signup'
    GROUP BY user_id
),
purchases AS (
    SELECT user_id, MIN(timestamp) AS first_purchase
    FROM events WHERE event_type = 'purchase'
    GROUP BY user_id
)
SELECT
    COUNT(DISTINCT pv.user_id) AS viewers,
    COUNT(DISTINCT s.user_id) AS signups,
    COUNT(DISTINCT pu.user_id) AS purchasers,
    COUNT(DISTINCT s.user_id) / NULLIF(COUNT(DISTINCT pv.user_id), 0) AS signup_rate,
    COUNT(DISTINCT pu.user_id) / NULLIF(COUNT(DISTINCT s.user_id), 0) AS purchase_rate
FROM page_views pv
LEFT JOIN signups s ON pv.user_id = s.user_id
LEFT JOIN purchases pu ON pv.user_id = pu.user_id;
```

## Pivot / Unpivot

### Pivot (Rows → Columns)
```sql
-- Standard SQL with CASE WHEN
SELECT
    DATE_TRUNC('month', order_date) AS month,
    SUM(CASE WHEN product_category = 'Electronics' THEN amount ELSE 0 END) AS electronics,
    SUM(CASE WHEN product_category = 'Clothing' THEN amount ELSE 0 END) AS clothing,
    SUM(CASE WHEN product_category = 'Home' THEN amount ELSE 0 END) AS home,
    SUM(CASE WHEN product_category = 'Books' THEN amount ELSE 0 END) AS books
FROM fct_orders
GROUP BY month;

-- Snowflake/BigQuery PIVOT
SELECT *
FROM (
    SELECT DATE_TRUNC('month', order_date) AS month, product_category, amount
    FROM fct_orders
)
PIVOT (
    SUM(amount)
    FOR product_category IN ('Electronics', 'Clothing', 'Home', 'Books')
) AS p;
```

### Unpivot (Columns → Rows)
```sql
-- Standard SQL UNPIVOT
SELECT
    DATE_TRUNC('month', order_date) AS month,
    'Electronics' AS category,
    SUM(electronics) AS revenue
FROM monthly_category_revenue
GROUP BY month
UNION ALL
SELECT
    DATE_TRUNC('month', order_date) AS month,
    'Clothing' AS category,
    SUM(clothing) AS revenue
FROM monthly_category_revenue
GROUP BY month;

-- BigQuery UNPIVOT
SELECT month, category, revenue
FROM monthly_category_revenue
UNPIVOT (
    revenue FOR category IN (electronics, clothing, home, books)
);
```

## Statistical Functions

```sql
-- Percentile / Quantile
SELECT
    PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY total_amount) AS q1,
    PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY total_amount) AS median,
    PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY total_amount) AS q3,
    PERCENTILE_CONT(0.90) WITHIN GROUP (ORDER BY total_amount) AS p90,
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY total_amount) AS p95,
    PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY total_amount) AS p99
FROM fct_orders;

-- Standard deviation and variance
SELECT
    AVG(total_amount) AS mean,
    STDDEV(total_amount) AS std_dev,
    VARIANCE(total_amount) AS variance,
    STDDEV(total_amount) / AVG(total_amount) AS coefficient_variation
FROM fct_orders;

-- Correlation
SELECT
    CORR(total_amount, quantity) AS revenue_quantity_corr
FROM fct_orders;

-- Z-score
SELECT
    order_id,
    total_amount,
    (total_amount - AVG(total_amount) OVER ())
        / NULLIF(STDDEV(total_amount) OVER (), 0) AS z_score
FROM fct_orders;

-- IQR outlier detection
WITH stats AS (
    SELECT
        PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY total_amount) AS q1,
        PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY total_amount) AS q3
    FROM fct_orders
)
SELECT
    order_id, total_amount,
    q1 - 1.5 * (q3 - q1) AS lower_fence,
    q3 + 1.5 * (q3 - q1) AS upper_fence,
    CASE WHEN total_amount < q1 - 1.5 * (q3 - q1)
              OR total_amount > q3 + 1.5 * (q3 - q1)
         THEN 'outlier' ELSE 'normal'
    END AS outlier_flag
FROM fct_orders, stats;
```

## Time Series SQL

### Date Bucketing
```sql
-- Truncate to different grains
SELECT
    DATE_TRUNC('hour', timestamp) AS hour_bucket,
    DATE_TRUNC('day', timestamp) AS day_bucket,
    DATE_TRUNC('week', timestamp) AS week_bucket,
    DATE_TRUNC('month', timestamp) AS month_bucket,
    COUNT(*) AS events
FROM events
GROUP BY hour_bucket, day_bucket, week_bucket, month_bucket;

-- Custom period (e.g., 6-hour buckets)
SELECT
    TIMESTAMP_SECONDS(
        UNIX_SECONDS(timestamp) - UNIX_SECONDS(timestamp) % (6 * 3600)
    ) AS six_hour_bucket,
    COUNT(*) AS events
FROM events
GROUP BY six_hour_bucket;
```

### Cohort Analysis
```sql
WITH user_cohorts AS (
    SELECT
        user_id,
        DATE_TRUNC('month', MIN(order_date)) AS cohort_month
    FROM fct_orders
    GROUP BY user_id
),
cohort_activity AS (
    SELECT
        uc.cohort_month,
        DATE_TRUNC('month', o.order_date) AS activity_month,
        COUNT(DISTINCT o.user_id) AS active_users
    FROM user_cohorts uc
    JOIN fct_orders o ON uc.user_id = o.user_id
    GROUP BY cohort_month, activity_month
),
cohort_sizes AS (
    SELECT cohort_month, COUNT(DISTINCT user_id) AS cohort_size
    FROM user_cohorts
    GROUP BY cohort_month
)
SELECT
    ca.cohort_month,
    ca.activity_month,
    DATEDIFF('month', ca.cohort_month, ca.activity_month) AS period_number,
    ca.active_users,
    cs.cohort_size,
    ca.active_users / cs.cohort_size AS retention_rate
FROM cohort_activity ca
JOIN cohort_sizes cs ON ca.cohort_month = cs.cohort_month
ORDER BY cohort_month, period_number;
```

### Sessionization
```sql
WITH events_with_prev AS (
    SELECT
        user_id,
        timestamp,
        event_type,
        LAG(timestamp) OVER (PARTITION BY user_id ORDER BY timestamp) AS prev_timestamp,
        CASE WHEN TIMESTAMPDIFF('minute',
                 LAG(timestamp) OVER (PARTITION BY user_id ORDER BY timestamp),
                 timestamp) > 30
             THEN 1 ELSE 0
        END AS new_session_flag
    FROM events
),
session_starts AS (
    SELECT *,
        SUM(new_session_flag) OVER (
            PARTITION BY user_id
            ORDER BY timestamp
            ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
        ) AS session_id
    FROM events_with_prev
)
SELECT
    user_id,
    session_id,
    MIN(timestamp) AS session_start,
    MAX(timestamp) AS session_end,
    TIMESTAMPDIFF('second', MIN(timestamp), MAX(timestamp)) AS session_duration_seconds,
    COUNT(*) AS events_in_session
FROM session_starts
GROUP BY user_id, session_id;
```

## Performance Optimization

### Query Tuning Tips
```sql
-- 1. Filter early and aggressively
WITH filtered AS (
    SELECT * FROM fct_orders
    WHERE order_date >= '2026-01-01'
      AND order_date < '2026-02-01'
      AND status = 'completed'
)
SELECT customer_id, SUM(total_amount) FROM filtered GROUP BY customer_id;

-- 2. Use EXIST instead of DISTINCT for join filtering
SELECT customer_id, customer_name
FROM dim_customers c
WHERE EXISTS (
    SELECT 1 FROM fct_orders o
    WHERE o.customer_id = c.customer_id AND o.order_date >= '2026-01-01'
);

-- 3. Pre-aggregate before joining
WITH daily_revenue AS (
    SELECT order_date, SUM(total_amount) AS revenue
    FROM fct_orders
    WHERE status = 'completed'
    GROUP BY order_date
)
SELECT d.*, c.day_of_week, c.is_holiday
FROM daily_revenue d
JOIN dim_dates c ON d.order_date = c.date;

-- 4. Use APPROX_COUNT_DISTINCT for large cardinality
SELECT APPROX_COUNT_DISTINCT(user_id) AS approximate_users
FROM events WHERE event_date = CURRENT_DATE;
```

### Partitioning and Clustering
```sql
-- Partition pruning: always filter on partition column
SELECT * FROM fct_orders
WHERE order_date >= '2026-01-01'  -- Partition column in WHERE

-- Cluster keys for high-cardinality filters
SELECT * FROM fct_orders
WHERE customer_id = 12345;  -- Cluster key speeds up this query
```

## UDFs (User-Defined Functions)

### SQL UDF
```sql
CREATE FUNCTION calculate_discount(amount DECIMAL, customer_tier VARCHAR)
RETURNS DECIMAL
AS
$$
    CASE
        WHEN customer_tier = 'platinum' THEN amount * 0.20
        WHEN customer_tier = 'gold' THEN amount * 0.15
        WHEN customer_tier = 'silver' THEN amount * 0.10
        ELSE amount * 0.05
    END
$$;

SELECT order_id, total_amount, calculate_discount(total_amount, 'gold') AS discount;
```

### Python UDF (Snowflake/BigQuery)
```python
CREATE FUNCTION calculate_customer_score(
    order_count INT,
    total_spent FLOAT,
    days_since_last_order INT
) RETURNS FLOAT
LANGUAGE PYTHON
AS
$$
    import numpy as np
    recency_score = np.exp(-days_since_last_order / 365)
    frequency_score = np.log1p(order_count) / np.log1p(100)
    monetary_score = np.log1p(total_spent) / np.log1p(100000)
    return (0.3 * recency_score + 0.3 * frequency_score + 0.4 * monetary_score) * 100
$$;
```
