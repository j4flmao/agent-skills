# Legacy Migration Patterns

## Migration Strategy Overview

| Pattern | Risk | Duration | Complexity | Cost | Rollback |
|---------|------|----------|------------|------|----------|
| Strangler Fig | Low | Long (months-years) | Medium | Medium | Instant |
| Branch by Abstraction | Low-Medium | Medium (weeks-months) | High | Medium | Instant |
| Parallel Run | Medium | Medium (weeks) | High | High | Safe |
| Big Bang | High | Short (days-weeks) | Low-Medium | Low | Difficult |
| Database-Only | Medium | Varies | High | Varies | Difficult |

## Strangler Fig Pattern

The Strangler Fig incrementally replaces legacy system functionality while keeping both systems operational. New functionality routes to the new system; old routes remain in the legacy system.

### Implementation Steps
```
1. Identify bounded contexts and service boundaries
2. Build anti-corruption layer (ACL) between old and new
3. Add routing logic to redirect specific calls to new system
4. Redirect one route at a time, starting with low-risk routes
5. Verify each redirected route independently
6. Decommission replaced legacy routes incrementally
7. Shut down legacy system when all routes are migrated
```

### Routing Strategies
```
Route by feature:
  /api/users/* → new user service
  /api/orders/* → legacy monolith
  
Route by customer:
  early-adopters → new system
  standard → legacy system
  
Route by data:
  new accounts → new system
  existing accounts → legacy with sync
```

### Anti-Corruption Layer Design
```python
# ACL translating legacy domain model to new domain model
class LegacyOrderAdapter:
    def get_order(self, order_id):
        legacy_order = legacy_client.fetch_order(order_id)
        return NewOrderModel(
            id=legacy_order.id,
            customer_id=legacy_order.customer_id,
            line_items=[
                LineItem(
                    sku=item.product_code,
                    quantity=item.qty,
                    price=Decimal(item.unit_price)
                )
                for item in legacy_order.items
            ],
            status=self._translate_status(legacy_order.state),
            created_at=parser.parse(legacy_order.created_date)
        )

    def _translate_status(self, legacy_state):
        mapping = {
            "P": "pending",
            "A": "approved",
            "S": "shipped",
            "C": "cancelled"
        }
        return mapping.get(legacy_state, "unknown")
```

## Branch by Abstraction

This pattern creates an abstraction layer between consumers and implementation, allowing the implementation to be swapped without changing consumer code.

### Process
```
1. Identify the component or service to be replaced
2. Define the target interface (abstraction)
3. Build the abstraction wrapping the existing implementation
4. Switch all consumers to use the abstraction
5. Implement the new system behind the same abstraction
6. Switch the abstraction to use new implementation
7. Remove the old implementation and abstraction if no longer needed
```

### Abstractions for Common Migration Scenarios
```
Data access: Repository pattern (swap from SQL to NoSQL, or DB vendor)
Message publishing: Publisher interface (swap from SQS to Kafka)
External API: Gateway/Proxy layer (swap from legacy API to new API)
Search: SearchProvider interface (swap from Elastic to Meilisearch)
Authentication: AuthProvider (swap from custom auth to OIDC)
```

## Parallel Run Pattern

Run both old and new systems simultaneously, compare outputs to validate correctness before cutover.

### Dual-Write Strategy
```
1. Route write operations to both systems
2. Read from legacy system (source of truth)
3. Compare outputs of both systems nightly
4. Resolve discrepancies with manual reconciliation
5. After confidence period, switch reads to new system
6. Maintain legacy read-only for fallback
```

### Verification Checks
```
Count comparison: row counts match between systems
Sum comparison: aggregates match (revenue, order count)
Value comparison: specific records match field by field
Timestamp comparison: data freshness within acceptable window
```

### Discrepancy Resolution
```
| Discrepancy Type | Automated? | Resolution |
|-----------------|------------|------------|
| Missing record | Yes | Re-run sync |
| Value mismatch | Partial | Flag for review |
| Extra record | Yes | Remove from new system |
| Timing difference | Yes | Adjust sync window |
| Schema mismatch | No | Manual remediation |
```

## Big Bang Migration

Switch all traffic from legacy to new system at a single point in time.

### When Big Bang Is Acceptable
```
- No reasonable incremental path exists
- Legacy system cannot coexist (schema lock, hardware decommission)
- Small system with well-understood scope
- Acceptable downtime exists
- Comprehensive test coverage in place
```

### Cutover Runbook Template
```
T-2 weeks: Complete staging validation
T-1 week: Final data sync, performance baseline
T-48 hours: Communication to stakeholders
T-24 hours: Final test pass
T-6 hours: Start final sync, stop writes to legacy
T-2 hours: Migrate data, validate completeness
T-1 hour: Deploy new system, route traffic
T-0: Go live, begin monitoring

Rollback triggers (any = abort):
- Error rate >5% after 15 minutes
- p99 latency >2x baseline
- Data discrepancy >0.1%
- Any P0 incident
```

## Data Migration Strategies

### ETL Migration Pipeline
```
Extract:
- Full export of legacy data
- Chunked by 100K rows
- Checksum per chunk

Transform:
- Schema mapping
- Data type conversion
- ID remapping
- Business logic application
- Validation rules

Load:
- Batch insert with transaction per chunk
- Idempotent (retry-safe)
- Audit log per batch
- Failure: rollback batch, alert, retry
```

### Data Validation Suite
```
Migration validation checks:
1. Row count parity (source vs target ±0%)
2. Column sum parity for numeric fields
3. Foreign key integrity (no orphaned records)
4. Unique constraint validation
5. Data type and format conformance
6. Date range sanity checks
7. Null percentage comparison
```

## Testing Strategies for Migration

### Test Types
```
Integration tests: End-to-end flow through both systems
Reconciliation tests: Automated comparison of outputs
Performance tests: Latency and throughput parity
Rollback tests: Verify rollback procedure works
Chaos tests: Test failure modes and error handling
Smoke tests: Critical path validation after cutover
```

### Testing Cadence
```
Continuous (CI/CD): Integration tests for both systems
Daily: Automated reconciliation checks
Weekly: Performance benchmarking
Per release: Rollback test in staging
Per quarter: Full chaos testing
```

### Rollback Plan Template
```
Rollback Triggers:
- Error rate >5%
- p99 latency >2s
- Data loss detected
- Revenue-impacting bug

Rollback Steps:
1. Stop traffic to new system
2. Route all traffic back to legacy
3. Run data reconciliation (reverse sync)
4. Verify legacy system health
5. Notify stakeholders of rollback status
6. Schedule post-mortem within 24 hours

Rollback Window: 30 minutes max
Rollback Validation: All critical paths green
```
