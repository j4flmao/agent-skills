# Data Quality Dimensions

## Completeness

### Definition
Percentage of non-null, non-empty values for required columns. Missing data indicates gaps in collection or processing failures. Measure per column and overall table.

### Measurement
```sql
SELECT
    COUNT(*) AS total_rows,
    COUNT(customer_id) AS customer_id_present,
    COUNT(email) AS email_present,
    COUNT(phone) AS phone_present,
    ROUND(COUNT(email) * 100.0 / COUNT(*), 2) AS email_completeness_pct,
    ROUND(COUNT(phone) * 100.0 / COUNT(*), 2) AS phone_completeness_pct
FROM customers;
```

### Thresholds
Critical: 100% for primary keys, foreign keys, NOT NULL columns. High: >99% for business-required fields (email, order amount). Medium: >95% for optional important fields (phone, address). Low: no threshold for optional fields.

### Remediation
Missing critical data: block pipeline, alert producer, investigate source system. Missing optional data: report in quality dashboard, no pipeline impact. Pattern: add default values, fallback logic (use email for missing phone), or source-side validation.

## Accuracy

### Definition
Values correctly represent real-world facts. Verified against trusted sources, cross-references, or validation rules.

### Measurement
```sql
SELECT
    COUNT(*) AS total_orders,
    SUM(CASE WHEN ABS(o.total - li.total) > 0.01 THEN 1 ELSE 0 END) AS inaccurate_orders,
    ROUND(AVG(CASE WHEN ABS(o.total - li.total) > 0.01 THEN 1 ELSE 0 END) * 100, 2) AS inaccuracy_rate
FROM orders o
JOIN (
    SELECT order_id, SUM(quantity * unit_price) AS total
    FROM order_line_items GROUP BY order_id
) li ON o.order_id = li.order_id;
```

### Validation Techniques
Cross-reference between related tables (order total = sum of line items). Range validation (age 0-150, price > 0). Pattern matching (email regex, phone format, ZIP+4). Business rule validation (discount <= 100%, ship_date >= order_date, end_date > start_date).

## Consistency

### Definition
Data values are the same across different systems, tables, and time periods. No contradictions or discrepancies between sources of truth.

### Measurement
```sql
SELECT 'CRM' AS source, COUNT(*) AS customer_count FROM crm.customers
UNION ALL
SELECT 'BILLING', COUNT(*) FROM billing.customers
UNION ALL
SELECT 'DIFFERENCE', ABS(
    (SELECT COUNT(*) FROM crm.customers) -
    (SELECT COUNT(*) FROM billing.customers)
);
```

### Common Inconsistencies
Same customer, different name/email between systems. Order exists in source but not replicated to warehouse. Date format varies (UTC vs local, ISO vs US). Currency amounts without consistent conversion rate. Status values don't match across systems (CRM says active, billing says cancelled).

## Timeliness

### Definition
Data is available within the expected time window from real-world event to data availability. Freshness SLA per table.

### Measurement
```sql
SELECT
    MAX(created_at) AS latest_record,
    CURRENT_TIMESTAMP - MAX(created_at) AS age,
    CASE
        WHEN CURRENT_TIMESTAMP - MAX(created_at) < INTERVAL '1 hour' THEN 'ON_TIME'
        WHEN CURRENT_TIMESTAMP - MAX(created_at) < INTERVAL '6 hours' THEN 'LATE'
        ELSE 'OVERDUE'
    END AS freshness_status
FROM orders;
```

### SLAs
Critical: data available within 5 minutes of event (real-time dashboards, fraud detection). High: within 1 hour (operational reports, customer-facing metrics). Medium: end of day — by 6am next day (executive dashboards). Low: within 48 hours (analytical models, batch processing).

## Uniqueness

### Definition
No duplicate records for defined unique key constraints. Duplicates cause double-counting in aggregations and inaccurate metrics.

### Measurement
```sql
SELECT
    COUNT(*) AS total_rows,
    COUNT(DISTINCT order_id) AS unique_orders,
    COUNT(*) - COUNT(DISTINCT order_id) AS duplicate_count,
    ROUND((COUNT(*) - COUNT(DISTINCT order_id)) * 100.0 / COUNT(*), 4) AS duplicate_rate
FROM orders;
```

### Thresholds
Primary key: 0% duplicate rate. Business key (customer email, order number): <0.01% (allow for race conditions). Logical duplicates (same customer with slight name variation): investigate if >0.1%.

## Integrity

### Definition
Referential integrity: every foreign key value exists in the referenced parent table. No orphan records or dangling references.

### Measurement
```sql
SELECT COUNT(*) AS orphan_orders
FROM fct_orders o
LEFT JOIN dim_customers c ON o.customer_id = c.customer_id
WHERE c.customer_id IS NULL;
```

## Validity

### Definition
Values conform to expected format, type, and domain constraints.

### Checks
Data type: integer column contains only integers. Format: email contains @ and domain. Domain: status IN ('active', 'inactive', 'churned'). Range: age BETWEEN 0 AND 150. Referential: foreign key exists in parent table.

## Quality Scoring

### Weighted Composite Score
```python
score = (
    completeness_weight * completeness_score +
    accuracy_weight * accuracy_score +
    consistency_weight * consistency_score +
    timeliness_weight * timeliness_score +
    uniqueness_weight * uniqueness_score +
    validity_weight * validity_score
) / sum(weights)
```
Default weights: completeness (20%), accuracy (25%), consistency (15%), timeliness (15%), uniqueness (10%), validity (15%). Adjust weights per table based on business criticality — accuracy matters more for financial data, timeliness more for real-time dashboards.

### Grading
A (95-100%): excellent, no action needed. B (85-94%): good, minor issues, monitor. C (70-84%): fair, needs attention, create improvement plan. D (<70%): poor, immediate action required, block downstream consumption.
