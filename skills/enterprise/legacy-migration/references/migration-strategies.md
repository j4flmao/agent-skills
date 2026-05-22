# Migration Strategies

## Strategy Comparison

| Strategy | Risk | Speed | Cost | Testing Need | Rollback |
|----------|------|-------|------|--------------|----------|
| Strangler Fig | Lowest | Slowest | High | Medium | Instant |
| Parallel Run | Low | Medium | Highest | High | Instant |
| Big Bang | Highest | Fastest | Low | Very High | Difficult |
| Lift and Shift | Low | Fast | Medium | Low | Medium |

## Strangler Fig Pattern

### When to Use
- Large monolith (>100k LOC)
- High business criticality
- Low tolerance for downtime
- Team can sustain long migration
- Multiple independent modules

### Routing Strategy
```
Request → API Gateway → Feature Flag Service
                         ↓          ↓
                    New Service   Legacy Service
                    (if flag on)  (if flag off)
```

### Cutover Process
1. Route 1% of users to new implementation
2. Monitor for 24h on error rate, latency, business metrics
3. Ramp to 5%, 10%, 25%, 50%, 75%, 100%
4. Each ramp step requires monitoring window
5. Auto-rollback if error rate spike > 2x baseline

## Parallel Run Strategy

### When to Use
- Financial systems requiring perfect accuracy
- Highly regulated industries
- Data must be exactly right
- High operational cost acceptable

### Dual-Write Implementation
```python
def process_order(order_data):
    # Write to both systems within transaction
    legacy_id = legacy_api.create_order(order_data)
    new_id = new_api.create_order(order_data)

    # Store mapping for reconciliation
    mapping_store.save({
        "legacy_id": legacy_id,
        "new_id": new_id,
        "timestamp": now()
    })

    # Compare responses
    if legacy_id != new_id:
        reconciliation_alert({
            "type": "id_mismatch",
            "legacy_id": legacy_id,
            "new_id": new_id,
            "payload_hash": hash(order_data)
        })
```

## Big Bang Strategy

### When to Use
- Small system with good test coverage
- Can afford scheduled downtime
- Simple data model
- Strong CI/CD and rollback automation

### Cutover Checklist
```yaml
cutover:
  pre_checks:
    - test_suite_pass: true
    - staging_smoke_test: pass
    - rollback_script_tested: true
    - data_sync_verified: true
  steps:
    - stop_writes_to_legacy
    - final_data_sync
    - data_reconciliation
    - dns_switch
    - validate_new_system_traffic
    - rollback_ready_standby
```

## Lift and Shift

### When to Use
- Immediate cloud migration needed
- No time for refactoring
- Quick win before modernization
- Moving from DC to cloud

### Approach
1. Replicate environment in cloud
2. Test equivalently
3. DNS cutover
4. Decommission on-prem
5. Begin refactoring post-migration
