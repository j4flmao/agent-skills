# Testing Legacy Migrations

## Testing Strategy

### Test Levels
```
Unit: Individual migration components (transformers, mappers)
Integration: Data flow between source and target
System: End-to-end migration run
Performance: Data volume and speed benchmarks
User Acceptance: Business validation of migrated data
```

### Test Types by Migration Phase
| Phase | Tests | Success Criteria |
|-------|-------|-----------------|
| Pre-migration | Schema compatibility, data profiling | No incompatible types |
| Migration | Data transfer, transformation logic | 100% row count match |
| Post-migration | Data integrity, application functionality | All queries return correct results |
| Cutover | Rollback, dual-read comparison | <0.1% data discrepancy |

## Data Validation

### Row Count Verification
```sql
-- Source
SELECT COUNT(*) FROM source.orders WHERE date >= '2026-01-01';
-- Target
SELECT COUNT(*) FROM target.orders WHERE date >= '2026-01-01';
-- Must match exactly
```

### Checksum Comparison
```sql
-- Source checksum
SELECT COUNT(*), SUM(CAST(MD5(CAST(ROW(order_id, total, status) AS text)) AS BIT(32))::int)
FROM source.orders;

-- Target checksum  
SELECT COUNT(*), SUM(CAST(MD5(CAST(ROW(order_id, total, status) AS text)) AS BIT(32))::int)
FROM target.orders;
```

### Sampling Verification
```python
def verify_sample(source_conn, target_conn, table, sample_pct=5):
    source = source_conn.execute(f"SELECT * FROM {table} TABLESAMPLE SYSTEM({sample_pct})")
    target = target_conn.execute(f"SELECT * FROM {table} TABLESAMPLE SYSTEM({sample_pct})")
    
    # Compare row by row
    for s_row, t_row in zip(source, target):
        for col in s_row.keys():
            if normalize(s_row[col]) != normalize(t_row[col]):
                return {"match": False, "column": col, "source": s_row[col], "target": t_row[col]}
    return {"match": True}
```

## Smoke Tests

### Application Health Checks
```
1. Can users log in? (auth flow)
2. Can users see their data? (read path)
3. Can users create new records? (write path)
4. Can users search? (search/index)
5. Do reports render with correct data? (analytics)
6. Do integrations receive expected data? (webhooks, exports)
```

## Rollback Testing

### Rollback Scenarios
```yaml
rollback_tests:
  - scenario: "Data migration fails mid-way"
    test: "Kill migration process, verify source data intact"
    expected: "Source data unchanged, partial target data cleaned up"
  
  - scenario: "Application broken on new system"
    test: "Switch DNS back to old system"
    expected: "Old system serves traffic within 5 minutes"
  
  - scenario: "Data integrity issue found post-migration"
    test: "Restore from pre-migration backup"
    expected: "Data restored to exact pre-migration state"
```

## Performance Testing

### Benchmarks
| Metric | Pre-Migration | Post-Migration | Threshold |
|--------|---------------|----------------|-----------|
| Query P50 | 50ms | 50ms | +20% |
| Query P95 | 200ms | 200ms | +30% |
| Write P50 | 30ms | 30ms | +20% |
| Bulk load | 1M rows/min | 1M rows/min | -10% |
| Index build | 10 min | 10 min | +50% |

## UAT (User Acceptance Testing)

### Test Cases
```
Core Flow: Create, read, update, delete on each entity type
Search: Find records by various criteria
Reports: Generate standard reports with correct numbers
Integrations: Data flows to connected systems
Permissions: Access control works correctly
```

### Sign-off Criteria
- [ ] All P0 test cases pass (100%)
- [ ] P1 test cases pass (>=95%)
- [ ] No data loss detected (row count, checksum)
- [ ] Performance within threshold
- [ ] Rollback tested and working
- [ ] Business stakeholders signed off
