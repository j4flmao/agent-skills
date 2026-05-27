# Dimensional Modeling

## Overview
Star schemas, snowflake schemas, fact tables, dimension tables, slowly changing dimensions (SCD), and dimensional modeling best practices for analytical and reporting workloads.

## Star Schema

### Fact Tables
Fact tables store quantitative measures and foreign keys to dimension tables. Each row represents a business event (sale, click, shipment, transaction).

```sql
CREATE TABLE fact_sales (
    sale_id BIGINT PRIMARY KEY,
    date_key INT NOT NULL REFERENCES dim_date(date_key),
    customer_key INT NOT NULL REFERENCES dim_customer(customer_key),
    product_key INT NOT NULL REFERENCES dim_product(product_key),
    store_key INT NOT NULL REFERENCES dim_store(store_key),
    quantity INT NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    discount DECIMAL(10,2) DEFAULT 0,
    total_amount DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Index foreign keys for join performance
CREATE INDEX idx_fact_sales_date ON fact_sales(date_key);
CREATE INDEX idx_fact_sales_customer ON fact_sales(customer_key);
CREATE INDEX idx_fact_sales_product ON fact_sales(product_key);
```

Fact table types:
- Transaction facts: one row per business event (sales, orders). Most granular.
- Periodic snapshot facts: aggregated at regular intervals (daily balance, monthly inventory).
- Accumulating snapshot facts: multiple milestones per process (order → payment → shipment).
- Factless fact tables: tracks events without measures (student attendance, page views).

### Dimension Tables
Dimension tables store descriptive attributes that provide context for fact measures.

```sql
CREATE TABLE dim_customer (
    customer_key SERIAL PRIMARY KEY,
    customer_id VARCHAR(50) NOT NULL,  -- source system ID
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(20),
    address_line1 VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(50),
    postal_code VARCHAR(20),
    country VARCHAR(100),
    segment VARCHAR(50),  -- retail, wholesale, enterprise
    created_date DATE NOT NULL,
    valid_from DATE NOT NULL,
    valid_to DATE,
    is_current BOOLEAN DEFAULT true
);

CREATE TABLE dim_product (
    product_key SERIAL PRIMARY KEY,
    product_id VARCHAR(50) NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    subcategory VARCHAR(100),
    brand VARCHAR(100),
    unit_cost DECIMAL(10,2),
    retail_price DECIMAL(10,2),
    effective_date DATE NOT NULL,
    expiry_date DATE
);

-- Conformed dimension date dimension
CREATE TABLE dim_date (
    date_key INT PRIMARY KEY,
    full_date DATE NOT NULL,
    year INT NOT NULL,
    quarter INT NOT NULL,
    month INT NOT NULL,
    month_name VARCHAR(20) NOT NULL,
    week INT NOT NULL,
    day_of_month INT NOT NULL,
    day_of_week INT NOT NULL,
    day_name VARCHAR(20) NOT NULL,
    is_weekend BOOLEAN NOT NULL,
    is_holiday BOOLEAN DEFAULT false,
    fiscal_year INT,
    fiscal_quarter INT
);
```

Dimension types:
- Conformed dimensions: shared across multiple fact tables (date, customer, product).
- Junk dimensions: combine low-cardinality flags and indicators into a single dimension.
- Degenerate dimensions: dimension attributes stored in the fact table (order number, invoice number).
- Role-playing dimensions: same dimension table used with different roles (order_date vs ship_date both use dim_date).
- Slowly changing dimensions: track attribute changes over time (see SCD section).

## Snowflake Schema
Snowflake normalizes dimension tables into sub-dimensions to reduce redundancy. Recommended only when storage is constrained or maintenance is a concern — otherwise prefer star schema for query performance.

```sql
-- Instead of flat dim_product with category/subcategory:
CREATE TABLE dim_category (
    category_key SERIAL PRIMARY KEY,
    category_name VARCHAR(100) NOT NULL,
    department VARCHAR(100)
);

CREATE TABLE dim_product_snowflake (
    product_key SERIAL PRIMARY KEY,
    product_id VARCHAR(50) NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    category_key INT NOT NULL REFERENCES dim_category(category_key),
    brand VARCHAR(100),
    unit_cost DECIMAL(10,2),
    retail_price DECIMAL(10,2)
);
```

Trade-offs:
- Star: simpler queries (fewer joins), better query performance, more storage.
- Snowflake: less redundant storage, more joins in queries, harder for business users.
- Recommendation: star schema as default, snowflake only when dimension hierarchy management is critical.

## Slowly Changing Dimensions (SCD)

### SCD Type 0: Fixed
Dimension attributes never change. Used for immutable reference data (date attributes, original transaction codes).

### SCD Type 1: Overwrite
Old value is overwritten. No history preserved. Simplest but loses historical accuracy.

```sql
UPDATE dim_customer
SET email = 'newemail@example.com',
    updated_at = NOW()
WHERE customer_key = 123;
```

### SCD Type 2: Add New Row
New row inserted with new surrogate key when an attribute changes. Maintains full history. Most common SCD type.

```sql
-- Insert new version when email changes
UPDATE dim_customer SET valid_to = CURRENT_DATE, is_current = false
WHERE customer_id = 'CUST001' AND is_current = true;

INSERT INTO dim_customer (
    customer_id, first_name, last_name, email,
    valid_from, valid_to, is_current
) VALUES (
    'CUST001', 'John', 'Doe', 'newemail@example.com',
    CURRENT_DATE, NULL, true
);
```

### SCD Type 3: Add New Attribute
Add a column to track the previous value alongside the current value. Limited history (only one previous value).

```sql
ALTER TABLE dim_customer ADD COLUMN previous_email VARCHAR(255);
ALTER TABLE dim_customer ADD COLUMN email_changed_date DATE;

UPDATE dim_customer
SET previous_email = email,
    email = 'newemail@example.com',
    email_changed_date = CURRENT_DATE
WHERE customer_key = 123;
```

### SCD Type 4: Mini-Dimension
Frequently changing attributes moved to a separate mini-dimension table. Useful for attributes that change often (demographics, loyalty tiers).

### SCD Type 6: Hybrid (1+2+3)
Combines Type 1 (current value overwrite), Type 2 (history tracking), and Type 3 (previous value tracking). Provides current value for reporting and full history for analysis.

## Fact Table Design Patterns

### Additive Facts
Can be summed across any dimension (quantity, revenue, count). Most flexible for reporting.

### Semi-Additive Facts
Summable across some dimensions but not others (account balance can be summed across accounts but not across time — must average over time).

### Non-Additive Facts
Cannot be summed at all (percentage, ratio, unit price). Always recalculate from base additive facts.

### Factless Fact Table
```sql
CREATE TABLE fact_student_attendance (
    date_key INT NOT NULL REFERENCES dim_date(date_key),
    student_key INT NOT NULL REFERENCES dim_student(student_key),
    class_key INT NOT NULL REFERENCES dim_class(class_key),
    attendance_status VARCHAR(20),  -- present, absent, excused
    PRIMARY KEY (date_key, student_key, class_key)
);
```

## Grain Declaration
Every fact table must declare its grain (granularity level) before design:

| Fact Table | Grain | Examples |
|---|---|---|
| fact_sales | One row per line item per transaction | Individual product sold in an order |
| fact_inventory | One row per product per day | Daily snapshots of stock levels |
| fact_orders | One row per order (header grain) | Order-level totals, no line items |
| fact_web_traffic | One row per page view per session | Each individual page request |

Grain decisions determine which dimensions and measures belong in the fact table.

## Slowly Changing Dimension Strategy Decision Matrix

| Attribute | Change Frequency | Historical Accuracy Needed | Recommended SCD |
|---|---|---|---|
| Product color | Rare | Yes | Type 2 |
| Customer email | Moderate | No (current matters) | Type 1 |
| Employee department | Rare | Yes (payroll audits) | Type 2 |
| Customer segment | Frequent | Somewhat | Type 4 (mini-dim) |
| Credit limit | Moderate | Yes (compliance) | Type 2 |
| Address | Rare | Yes (shipping history) | Type 2 |
| Phone number | Moderate | No | Type 1 |

## Bridge Tables
Bridge tables resolve many-to-many relationships between dimensions and facts.

```sql
-- Product hierarchy: products belong to multiple categories
CREATE TABLE bridge_product_category (
    product_key INT NOT NULL REFERENCES dim_product(product_key),
    category_key INT NOT NULL REFERENCES dim_category(category_key),
    primary_flag BOOLEAN DEFAULT false,
    weighting_factor DECIMAL(3,2) DEFAULT 1.0,
    PRIMARY KEY (product_key, category_key)
);
```

Use bridge tables when:
- A dimension naturally maps to multiple hierarchies.
- Weighting or allocation factors are needed.
- Reporting requires drilling across multiple hierarchies.

## Dimensional Modeling Anti-Patterns

| Anti-Pattern | Problem | Solution |
|---|---|---|
| Wide fact tables | Poor compression, slow scans | Keep facts lean (measures + FKs only) |
| Too many dimensions on one fact | Join explosion, slow queries | Split into multiple fact tables at different grains |
| Changing dimension keys via Type 1 | Lost historical accuracy | Use Type 2 for historically significant attributes |
| One-size-fits-all dimension | Confusing, hard to maintain | Conformed dimensions with clear ownership |
| Over-normalization in dimensions | Too many joins, complex queries | Star schema with some denormalization |
| Facts in dimensions | Query complexity, inconsistent reporting | Measures belong in fact tables |
| Ignoring date dimension | Date-based queries become complex | Always include a date dimension table |

## Query Patterns

### Common Aggregations
```sql
-- Sales by product category by month
SELECT
    d.month_name,
    p.category,
    SUM(f.quantity) AS total_quantity,
    SUM(f.total_amount) AS total_revenue
FROM fact_sales f
JOIN dim_date d ON f.date_key = d.date_key
JOIN dim_product p ON f.product_key = p.product_key
WHERE d.year = 2024
GROUP BY d.month_name, p.category
ORDER BY d.month_name;

-- Year-over-year comparison
SELECT
    d.month,
    SUM(CASE WHEN d.year = 2024 THEN f.total_amount ELSE 0 END) AS revenue_2024,
    SUM(CASE WHEN d.year = 2023 THEN f.total_amount ELSE 0 END) AS revenue_2023,
    (SUM(CASE WHEN d.year = 2024 THEN f.total_amount ELSE 0 END) -
     SUM(CASE WHEN d.year = 2023 THEN f.total_amount ELSE 0 END)) /
     NULLIF(SUM(CASE WHEN d.year = 2023 THEN f.total_amount ELSE 0 END), 0) * 100
     AS yoy_growth_pct
FROM fact_sales f
JOIN dim_date d ON f.date_key = d.date_key
WHERE d.year IN (2023, 2024)
GROUP BY d.month
ORDER BY d.month;
```

### Open Period Balances
```sql
-- Account balance at any point in time
SELECT
    d.full_date,
    a.account_id,
    SUM(f.daily_balance) AS balance
FROM fact_account_balance f
JOIN dim_date d ON f.date_key = d.date_key
JOIN dim_account a ON f.account_key = a.account_key
WHERE d.full_date <= CURRENT_DATE
    AND a.account_id = 'ACC001'
GROUP BY d.full_date, a.account_id
ORDER BY d.full_date DESC
LIMIT 30;
```

## Key Points
- Define fact grain before adding dimensions or measures — grain is the single most important decision.
- Star schema as default, snowflake only when hierarchy management is critical.
- Type 2 SCD for historically significant attributes, Type 1 for current-value-only attributes.
- Conformed dimensions (date, customer, product) shared across fact tables enable cross-functional reporting.
- Facts are additive (fully), semi-additive (across some dimensions), or non-additive (must recalculate).
- Bridge tables for many-to-many dimension relationships with weighting factors.
- Date dimension table in every warehouse — never use DATEPART functions in queries.
- Dimensional models optimize for query performance and business user understandability.
- Review and update SCD strategies as business requirements evolve.
