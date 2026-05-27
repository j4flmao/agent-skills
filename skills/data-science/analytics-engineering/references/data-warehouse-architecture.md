# Data Warehouse Architecture

## Architecture Patterns

### Star Schema
The star schema is the most common dimensional modeling pattern:
- **Fact tables**: Contain quantitative measures and foreign keys to dimensions
- **Dimension tables**: Contain descriptive attributes (who, what, where, when)
- **Benefits**: Simple to understand, fast aggregations, efficient for BI tools

`sql
CREATE TABLE fact_sales (
    sale_id BIGINT PRIMARY KEY,
    date_id INT REFERENCES dim_date(date_id),
    product_id INT REFERENCES dim_product(product_id),
    customer_id INT REFERENCES dim_customer(customer_id),
    store_id INT REFERENCES dim_store(store_id),
    quantity INT NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    discount DECIMAL(5,2) DEFAULT 0
);

CREATE TABLE dim_product (
    product_id INT PRIMARY KEY,
    sku VARCHAR(50) NOT NULL,
    product_name VARCHAR(200) NOT NULL,
    category VARCHAR(100),
    subcategory VARCHAR(100),
    brand VARCHAR(100),
    unit_cost DECIMAL(10,2),
    current_retail_price DECIMAL(10,2),
    effective_date DATE NOT NULL,
    end_date DATE,
    is_current BOOLEAN DEFAULT TRUE
);
`

### Snowflake Schema
- Normalized dimension tables (sub-dimensions as separate tables)
- Reduces data redundancy but increases join complexity
- Suitable for heavily normalized source systems

### Kimball vs Inmon vs Data Vault
| Approach | Philosophy | Strengths | Weaknesses |
|----------|-----------|-----------|------------|
| Kimball | Dimensional modeling, bottom-up | Fast time-to-value, business-friendly | Data redundancy |
| Inmon | 3NF enterprise model, top-down | Single source of truth, less redundancy | Slow to build, complex |
| Data Vault | Hub, Link, Satellite | Auditable, flexible, handles history | Complex querying |

## Modern Cloud Data Warehouses

### Snowflake Architecture
- **Storage**: Columnar, compressed, auto-clustered micro-partitions
- **Compute**: Virtual warehouses (elastic clusters), auto-suspend/resume
- **Services**: Query optimization, metadata management, security

`sql
-- Snowflake clustering
ALTER TABLE fact_sales CLUSTER BY (sale_date);

-- Snowflake zero-copy cloning
CREATE OR REPLACE TABLE analytics_dev.fact_sales
CLONE analytics_prod.fact_sales;

-- Time travel queries
SELECT * FROM fact_sales
AT (TIMESTAMP => '2024-01-15 10:00:00'::TIMESTAMP);
`

### BigQuery Architecture
- **Colossus**: Distributed file system for storage
- **Borg/Dremel**: Compute engine with slot-based resource management
- **Separation**: Storage and compute are fully separated

`sql
-- BigQuery partitioning
CREATE TABLE project.dataset.sales
PARTITION BY DATE(order_date)
CLUSTER BY customer_id, product_id
OPTIONS(require_partition_filter=true);

-- BigQuery materialized views
CREATE MATERIALIZED VIEW project.dataset.daily_sales AS
SELECT
    order_date,
    product_id,
    SUM(quantity) AS total_quantity,
    SUM(revenue) AS total_revenue
FROM project.dataset.sales
GROUP BY 1, 2;
`

### Redshift Architecture
- **Leader node**: Query planning, result aggregation
- **Compute nodes**: Columnar storage, local SSD caching
- **Distribution styles**: KEY, ALL, EVEN, AUTO

`sql
-- Redshift distribution and sort keys
CREATE TABLE fact_sales (
    sale_id BIGINT ENCODE DELTA,
    date_id INT ENCODE DELTA32K,
    product_id INT ENCODE MOST,
    customer_id INT ENCODE MOST,
    quantity INT ENCODE DELTA,
    total_amount DECIMAL(10,2) ENCODE BYTEDICT
)
DISTKEY(product_id)
SORTKEY(date_id, customer_id)
;

-- Redshift late-arriving views
CREATE MATERIALIZED VIEW mv_daily_summary AS
SELECT
    d.year,
    d.month,
    d.day,
    p.category,
    SUM(s.total_amount) AS total_sales,
    COUNT(DISTINCT s.customer_id) AS unique_customers
FROM fact_sales s
JOIN dim_date d ON s.date_id = d.date_id
JOIN dim_product p ON s.product_id = p.product_id
GROUP BY 1, 2, 3, 4;
`

## Data Modeling Best Practices

### Slowly Changing Dimensions (SCD)
| Type | Strategy | Use Case |
|------|----------|----------|
| SCD 0 | Retain original | Immutable attributes (birth date) |
| SCD 1 | Overwrite | Fixing data errors |
| SCD 2 | Add new row | Tracking history (address changes) |
| SCD 3 | Add new column | Limited history (previous value) |
| SCD 4 | Separate history table | High-volume audit tracking |

`sql
-- SCD Type 2 implementation
CREATE TABLE dim_customer_scd2 (
    customer_sk BIGINT PRIMARY KEY,
    customer_id INT NOT NULL,
    full_name VARCHAR(200),
    email VARCHAR(200),
    address VARCHAR(500),
    effective_date DATE NOT NULL,
    end_date DATE,
    is_current BOOLEAN DEFAULT TRUE
);

-- Merge statement for SCD2
MERGE INTO dim_customer_scd2 AS target
USING staging_customers AS source
ON target.customer_id = source.customer_id AND target.is_current = TRUE
WHEN MATCHED AND target.address <> source.address THEN
    UPDATE SET end_date = CURRENT_DATE, is_current = FALSE
    INSERT (customer_sk, customer_id, full_name, email, address,
            effective_date, end_date, is_current)
    VALUES (NEXT VALUE FOR seq_customer_sk, source.customer_id,
            source.full_name, source.email, source.address,
            CURRENT_DATE, NULL, TRUE)
WHEN NOT MATCHED THEN
    INSERT (customer_sk, customer_id, full_name, email, address,
            effective_date, end_date, is_current)
    VALUES (NEXT VALUE FOR seq_customer_sk, source.customer_id,
            source.full_name, source.email, source.address,
            CURRENT_DATE, NULL, TRUE);
`

### Conformed Dimensions
- Same dimension used across multiple fact tables
- Ensures consistent drill-across analysis
- Example: Dim_Date used by sales, inventory, and marketing facts

### Degenerate Dimensions
- Dimension attributes stored directly in the fact table
- Used for transaction-level identifiers (order number, invoice number)
- Avoids creating a dimension table with a 1:1 relationship to facts

## Performance Optimization

### Partitioning Strategies
| Granularity | Data Size | Retention | Compression |
|-------------|-----------|-----------|-------------|
| Daily | < 1GB/day | 90 days | Snappy/GZIP |
| Monthly | 1-10GB/day | 2 years | GZIP/ZSTD |
| Yearly | > 10GB/day | 7 years | ZSTD |

### Materialized View Patterns
`sql
-- Pre-aggregated marts for common queries
CREATE MATERIALIZED VIEW mv_customer_monthly AS
SELECT
    c.customer_id,
    c.segment,
    d.year,
    d.month,
    COUNT(DISTINCT s.sale_id) AS order_count,
    SUM(s.total_amount) AS total_spent,
    SUM(s.quantity) AS total_items
FROM dim_customer c
JOIN fact_sales s ON c.customer_sk = s.customer_sk
JOIN dim_date d ON s.date_id = d.date_id
WHERE c.is_current = TRUE
GROUP BY 1, 2, 3, 4;
`

## Key Points
- Choose architectural pattern (Kimball, Inmon, Data Vault) based on organizational maturity and requirements
- Modern cloud warehouses (Snowflake, BigQuery, Redshift) enable separation of storage and compute
- Implement SCD strategies appropriate to business needs for historical tracking
- Use conformed dimensions to ensure consistent cross-functional analysis
- Design partitioning and clustering strategies aligned with query patterns
- Leverage materialized views for common aggregation patterns
- Balance normalization level (3NF vs star schema) with query performance needs
- Plan for data retention, archival, and lifecycle management from day one
