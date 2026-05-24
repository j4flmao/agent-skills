# Data Vault 2.0 Reference

## Overview

Data Vault 2.0 is a hybrid approach combining the best of 3NF and dimensional modeling. It provides auditability, flexibility, and scalability for enterprise data warehouses. The core components are Hubs, Links, and Satellites.

## Core Components

### Hubs

Hubs store unique business keys with no descriptive attributes. They represent core business concepts.

**Structure:**
- Surrogate hash key (primary key)
- Business key (natural key from source)
- Load date timestamp
- Record source

```sql
-- Customer Hub
CREATE TABLE hub_customer (
    customer_hk CHAR(32) PRIMARY KEY,     -- MD5 hash of business key
    customer_id STRING NOT NULL,            -- Business key
    load_dts TIMESTAMP NOT NULL,            -- When first loaded
    record_source STRING NOT NULL,          -- Source system
    UNIQUE (customer_id)
);

-- Product Hub
CREATE TABLE hub_product (
    product_hk CHAR(32) PRIMARY KEY,
    product_id STRING NOT NULL,
    load_dts TIMESTAMP NOT NULL,
    record_source STRING NOT NULL,
    UNIQUE (product_id)
);

-- Order Hub
CREATE TABLE hub_order (
    order_hk CHAR(32) PRIMARY KEY,
    order_id STRING NOT NULL,
    load_dts TIMESTAMP NOT NULL,
    record_source STRING NOT NULL,
    UNIQUE (order_id)
);
```

### Links

Links represent relationships between hubs (transactions, associations, hierarchies).

**Structure:**
- Surrogate hash key (primary key)
- Hash keys of referenced hubs (foreign keys)
- Load date timestamp
- Record source

```sql
-- Link: Order contains Products (order line items)
CREATE TABLE link_order_product (
    order_product_lhk CHAR(32) PRIMARY KEY,  -- MD5 of order_hk + product_hk
    order_hk CHAR(32) NOT NULL REFERENCES hub_order(order_hk),
    product_hk CHAR(32) NOT NULL REFERENCES hub_product(product_hk),
    load_dts TIMESTAMP NOT NULL,
    record_source STRING NOT NULL,
    UNIQUE (order_hk, product_hk)
);

-- Link: Customer places Order
CREATE TABLE link_customer_order (
    customer_order_lhk CHAR(32) PRIMARY KEY,
    customer_hk CHAR(32) NOT NULL REFERENCES hub_customer(customer_hk),
    order_hk CHAR(32) NOT NULL REFERENCES hub_order(order_hk),
    load_dts TIMESTAMP NOT NULL,
    record_source STRING NOT NULL,
    UNIQUE (customer_hk, order_hk)
);
```

### Satellites

Satellites store descriptive attributes and track changes over time. Each hub and link can have multiple satellites.

**Structure:**
- Hash key of parent hub/link + load date (composite PK)
- Descriptive attributes
- Load date timestamp
- Record source
- Optional: end date for tracking changes

```sql
-- Customer satellite (primary attributes)
CREATE TABLE sat_customer_detail (
    customer_hk CHAR(32) NOT NULL REFERENCES hub_customer(customer_hk),
    load_dts TIMESTAMP NOT NULL,             -- When this version was loaded
    record_source STRING NOT NULL,
    -- Descriptive attributes
    customer_name STRING,
    customer_email STRING,
    customer_phone STRING,
    customer_tier STRING,
    -- SCD tracking (Type 2)
    end_dts TIMESTAMP,                       -- NULL = current version
    is_current BOOLEAN DEFAULT true,
    hash_diff CHAR(32),                      -- MD5 of all descriptive columns
    PRIMARY KEY (customer_hk, load_dts)
);

-- Customer satellite (demographic attributes, separate change frequency)
CREATE TABLE sat_customer_demographic (
    customer_hk CHAR(32) NOT NULL REFERENCES hub_customer(customer_hk),
    load_dts TIMESTAMP NOT NULL,
    record_source STRING NOT NULL,
    age_group STRING,
    income_bracket STRING,
    marital_status STRING,
    home_owner BOOLEAN,
    end_dts TIMESTAMP,
    is_current BOOLEAN DEFAULT true,
    hash_diff CHAR(32),
    PRIMARY KEY (customer_hk, load_dts)
);

-- Order satellite
CREATE TABLE sat_order_detail (
    order_hk CHAR(32) NOT NULL REFERENCES hub_order(order_hk),
    load_dts TIMESTAMP NOT NULL,
    record_source STRING NOT NULL,
    order_date DATE,
    order_status STRING,
    total_amount DECIMAL(12,2),
    currency STRING,
    end_dts TIMESTAMP,
    is_current BOOLEAN DEFAULT true,
    hash_diff CHAR(32),
    PRIMARY KEY (order_hk, load_dts)
);
```

## Hash Keys

Data Vault 2.0 uses hash keys instead of sequential surrogate keys for:
- Consistent key assignment across distributed systems
- No need for sequence generation (parallel loading)
- Deterministic key derivation (same key from same business key in any system)

### Hash Key Generation

```sql
-- MD5 hash of business key
-- Hub hash: MD5(upper(trim(business_key)))
-- Link hash: MD5(upper(trim(hk1)) || '+' || upper(trim(hk2)))

-- Hub hash key
SELECT MD5(UPPER(TRIM(customer_id))) AS customer_hk FROM source.customers;

-- Link hash key
SELECT MD5(
    UPPER(TRIM(c.customer_id)) || '+' || UPPER(TRIM(o.order_id))
) AS customer_order_lhk
FROM source.orders o
JOIN source.customers c ON o.customer_id = c.customer_id;

-- Hash diff for satellite change detection
SELECT MD5(
    UPPER(COALESCE(TRIM(customer_name), '')) || '|' ||
    UPPER(COALESCE(TRIM(email), '')) || '|' ||
    COALESCE(TRIM(phone), '') || '|' ||
    COALESCE(TRIM(tier), '')
) AS hash_diff
FROM source.customers;
```

## Raw Vault vs Business Vault

### Raw Vault
The raw vault preserves source data as-is with no business transformation.

**Characteristics:**
- Direct mapping from source to Data Vault structures
- One-to-one with source data
- No business rules applied
- Fully auditable (what was actually sent by the source)
- Serves as the enterprise integration layer

```sql
-- Raw Vault: Customer Hub loaded directly from source
INSERT INTO hub_customer (customer_hk, customer_id, load_dts, record_source)
SELECT
    MD5(UPPER(TRIM(customer_id))),
    customer_id,
    CURRENT_TIMESTAMP,
    'source_crm'
FROM source_crm.customers;
```

### Business Vault
The business vault applies business rules, data quality corrections, and transformations.

**Characteristics:**
- Same Data Vault structure (hubs, links, satellites)
- Contains cleansed, deduplicated, enriched data
- Business rules applied consistently
- Multiple raw sources merged into single business view
- Feeds presentation layer (dimensional marts)

```sql
-- Business Vault: Cleaned customer hub (mastered from multiple sources)
INSERT INTO bv_hub_customer (customer_hk, customer_id, global_customer_id, load_dts, record_source)
SELECT
    MD5(UPPER(TRIM(m.customer_id))),
    m.customer_id,
    m.global_customer_id,
    CURRENT_TIMESTAMP,
    'customer_master'
FROM master_data.customers m
WHERE m.is_primary_record = true;

-- Business Vault: Customer satellite with enriched data
INSERT INTO bv_sat_customer (customer_hk, load_dts, record_source, customer_name, customer_tier, risk_score)
SELECT
    c.hub_customer_hk,
    CURRENT_TIMESTAMP,
    'customer_risk_scoring',
    m.customer_name,
    CASE
        WHEN m.lifetime_value > 10000 THEN 'platinum'
        WHEN m.lifetime_value > 5000 THEN 'gold'
        WHEN m.lifetime_value > 1000 THEN 'silver'
        ELSE 'bronze'
    END AS customer_tier,
    r.risk_score
FROM bv_hub_customer c
JOIN master_data.customers m ON c.global_customer_id = m.global_customer_id
LEFT JOIN risk_scores.customer_risk r ON m.customer_id = r.customer_id;
```

## Loading Patterns

### Hub Load (Insert-Only)

```sql
-- Hub: insert only, duplicate detection via primary key
INSERT INTO hub_customer (customer_hk, customer_id, load_dts, record_source)
SELECT DISTINCT
    MD5(UPPER(TRIM(src.customer_id))) AS customer_hk,
    src.customer_id,
    CURRENT_TIMESTAMP,
    'source_crm'
FROM source_crm.customers src
WHERE NOT EXISTS (
    SELECT 1 FROM hub_customer hub
    WHERE hub.customer_hk = MD5(UPPER(TRIM(src.customer_id)))
);
```

### Satellite Load (Detect Changes)

```sql
-- Satellite: insert on new hub entries or attribute changes
INSERT INTO sat_customer_detail (
    customer_hk, load_dts, record_source,
    customer_name, customer_email, customer_phone, customer_tier,
    end_dts, is_current, hash_diff
)
SELECT
    hub.customer_hk,
    CURRENT_TIMESTAMP,
    'source_crm',
    src.customer_name,
    src.email,
    src.phone,
    src.tier,
    NULL,
    true,
    MD5(UPPER(COALESCE(TRIM(src.customer_name), '')) || '|' ||
        UPPER(COALESCE(TRIM(src.email), '')) || '|' ||
        COALESCE(TRIM(src.phone), '') || '|' ||
        COALESCE(TRIM(src.tier), ''))
FROM source_crm.customers src
JOIN hub_customer hub ON hub.customer_hk = MD5(UPPER(TRIM(src.customer_id)))
LEFT JOIN sat_customer_detail sat
    ON sat.customer_hk = hub.customer_hk AND sat.is_current = true
WHERE sat.customer_hk IS NULL                           -- new hub entry
   OR sat.hash_diff != MD5(                             -- attribute changed
        UPPER(COALESCE(TRIM(src.customer_name), '')) || '|' ||
        UPPER(COALESCE(TRIM(src.email), '')) || '|' ||
        COALESCE(TRIM(src.phone), '') || '|' ||
        COALESCE(TRIM(src.tier), '')
   )
-- Close previous version
UNION ALL
UPDATE sat_customer_detail
SET end_dts = CURRENT_TIMESTAMP, is_current = false
FROM sat_customer_detail sat
JOIN hub_customer hub ON sat.customer_hk = hub.customer_hk
JOIN source_crm.customers src ON hub.customer_id = src.customer_id
WHERE sat.is_current = true
  AND sat.hash_diff != MD5(
      UPPER(COALESCE(TRIM(src.customer_name), '')) || '|' ||
      UPPER(COALESCE(TRIM(src.email), '')) || '|' ||
      COALESCE(TRIM(src.phone), '') || '|' ||
      COALESCE(TRIM(src.tier), '')
  );
```

## Point-in-Time (PIT) Tables

PIT tables simplify querying Data Vault by providing pre-joined snapshots of satellites at specific points in time.

```sql
CREATE TABLE pit_customer (
    customer_hk CHAR(32) PRIMARY KEY,
    pit_snapshot_date DATE NOT NULL,
    sat_detail_load_dts TIMESTAMP,    -- Which satellite version was active
    sat_demographic_load_dts TIMESTAMP,
    pit_valid_from DATE,
    pit_valid_to DATE
);

-- Query using PIT: correct satellite version for each date
SELECT
    hub.customer_id,
    pit.pit_snapshot_date,
    sat_detail.customer_name,
    sat_detail.customer_tier,
    sat_demo.age_group
FROM pit_customer pit
JOIN hub_customer hub ON pit.customer_hk = hub.customer_hk
LEFT JOIN sat_customer_detail sat_detail
    ON pit.customer_hk = sat_detail.customer_hk
    AND pit.sat_detail_load_dts = sat_detail.load_dts
LEFT JOIN sat_customer_demographic sat_demo
    ON pit.customer_hk = sat_demo.customer_hk
    AND pit.sat_demographic_load_dts = sat_demo.load_dts
WHERE pit.pit_snapshot_date = '2026-05-01';
```

## Bridge Tables

Bridge tables connect transactional Data Vault links to dimensional star schemas for performance.

```sql
-- Bridge: flatten multiple satellites for dimension use
CREATE TABLE bridge_customer (
    customer_dim_key INT PRIMARY KEY,
    customer_hk CHAR(32) NOT NULL,
    customer_id STRING,
    customer_name STRING,
    customer_tier STRING,
    age_group STRING,
    income_bracket STRING,
    effective_date DATE,
    expiration_date DATE,
    is_current BOOLEAN
);
```

## Query Patterns

```sql
-- Point-in-time customer state
SELECT
    h.customer_id,
    s.customer_name,
    s.customer_tier,
    s.load_dts AS version_as_of
FROM hub_customer h
JOIN sat_customer_detail s ON h.customer_hk = s.customer_hk
WHERE s.load_dts <= CURRENT_TIMESTAMP
  AND (s.end_dts IS NULL OR s.end_dts > CURRENT_TIMESTAMP)
  AND h.customer_id = 'CUST-001';

-- Customer order history with attributes at order time
SELECT
    h.customer_id,
    o.order_hk,
    sod.order_date,
    sod.total_amount,
    scd.customer_name,
    scd.customer_tier
FROM hub_customer h
JOIN link_customer_order lco ON h.customer_hk = lco.customer_hk
JOIN hub_order o ON lco.order_hk = o.order_hk
JOIN sat_order_detail sod ON o.order_hk = sod.order_hk
    AND sod.load_dts = (SELECT MAX(load_dts) FROM sat_order_detail WHERE order_hk = o.order_hk AND load_dts <= sod.order_date)
LEFT JOIN (
    SELECT s.customer_hk, s.customer_name, s.customer_tier, s.load_dts, s.end_dts
    FROM sat_customer_detail s
) scd ON h.customer_hk = scd.customer_hk
    AND scd.load_dts = (SELECT MAX(load_dts) FROM sat_customer_detail WHERE customer_hk = h.customer_hk AND load_dts <= sod.order_date)
WHERE h.customer_id = 'CUST-001';
```

## Rules
- A hub represents one core business concept identified by its business key
- Links connect hubs representing associations, not transactions
- Satellites store all descriptive attributes and track changes
- Hash keys enable distributed, deterministic key assignment
- Raw vault preserves source data integrity; business vault applies rules
- INSERT-only loads for hubs and links, Type 2 sat loads for satellites
- Hash diff columns enable efficient change detection
- PIT tables simplify querying by pre-joining satellite snapshots
- Bridge tables connect Data Vault to dimensional marts
- Document all source-to-target mappings for auditability
- Test hash key collision probability (extremely low for MD5)
