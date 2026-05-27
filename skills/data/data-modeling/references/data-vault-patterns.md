# Data Vault Patterns

## Overview
Data Vault 2.0 methodology for enterprise data warehousing — hubs, links, satellites, loading patterns, and best practices for scalable, auditable data warehouses.

## Data Vault Core Concepts

### Hubs
Hubs store unique business keys with no context or relationships. Each hub represents a core business concept (customer, product, order).

```sql
CREATE TABLE hub_customer (
    customer_hk CHAR(32) PRIMARY KEY,  -- MD5 hash of business key
    customer_id VARCHAR(50) NOT NULL,   -- business key from source
    record_source VARCHAR(100) NOT NULL,
    load_date TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT uk_hub_customer UNIQUE (customer_id)
);

CREATE TABLE hub_product (
    product_hk CHAR(32) PRIMARY KEY,
    product_sku VARCHAR(50) NOT NULL,
    record_source VARCHAR(100) NOT NULL,
    load_date TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT uk_hub_product UNIQUE (product_sku)
);

CREATE TABLE hub_order (
    order_hk CHAR(32) PRIMARY KEY,
    order_number VARCHAR(50) NOT NULL,
    record_source VARCHAR(100) NOT NULL,
    load_date TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT uk_hub_order UNIQUE (order_number)
);
```

Hub design rules:
- One row per unique business key.
- Hash key (SHA-1 or MD5) as primary key for performance and distribution.
- Business key is the natural key from the source system.
- Never delete from a hub — insert only.
- record_source tracks where the data originated.
- Load date tracks when the record was first inserted.

### Links
Links represent relationships between hubs (many-to-many, many-to-one, one-to-many). Each link connects two or more hub hash keys.

```sql
-- Many-to-many: which products are in which orders
CREATE TABLE link_order_product (
    order_product_hk CHAR(32) PRIMARY KEY,
    order_hk CHAR(32) NOT NULL REFERENCES hub_order(order_hk),
    product_hk CHAR(32) NOT NULL REFERENCES hub_product(product_hk),
    record_source VARCHAR(100) NOT NULL,
    load_date TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT uk_link_order_product UNIQUE (order_hk, product_hk)
);

-- One-to-many: customer placed orders
CREATE TABLE link_customer_order (
    customer_order_hk CHAR(32) PRIMARY KEY,
    customer_hk CHAR(32) NOT NULL REFERENCES hub_customer(customer_hk),
    order_hk CHAR(32) NOT NULL REFERENCES hub_order(order_hk),
    record_source VARCHAR(100) NOT NULL,
    load_date TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT uk_link_customer_order UNIQUE (order_hk)  -- one order per customer
);

-- Many-to-many with extra context
CREATE TABLE link_customer_address (
    customer_address_hk CHAR(32) PRIMARY KEY,
    customer_hk CHAR(32) NOT NULL REFERENCES hub_customer(customer_hk),
    address_hk CHAR(32) NOT NULL REFERENCES hub_address(address_hk),
    address_type VARCHAR(20),  -- billing, shipping, physical
    record_source VARCHAR(100) NOT NULL,
    load_date TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT uk_link_customer_address UNIQUE (customer_hk, address_hk, address_type)
);
```

Link design rules:
- Each relationship gets its own link table.
- Hash key is derived from concatenation of all involved hub keys plus context.
- Same-hub links (self-referencing) are valid — e.g., employee-manager hierarchy.
- Links can have link satellites for time-varying relationship attributes.
- Non-historic link attributes (static relationships) go directly in the link.

### Satellites
Satellites store descriptive attributes and context for hubs or links. They track changes over time.

```sql
-- Hub satellite: customer attributes that change over time
CREATE TABLE sat_customer_detail (
    customer_hk CHAR(32) NOT NULL REFERENCES hub_customer(customer_hk),
    load_date TIMESTAMP NOT NULL,
    record_source VARCHAR(100) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    email VARCHAR(255),
    phone VARCHAR(20),
    customer_segment VARCHAR(50),
    hash_diff CHAR(32) NOT NULL,  -- MD5 of all descriptive fields
    PRIMARY KEY (customer_hk, load_date)
);

-- Link satellite: order line item details
CREATE TABLE sat_order_product_detail (
    order_product_hk CHAR(32) NOT NULL REFERENCES link_order_product(order_product_hk),
    load_date TIMESTAMP NOT NULL,
    record_source VARCHAR(100) NOT NULL,
    quantity INT,
    unit_price DECIMAL(10,2),
    discount DECIMAL(10,2),
    line_total DECIMAL(10,2),
    hash_diff CHAR(32) NOT NULL,
    PRIMARY KEY (order_product_hk, load_date)
);
```

Satellite design rules:
- Always model as Type 2 (full change tracking) — the load_date is part of the primary key.
- Group attributes that change at different rates into separate satellites (rapidly changing vs stable).
- hash_diff column enables efficient change detection without comparing each field.
- Satellites can have multiple active records per hub key if non-overlapping effective dates.
- Use separate satellites for sensitive data (PII) to enable column-level security.

## Loading Patterns

### Hub Load (Incremental)
```sql
-- Stage table contains new/changed records from source
INSERT INTO hub_customer (customer_hk, customer_id, record_source, load_date)
SELECT DISTINCT
    MD5(UPPER(TRIM(stg.customer_id))) AS customer_hk,
    stg.customer_id,
    'CRM_SYSTEM' AS record_source,
    NOW() AS load_date
FROM stage_customer stg
LEFT JOIN hub_customer hub
    ON MD5(UPPER(TRIM(stg.customer_id))) = hub.customer_hk
WHERE hub.customer_hk IS NULL;
```

### Satellite Load (Change Detection)
```sql
INSERT INTO sat_customer_detail (
    customer_hk, load_date, record_source,
    first_name, last_name, email, phone,
    customer_segment, hash_diff
)
SELECT
    MD5(UPPER(TRIM(stg.customer_id))) AS customer_hk,
    NOW() AS load_date,
    'CRM_SYSTEM' AS record_source,
    stg.first_name,
    stg.last_name,
    stg.email,
    stg.phone,
    stg.segment,
    MD5(CONCAT_WS('|',
        COALESCE(stg.first_name, ''),
        COALESCE(stg.last_name, ''),
        COALESCE(stg.email, ''),
        COALESCE(stg.phone, ''),
        COALESCE(stg.segment, '')
    )) AS hash_diff
FROM stage_customer stg
JOIN hub_customer hub
    ON MD5(UPPER(TRIM(stg.customer_id))) = hub.customer_hk
LEFT JOIN (
    SELECT customer_hk, hash_diff
    FROM sat_customer_detail
    WHERE (customer_hk, load_date) IN (
        SELECT customer_hk, MAX(load_date)
        FROM sat_customer_detail
        GROUP BY customer_hk
    )
) sat ON hub.customer_hk = sat.customer_hk
WHERE (sat.hash_diff IS NULL
    OR sat.hash_diff != MD5(CONCAT_WS('|',
        COALESCE(stg.first_name, ''),
        COALESCE(stg.last_name, ''),
        COALESCE(stg.email, ''),
        COALESCE(stg.phone, ''),
        COALESCE(stg.segment, '')
    )));
```

## Point-in-Time (PIT) Tables
PIT tables pre-join hub, link, and satellite snapshots at specific time points for query performance.

```sql
CREATE TABLE pit_customer_daily (
    customer_hk CHAR(32) NOT NULL REFERENCES hub_customer(customer_hk),
    snapshot_date DATE NOT NULL,
    sat_customer_detail_load_date TIMESTAMP,
    sat_customer_credit_load_date TIMESTAMP,
    sat_customer_preference_load_date TIMESTAMP,
    PRIMARY KEY (customer_hk, snapshot_date)
);

-- Bridge table for PIT construction
CREATE TABLE bridge_customer_satellite (
    customer_hk CHAR(32) NOT NULL,
    satellite_name VARCHAR(100) NOT NULL,
    load_date TIMESTAMP NOT NULL,
    PRIMARY KEY (customer_hk, satellite_name)
);
```

PIT tables improve query performance by:
- Pre-joining satellite versions for common time references.
- Eliminating subqueries to find the correct satellite version per time point.
- Supporting daily/weekly/monthly snapshot patterns.

## Business Vault
The Business Vault layer adds business rules, derived data, and computed metrics on top of the Raw Vault.

```sql
-- Business vault satellite: computed customer lifetime value
CREATE TABLE bv_sat_customer_lifetime_value (
    customer_hk CHAR(32) NOT NULL REFERENCES hub_customer(customer_hk),
    load_date TIMESTAMP NOT NULL,
    record_source VARCHAR(100) DEFAULT 'BUSINESS_VAULT',
    total_revenue DECIMAL(15,2),
    total_orders INT,
    avg_order_value DECIMAL(10,2),
    customer_tenure_days INT,
    churn_risk_score DECIMAL(5,2),
    lifetime_value_segment VARCHAR(20),
    hash_diff CHAR(32) NOT NULL,
    PRIMARY KEY (customer_hk, load_date)
);
```

Business Vault patterns:
- Derived metrics (ratios, scores, segments) computed from raw data.
- Data quality satellites for tracking data issues and transformations.
- Same-as-link (SAL) for recursive hierarchies.
- Hierarchical link tables for organizational structures.
- PIT and Bridge tables for query optimization.

## Query Patterns

### Current View
```sql
-- Latest customer details (current state)
SELECT
    h.customer_id,
    s.first_name,
    s.last_name,
    s.email,
    s.customer_segment
FROM hub_customer h
LEFT JOIN sat_customer_detail s
    ON h.customer_hk = s.customer_hk
    AND s.load_date = (
        SELECT MAX(s2.load_date)
        FROM sat_customer_detail s2
        WHERE s2.customer_hk = s.customer_hk
    );
```

### Point-in-Time View
```sql
-- Customer state as of specific date
WITH customer_pit AS (
    SELECT
        customer_hk,
        MAX(load_date) AS sat_load_date
    FROM sat_customer_detail
    WHERE load_date <= '2024-06-01'
    GROUP BY customer_hk
)
SELECT
    h.customer_id,
    s.first_name,
    s.last_name,
    s.email,
    s.customer_segment
FROM hub_customer h
JOIN customer_pit pit ON h.customer_hk = pit.customer_hk
JOIN sat_customer_detail s
    ON pit.customer_hk = s.customer_hk
    AND pit.sat_load_date = s.load_date;
```

### Full History
```sql
-- Full change history for a customer
SELECT
    h.customer_id,
    s.first_name,
    s.last_name,
    s.email,
    s.load_date AS effective_from,
    LEAD(s.load_date) OVER (
        PARTITION BY s.customer_hk
        ORDER BY s.load_date
    ) AS effective_to
FROM hub_customer h
JOIN sat_customer_detail s ON h.customer_hk = s.customer_hk
WHERE h.customer_id = 'CUST001'
ORDER BY s.load_date DESC;
```

## Data Vault vs Star Schema

| Aspect | Data Vault | Star Schema |
|---|---|---|
| Design effort | Higher (more tables) | Lower (simpler joins) |
| Change tracking | Native (via satellites) | Requires SCD logic |
| Auditability | Full lineage, source tracking | Limited |
| Load complexity | Parallel-ready, resilient | Sequential, ETL-dependent |
| Query performance | Slower (more joins) | Faster (denormalized) |
| Storage | Higher (history + hash keys) | Lower (current state optimized) |
| Best for | Enterprise data warehouse, compliance | Data mart, BI reporting |

## Key Points
- Hubs store business keys, Links store relationships, Satellites store attributes — nothing else.
- Hash keys (MD5 or SHA-1) enable parallel loading and consistent distribution.
- Satellites track full history via load_date in primary key — never update in place.
- hash_diff enables efficient change detection without field-by-field comparison.
- Loading is insert-only — no updates, no deletes in Raw Vault.
- Group satellite attributes by change frequency for optimal storage and load performance.
- PIT tables bridge the gap between raw vault and query performance needs.
- Business Vault transforms raw data into analytics-ready structures.
- Data Vault excels in complex, integrated environments requiring full auditability.
- Raw Vault models the source system exactly — transformations belong in Business Vault.
