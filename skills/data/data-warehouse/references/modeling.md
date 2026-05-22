# Dimensional Modeling

## Star Schema

### Structure
Single fact table at center, dimension tables around it (denormalized). Fact table contains measures and foreign keys to dimensions. Dimensions are wide (many attributes per dimension).

### Advantages
Simple to understand. Fast queries (fewer joins). Intuitive for business users. Well-supported by BI tools.

### Example
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
Dimension tables normalized (split into sub-dimensions). Reduces data redundancy. More joins required.

### Advantages
More storage-efficient. Easier dimension maintenance. Better for deeply hierarchical dimensions.

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
Transaction: one row per event (order, click, transaction). Periodic Snapshot: one row per period (daily account balance, monthly inventory). Cumulative Snapshot: one row per process lifecycle (order-to-delivery pipeline).

### Grain Declaration
Most atomic level: "one row per order line item" not "one row per order". Document grain in table description. Never mix grains in one fact table.

### Additive Measures
Additive: sum across any dimension (quantity, amount, count). Semi-additive: sum across some dimensions (account balance additive across accounts but not time). Non-additive: cannot sum (ratios, percentages, unit price).

## Dimension Tables

### Conformed Dimensions
Shared across fact tables and data marts. Same dimension key, same attributes, same meaning. Examples: dim_dates (calendar), dim_customers (customer master), dim_products (product catalog).

### Role-Playing Dimensions
Same dimension used differently in same fact table. Example: dim_dates as order_date, ship_date, delivery_date. Aliased with views or role names.

### Junk Dimensions
Combine low-cardinality flags and indicators into one dimension. Example: is_express_shipping, is_gift_wrapped, payment_method, order_source. Combine all into dim_order_flags.

### Degenerate Dimensions
Dimension attribute stored in fact table (no separate dimension). Examples: order_number, invoice_number, transaction_id. Used when the dimension has no other attributes.

## Slowly Changing Dimensions (SCD)

### Type 0: Retain Original
Never change dimension attribute values. Used for: immutable audit data, creation timestamps.

### Type 1: Overwrite
Replace old value with new value. No history. Used for: corrections, fields where history doesn't matter (customer phone for contact purposes).

### Type 2: Add New Row
Add new row with `valid_from`, `valid_to`, `is_current` flags. Full history preserved. Used for: address changes, name changes, status changes.

### Type 3: Add New Column
Add column for previous value (limited history). Used for: tracking previous version only ("previous_price", "previous_manager").

### Hybrid
SCD Type 2 for critical attributes (address, name). SCD Type 1 for non-critical (phone, email). SCD Type 0 for immutable (created date, original ID).
