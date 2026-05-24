# Slowly Changing Dimensions Reference

## SCD Overview

Slowly Changing Dimensions (SCD) handle changes to dimension attribute values over time. Different business requirements need different SCD types. The choice depends on whether historical accuracy is needed, how the dimension is queried, and the rate of change.

## SCD Type 0: Retain Original

**Behavior:** Dimension attributes are never changed after initial loading. The original value is retained forever.

**Use Cases:**
- Inherent, unchangeable attributes (date of birth, original creation date)
- Attributes that are contractually fixed (initial contract terms)
- Audit reference columns (created_by, original_source)
- Historical immutable facts

```sql
-- Type 0: Original values never change
CREATE TABLE dim_customer (
    customer_key INT PRIMARY KEY,
    customer_id STRING NOT NULL,
    original_acquisition_channel STRING,  -- Type 0: never changes
    customer_name STRING,                  -- Type 1 or 2
    scd_start_date DATE NOT NULL,
    is_current BOOLEAN NOT NULL DEFAULT true
);

-- On data load: only insert new customers, never update Type 0 columns
INSERT INTO dim_customer (customer_key, customer_id, original_acquisition_channel, customer_name, scd_start_date, is_current)
SELECT
    NEXT VALUE FOR dim_seq,
    src.customer_id,
    src.acquisition_channel,  -- Type 0: set once
    src.customer_name,
    CURRENT_DATE,
    true
FROM source.customers src
WHERE NOT EXISTS (SELECT 1 FROM dim_customer d WHERE d.customer_id = src.customer_id);
```

## SCD Type 1: Overwrite

**Behavior:** Old attribute values are overwritten with new values. No history is preserved.

**Use Cases:**
- Data corrections (wrong spelling, wrong category)
- Attributes where history doesn't matter (current phone area code)
- Attributes that are always current-focused (current customer tier for operational systems)
- When storage is a concern and history is not needed

```sql
-- Type 1: Overwrite on change
CREATE TABLE dim_customer (
    customer_key INT PRIMARY KEY,
    customer_id STRING NOT NULL,
    customer_phone STRING,       -- Type 1: overwrite
    customer_email STRING,       -- Type 1: overwrite
    scd_start_date DATE NOT NULL
);

-- Merge with Type 1: update in place
MERGE INTO dim_customer d
USING source.customers src ON d.customer_id = src.customer_id
WHEN MATCHED AND (
    d.customer_phone != src.phone OR
    d.customer_email != src.email
) THEN UPDATE SET
    d.customer_phone = src.phone,
    d.customer_email = src.email,
    d.scd_start_date = CURRENT_DATE
WHEN NOT MATCHED THEN INSERT
    (customer_key, customer_id, customer_phone, customer_email, scd_start_date)
VALUES
    (NEXT VALUE FOR dim_seq, src.customer_id, src.phone, src.email, CURRENT_DATE);
```

## SCD Type 2: Add Row

**Behavior:** A new row is added for each attribute change. The previous version is closed with an end date. This preserves full historical tracking.

**Use Cases:**
- Regulatory requirements (audit who had what tier at what time)
- Historical reporting (sales by customer as they were at order time)
- Slowly changing attributes where past values matter
- Most common SCD type in enterprise data warehouses

```sql
-- Type 2: Add row on change
CREATE TABLE dim_customer (
    customer_key INT PRIMARY KEY,
    customer_id STRING NOT NULL,       -- Business key (natural key)
    customer_name STRING,
    customer_tier STRING,              -- Tracked attribute
    customer_region STRING,
    -- SCD Type 2 tracking columns
    scd_start_date DATE NOT NULL,
    scd_end_date DATE,                 -- NULL = current version
    is_current BOOLEAN NOT NULL DEFAULT true,
    scd_version INT NOT NULL DEFAULT 1,
    -- ETL metadata
    etl_created_at TIMESTAMP,
    etl_updated_at TIMESTAMP
);

-- Type 2 merge (Snowflake merge pattern)
MERGE INTO dim_customer d
USING (
    SELECT
        src.customer_id,
        src.customer_name,
        src.customer_tier,
        src.region,
        src.etl_timestamp
    FROM source.customers src
) s ON d.customer_id = s.customer_id AND d.is_current = true

-- If changed: close current and insert new
WHEN MATCHED AND (
    d.customer_name != s.customer_name OR
    d.customer_tier != s.customer_tier OR
    d.customer_region != s.region
) THEN UPDATE SET
    d.scd_end_date = CURRENT_DATE,
    d.is_current = false

-- Insert new version
INSERT WHEN NOT MATCHED THEN
    (customer_key, customer_id, customer_name, customer_tier,
     customer_region, scd_start_date, scd_end_date, is_current, scd_version)
VALUES
    (NEXT VALUE FOR dim_seq, s.customer_id, s.customer_name, s.customer_tier,
     s.region, CURRENT_DATE, NULL, true, 1);

-- After close + insert, also insert new version for matched, changed rows
-- (implementation varies by DB; often a two-step process)
```

### Type 2 Query Patterns

```sql
-- Find customer version at order time
SELECT
    c.customer_key,
    c.customer_name,
    c.customer_tier,
    o.order_id,
    o.order_amount
FROM fact_orders o
JOIN dim_customer c ON o.customer_key = c.customer_key
-- Customer version is already resolved at ETL time via surrogate key

-- Reconstruct customer history
SELECT
    customer_id,
    customer_tier,
    scd_start_date,
    scd_end_date,
    DATEDIFF('day', scd_start_date, COALESCE(scd_end_date, CURRENT_DATE)) AS days_in_tier
FROM dim_customer
WHERE customer_id = 'CUST-001'
ORDER BY scd_start_date;

-- Current state snapshot
SELECT * FROM dim_customer WHERE is_current = true;

-- Count how many customers were in each tier at a point in time
SELECT
    customer_tier,
    COUNT(*) AS customer_count
FROM dim_customer
WHERE scd_start_date <= '2026-01-01'
  AND (scd_end_date >= '2026-01-01' OR scd_end_date IS NULL)
GROUP BY customer_tier;
```

## SCD Type 3: Add Column

**Behavior:** Original and current values are stored in separate columns. Limited history (usually 1-2 versions).

**Use Cases:**
- When you need to compare current vs previous value
- Limited history requirements (track only the most recent change)
- Simple reporting that compares old vs new

```sql
-- Type 3: Add column for previous value
CREATE TABLE dim_customer (
    customer_key INT PRIMARY KEY,
    customer_id STRING NOT NULL,
    customer_name STRING,
    -- Type 3 tracking for customer_tier
    original_tier STRING,        -- First recorded value
    previous_tier STRING,        -- Previous value (before current)
    current_tier STRING,         -- Current value
    tier_change_date DATE,       -- When was the last change?
    -- ETL metadata
    etl_created_at TIMESTAMP,
    etl_updated_at TIMESTAMP
);

-- Type 3 update
MERGE INTO dim_customer d
USING source.customers src ON d.customer_id = src.customer_id
WHEN MATCHED AND d.current_tier != src.tier THEN UPDATE SET
    d.previous_tier = d.current_tier,
    d.current_tier = src.tier,
    d.tier_change_date = CURRENT_DATE;

-- Query: customers whose tier changed
SELECT
    customer_id,
    previous_tier,
    current_tier,
    tier_change_date
FROM dim_customer
WHERE previous_tier IS NOT NULL;
```

## SCD Type 4: Mini-Dimension

**Behavior:** Rapidly changing attributes are moved to a separate mini-dimension table linked to the main dimension. The main dimension references the current mini-dimension key.

**Use Cases:**
- Attributes that change frequently (dozens of times per customer)
- When Type 2 would create too many rows
- When change frequency is high but only current state matters for most queries

```sql
-- Main dimension (stable attributes)
CREATE TABLE dim_customer (
    customer_key INT PRIMARY KEY,
    customer_id STRING NOT NULL,
    customer_name STRING,
    customer_email STRING,
    -- Reference to current mini-dimension
    current_demographic_key INT REFERENCES dim_customer_demographic(demographic_key),
    scd_start_date DATE NOT NULL,
    is_current BOOLEAN
);

-- Mini-dimension (rapidly changing attributes)
CREATE TABLE dim_customer_demographic (
    demographic_key INT PRIMARY KEY,
    age_group STRING,
    income_bracket STRING,
    marital_status STRING,
    number_of_children INT,
    home_owner_status STRING,
    scd_start_date DATE,
    scd_end_date DATE,
    is_current BOOLEAN
);

-- Query with mini-dimension
SELECT
    c.customer_name,
    d.age_group,
    d.income_bracket,
    SUM(o.order_amount) AS total_spent
FROM fact_orders o
JOIN dim_customer c ON o.customer_key = c.customer_key
JOIN dim_customer_demographic d ON c.current_demographic_key = d.demographic_key
WHERE d.is_current = true
GROUP BY c.customer_name, d.age_group, d.income_bracket;
```

## SCD Type 6: Hybrid (Type 1 + 2 + 3)

**Behavior:** Combines Type 2 row-based history with Type 1 overwrite of current value AND Type 3 column for tracking current vs historical.

**Use Cases:**
- Need both point-in-time accuracy AND current value filtering
- Regulatory reporting requiring historical state
- Operational reporting needing current state

```sql
-- Type 6: Hybrid approach
CREATE TABLE dim_customer (
    customer_key INT PRIMARY KEY,
    customer_id STRING NOT NULL,
    customer_name STRING,
    -- Type 1: Always current
    current_tier STRING,
    -- Type 2: Row tracking
    scd_start_date DATE,
    scd_end_date DATE,
    is_current BOOLEAN,
    scd_version INT,
    -- Type 3: Original value
    original_tier STRING
);

-- Query: current tier as filter with point-in-time facts
SELECT
    c.customer_id,
    c.current_tier,          -- always current
    c.original_tier,          -- original at acquisition
    o.order_amount,
    o.order_date
FROM fact_orders o
JOIN dim_customer c ON o.customer_key = c.customer_key
WHERE c.current_tier = 'platinum';  -- filter by current value
```

## SCD Selection Guide

| Requirement | SCD Type | Rationale |
|-------------|----------|-----------|
| Never change attribute | 0 | Immutable by nature |
| Correct errors, no history needed | 1 | Simple, efficient, no history |
| Full audit trail of all changes | 2 | Complete history, most common |
| Compare current vs previous | 3 | Simple old/new columns |
| Rapidly changing attributes | 4 | Separate mini-dimension |
| Current filter + historical accuracy | 6 | Best of Type 1, 2, 3 |

### Decision Matrix

| Condition | Type 0 | Type 1 | Type 2 | Type 3 | Type 4 | Type 6 |
|-----------|--------|--------|--------|--------|--------|--------|
| Need full history | | | X | | | X |
| Need current value only | | X | | | X | |
| Compare current vs previous | | | | X | | X |
| High change frequency | | | | | X | |
| Storage limited | | X | | X | | |
| Query performance critical | | X | | X | X | |
| Regulatory/audit required | | | X | | | X |
| Simple reporting | X | X | | X | | |

## Performance Considerations

```sql
-- Type 2 dimension: indexes for current-version lookups
CREATE INDEX idx_dim_customer_current ON dim_customer(customer_id) WHERE is_current = true;
CREATE INDEX idx_dim_customer_business_key ON dim_customer(customer_id);

-- Partition type 2 dimensions by year for large tables
CREATE TABLE dim_customer (
    ...
) PARTITION BY (scd_start_date_year INT);

-- Type 2 dimension maintenance
-- Archive closed versions older than 5 years
DELETE FROM dim_customer
WHERE is_current = false
  AND scd_end_date < DATEADD('year', -5, CURRENT_DATE);
```

## Rules
- Type 2 is the default for tracked attributes; use others only with explicit justification
- Dimension surrogate keys resolve to the correct version at ETL time, not query time
- Index the is_current flag for fast current-version lookups
- For Type 2, always include start date, end date, and is_current flag
- Mini-dimensions (Type 4) for attributes changing 10+ times per entity per year
- Type 6 when you need both current-value filtering AND point-in-time accuracy
- Avoid mixing Type 1 and Type 2 in the same column across different dimensions
- Document the SCD strategy for every dimension attribute
- Test SCD merge logic with before/after row counts
- Archive aged Type 2 rows to maintain query performance
