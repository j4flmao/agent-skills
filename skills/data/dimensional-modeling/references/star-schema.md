# Star Schema Design Reference

## Star Schema Structure

A star schema centers on a single fact table surrounded by conformed dimension tables. The fact table sits at the center and contains measurements (facts) and foreign keys to each dimension.

### Component Types

```
Fact Table
  - Measures (additive, semi-additive, non-additive)
  - Foreign keys to dimension tables
  - Degenerate dimensions (transaction identifiers)
  - Date/time stamps
  - Surrogate key (primary key)

Dimension Table
  - Descriptive attributes
  - Surrogate key (primary key)
  - Natural/business key
  - SCD tracking columns
  - Hierarchical attributes
```

### Physical Layout

```sql
-- Date dimension
CREATE TABLE dim_date (
    date_key INT PRIMARY KEY,
    full_date DATE NOT NULL,
    day_of_week INT,
    day_name STRING,
    day_of_month INT,
    month_key INT,
    month_name STRING,
    month_short_name STRING(3),
    quarter_key INT,
    quarter_name STRING,
    year INT,
    fiscal_year INT,
    fiscal_quarter INT,
    is_weekend BOOLEAN,
    is_holiday BOOLEAN,
    -- ETL metadata
    etl_created_at TIMESTAMP,
    etl_updated_at TIMESTAMP
);

-- Product dimension with SCD Type 2
CREATE TABLE dim_product (
    product_key INT PRIMARY KEY,
    product_id STRING NOT NULL,
    product_name STRING,
    product_category STRING,
    product_subcategory STRING,
    brand STRING,
    unit_price DECIMAL(10,2),
    supplier_name STRING,
    -- SCD Type 2 columns
    scd_start_date DATE NOT NULL,
    scd_end_date DATE,
    is_current BOOLEAN NOT NULL DEFAULT true,
    -- ETL metadata
    etl_created_at TIMESTAMP,
    etl_updated_at TIMESTAMP
);

-- Customer dimension with SCD Type 2
CREATE TABLE dim_customer (
    customer_key INT PRIMARY KEY,
    customer_id STRING NOT NULL,
    customer_name STRING,
    customer_email STRING,
    customer_tier STRING,
    acquisition_channel STRING,
    region STRING,
    country STRING,
    city STRING,
    first_purchase_date DATE,
    -- SCD Type 2 columns
    scd_start_date DATE NOT NULL,
    scd_end_date DATE,
    is_current BOOLEAN NOT NULL DEFAULT true,
    -- ETL metadata
    etl_created_at TIMESTAMP,
    etl_updated_at TIMESTAMP
);

-- Fact table: Sales at line-item grain
CREATE TABLE fact_sales (
    sales_fact_key BIGINT PRIMARY KEY,
    -- Foreign keys
    date_key INT NOT NULL REFERENCES dim_date(date_key),
    product_key INT NOT NULL REFERENCES dim_product(product_key),
    customer_key INT NOT NULL REFERENCES dim_customer(customer_key),
    store_key INT NOT NULL REFERENCES dim_store(store_key),
    promotion_key INT REFERENCES dim_promotion(promotion_key),
    payment_method_key INT REFERENCES dim_payment_method(payment_method_key),
    -- Degenerate dimensions (transaction identifiers)
    receipt_number STRING,
    line_item_number INT,
    -- Additive facts (summable across all dimensions)
    quantity INT NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    discount_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    sales_amount DECIMAL(10,2) NOT NULL,
    cost_amount DECIMAL(10,2) NOT NULL,
    tax_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    -- Semi-additive facts
    -- Non-additive facts (ratios, percentages)
    profit_margin_pct DECIMAL(5,2),
    -- ETL metadata
    etl_created_at TIMESTAMP,
    etl_updated_at TIMESTAMP
);
```

## Fact Table Types

### Transaction Fact Table
Stores a record for each business event at the most atomic grain. This is the most common fact table type.

**Characteristics:**
- One row per measurement event
- Dense with additive facts
- Most granular fact table
- Fastest growing (largest volume)
- Enables maximum analytical flexibility

```sql
CREATE TABLE fact_shipments (
    shipment_fact_key BIGINT PRIMARY KEY,
    date_key INT NOT NULL REFERENCES dim_date(date_key),
    product_key INT NOT NULL REFERENCES dim_product(product_key),
    customer_key INT NOT NULL REFERENCES dim_customer(customer_key),
    warehouse_key INT NOT NULL REFERENCES dim_warehouse(warehouse_key),
    carrier_key INT REFERENCES dim_carrier(carrier_key),
    -- Degenerate dimensions
    shipment_tracking_number STRING,
    -- Facts
    shipment_quantity INT NOT NULL,
    shipment_weight_kg DECIMAL(8,2),
    shipping_cost DECIMAL(10,2),
    transit_days INT
);
```

### Periodic Snapshot Fact Table
Stores a regular interval snapshot of measurements at a defined period.

**Characteristics:**
- One row per period (day, month) per entity
- Semi-additive facts (balances, levels, counts)
- Regular predictable row count
- Time series analysis

```sql
CREATE TABLE fact_inventory_snapshot (
    inventory_fact_key BIGINT PRIMARY KEY,
    date_key INT NOT NULL REFERENCES dim_date(date_key),
    product_key INT NOT NULL REFERENCES dim_product(product_key),
    warehouse_key INT NOT NULL REFERENCES dim_warehouse(warehouse_key),
    -- Semi-additive facts (summable across product/warehouse, not date)
    quantity_on_hand INT NOT NULL,
    quantity_reserved INT NOT NULL,
    quantity_available INT NOT NULL,
    -- Additive facts
    units_received_today INT,
    units_shipped_today INT,
    -- Non-additive
    inventory_turnover_days DECIMAL(8,2)
);
```

### Accumulating Snapshot Fact Table
Tracks a process with defined beginning and end milestones.

**Characteristics:**
- One row per process instance (e.g., one per order)
- Multiple date foreign keys for each milestone
- Updated in place as the process progresses
- Fact values are often the time between milestones

```sql
CREATE TABLE fact_order_fulfillment (
    order_fact_key BIGINT PRIMARY KEY,
    -- Date dimensions (multiple milestones)
    order_date_key INT NOT NULL REFERENCES dim_date(date_key),
    payment_date_key INT REFERENCES dim_date(date_key),
    shipment_date_key INT REFERENCES dim_date(date_key),
    delivery_date_key INT REFERENCES dim_date(date_key),
    return_date_key INT REFERENCES dim_date(date_key),
    -- Core dimensions
    customer_key INT NOT NULL REFERENCES dim_customer(customer_key),
    product_key INT NOT NULL REFERENCES dim_product(product_key),
    warehouse_key INT REFERENCES dim_warehouse(warehouse_key),
    -- Degenerate dimensions
    order_id STRING NOT NULL,
    -- Facts (mostly time deltas and flags)
    order_to_payment_days INT,
    payment_to_shipment_days INT,
    shipment_to_delivery_days INT,
    total_fulfillment_days INT,
    is_completed BOOLEAN,
    is_returned BOOLEAN,
    -- Financial facts
    order_amount DECIMAL(10,2),
    shipping_cost DECIMAL(10,2)
);
```

## Surrogate Keys

Surrogate keys are meaningless, system-generated integer keys used as primary keys in dimension tables and foreign keys in fact tables.

### Rules for Surrogate Keys
- NEVER expose surrogate keys to business users
- Surrogate key = system-managed, business key = source-managed
- Use integer surrogate keys for join performance
- Never reuse surrogate keys (monotonically increasing)
- Business keys go in dimension tables as attributes

```sql
-- Surrogate key assignment pattern
CREATE OR REPLACE SEQUENCE dim_customer_seq START = 1;

INSERT INTO dim_customer (
    customer_key,
    customer_id,      -- business key from source
    customer_name,
    scd_start_date,
    is_current
)
SELECT
    NEXT VALUE FOR dim_customer_seq,  -- surrogate key
    src.customer_id,                   -- business key
    src.customer_name,
    CURRENT_DATE,
    true
FROM source.customers src
WHERE NOT EXISTS (
    SELECT 1 FROM dim_current_customer cur
    WHERE cur.customer_id = src.customer_id
);
```

## Degenerate Dimensions

Degenerate dimensions are dimension keys with no associated dimension table, stored directly in the fact table. They represent transaction identifiers used for tracking and analysis.

### When to Use Degenerate Dimensions

- Transaction numbers (order ID, invoice ID, receipt number)
- Ticket or case numbers
- Shipment tracking numbers
- Session IDs (web analytics)

### When NOT to Use Degenerate Dimensions

- When the identifier has descriptive attributes (dimension table needed)
- When many facts share the same identifier (normalize to dimension)

```sql
-- Good use: receipt_number as degenerate dimension
-- Receipt has no attributes other than its identifier
CREATE TABLE fact_sales (
    sales_fact_key BIGINT PRIMARY KEY,
    -- Dimensions
    date_key INT NOT NULL,
    product_key INT NOT NULL,
    -- Degenerate dimensions
    receipt_number STRING,       -- no attributes, stored directly
    -- Facts
    quantity INT NOT NULL,
    sales_amount DECIMAL(10,2) NOT NULL
);

-- Bad use: product_id as degenerate dimension
-- Product has many attributes so it needs a dimension table
-- WRONG:
CREATE TABLE fact_sales (
    -- ...
    product_id STRING,   -- don't do this — use product_key FK
    -- ...
);
```

## Snowflake Schema

Snowflake schema normalizes dimension tables into sub-dimensions to reduce redundancy.

### When to Snowflake
- Hierarchies with 3+ levels (e.g., Product → Subcategory → Category → Department)
- Very large dimensions where repeating attributes wastes space (rare)
- When source systems already maintain the hierarchy separately

### When NOT to Snowflake
- For query performance (denormalized is faster)
- For most dimensions (denormalized is simpler for users)
- When dimension tables are small (< 100K rows)

```sql
-- Snowflaked product dimension
CREATE TABLE dim_category (
    category_key INT PRIMARY KEY,
    category_name STRING,
    department STRING
);

CREATE TABLE dim_product (
    product_key INT PRIMARY KEY,
    product_id STRING,
    product_name STRING,
    category_key INT REFERENCES dim_category(category_key),
    brand STRING,
    unit_price DECIMAL(10,2)
);

-- Query against snowflaked schema
SELECT
    c.category_name,
    SUM(s.sales_amount) AS total_sales
FROM fact_sales s
JOIN dim_product p ON s.product_key = p.product_key
JOIN dim_category c ON p.category_key = c.category_key
GROUP BY c.category_name;
```

## Quiz Questions

- The grain statement determines what _____ can exist.
- A _____ dimension is shared across multiple fact tables.
- _____ keys are meaningless integers used for joins.
- An accumulating snapshot fact table is used to track _____.
- A _____ dimension is a transaction identifier stored in the fact table.

## Rules
- Declare grain before designing anything else
- Surrogate keys in fact tables, business keys in dimension tables
- Always use surrogate keys for dimension joins (never business keys)
- Conformed dimensions are shared across fact tables
- Transaction facts at atomic grain; periodic snapshots for regular intervals
- Accumulating snapshots for processes with defined milestones
- Degenerate dimensions for transaction identifiers only
- Avoid snowflake schemas unless hierarchy exceeds 3 levels
- Index foreign keys in fact tables (surrogate key lookups)
- Balance query performance with ETL complexity in design decisions
