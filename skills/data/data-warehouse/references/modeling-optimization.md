# Modeling and Optimization

## Star Schema

### Structure
Single fact table at center, dimension tables around it (denormalized). Fact table contains measures and foreign keys to dimensions. Dimensions are wide (many attributes per dimension). Simple to understand, fast queries (fewer joins), intuitive for business users, well-supported by BI tools.

### Example DDL
```sql
CREATE TABLE fact_orders (
    order_id BIGINT PRIMARY KEY,
    customer_id INT REFERENCES dim_customers(customer_id),
    product_id INT REFERENCES dim_products(product_id),
    date_id INT REFERENCES dim_dates(date_id),
    store_id INT REFERENCES dim_stores(store_id),
    quantity INT NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    discount DECIMAL(5,2) DEFAULT 0,
    total_amount DECIMAL(12,2) NOT NULL,
    created_at TIMESTAMP NOT NULL
);

CREATE TABLE dim_customers (
    customer_id INT PRIMARY KEY,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    email VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(50),
    country VARCHAR(50),
    segment VARCHAR(50),
    created_at TIMESTAMP
);

CREATE TABLE dim_dates (
    date_id INT PRIMARY KEY,
    date DATE NOT NULL,
    year INT,
    quarter INT,
    month INT,
    month_name VARCHAR(20),
    week INT,
    day_of_week INT,
    day_name VARCHAR(20),
    is_weekend BOOLEAN,
    is_holiday BOOLEAN
);
```

## Snowflake Schema

### Structure
Dimension tables normalized (split into sub-dimensions). Reduces data redundancy. More joins required. More storage-efficient, easier dimension maintenance, better for deeply hierarchical dimensions.

### When to Use
Large dimensions with many attributes. Deep hierarchies (e.g., product category → subcategory → brand → SKU). Regulatory requirements for normalized models.

### Example
```sql
CREATE TABLE dim_products (
    product_id INT PRIMARY KEY,
    product_name VARCHAR(200),
    brand_id INT REFERENCES dim_brands(brand_id),
    category_id INT REFERENCES dim_categories(category_id),
    supplier_id INT REFERENCES dim_suppliers(supplier_id),
    unit_price DECIMAL(10,2),
    weight_kg DECIMAL(8,2)
);

CREATE TABLE dim_categories (
    category_id INT PRIMARY KEY,
    category_name VARCHAR(100),
    department_id INT REFERENCES dim_departments(department_id)
);

CREATE TABLE dim_departments (
    department_id INT PRIMARY KEY,
    department_name VARCHAR(100)
);
```

## Fact Tables

### Types
**Transaction**: one row per event (order, click, transaction). Fully additive across all dimensions. Most common fact table type. **Periodic Snapshot**: one row per period (daily account balance, monthly inventory). Semi-additive — sum across dimensions but not time. **Cumulative Snapshot**: one row per process lifecycle (order-to-delivery pipeline). Used for process tracking and cycle time analysis.

### Grain Declaration
Document grain at the most atomic level: "one row per order line item" not "one row per order". Never mix grains in one fact table. Grain determines granularity for all downstream queries.

### Additive Measures
**Additive**: sum across any dimension (quantity, amount, count). The most flexible measure type. **Semi-additive**: sum across some dimensions but not time (account balance, inventory level). **Non-additive**: cannot be summed (ratios, percentages, unit prices). Handle non-additive measures by storing numerator and denominator separately.

## Dimension Tables

### Conformed Dimensions
Shared across fact tables and data marts. Same dimension key, same attributes, same meaning. Examples: dim_dates (calendar), dim_customers (customer master), dim_products (product catalog). Conformed dimensions enable cross-process analysis (e.g., "sales by customer region in the same dim_customers used for support tickets").

### Role-Playing Dimensions
Same dimension used differently in same fact table. Example: dim_dates as order_date, ship_date, delivery_date. Each role is a foreign key in the fact table referencing the same dimension table. Use views or aliases for clarity.

### Junk Dimensions
Combine low-cardinality flags and indicators into one dimension table. Example attributes: is_express_shipping, is_gift_wrapped, payment_method, order_source. Combine all into dim_order_flags. A junk dimension reduces the fact table width and improves compresssion.

### Degenerate Dimensions
Dimension attribute stored in the fact table as a scalar value (no separate dimension). Examples: order_number, invoice_number, transaction_id. Used when the dimension has no other attributes beyond its identifier.

## Slowly Changing Dimensions (SCD)

### Type 0: Retain Original
Never change dimension attribute values. Used for: immutable audit data, creation timestamps, original referential attributes.

### Type 1: Overwrite
Replace old value with new value. No history preserved. Used for: corrections (misspelling), fields where history doesn't matter (customer phone for contact purposes). Simplest implementation but loses historical context.

### Type 2: Add New Row
Add new row with `valid_from`, `valid_to`, `is_current` flags. Full history preserved. Default choice for most dimension attributes. Implementation:
```sql
CREATE TABLE dim_customers (
    customer_sk INT PRIMARY KEY,
    customer_id INT,  -- natural key
    first_name VARCHAR(100),
    email VARCHAR(255),
    address VARCHAR(200),
    valid_from TIMESTAMP NOT NULL,
    valid_to TIMESTAMP,
    is_current BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```
Query current records: `WHERE is_current = TRUE` or `WHERE valid_to IS NULL`.

### Type 3: Add New Column
Add column for previous value (limited to one version of history). Used for: tracking previous version only ("previous_price", "previous_manager"). Limited usefulness — Type 2 is preferred for most scenarios.

### Hybrid Strategy
SCD Type 2 for critical attributes (address, name, status). SCD Type 1 for non-critical (phone, email). SCD Type 0 for immutable (created date, original ID). Apply different SCD types per attribute within the same dimension table.

## Partitioning

### Snowflake
Automatic clustering: enable for tables >1TB. Micro-partition pruning via natural partitioning from data ingestion order. Manual clustering keys: `ALTER TABLE fact_orders CLUSTER BY (order_date)`. Best for: date-range filtered queries, large fact tables. Snowflake credits are consumed for clustering operations.

### BigQuery
Partition by DATE/TIMESTAMP column or ingestion time (_PARTITIONTIME). Max 4000 partitions per table. Syntax: `PARTITION BY DATE(order_date)`. Best for: time-based queries, data lifecycle management. Partition expiration: `partition_expiration_days = 365`.

### Redshift
Distribution style (KEY on join columns, ALL for small dims, EVEN for large dims without clear join key). Sort key: COMPOUND for multi-column range queries, INTERLEAVED for equality filters on multiple columns. VACUUM reclaims space after DELETEs and restores sort order.

## Clustering

### Key Selection
Choose columns used in WHERE filters, JOIN conditions, GROUP BY, and ORDER BY. High cardinality columns first (date, customer ID). Clustering order: equality filters first, range filters second. Clustering improves query performance by reducing the data scanned per query.

### Platform Specifics
Snowflake: automated clustering for tables >1TB. BigQuery: up to 4 cluster columns, automatic re-clustering. Redshift: COMPOUND or INTERLEAVED sort keys with manual VACUUM sort.

## Materialized Views

### Snowflake
```sql
CREATE MATERIALIZED VIEW mv_daily_sales AS
SELECT
    order_date,
    product_id,
    SUM(quantity) AS total_quantity,
    SUM(total_amount) AS total_revenue,
    COUNT(DISTINCT customer_id) AS unique_customers
FROM fact_orders
GROUP BY order_date, product_id;
```
Refresh: automatic, near real-time. Limitations: no joins, no subqueries, limited SQL functions.

### BigQuery
```sql
CREATE MATERIALIZED VIEW project.dataset.mv_daily_sales AS
SELECT
    order_date,
    product_id,
    SUM(quantity) AS total_quantity,
    SUM(total_amount) AS total_revenue
FROM project.dataset.fact_orders
GROUP BY order_date, product_id;
```
Refresh: periodic (5-30 minute window). Limitations: no UNION, no self-joins, limited DML.

### Best Practices
One MV per dashboard or reporting query. Refresh during off-peak hours. Test against base table for consistency. Monitor storage costs (MVs consume additional storage).

## Query Optimization

### Identify Expensive Queries
- Snowflake: `QUERY_HISTORY` view, `WAREHOUSE_METERING_HISTORY`
- BigQuery: `INFORMATION_SCHEMA.JOBS`, `INFORMATION_SCHEMA.JOBS_TIMELINE`
- Redshift: `STL_QUERY`, `SVL_QUERY_REPORT`, `WLM_QUEUE_STATE_V2`

### Optimization Techniques
- Filter early: push WHERE clauses to subqueries and CTEs
- Avoid SELECT *: specify only needed columns
- Use approximate functions: APPROX_COUNT_DISTINCT, HyperLogLog
- Reduce JOIN complexity: pre-aggregate, use dimension keys
- Use LIMIT with ORDER BY (reduces sort costs on large result sets)
- Avoid cross-joins and CARTESIAN JOIN

### Common Anti-Patterns
- Joining on non-distribution keys (causes data redistribution in Redshift)
- Selecting too many partitions (full table scan in BigQuery)
- Non-selective filtering on non-clustered columns
- Self-joins instead of window functions
- SELECT * in production queries

## Cost Management

### Snowflake
Auto-suspend after 5 min idle. Use XS/S for dev, S-M for prod, L+ for large jobs. Resource monitors with credit quotas per warehouse. Limit concurrent warehouses. Use compressed storage (ZSTD default).

### BigQuery
Flat-rate slot reservations for predictable costs. On-demand pricing with max bytes billed per query. BI Engine cache for dashboard queries. Partition and cluster tables to reduce bytes scanned.

### Redshift
RA3 nodes for managed storage (compute/storage separation). Concurrency scaling for burst traffic. Spectrum for cold S3 data. Regular VACUUM and ANALYZE for optimal performance.

### Universal
Drop unused tables and views. Compress tables (ZSTD default). Implement partition retention (drop old partitions). Tag costs by team/project for chargeback. Review query patterns monthly to optimize high-cost queries.
