# Fact Table Design Reference

## Fact Types

### Transaction Fact Tables

Transaction fact tables capture individual measurement events at the most atomic grain possible.

**Characteristics:**
- One row per event
- Dense with additive numeric facts
- Foreign keys to many dimensions
- Fastest growth rate
- Foundation for all other fact tables

```sql
CREATE TABLE fact_page_views (
    page_view_fact_key BIGINT PRIMARY KEY,
    -- Dimension foreign keys
    date_key INT NOT NULL REFERENCES dim_date(date_key),
    time_key INT NOT NULL REFERENCES dim_time(time_key),
    visitor_key INT NOT NULL REFERENCES dim_visitor(visitor_key),
    page_key INT NOT NULL REFERENCES dim_page(page_key),
    referrer_key INT REFERENCES dim_referrer(referrer_key),
    session_key INT REFERENCES dim_session(session_key),
    device_key INT REFERENCES dim_device(device_key),
    -- Degenerate dimensions
    page_url STRING,
    referrer_url STRING,
    session_id STRING,
    -- Additive facts
    time_on_page_seconds INT,
    page_scroll_depth_px INT,
    -- Non-additive facts
    is_bounce BOOLEAN,
    is_conversion BOOLEAN
);
```

### Periodic Snapshot Fact Tables

Periodic snapshots capture measurements at regular, predictable time intervals.

**Characteristics:**
- One row per period per entity
- Semi-additive facts (balances, levels)
- Predictable row count
- Used for time-series analysis

```sql
CREATE TABLE fact_account_balance_snapshot (
    balance_fact_key BIGINT PRIMARY KEY,
    date_key INT NOT NULL REFERENCES dim_date(date_key),
    account_key INT NOT NULL REFERENCES dim_account(account_key),
    customer_key INT NOT NULL REFERENCES dim_customer(customer_key),
    -- Semi-additive: summable across accounts, not across dates
    ending_balance DECIMAL(15,2) NOT NULL,
    average_daily_balance DECIMAL(15,2),
    -- Additive across all dimensions
    deposits_today DECIMAL(15,2),
    withdrawals_today DECIMAL(15,2),
    transaction_count_today INT,
    -- Non-additive
    interest_rate DECIMAL(5,4),
    account_health_score INT
);
```

### Accumulating Snapshot Fact Tables

Accumulating snapshots track a business process from beginning to end, with multiple date milestones.

**Characteristics:**
- One row per process instance (order, claim, application)
- Multiple date foreign keys (order_date, ship_date, delivery_date)
- Updated in place as process progresses
- Row count equals process instance count

```sql
CREATE TABLE fact_insurance_claim (
    claim_fact_key BIGINT PRIMARY KEY,
    -- Milestone dates
    claim_filed_date_key INT NOT NULL REFERENCES dim_date(date_key),
    claim_review_date_key INT REFERENCES dim_date(date_key),
    claim_approval_date_key INT REFERENCES dim_date(date_key),
    claim_payment_date_key INT REFERENCES dim_date(date_key),
    claim_closed_date_key INT REFERENCES dim_date(date_key),
    -- Core dimensions
    claimant_key INT NOT NULL REFERENCES dim_customer(customer_key),
    policy_key INT NOT NULL REFERENCES dim_policy(policy_key),
    adjuster_key INT REFERENCES dim_adjuster(adjuster_key),
    claim_type_key INT REFERENCES dim_claim_type(claim_type_key),
    -- Degenerate dimensions
    claim_number STRING NOT NULL,
    policy_number STRING,
    -- Facts (time between milestones)
    filing_to_review_days INT,
    review_to_approval_days INT,
    approval_to_payment_days INT,
    total_claim_duration_days INT,
    -- Financial facts
    claim_amount DECIMAL(12,2),
    approved_amount DECIMAL(12,2),
    paid_amount DECIMAL(12,2),
    deductible_amount DECIMAL(10,2)
);
```

### Factless Fact Tables

Factless fact tables have no numeric measures. They capture events or coverage with only dimension foreign keys.

**Uses:**
- Events with no measurable value (product page view, login event)
- Coverage analysis (which products were on promotion but didn't sell)
- Activity tracking (student attendance, employee training completion)

```sql
-- Factless fact: product promotion coverage
CREATE TABLE fact_promotion_coverage (
    date_key INT NOT NULL REFERENCES dim_date(date_key),
    product_key INT NOT NULL REFERENCES dim_product(product_key),
    promotion_key INT NOT NULL REFERENCES dim_promotion(promotion_key),
    store_key INT NOT NULL REFERENCES dim_store(store_key),
    PRIMARY KEY (date_key, product_key, promotion_key, store_key)
);

-- Answer: Which products were on promotion but had zero sales?
SELECT p.product_name, pr.promotion_name
FROM fact_promotion_coverage fpc
JOIN dim_product p ON fpc.product_key = p.product_key
JOIN dim_promotion pr ON fpc.promotion_key = pr.promotion_key
LEFT JOIN fact_sales fs ON fpc.date_key = fs.date_key
    AND fpc.product_key = fs.product_key
    AND fpc.store_key = fs.store_key
WHERE fs.sales_fact_key IS NULL;
```

### Fact Constellation

Multiple fact tables sharing conformed dimensions form a fact constellation. This enables drill-across analysis.

```
Fact Constellation:
  dim_date  ←---  fact_sales
    ↓               fact_returns
  dim_product  ←--- fact_inventory
    ↓               fact_forecast
  dim_customer ←--- fact_support_tickets
  dim_store    ←--- fact_store_audits
```

## Additive, Semi-Additive, and Non-Additive Facts

### Additive Facts
Summable across all dimensions. These are the most useful facts.

```sql
CREATE TABLE fact_sales (
    quantity INT NOT NULL,          -- Additive: sum over any dimension
    sales_amount DECIMAL(10,2),     -- Additive
    cost_amount DECIMAL(10,2),      -- Additive
    discount_amount DECIMAL(10,2),  -- Additive
    tax_amount DECIMAL(10,2)        -- Additive
);
```

### Semi-Additive Facts
Summable across some dimensions but not others. Usually not summable across time.

```sql
CREATE TABLE fact_inventory (       
    quantity_on_hand INT,           -- Semi-additive: sum over product/store but not date
    account_balance DECIMAL(15,2),  -- Semi-additive: balance at point in time
    head_count INT,                 -- Semi-additive: headcount snapshot
);

-- Correct handling of semi-additive facts: average for time dimension
SELECT
    DATE_TRUNC('month', d.full_date) AS month,
    AVG(inv.quantity_on_hand) AS avg_inventory  -- AVG, not SUM
FROM fact_inventory inv
JOIN dim_date d ON inv.date_key = d.date_key
GROUP BY DATE_TRUNC('month', d.full_date);
```

### Non-Additive Facts
Cannot be summed across any dimension. Stored for reference or as computed metrics.

```sql
CREATE TABLE fact_sales (  
    profit_margin_pct DECIMAL(5,2),   -- Non-additive: percentage
    unit_price DECIMAL(10,2),         -- Non-additive: context-dependent
    discount_rate DECIMAL(5,2),       -- Non-additive: percentage
    customer_satisfaction_score INT,  -- Non-additive: ordinal
);

-- Correct handling: average or weighted average
SELECT
    p.category_name,
    AVG(s.profit_margin_pct) AS avg_margin,     -- Average of percentages
    SUM(s.sales_amount) / NULLIF(SUM(s.quantity), 0) AS avg_unit_price  -- Derived
FROM fact_sales s
JOIN dim_product p ON s.product_key = p.product_key
GROUP BY p.category_name;
```

## Fact Table Granularity

Grain determines what a single row represents. Getting grain right is the most critical fact table design decision.

| Grain Example | Row Count (Monthly) | Business Question |
|---------------|-------------------|-------------------|
| Per line item | 10M | What products are selling together? |
| Per receipt | 2M | What is average basket size? |
| Per customer per day | 500K | How many customers buy daily? |
| Per product per day | 100K | What is daily sales by product? |

**Coarser grain (aggregated) refers to a less granular representation: fewer rows but less detail. Finer granularity (more atomic) gives more rows with more detail.**

## Fact Table Design Decisions

### Where to Store Calculated Facts

```sql
-- Option A: Pre-calculate in ETL (performance)
CREATE TABLE fact_sales (
    quantity INT,
    unit_price DECIMAL(10,2),
    discount_amount DECIMAL(10,2),
    sales_amount DECIMAL(10,2),       -- Pre-calculated: quantity * unit_price - discount
    profit_amount DECIMAL(10,2),      -- Pre-calculated: sales_amount - cost_amount
    profit_margin_pct DECIMAL(5,2)   -- Pre-calculated: profit / sales_amount * 100
);

-- Option B: Calculate in BI/query layer (flexibility)
-- Only store base facts, compute derived metrics in reports
```

**Prefer pre-calculation for:**
- Complex business logic that should be consistent
- Performance-critical aggregations
- Calculations that change rarely

**Prefer query-time calculation for:**
- Simple arithmetic (quantity * price)
- Calculations with frequent logic changes
- Exploratory analysis

### Fact Table Size Management

```sql
-- Partition large fact tables
CREATE TABLE fact_sales (
    date_key INT NOT NULL,
    product_key INT NOT NULL,
    ...
) PARTITION BY (date_key)
-- Partition by month or year for data lifecycle management

-- Clustering for query performance
CLUSTER fact_sales BY (date_key, product_key);

-- Materialized views for common aggregations
CREATE MATERIALIZED VIEW mv_daily_sales AS
SELECT
    date_key,
    product_key,
    SUM(quantity) AS total_quantity,
    SUM(sales_amount) AS total_sales_amount
FROM fact_sales
GROUP BY date_key, product_key;
```

### Audit Columns

Every fact table should include ETL metadata columns:

```sql
CREATE TABLE fact_sales (
    -- Facts and dimensions
    ...
    -- ETL metadata
    etl_batch_id STRING,          -- identifier for the batch load
    etl_created_at TIMESTAMP,     -- when this row was inserted
    etl_updated_at TIMESTAMP,     -- when this row was last modified
    etl_source_system STRING,     -- origin of the data
    etl_source_file STRING        -- specific source file/table
);
```

## Rules
- Always declare grain before designing facts — every fact must match grain
- Classify every fact as additive, semi-additive, or non-additive
- Use AVG, not SUM, for semi-additive facts when querying across restricted dimensions
- Transaction facts are the foundation; build snapshots from them
- Accumulating snapshots for processes with defined start and end milestones
- Factless facts for event coverage analysis
- Pre-calculate derived facts for consistency across reporting tools
- Add audit columns (batch ID, timestamps) to every fact table
- Partition large fact tables by date for lifecycle management
- Use materialized views for common aggregations on large fact tables
