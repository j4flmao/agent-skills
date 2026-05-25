# Migration Testing

## Testing Strategies

| Phase | Test Type | Focus |
|-------|-----------|-------|
| Pre-migration | Unit tests | App logic unchanged |
| Pre-migration | Integration tests | API contracts preserved |
| During migration | Smoke tests | Core functionality |
| Post-migration | Performance tests | Baseline comparison |
| Post-migration | Security tests | Vulnerability scan |
| Post-migration | DR tests | Failover validation |

## Cutover Planning

```
T-4 weeks: Finalize cutover plan
T-2 weeks: Dry run 1 (full rehearsal)
T-1 week:  Dry run 2 (with rollback)
T-24h:     Final data sync
T-0:       Cutover execution
T+1h:      Smoke tests pass
T+4h:      Monitoring confirms stability
T+24h:     Rollback window closes
```

### Rollback Decision Matrix

| Condition | Action |
|-----------|--------|
| Smoke tests fail | Rollback immediately |
| Error rate > 1% | Rollback within 30 min |
| Latency > 2x baseline | Rollback or investigate |
| Data integrity check fails | Rollback immediately |
| Security scan critical | Rollback, fix vulnerability |
| Performance acceptable | Proceed to monitoring phase |

## Rollback Testing

```python
class RollbackTester:
    def verify_rollback(self, migration_state):
        checks = {
            "database_integrity": self.check_db_consistency(),
            "data_sync_status": self.check_sync_status(),
            "application_state": self.check_app_state(),
            "monitoring_coverage": self.check_monitoring(),
        }
        failures = [k for k, v in checks.items() if not v]
        return {
            "rollback_ready": len(failures) == 0,
            "failures": failures,
            "estimated_rollback_time": self.estimate_time(failures)
        }

    def estimate_time(self, failures):
        base = 30  # base 30 min rollback
        penalties = {"database_integrity": 60, "data_sync_status": 30}
        return base + sum(penalties.get(f, 15) for f in failures)
```

## Validation Checklist

| Check | Method | Success Criteria |
|-------|--------|-----------------|
| Functional parity | E2E test suite | All tests pass |
| Data integrity | Row count + checksum | 100% match |
| Latency | Synthetic transactions | Within 10% of baseline |
| Throughput | Load test | >= baseline capacity |
| Error rates | Monitoring | < 0.1% error rate |
| Backup restore | Full restore drill | RTO met, RPO verified |
| Security | Vulnerability scan | No critical findings |

## Load Testing for Migration

| Test | Target | Duration | Success Criteria |
|------|--------|----------|-----------------|
| Baseline | Current system | 1 hour | Record metrics |
| Light load | 50% baseline traffic | 30 min | < 10% degradation |
| Peak load | 2x expected peak | 30 min | No errors, < 20% degradation |
| Stress | 5x peak | 5 min | Graceful degradation |
| Soak | Normal traffic | 4 hours | No memory leak |

## Parallel Run Strategy

| Phase | Old System | New System | Duration |
|-------|-----------|------------|----------|
| Shadow mode | Full production | Reads traffic, no response | 1 week |
| Mirrored mode | Full production | Reads + writes to shadow DB | 1 week |
| Canary mode | 90% traffic | 10% traffic with monitoring | 1 week |
| Full cutover | 0% traffic | 100% traffic | N/A |

### Data Sync Verification
```python
class DataSyncVerifier:
    def compare_tables(self, source_db, target_db, tables):
        mismatches = []
        for table in tables:
            source_count = source_db.query(f"SELECT COUNT(*) FROM {table}").scalar()
            target_count = target_db.query(f"SELECT COUNT(*) FROM {table}").scalar()
            if source_count != target_count:
                mismatches.append({
                    "table": table,
                    "source_count": source_count,
                    "target_count": target_count,
                    "diff": source_count - target_count,
                })
        return mismatches
```
