# Schema Testing Reference

## Schema Validation

Schema testing ensures data conforms to expected structure and types.

### dbt Schema Tests

```yaml
# models/schema.yml
version: 2

models:
  - name: stg_orders
    description: "Staged orders from source system"
    columns:
      - name: order_id
        tests:
          - unique
          - not_null
      - name: customer_id
        tests:
          - not_null
          - relationships:
              to: ref('stg_customers')
              field: customer_id
      - name: order_date
        tests:
          - not_null
          - dbt_expectations.expect_column_values_to_be_of_type:
              column_type: date
      - name: amount
        tests:
          - not_null
          - dbt_expectations.expect_column_values_to_be_between:
              min_value: 0
              max_value: 100000
      - name: status
        tests:
          - not_null
          - accepted_values:
              values: ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled']
      - name: email
        tests:
          - dbt_expectations.expect_column_value_lengths_to_be_between:
              min_value: 5
              max_value: 255
          - dbt_expectations.expect_column_values_to_match_regex:
              regex: "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$"
```

### SodaCL Schema Checks

```yaml
# soda/checks/schema_checks.yml
checks for orders:
  - schema:
      name: Order schema validation
      warn:
        when required column missing: []
        when wrong column type:
          order_id: int
          customer_id: int
          order_date: date
          amount: decimal
          status: varchar(50)
      fail:
        when forbidden column present:
          - internal_notes
          - debug_info
        when column not in:
          - order_id
          - customer_id
          - order_date
          - amount
          - status
          - discount
          - created_at

  - schema:
      name: Required columns check
      fail:
        when required column missing:
          - order_id
          - customer_id
          - amount
```

## Column Type Checks

### Data Type Validation

```sql
-- Manual type validation queries
SELECT
    'order_id' AS column_name,
    CASE
        WHEN COUNT(*) = COUNT(TRY_CAST(order_id AS BIGINT)) THEN 'valid'
        ELSE 'invalid'
    END AS type_check
FROM staging.orders
UNION ALL
SELECT
    'amount',
    CASE
        WHEN COUNT(*) = COUNT(TRY_CAST(amount AS DECIMAL(10,2))) THEN 'valid'
        ELSE 'invalid'
    END
FROM staging.orders
UNION ALL
SELECT
    'order_date',
    CASE
        WHEN COUNT(*) = COUNT(TRY_CAST(order_date AS DATE)) THEN 'valid'
        ELSE 'invalid'
    END
FROM staging.orders;

-- Find rows with type violations
SELECT order_id, customer_id, amount
FROM staging.orders
WHERE TRY_CAST(amount AS DECIMAL(10,2)) IS NULL
  AND amount IS NOT NULL;
```

### Automated Type Validation

```python
class SchemaValidator:
    """Validate column types against expected schema."""

    def __init__(self, warehouse_conn: str):
        self.conn = warehouse_conn

    def validate_column_type(
        self,
        table: str,
        column: str,
        expected_type: str
    ) -> dict:
        """Validate that a column matches the expected data type."""
        # Get actual column type from INFORMATION_SCHEMA
        actual_type = self._get_column_type(table, column)

        if actual_type.lower() == expected_type.lower():
            return {
                'column': column,
                'expected': expected_type,
                'actual': actual_type,
                'passed': True
            }

        # Try coercion test: can all values be cast?
        coercion_test = self._test_coercion(table, column, expected_type)

        return {
            'column': column,
            'expected': expected_type,
            'actual': actual_type,
            'passed': coercion_test['success_rate'] >= 0.99,
            'coercion_rate': coercion_test['success_rate']
        }

    def _test_coercion(self, table: str, column: str, target_type: str) -> dict:
        """Test if column values can be coerced to target type."""
        query = f"""
        WITH data AS (
            SELECT {column} AS val FROM {table}
        ),
        coercion AS (
            SELECT
                CASE
                    WHEN {column} IS NULL THEN NULL
                    WHEN TRY_CAST({column} AS {target_type}) IS NOT NULL THEN TRUE
                    ELSE FALSE
                END AS is_valid
            FROM data
        )
        SELECT
            COUNT(*) AS total,
            SUM(CASE WHEN is_valid = TRUE THEN 1 ELSE 0 END) AS valid,
            SUM(CASE WHEN is_valid = FALSE THEN 1 ELSE 0 END) AS invalid
        FROM coercion
        """
        result = self.conn.execute(query).fetchone()
        return {
            'total': result['total'],
            'valid': result['valid'],
            'invalid': result['invalid'],
            'success_rate': result['valid'] / result['total'] if result['total'] > 0 else 1.0
        }
```

## Nullability Checks

### Null Validation Tests

```sql
-- Primary key null check (critical failure)
SELECT 'FAIL' AS status, COUNT(*) AS null_count
FROM staging.orders
WHERE order_id IS NULL;

-- Null rate check per column
SELECT
    'customer_id' AS column,
    SUM(CASE WHEN customer_id IS NULL THEN 1 ELSE 0 END) AS null_count,
    ROUND(AVG(CASE WHEN customer_id IS NULL THEN 1.0 ELSE 0.0 END) * 100, 2) AS null_pct
FROM staging.orders
UNION ALL
SELECT
    'email',
    SUM(CASE WHEN email IS NULL THEN 1 ELSE 0 END),
    ROUND(AVG(CASE WHEN email IS NULL THEN 1.0 ELSE 0.0 END) * 100, 2)
FROM staging.customers;

-- Conditional null check: field should be null only when status allows
SELECT order_id, status, shipped_date
FROM staging.orders
WHERE status = 'pending'
  AND shipped_date IS NOT NULL;  -- shipped_date should be null for pending orders
```

### dbt Nullability Tests

```sql
-- tests/generic/test_not_null_conditional.sql
{% test not_null_conditional(model, column_name, condition_column, condition_value) %}
SELECT *
FROM {{ model }}
WHERE {{ condition_column }} = '{{ condition_value }}'
  AND {{ column_name }} IS NULL
{% endtest %}

-- Usage in schema.yml:
-- - name: shipped_date
--   tests:
--     - not_null_conditional:
--         condition_column: status
--         condition_value: shipped
```

## Uniqueness Checks

### Composite Uniqueness Validation

```sql
-- Single column uniqueness
SELECT customer_id, COUNT(*) AS dup_count
FROM staging.customers
GROUP BY customer_id
HAVING COUNT(*) > 1;

-- Composite uniqueness
SELECT order_id, product_id, COUNT(*) AS dup_count
FROM staging.order_items
GROUP BY order_id, product_id
HAVING COUNT(*) > 1;

-- Window function for detailed duplicates
SELECT *
FROM (
    SELECT *,
        ROW_NUMBER() OVER (
            PARTITION BY order_id, product_id
            ORDER BY etl_loaded_at DESC
        ) AS rn
    FROM staging.order_items
) dups
WHERE dups.rn > 1;
```

### dbt Uniqueness Tests

```yaml
# Custom uniqueness tests
tests:
  stg_orders:
    - name: order_id_unique
      type: unique
      config:
        where: "order_date >= '2026-01-01'"
        severity: error
    - name: composite_unique
      type: unique_combination_of_columns
      config:
        columns:
          - order_id
          - line_item_id
        severity: warn
```

## Referential Integrity

### Foreign Key Validation

```sql
-- Find orphan records in fact table
SELECT DISTINCT o.customer_id
FROM staging.orders o
LEFT JOIN staging.customers c ON o.customer_id = c.customer_id
WHERE c.customer_id IS NULL;

-- Orphan rate
SELECT
    ROUND(
        COUNT(DISTINCT CASE WHEN c.customer_id IS NULL THEN o.customer_id END) * 100.0
        / NULLIF(COUNT(DISTINCT o.customer_id), 0),
        2
    ) AS orphan_pct
FROM staging.orders o
LEFT JOIN staging.customers c ON o.customer_id = c.customer_id;

-- Referential integrity by partition
SELECT
    o.order_date,
    COUNT(DISTINCT o.customer_id) AS total_customers,
    COUNT(DISTINCT CASE WHEN c.customer_id IS NULL THEN o.customer_id END) AS orphan_customers
FROM staging.orders o
LEFT JOIN staging.customers c ON o.customer_id = c.customer_id
WHERE o.order_date >= CURRENT_DATE - 7
GROUP BY o.order_date;
```

## Custom Schema Checks

### Advanced Schema Validation

```python
class CustomSchemaCheck:
    """Custom schema validation beyond basic type/null/unique checks."""

    def check_column_pattern(self, table: str, column: str, pattern: str) -> dict:
        """Validate column values match a regex pattern."""
        query = f"""
        SELECT
            COUNT(*) AS total,
            SUM(CASE WHEN {column} REGEXP '{pattern}' THEN 0 ELSE 1 END) AS violations
        FROM {table}
        """
        result = self.conn.execute(query).fetchone()
        return {
            'table': table,
            'column': column,
            'check': 'pattern',
            'total': result['total'],
            'violations': result['violations'],
            'passed': result['violations'] == 0
        }

    def check_column_range(self, table: str, column: str, min_val, max_val) -> dict:
        """Validate column values are within a numeric range."""
        query = f"""
        SELECT
            COUNT(*) AS total,
            SUM(CASE WHEN {column} < {min_val} OR {column} > {max_val} THEN 1 ELSE 0 END) AS violations
        FROM {table}
        WHERE {column} IS NOT NULL
        """
        result = self.conn.execute(query).fetchone()
        return {
            'table': table,
            'column': column,
            'check': 'range',
            'min': min_val,
            'max': max_val,
            'total': result['total'],
            'violations': result['violations'],
            'passed': result['violations'] == 0
        }

    def check_consistent_hashing(self, table: str, id_column: str, hash_column: str) -> dict:
        """Validate that hashed columns are consistent with their source IDs."""
        query = f"""
        SELECT COUNT(*) AS mismatches
        FROM {table}
        WHERE {hash_column} != SHA2({id_column}, 256)
        """
        result = self.conn.execute(query).fetchone()
        return {
            'table': table,
            'check': 'consistent_hashing',
            'mismatches': result['mismatches'],
            'passed': result['mismatches'] == 0
        }
```

### Schema Change Detection

```python
class SchemaChangeDetector:
    """Detect schema changes between environments."""

    def compare_schemas(self, env_a: str, env_b: str, tables: list[str]) -> list[dict]:
        """Compare schemas between two environments."""
        changes = []
        for table in tables:
            schema_a = self._get_schema(env_a, table)
            schema_b = self._get_schema(env_b, table)

            for col_a, col_b in zip(schema_a, schema_b):
                if col_a['name'] != col_b['name']:
                    changes.append({
                        'type': 'column_renamed',
                        'table': table,
                        'old_name': col_a['name'],
                        'new_name': col_b['name']
                    })
                elif col_a['type'] != col_b['type']:
                    changes.append({
                        'type': 'type_changed',
                        'table': table,
                        'column': col_a['name'],
                        'old_type': col_a['type'],
                        'new_type': col_b['type']
                    })

            # Added columns
            a_names = {c['name'] for c in schema_a}
            for col in schema_b:
                if col['name'] not in a_names:
                    changes.append({
                        'type': 'column_added',
                        'table': table,
                        'column': col['name'],
                        'type': col['type']
                    })

        return changes
```

## Rules
- Every table must have schema validation (column names, types, nullability)
- Primary key columns must have unique + not_null tests in CI
- All foreign key relationships must have referential integrity checks
- Null rate thresholds per column based on business requirements
- Type coercion tests catch schema drift before breaking consumers
- Custom regex patterns validate domain-specific formats (email, phone, ZIP)
- Schema change detection runs on every deployment to alert on drift
- Composite uniqueness tests for multi-column natural keys
- Use dbt_expectations package for advanced schema tests
- Document all schema tests with expected behavior and thresholds
