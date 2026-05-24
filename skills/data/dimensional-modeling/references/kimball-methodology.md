# Kimball Methodology Reference

## Overview

The Kimball methodology is a bottom-up approach to data warehousing that focuses on delivering business value incrementally through dimensional data marts. It emphasizes business process alignment, conformed dimensions, and the Bus Matrix for enterprise-wide coordination.

## The 4-Step Process

### Step 1: Select the Business Process

Choose a business process that generates measurable events. Business processes are operational activities (sales, ordering, inventory, customer service) that produce records in source systems.

**Criteria for selection:**
- Business priority and stakeholder demand
- Data availability and quality
- Source system accessibility
- Potential for reusability across the enterprise

**Examples:**
- Sales transactions (point-of-sale)
- Order fulfillment (order-to-cash)
- Inventory movements (receiving, shipping, transfers)
- Customer service calls (ticket creation, resolution)
- Web browsing sessions (page views, clicks)

### Step 2: Declare the Grain

The grain is the fundamental level at which a fact record represents a measurement. It must be declared before dimensions or facts can be identified.

**Grain declaration examples:**

```
Business Process: Sales Transactions
Grain: One row per individual line item on a sales receipt

Business Process: Inventory
Grain: One row per product per warehouse per day

Business Process: Customer Service
Grain: One row per service ticket per status change

Business Process: Web Browsing
Grain: One row per page view event

Business Process: Order Fulfillment
Grain: One row per order
```

**Grain rules:**
- The grain must be atomic (cannot be further subdivided)
- The grain determines which dimensions are valid
- The grain must be understood by business users
- Change the grain only when justified by new requirements

### Step 3: Identify the Dimensions

Dimensions answer who, what, where, when, why, and how about the measurement event.

**Standard dimensions by business process:**

| Business Process | Typical Dimensions |
|-----------------|-------------------|
| Sales | Date, Product, Customer, Store, Promotion, Payment Method |
| Order Fulfillment | Date, Product, Customer, Warehouse, Carrier, Order |
| Inventory | Date, Product, Warehouse, Supplier |
| Customer Service | Date, Customer, Product, Agent, Issue Category |
| Web Analytics | Date, Visitor, Page, Referrer, Campaign, Device |

**Conformed dimensions** are dimensions that have the same meaning and content across multiple fact tables. They enable drill-across analysis.

```sql
-- Conformed dimension example: Date dimension shared by all fact tables
CREATE TABLE dim_date (
    date_key INT PRIMARY KEY,
    full_date DATE,
    day_of_week INT,
    day_name STRING,
    day_of_month INT,
    day_of_year INT,
    week_of_year INT,
    month_key INT,
    month_name STRING,
    month_of_year INT,
    quarter_key INT,
    quarter_name STRING,
    year INT,
    fiscal_year INT,
    fiscal_period INT,
    is_weekend BOOLEAN,
    is_holiday BOOLEAN
);

-- Conformed dimension: Customer dimension shared by Sales and Service fact tables
CREATE TABLE dim_customer (
    customer_key INT PRIMARY KEY,
    customer_id STRING,
    customer_name STRING,
    customer_email STRING,
    customer_tier STRING,
    acquisition_date DATE,
    region STRING,
    country STRING,
    scd_start_date DATE,
    scd_end_date DATE,
    is_current BOOLEAN
);
```

### Step 4: Identify the Facts

Facts are numeric measurements that result from the business process event. They must be consistent with the declared grain.

```sql
-- Transaction fact table at line-item grain
CREATE TABLE fact_sales (
    sales_fact_key BIGINT PRIMARY KEY,
    date_key INT NOT NULL REFERENCES dim_date(date_key),
    product_key INT NOT NULL REFERENCES dim_product(product_key),
    customer_key INT NOT NULL REFERENCES dim_customer(customer_key),
    store_key INT NOT NULL REFERENCES dim_store(store_key),
    promotion_key INT REFERENCES dim_promotion(promotion_key),
    payment_method_key INT REFERENCES dim_payment_method(payment_method_key),
    -- Degenerate dimensions
    receipt_number STRING,
    line_item_number INT,
    -- Additive facts
    quantity INT NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    discount_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    sales_amount DECIMAL(10,2) NOT NULL,
    cost_amount DECIMAL(10,2) NOT NULL,
    -- Non-additive facts
    profit_margin_pct DECIMAL(5,2)
);
```

## Bus Matrix

The Bus Matrix is the enterprise-wide architecture blueprint. Rows are business processes (fact tables), columns are dimensions. An X indicates a dimension is used by that fact table.

### Sample Bus Matrix

| Business Process | Date | Product | Customer | Store | Employee | Promotion | Shipment | Payment | Warehouse |
|-----------------|------|---------|----------|-------|----------|-----------|---------|---------|-----------|
| Sales Transactions | X | X | X | X | | X | | X | |
| Order Fulfillment | X | X | X | | | | X | | X |
| Inventory | X | X | | | | | | | X |
| Customer Service | X | | X | | X | | | | |
| Shipments | X | X | | | | | X | | X |
| Returns | X | X | X | X | | | | X | |

### Building the Bus Matrix

```sql
CREATE TABLE bus_matrix (
    business_process STRING,
    dimension_name STRING,
    is_used BOOLEAN,
    grain_description STRING
);

INSERT INTO bus_matrix VALUES
    ('Sales Transactions', 'Date', true, 'Transaction date'),
    ('Sales Transactions', 'Product', true, 'Product sold'),
    ('Sales Transactions', 'Customer', true, 'Purchasing customer'),
    ('Sales Transactions', 'Store', true, 'Point of sale'),
    ('Order Fulfillment', 'Date', true, 'Order date'),
    ('Order Fulfillment', 'Product', true, 'Product ordered'),
    ('Order Fulfillment', 'Customer', true, 'Ordering customer');
```

## Conformed Dimensions

### Types of Conformed Dimensions

1. **Identical** — Same dimension table, same content, same grain used across multiple fact tables. Example: Date dimension is always identical.

2. **Shrunken** — Rollup of a base dimension. Example: Month dimension (a shrunken Date dimension) used for monthly snapshots.

3. **Consistent** — Different dimension tables that use the same attributes with the same meanings. Example: Customer dimension in Sales and Customer dimension in Service have the same customer_tier definition even if other attributes differ.

### Conformed Dimension Rules

- Primary keys must be consistent across all uses
- Attribute definitions must be identical
- Slowly changing dimension tracking (Type 2) must be consistent
- No fact-table-specific columns in conformed dimensions

## Drill-Across

Drill-across queries use conformed dimensions to query multiple fact tables together.

```sql
-- Drill-across: sales + returns by date
SELECT
    d.full_date,
    SUM(fs.sales_amount) AS total_sales,
    SUM(fr.return_amount) AS total_returns,
    SUM(fr.return_amount) / NULLIF(SUM(fs.sales_amount), 0) AS return_rate
FROM dim_date d
LEFT JOIN fact_sales fs ON d.date_key = fs.date_key
LEFT JOIN fact_returns fr ON d.date_key = fr.date_key
WHERE d.year = 2026
GROUP BY d.full_date
ORDER BY d.full_date;
```

## Kimball Lifecycle

The Kimball lifecycle has three phases:

1. **Project Planning & Requirements:** Stakeholder interviews, business requirements gathering, technical assessment
2. **Data Track:** Dimensional modeling, ETL design, ETL development, ETL testing
3. **BI Track:** BI application design, BI application development, BI application testing

The lifecycle is iterative: deliver one data mart at a time, then expand.

## Rules
- Always declare the grain before designing dimensions or facts
- Conformed dimensions are the key to enterprise-wide consistency
- The Bus Matrix is the master architecture document, keep it current
- Start with the highest-priority business process, not the easiest
- Dimension attributes should be text or discrete values, not codes
- Every fact table joins to the date dimension
- Degenerate dimensions belong in the fact table (order number, receipt number)
- Drill-across requires conformed dimensions — non-negotiable
- One fact table per business process at the atomic grain
- Iterate: deliver value in 4-8 week cycles per data mart
