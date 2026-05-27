# Contract Migration Strategies

## Schema Migration Planning

Data contract migrations require coordination between producers and consumers.

### Migration Lifecycle

```python
from enum import Enum
from datetime import datetime, timedelta

class MigrationPhase(Enum):
    PROPOSED = "proposed"
    REVIEWING = "reviewing"
    APPROVED = "approved"
    DEPLOYING = "deploying"
    COEXISTING = "coexisting"
    COMPLETED = "completed"
    ROLLED_BACK = "rolled_back"

class ContractMigration:
    def __init__(self, contract_id: str, new_schema: dict):
        self.contract_id = contract_id
        self.new_schema = new_schema
        self.phase = MigrationPhase.PROPOSED
        self.created_at = datetime.utcnow()
        self.approvals: list[str] = []
        self.consumer_notifications: list[Notification] = []

    def propose(self, producer: str, change_description: str):
        self.producer = producer
        self.description = change_description
        self.phase = MigrationPhase.REVIEWING
        self._notify_consumers(change_description)

    def approve(self, approver: str):
        self.approvals.append(approver)
        if len(self.approvals) >= 2:
            self.phase = MigrationPhase.APPROVED

    def deploy_coexisting(self):
        self.phase = MigrationPhase.COEXISTING
        self.coexisting_start = datetime.utcnow()
        self.coexisting_end = self.coexisting_start + timedelta(days=30)
```

### Dual Write Strategy

```python
class DualWriteManager:
    def __init__(self, old_schema: Schema, new_schema: Schema):
        self.old = old_schema
        self.new = new_schema
        self.comparison_results: list[ComparisonResult] = []

    def write_both(self, data: dict):
        old_record = self.old.transform(data)
        new_record = self.new.transform(data)
        self.old.write(old_record)
        self.new.write(new_record)
        self.compare(old_record, new_record)

    def compare(self, old: dict, new: dict):
        diff = DeepDiff(old, new, significant_digits=2)
        self.comparison_results.append(ComparisonResult(
            match=not bool(diff),
            differences=diff,
            timestamp=datetime.utcnow(),
        ))

    def switchover(self) -> SwitchoverReport:
        total = len(self.comparison_results)
        matches = sum(1 for r in self.comparison_results if r.match)
        consistency = matches / total if total > 0 else 0

        if consistency >= 0.999:
            return SwitchoverReport(
                safe=True,
                consistency=consistency,
                sample_size=total,
                recommendation="Proceed with switchover",
            )

        return SwitchoverReport(
            safe=False,
            consistency=consistency,
            sample_size=total,
            recommendation=f"Wait: consistency {consistency:.1%} below 99.9% threshold",
        )
```

### Consumer Migration

```python
class ConsumerMigrationTracker:
    def __init__(self, registry: ContractRegistry):
        self.registry = registry
        self.consumer_state: dict[str, ConsumerState] = {}

    def notify_consumers(self, contract_id: str, migration: ContractMigration):
        contract = self.registry.get(contract_id)
        for consumer in contract.consumers:
            notification = Notification(
                consumer=consumer,
                migration_id=migration.id,
                new_schema=migration.new_schema,
                migration_deadline=migration.coexisting_end,
                migration_guide=f"docs/migrations/{contract_id}.md",
            )
            self._send(notification)

    def track_progress(self, contract_id: str) -> MigrationProgress:
        contract = self.registry.get(contract_id)
        total = len(contract.consumers)
        migrated = sum(
            1 for c in contract.consumers
            if self.consumer_state.get(c) == ConsumerState.MIGRATED
        )
        return MigrationProgress(
            contract_id=contract_id,
            total_consumers=total,
            migrated_consumers=migrated,
            completion=round(migrated / total * 100, 1) if total > 0 else 100,
        )
```

## Rollback Procedures

```python
class MigrationRollback:
    def __init__(self, storage: StorageBackend):
        self.storage = storage

    def create_savepoint(self, contract_id: str):
        contract = self.storage.get(f"contracts/{contract_id}.yaml")
        self.storage.put(
            f"savepoints/{contract_id}_{datetime.utcnow().isoformat()}.yaml",
            contract,
        )

    def rollback(self, contract_id: str, savepoint_id: str):
        savepoint = self.storage.get(
            f"savepoints/{contract_id}_{savepoint_id}.yaml"
        )
        self.storage.put(f"contracts/{contract_id}.yaml", savepoint)
        return RollbackResult(
            contract_id=contract_id,
            rolled_back_to=savepoint_id,
            timestamp=datetime.utcnow(),
        )
```

## Key Points

- Migration lifecycle: proposed → reviewing → approved → coexisting → completed
- Dual write runs old and new schemas in parallel for comparison
- 99.9% consistency threshold before switchover
- 30-day coexistence period with transparent consumer migration
- Consumer migration tracker monitors migration progress per consumer
- Savepoints enable rollback to any previous contract version
- Notify all consumers with migration guide and deadline
- Track migration completion percentage across consumers
- Blocking approval requires minimum two approvers
- Automated consistency checking during dual-write phase
