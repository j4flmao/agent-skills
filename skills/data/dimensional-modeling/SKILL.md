---
name: data-dimensional-modeling
description: >
  Use this skill when designing dimensional data models — Kimball star schemas, Data Vault 2.0, slowly changing dimensions, fact table design, or bus matrix development. This skill enforces: Kimball 4-step methodology (business process, grain, dimensions, facts), star schema design with conformed dimensions, SCD Type 0-6 selection, fact table granularity and additive/non-additive measures, and Data Vault 2.0 hub/link/satellite modeling. Do NOT use for: OLTP normalization, NoSQL data modeling, or data lake table format design.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [data, modeling, warehouse, phase-7]
---

# Dimensional Modeling

## Purpose
Design robust dimensional data models for analytical workloads following Kimball methodology, star schema best practices, slowly changing dimension strategies, fact table design patterns, and Data Vault 2.0 architecture.

## Agent Protocol

### Trigger
Exact user phrases: "dimensional modeling", "Kimball", "star schema", "snowflake schema", "bus matrix", "conformed dimension", "slowly changing dimension", "SCD", "fact table", "dimension table", "data vault", "hub link satellite", "grain declaration", "surrogate key", "degenerate dimension".

### Input Context
- Business processes to model (sales, inventory, orders, payments)
- Source systems and data granularity
- Reporting and analytics requirements
- Query patterns (aggregations, drill-down, slice-and-dice)
- Data volume and growth rate
- Historical tracking requirements (how far back, what changes to track)
- BI tool requirements (Tableau, Power BI, Looker)

### Output Artifact
Dimensional model with bus matrix, star schemas, SCD strategy, fact table designs, and DDL statements.

### Response Format
```sql
-- Dimension and fact table DDL
-- SCD implementation
```
```yaml
# Bus matrix
# Grain declaration
```
```markdown
# Design decisions and trade-offs
```

No preamble. No postamble. No explanations. No filler/hedging/transitions.

### Completion Criteria
- [ ] Business process selected and grain declared
- [ ] Bus matrix created showing dimensions by process
- [ ] Conformed dimensions identified and standardized
- [ ] SCD type selected per dimension attribute
- [ ] Fact table type (transaction, periodic snapshot, accumulating) selected
- [ ] Additive, semi-additive, and non-additive measures classified
- [ ] Surrogate key strategy defined
- [ ] Data Vault model designed if applicable

### Max Response Length
300 lines of code and configuration.

## Workflow

### Step 1: Select Business Process
Identify core business processes that generate measurable events: sales transactions, order fulfillment, inventory movements, customer interactions, financial postings, service requests. Each process becomes a fact table candidate. Prioritize by business impact, data availability, and reporting requirements. Start with 3-5 core processes, expand in later phases.

#### Business Process Evaluation Matrix

| Process | Business Impact | Data Availability | Reporting Value | Complexity | Priority |
|---|---|---|---|---|---|
| Sales transactions | High | High | High | Low | 1 |
| Order fulfillment | High | Medium | High | Medium | 2 |
| Inventory movements | Medium | Medium | Medium | Medium | 3 |
| Customer interactions | High | Low | High | High | 4 |
| Financial postings | High | High | Medium | Medium | 2 |
| Returns/refunds | Medium | Medium | Medium | Low | 3 |

### Step 2: Declare Grain
Grain defines what a single row in the fact table represents. The grain must be precise and unambiguous — it is the most important design decision. Every dimension and fact must align exactly with the declared grain.

#### Grain Declaration Examples

| Business Process | Grain Example | Notes |
|---|---|---|
| Sales | One row per line item per order | Most granular, supports all drill paths |
| Sales | One row per order header | Less granular, cannot analyze product mix |
| Inventory | One row per product per day per warehouse | Periodic snapshot grain |
| Customer service | One row per ticket | Transactional grain |
| Web traffic | One row per page view per session | Most granular, high volume |
| Financial | One row per journal entry line | Accounting grain |

#### Grain Declaration Template
"The [fact table name] fact table contains one row per [grain description]. Each row represents [what happened] at [level of detail]. The grain supports drill-down to [lowest level] and roll-up to [highest level]."

Example: "The order_items fact table contains one row per order line item. Each row represents the sale of a product within an order. The grain supports drill-down to individual products within orders and roll-up to daily, weekly, monthly totals by customer, product, store, or promotion."

### Step 3: Identify Dimensions
Dimensions answer who, what, where, when, why, and how of the business process. Each dimension provides the entry point for slicing, dicing, and filtering fact data.

#### Standard Dimension Types

| Dimension | Description | Typical Attributes | Conformed? |
|---|---|---|---|
| Date/Time | Calendar, fiscal periods, time of day | date, day_of_week, month, quarter, year, fiscal_period, holiday_flag | Yes |
| Customer | Customer demographics and attributes | name, segment, region, acquisition_channel, lifetime_value_tier | Yes |
| Product | Product catalog attributes | name, category, brand, manufacturer, price_tier, sku | Yes |
| Store/Channel | Sales channel or physical location | name, region, type, size_tier, manager | Yes |
| Employee | Sales rep, service agent, approver | name, department, manager, territory, role | Maybe |
| Promotion | Marketing campaign or discount | name, type, start_date, end_date, discount_pct, channel | Yes |
| Geography | Location attributes for analysis | country, state, city, postal_code, region, territory | Yes |
| Scenario | Budget vs actual, forecast | scenario_type, version, effective_date | Maybe |

#### Conformed Dimension Design
A dimension is conformed when it has the same meaning, same keys, and same attributes across multiple fact tables. Conformed dimensions enable cross-process analysis (revenue by customer across sales and returns). Design process: identify common dimensions across processes, standardize attribute names and definitions, agree on granularity and SCD strategy, assign single source of truth owner.

#### Date Dimension DDL

```sql
CREATE TABLE dim_date (
    date_key INT PRIMARY KEY,          -- Surrogate key: YYYYMMDD
    full_date DATE NOT NULL UNIQUE,
    year INT NOT NULL,
    quarter INT NOT NULL,              -- 1-4
    month INT NOT NULL,                -- 1-12
    month_name VARCHAR(20) NOT NULL,
    day_of_month INT NOT NULL,
    day_of_week INT NOT NULL,          -- 1=Monday, 7=Sunday
    day_name VARCHAR(20) NOT NULL,
    week_of_year INT NOT NULL,
    fiscal_year INT NOT NULL,
    fiscal_quarter INT NOT NULL,
    is_weekend BOOLEAN NOT NULL,
    is_holiday BOOLEAN NOT NULL,
    holiday_name VARCHAR(100),
    is_current_month BOOLEAN GENERATED ALWAYS AS
        (full_date = DATE_TRUNC('month', CURRENT_DATE)::DATE) STORED
);
```

### Step 4: Identify Facts
Facts are the measurements from the business process at the declared grain.

#### Fact Classifications

| Classification | Definition | Example |
|---|---|---|
| Additive | Summable across all dimensions | Sales amount, quantity sold, cost |
| Semi-additive | Summable across some dimensions | Account balance, inventory count, headcount |
| Non-additive | Cannot be summable across any dimension | Ratio, percentage, unit price, temperature |
| Factless | No measures, tracks event coverage | Product availability, customer attendance |
| Degenerate | Transaction identifier stored in fact | Order number, invoice number, ticket ID |

#### Additive Measure Examples
Summable across all dimensions: revenue, quantity, discount_amount, tax_amount, cost, profit, units_sold, payment_amount. Semi-additive: account_balance (summable across customers not time), inventory_qty (summable across products not time), headcount (summable across depts not time). Non-additive: unit_price = revenue/quantity, profit_margin = profit/revenue (calculate in query), discount_pct.

#### Measure Design Rules
Measures must be numeric, defined at the exact grain, clearly documented (definition, source, calculation), consistent across fact tables, and classified as additive/semi-additive/non-additive. Avoid storing calculated measures that can be derived.

### Step 5: Design Star Schema

#### Star Schema Structure
```
dim_customer ─────────┐
                      │
dim_product ──────────┤   fct_order_items    ┌── dim_date
                      ├──────────────────────┤
dim_store ────────────┤                      └── dim_date (shipped_date)
                      │
dim_promotion ────────┘
```

#### Surrogate Keys in Star Schema
Dimension surrogate keys are meaningless integers (INT or BIGSERIAL) assigned sequentially. Fact table surrogate keys join to dimension surrogate keys. Never use business keys (natural keys) in dimension joins — they are not stable across SCD changes.

```sql
CREATE TABLE dim_customer (
    customer_key BIGSERIAL PRIMARY KEY,
    customer_id VARCHAR(20) NOT NULL,  -- Natural key for tracking
    name VARCHAR(200) NOT NULL,
    email VARCHAR(200),
    segment VARCHAR(50),
    valid_from DATE NOT NULL,
    valid_to DATE,
    is_current BOOLEAN DEFAULT true
);

CREATE TABLE fct_order_items (
    order_number VARCHAR(20),           -- Degenerate dimension
    product_key INT NOT NULL REFERENCES dim_product(product_key),
    customer_key INT NOT NULL REFERENCES dim_customer(customer_key),
    order_date_key INT NOT NULL REFERENCES dim_date(date_key),
    store_key INT NOT NULL REFERENCES dim_store(store_key),
    -- Measures
    quantity INT NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    discount_amount DECIMAL(10,2),
    total_amount DECIMAL(10,2) NOT NULL,
    PRIMARY KEY (order_number, product_key)
);
```

#### Snowflake Schema Exception
Only snowflake when hierarchies exceed 3 levels or dimension tables exceed 50 columns. Example: product → subcategory → category → department. Snowflake in the ETL layer, but BI tools should present the star view.

### Step 6: Apply SCD Strategy

#### SCD Type Reference

| Type | Name | Behavior | Use Case |
|---|---|---|---|
| 0 | Fixed | Attribute never changes | Original creation date, sequential ID |
| 1 | Overwrite | Replace old value with new | Customer email correction, product name fix |
| 2 | Add new row | Create new dimension row with new surrogate key | Customer address change, product category change |
| 3 | Add new column | Store current and previous value in separate columns | Customer segment (previous and current) |
| 4 | Mini-dimension | Rapidly changing attributes moved to separate dimension table | Customer demographics (age, income) |
| 6 | Hybrid | Type 1 + Type 2 + Type 3 combined | Enterprise customer dimension |

#### SCD Decision Tree
```
Does the attribute need full history tracking?
├── Yes → Type 2
│   ├── Track effective dates? → Type 2 with valid_from/valid_to
│   └── Track current and previous only → Type 2 + current_flag
├── No
│   ├── Attribute should never change → Type 0
│   ├── Correction only (no history needed) → Type 1
│   └── Track current and immediate previous → Type 3
└── Attribute changes frequently (daily/weekly)?
    ├── Yes → Type 4 (mini-dimension)
    └── No → Type 2 or Type 1
```

#### Type 2 SCD Implementation

```sql
-- Dimension merge with Type 2 SCD
MERGE INTO dim_customer AS target
USING staging_customer AS source ON target.customer_id = source.customer_id
WHEN MATCHED AND (
    target.name != source.name OR
    target.email != source.email OR
    target.segment != source.segment
) AND target.is_current = true THEN
    UPDATE SET is_current = false, valid_to = CURRENT_DATE - 1
    INSERT DEFAULT VALUES;

INSERT INTO dim_customer (
    customer_id, name, email, segment,
    valid_from, valid_to, is_current
)
SELECT source.customer_id, source.name, source.email, source.segment,
       CURRENT_DATE, NULL, true
FROM staging_customer source
WHERE NOT EXISTS (
    SELECT 1 FROM dim_customer current
    WHERE current.customer_id = source.customer_id
    AND current.is_current = true
    AND current.name = source.name
    AND current.email = source.email
    AND current.segment = source.segment
);
```

### Step 7: Design Fact Tables

#### Transaction Fact
One row per event at a point in time. Most common fact type. Examples: sales transaction, order line item, click event, service call. Characteristics: row per event, sparse (events happen at irregular times), highly additive, can be very large (millions to billions of rows).

#### Periodic Snapshot Fact
One row per regular interval (day, month). Examples: daily account balance, monthly inventory count, weekly headcount. Characteristics: row per time period per entity, dense (every entity every period), additive across entities, smaller than transaction fact.

#### Accumulating Snapshot Fact
One row per process instance with multiple milestones. Examples: order-to-delivery pipeline, claims processing, loan application. Characteristics: row per instance, updated as milestones occur, has multiple date foreign keys, helps analyze process bottlenecks.

#### Fact Table Type Decision

```
What does the business process measure?
├── Events at irregular times → Transaction fact
│   ├── High volume (>1M/day) → Partition by date, aggregate into summary
│   └── Moderate volume → Standard transaction fact
├── Status at regular intervals → Periodic snapshot fact
│   ├── Needs daily view → Daily snapshot
│   └── Needs monthly summary → Monthly snapshot
└── Process duration with milestones → Accumulating snapshot fact
    └── Many milestones (>10) → Consider multiple fact tables
```

#### Fact Table DDL Examples

```sql
-- Transaction fact: sales line items
CREATE TABLE fct_order_items (
    order_number VARCHAR(20) NOT NULL,
    product_key INT NOT NULL REFERENCES dim_product(product_key),
    customer_key INT NOT NULL REFERENCES dim_customer(customer_key),
    order_date_key INT NOT NULL REFERENCES dim_date(date_key),
    ship_date_key INT REFERENCES dim_date(date_key),
    store_key INT NOT NULL REFERENCES dim_store(store_key),
    promotion_key INT REFERENCES dim_promotion(promotion_key),
    quantity INT NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    discount_amount DECIMAL(10,2) DEFAULT 0,
    total_amount DECIMAL(10,2) NOT NULL,
    PRIMARY KEY (order_number, product_key)
) PARTITION BY RANGE (order_date_key);

-- Periodic snapshot: daily inventory
CREATE TABLE fct_inventory_daily (
    product_key INT NOT NULL REFERENCES dim_product(product_key),
    warehouse_key INT NOT NULL REFERENCES dim_warehouse(warehouse_key),
    date_key INT NOT NULL REFERENCES dim_date(date_key),
    quantity_on_hand INT NOT NULL,
    quantity_reserved INT NOT NULL,
    quantity_available INT NOT NULL,
    unit_cost DECIMAL(10,2) NOT NULL,
    PRIMARY KEY (product_key, warehouse_key, date_key)
);

-- Accumulating snapshot: order fulfillment
CREATE TABLE fct_order_fulfillment (
    order_key INT NOT NULL REFERENCES dim_order(order_key),
    customer_key INT NOT NULL REFERENCES dim_customer(customer_key),
    order_date_key INT NOT NULL REFERENCES dim_date(date_key),
    shipped_date_key INT REFERENCES dim_date(date_key),
    delivered_date_key INT REFERENCES dim_date(date_key),
    days_to_ship INT GENERATED ALWAYS AS
        (shipped_date_key - order_date_key) STORED,
    days_to_deliver INT GENERATED ALWAYS AS
        (delivered_date_key - order_date_key) STORED,
    PRIMARY KEY (order_key)
);
```

### Step 8: Consider Data Vault

#### Data Vault 2.0 Components
Hubs: store unique business keys with metadata. Hubs have no foreign keys, no descriptive data; contains surrogate hash key (HK), business key, load date, record source. Links: store relationships between hubs. Contains hub references, load date, record source. Satellites: store descriptive attributes for hubs and links. Contains hub/link reference, load date, source, valid_from/to, all descriptive columns.

```sql
-- Hub: unique business keys
CREATE TABLE hub_customer (
    customer_hk CHAR(32) PRIMARY KEY,  -- MD5 hash of business key
    customer_id VARCHAR(50) NOT NULL UNIQUE,  -- Business key
    load_date TIMESTAMPTZ NOT NULL,
    record_source VARCHAR(100) NOT NULL
);

-- Link: relationships
CREATE TABLE link_customer_order (
    customer_order_hk CHAR(32) PRIMARY KEY,
    customer_hk CHAR(32) NOT NULL REFERENCES hub_customer(customer_hk),
    order_hk CHAR(32) NOT NULL REFERENCES hub_order(order_hk),
    load_date TIMESTAMPTZ NOT NULL,
    record_source VARCHAR(100) NOT NULL
);

-- Satellite: descriptive attributes
CREATE TABLE sat_customer_detail (
    customer_hk CHAR(32) NOT NULL REFERENCES hub_customer(customer_hk),
    load_date TIMESTAMPTZ NOT NULL,
    valid_from TIMESTAMPTZ NOT NULL,
    valid_to TIMESTAMPTZ,
    name VARCHAR(200),
    email VARCHAR(200),
    segment VARCHAR(50),
    record_source VARCHAR(100) NOT NULL,
    PRIMARY KEY (customer_hk, load_date)
);
```

#### Data Vault Pros and Cons
Pros: scalable for enterprise EDW, audit-friendly (source tracking), resilient to source changes (add satellites), parallel loading, handles heterogeneous sources. Cons: complex to query (many joins), requires transformation for BI consumption, overkill for small-medium warehouses, limited tool support.

#### Raw Vault vs Business Vault
Raw Vault: mirrors source data as-is, no business rules, no aggregation, preserves historical accuracy. Business Vault: adds business rules, derived data, reference data, bridging tables. Pattern: load raw vault from sources, then transform to business vault, then to star schema marts.

### Bus Matrix Design

#### Bus Matrix Template
Rows = business processes, Columns = dimensions. Mark each intersection: P (primary), S (secondary), blank (not relevant).

| Business Process | Date | Customer | Product | Store | Employee | Promotion | Geography |
|---|---|---|---|---|---|---|---|
| Sales transactions | P | P | P | P | S | P | S |
| Returns | P | P | P | P | | S | |
| Inventory | P | | P | | | | S |
| Order fulfillment | P | P | | | | | |
| Customer service | P | P | | | S | | |
| Web traffic | P | | P | | | P | S |

The bus matrix shows which dimensions are conformed (appear in multiple processes) and guides development priority (P dimensions first, S dimensions when needed).

### Slowly Changing Dimension Implementation Patterns

#### SCD Type 6 (Hybrid)

```sql
CREATE TABLE dim_customer_scd6 (
    customer_key BIGSERIAL PRIMARY KEY,
    customer_id VARCHAR(20) NOT NULL,
    -- Type 1 behavior (overwrite)
    phone VARCHAR(20),
    email VARCHAR(200),
    -- Type 2 behavior (track history)
    address VARCHAR(500),
    address_valid_from DATE,
    address_valid_to DATE,
    -- Type 3 behavior (track previous)
    current_segment VARCHAR(50),
    previous_segment VARCHAR(50),
    -- Metadata
    is_current BOOLEAN DEFAULT true,
    effective_date DATE NOT NULL,
    expiration_date DATE,
    -- At least one SCD1 attribute (phone) and one SCD2 (address)
    -- plus SCD3 column pair for segment
);
```

#### SCD Type 4 (Mini-Dimension)

```sql
CREATE TABLE dim_customer (
    customer_key BIGSERIAL PRIMARY KEY,
    customer_id VARCHAR(20) NOT NULL,
    name VARCHAR(200),
    mini_dim_key INT REFERENCES dim_customer_demographics(demographic_key),
    -- Stable attributes only
    created_date DATE NOT NULL
);

CREATE TABLE dim_customer_demographics (
    demographic_key BIGSERIAL PRIMARY KEY,
    age_range VARCHAR(20),
    income_bracket VARCHAR(20),
    household_size INT,
    credit_score_range VARCHAR(20),
    -- No tracking needed for SCD4
    -- Mini-dimension is replaced on change
);
```

### Performance Optimization

#### Fact Table Partitioning

```sql
-- Partition by date range for efficient pruning
CREATE TABLE fct_order_items (
    order_number VARCHAR(20) NOT NULL,
    product_key INT NOT NULL,
    customer_key INT NOT NULL,
    order_date_key INT NOT NULL,
    quantity INT NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL
) PARTITION BY RANGE (order_date_key);

-- Create monthly partitions
CREATE TABLE fct_orders_202601 PARTITION OF fct_order_items
    FOR VALUES FROM (20260101) TO (20260201);
CREATE TABLE fct_orders_202602 PARTITION OF fct_order_items
    FOR VALUES FROM (20260201) TO (20260301);
```

#### Aggregates / Summary Tables
Pre-aggregate for common drill paths: daily product sales, weekly store sales, monthly regional sales. Benefits: faster queries for common patterns, reduces load on large fact tables. Costs: storage overhead, ETL complexity, must refresh on source data changes.

```sql
-- Summary table: daily product sales
CREATE TABLE agg_daily_product_sales (
    date_key INT NOT NULL REFERENCES dim_date(date_key),
    product_key INT NOT NULL REFERENCES dim_product(product_key),
    total_quantity INT NOT NULL,
    total_revenue DECIMAL(14,2) NOT NULL,
    transaction_count INT NOT NULL,
    PRIMARY KEY (date_key, product_key)
);
```

#### Bitmap Indexes
Use bitmap indexes on low-cardinality dimension columns in data warehouse databases that support them (Oracle, PostgreSQL with extensions). Efficient for: columns with few distinct values (gender, status, region), columns used in WHERE clauses, columns used in GROUP BY. Not for: high-cardinality columns, OLTP workloads with frequent updates.

### Common Anti-Patterns

#### Missing Grain Declaration
Symptom: fact table has ambiguous rows — stakeholders disagree on what each row means. Fix: document grain before designing dimensions and facts. Write it in one sentence.

#### Overloaded Fact Table
Symptom: fact table contains facts at different grains (order header and line item in same table). Fix: separate into multiple fact tables, one per grain.

#### Ragged Hierarchies in Dimension
Symptom: variable depth hierarchy in a single table (org chart with varying levels). Fix: bridge table for ragged hierarchies, or fixed-level approach with maximum depth.

#### Too Many Dimensions in One Fact
Symptom: fact table with 30+ dimension keys. Fix: review necessity of each dimension, consider splitting fact table, merge related dimensions.

#### Snowflaking Everything
Symptom: every dimension normalized into 5-10 tables. Fix: denormalize into single dimension table unless hierarchy>3 levels or table>50 columns.

## Rules
- Declare grain before designing dimensions or facts — everything follows from grain
- Conformed dimensions are non-negotiable for cross-process analysis
- Surrogate keys always, never use business keys in dimension joins
- Type 2 SCD for any attribute where historical reporting matters
- Facts must match the declared grain exactly
- Degenerate dimensions for transaction identifiers only
- Data Vault for enterprise EDW; star schema for presentation layer
- Snowflake dimensions only when hierarchies exceed 3 levels
- Test grain by querying: can I aggregate to the right level?
- Partition fact tables by date for manageability
- Pre-aggregate common drill paths for performance
- Bus matrix must be reviewed with business stakeholders
- Document every design decision in an ADR (Architecture Decision Record)

## References
  - references/data-vault.md — Data Vault 2.0 Reference
  - references/dimensional-modeling-etl.md — Dimensional Modeling ETL
  - references/dimensional-modeling-performance.md — Dimensional Modeling Performance
  - references/fact-table-design.md — Fact Table Design Reference
  - references/kimball-methodology.md — Kimball Methodology Reference
  - references/scd-types.md — Slowly Changing Dimensions Reference
  - references/star-schema.md — Star Schema Design Reference
## Handoff
`data-etl-pipeline` for ETL/ELT implementation of dimensional models
`data-data-warehouse` for warehouse platform-specific optimizations
`data-data-quality` for dimension and fact quality monitoring
