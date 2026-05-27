# Rollback and Recovery

## Overview
Rollback and recovery mechanisms ensure data integrity when bulk imports fail partway through. A robust rollback system must handle partial imports, concurrent operations, cascading foreign keys, and provide administrators with tools to recover from failures.

## Transaction Strategies

### Batch-Level Transactions

```python
class BatchTransactionManager:
    def __init__(self, db_session):
        self.db_session = db_session
        self.savepoints: list[str] = []

    async def begin_batch(self, batch_id: str):
        savepoint = f"batch_{batch_id}"
        await self.db_session.execute(f"SAVEPOINT {savepoint}")
        self.savepoints.append(savepoint)

    async def commit_batch(self, batch_id: str):
        savepoint = f"batch_{batch_id}"
        await self.db_session.execute(f"RELEASE SAVEPOINT {savepoint}")
        self.savepoints.remove(savepoint)

    async def rollback_batch(self, batch_id: str):
        savepoint = f"batch_{batch_id}"
        await self.db_session.execute(f"ROLLBACK TO SAVEPOINT {savepoint}")
        if savepoint in self.savepoints:
            self.savepoints.remove(savepoint)

    async def rollback_all(self):
        for sp in reversed(self.savepoints):
            await self.db_session.execute(f"ROLLBACK TO SAVEPOINT {sp}")
        self.savepoints.clear()
```

### Two-Phase Commit

```python
class TwoPhaseCommitManager:
    def __init__(self, resources: list[ResourceManager]):
        self.resources = resources

    async def prepare(self, transaction_id: str) -> bool:
        prepared = []
        for resource in self.resources:
            try:
                await resource.prepare(transaction_id)
                prepared.append(resource)
            except Exception as e:
                for r in reversed(prepared):
                    await r.rollback(transaction_id)
                return False
        return True

    async def commit(self, transaction_id: str):
        committed = []
        for resource in self.resources:
            try:
                await resource.commit(transaction_id)
                committed.append(resource)
            except Exception as e:
                for r in committed:
                    await r.recover(transaction_id)
                raise TwoPhaseCommitError(
                    f"Commit failed at {resource.name}: {e}"
                )

    async def rollback(self, transaction_id: str):
        for resource in reversed(self.resources):
            await resource.rollback(transaction_id)
```

## Rollback Mechanisms

### Compensating Transactions

```python
class CompensatingTransaction:
    def __init__(self, action: callable,
                 compensate: callable,
                 description: str):
        self.action = action
        self.compensate = compensate
        self.description = description
        self.executed = False
        self.result = None

    async def execute(self) -> Any:
        self.result = await self.action()
        self.executed = True
        return self.result

    async def undo(self):
        if self.executed:
            await self.compensate(self.result)
            self.executed = False

class CompensatingTransactionLog:
    def __init__(self):
        self.transactions: list[CompensatingTransaction] = []

    def add(self, tx: CompensatingTransaction):
        self.transactions.append(tx)

    async def rollback_all(self):
        for tx in reversed(self.transactions):
            try:
                await tx.undo()
            except Exception as e:
                logging.error(f"Compensation failed for {tx.description}: {e}")

    async def rollback_to(self, index: int):
        for tx in reversed(self.transactions[index:]):
            await tx.undo()
        self.transactions = self.transactions[:index]
```

### Change Data Capture for Rollback

```python
class ChangeCapture:
    def __init__(self, db_session):
        self.db_session = db_session

    async def capture_before_state(self, import_id: str,
                                    table: str,
                                    record_ids: list[int]):
        rows = await self.db_session.fetch(
            f"SELECT * FROM {table} WHERE id = ANY($1)",
            record_ids
        )
        await self._store_snapshot(import_id, table, rows)

    async def capture_after_state(self, import_id: str,
                                   table: str,
                                   records: list[dict]):
        await self._store_change_log(import_id, table, records)

    async def restore_from_snapshot(self, import_id: str,
                                     table: str):
        snapshot = await self._get_snapshot(import_id, table)
        for row in snapshot:
            await self.db_session.execute(
                f"UPDATE {table} SET {self._build_set_clause(row)} "
                f"WHERE id = $1", row["id"]
            )

    async def _store_snapshot(self, import_id: str,
                               table: str, rows: list[dict]):
        query = """
            INSERT INTO import_snapshots
                (import_id, table_name, row_id, snapshot_data)
            VALUES ($1, $2, $3, $4)
        """
        for row in rows:
            await self.db_session.execute(
                query, import_id, table, row["id"], json.dumps(row, default=str)
            )

    async def _store_change_log(self, import_id: str,
                                  table: str, records: list[dict]):
        query = """
            INSERT INTO import_change_log
                (import_id, table_name, record_data, changed_at)
            VALUES ($1, $2, $3, NOW())
        """
        for record in records:
            await self.db_session.execute(
                query, import_id, table, json.dumps(record, default=str)
            )
```

## Partial Rollback

```python
class PartialRollbackStrategy:
    def __init__(self, batch_manager: BatchTransactionManager,
                 change_capture: ChangeCapture):
        self.batch_manager = batch_manager
        self.change_capture = change_capture

    async def rollback_failed_batches(self, import_id: str,
                                       failed_batches: list[int],
                                       successful_batches: list[int]):
        for batch_id in failed_batches:
            await self.batch_manager.rollback_batch(batch_id)
            logging.info(f"Rolled back failed batch {batch_id}")

        conflict_checker = ConflictChecker()
        for batch_id in successful_batches:
            if await conflict_checker.has_dependency_conflicts(
                import_id, batch_id, failed_batches
            ):
                await self.batch_manager.rollback_batch(batch_id)
                logging.warning(
                    f"Rolled back successful batch {batch_id} "
                    f"due to dependency on failed batch"
                )

    async def mark_for_reprocessing(self, import_id: str,
                                     batch_id: int):
        query = """
            INSERT INTO reprocess_queue
                (import_id, batch_id, status, created_at)
            VALUES ($1, $2, 'pending', NOW())
        """
        await self.batch_manager.db_session.execute(query, import_id, batch_id)
```

## Conflict Detection

```python
class ConflictChecker:
    def __init__(self):
        self.locks: dict[str, set[str]] = {}

    def acquire_lock(self, resource: str,
                     import_id: str) -> bool:
        if resource not in self.locks:
            self.locks[resource] = set()
        if self.locks[resource] and import_id not in self.locks[resource]:
            return False
        self.locks[resource].add(import_id)
        return True

    def release_lock(self, resource: str, import_id: str):
        if resource in self.locks:
            self.locks[resource].discard(import_id)
            if not self.locks[resource]:
                del self.locks[resource]

    async def has_dependency_conflicts(self, import_id: str,
                                        batch_id: int,
                                        failed_batches: list[int]) -> bool:
        query = """
            SELECT COUNT(1) FROM batch_dependencies
            WHERE dependent_batch = $1
            AND dependency_batch = ANY($2)
        """
        result = await db.fetchval(query, batch_id, failed_batches)
        return result > 0
```

## Recovery Procedures

### Automated Recovery

```python
class AutoRecoveryEngine:
    def __init__(self, strategies: list[RecoveryStrategy]):
        self.strategies = strategies
        self.health_check_interval = 60

    async def monitor_and_recover(self):
        while True:
            failed_imports = await self._find_failed_imports()
            for import_job in failed_imports:
                await self._attempt_recovery(import_job)
            await asyncio.sleep(self.health_check_interval)

    async def _find_failed_imports(self) -> list[ImportJob]:
        query = """
            SELECT * FROM import_jobs
            WHERE status IN ('processing_error', 'rolling_back')
            AND updated_at < NOW() - INTERVAL '5 minutes'
            AND retry_count < 3
        """
        rows = await db.fetch(query)
        return [ImportJob(**row) for row in rows]

    async def _attempt_recovery(self, job: ImportJob):
        for strategy in self.strategies:
            if await strategy.can_apply(job):
                try:
                    await strategy.recover(job)
                    logging.info(
                        f"Recovered import {job.id} "
                        f"using {strategy.__class__.__name__}"
                    )
                    return
                except Exception as e:
                    logging.error(
                        f"Recovery strategy {strategy.__class__.__name__} "
                        f"failed for {job.id}: {e}"
                    )
        job.retry_count = (job.retry_count or 0) + 1
        await db.execute(
            "UPDATE import_jobs SET retry_count = $1, "
            "status = 'failed' WHERE id = $2",
            job.retry_count, job.id
        )

class RecoveryStrategy(ABC):
    @abstractmethod
    async def can_apply(self, job: ImportJob) -> bool:
        pass

    @abstractmethod
    async def recover(self, job: ImportJob):
        pass

class RetryStrategy(RecoveryStrategy):
    def __init__(self, max_retries: int = 3):
        self.max_retries = max_retries

    async def can_apply(self, job: ImportJob) -> bool:
        return (job.retry_count or 0) < self.max_retries

    async def recover(self, job: ImportJob):
        job.retry_count = (job.retry_count or 0) + 1
        orchestrator = ImportOrchestrator(...)
        await orchestrator._process(job)

class RollbackAndRestartStrategy(RecoveryStrategy):
    async def can_apply(self, job: ImportJob) -> bool:
        return job.processed_rows > 0

    async def recover(self, job: ImportJob):
        rollback_mgr = RollbackManager(storage)
        await rollback_mgr.rollback(job)
        job.status = ImportStatus.VALIDATION_PASSED
        job.processed_rows = 0
        job.error_rows = 0
        await storage.save_job(job)
        orchestrator = ImportOrchestrator(...)
        await orchestrator._process(job)
```

## Manual Recovery Tools

```python
class ManualRecoveryTool:
    def __init__(self, db_session):
        self.db_session = db_session

    async def list_failed_imports(self) -> list[dict]:
        rows = await self.db_session.fetch("""
            SELECT id, original_filename, status, total_rows,
                   processed_rows, error_rows, created_at,
                   updated_at
            FROM import_jobs
            WHERE status IN ('processing_error', 'partially_completed')
            ORDER BY updated_at DESC
        """)
        return [dict(row) for row in rows]

    async def get_import_detail(self, import_id: str) -> dict:
        job = await self.db_session.fetchrow(
            "SELECT * FROM import_jobs WHERE id = $1", import_id
        )
        if not job:
            return {}
        errors = await self.db_session.fetch("""
            SELECT * FROM import_errors
            WHERE import_id = $1
            ORDER BY row_number
        """, import_id)
        return {
            "job": dict(job),
            "errors": [dict(e) for e in errors]
        }

    async def resume_import(self, import_id: str) -> ImportJob:
        job = await self.db_session.fetchrow(
            "SELECT * FROM import_jobs WHERE id = $1", import_id
        )
        if not job:
            raise JobNotFoundError(import_id)
        import_job = ImportJob(**dict(job))
        unprocessed = await self._get_unprocessed_batches(import_id)
        if not unprocessed:
            import_job.status = ImportStatus.COMPLETED
            await self._save_job(import_job)
            return import_job
        import_job.status = ImportStatus.PROCESSING
        await self._save_job(import_job)
        asyncio.create_task(self._process_remaining(import_job, unprocessed))
        return import_job

    async def cancel_import(self, import_id: str):
        await self.db_session.execute(
            "UPDATE import_jobs SET status = 'cancelled' WHERE id = $1",
            import_id
        )
```

## Cleanup Policies

```python
class CleanupPolicy:
    def __init__(self, retention_days: int = 30,
                 snapshot_retention_days: int = 7):
        self.retention_days = retention_days
        self.snapshot_retention_days = snapshot_retention_days

    async def cleanup_old_jobs(self):
        cutoff = datetime.utcnow() - timedelta(days=self.retention_days)
        await db.execute(
            "DELETE FROM import_jobs WHERE created_at < $1 "
            "AND status IN ('completed', 'rolled_back', 'cancelled')",
            cutoff
        )

    async def cleanup_snapshots(self):
        cutoff = datetime.utcnow() - timedelta(
            days=self.snapshot_retention_days
        )
        await db.execute(
            "DELETE FROM import_snapshots WHERE created_at < $1",
            cutoff
        )

    async def archive_completed(self, days_old: int = 90):
        cutoff = datetime.utcnow() - timedelta(days=days_old)
        rows = await db.fetch("""
            INSERT INTO import_archive
            SELECT * FROM import_jobs
            WHERE completed_at < $1
            AND status = 'completed'
            RETURNING id
        """, cutoff)
        ids = [row["id"] for row in rows]
        if ids:
            await db.execute(
                "DELETE FROM import_jobs WHERE id = ANY($1)", ids
            )
```

## Schema for Rollback Support

```sql
CREATE TABLE import_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    import_id UUID NOT NULL REFERENCES import_jobs(id),
    table_name VARCHAR(255) NOT NULL,
    row_id INTEGER NOT NULL,
    snapshot_data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE import_change_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    import_id UUID NOT NULL REFERENCES import_jobs(id),
    table_name VARCHAR(255) NOT NULL,
    record_data JSONB NOT NULL,
    changed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE import_errors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    import_id UUID NOT NULL REFERENCES import_jobs(id),
    row_number INTEGER NOT NULL,
    column_name VARCHAR(255),
    error_code VARCHAR(100) NOT NULL,
    error_message TEXT NOT NULL,
    rejected_value TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE batch_dependencies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    import_id UUID NOT NULL REFERENCES import_jobs(id),
    dependent_batch INTEGER NOT NULL,
    dependency_batch INTEGER NOT NULL
);

CREATE TABLE reprocess_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    import_id UUID NOT NULL REFERENCES import_jobs(id),
    batch_id INTEGER NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    attempts INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ
);
```

## Key Points

- Batch-level transactions with savepoints allow granular rollback of individual batches.
- Two-phase commit ensures consistency across multiple resources (database, file storage, message queues).
- Compensating transactions provide undo semantics for non-transactional operations like sending notifications.
- Change data capture stores before and after snapshots for precise rollback.
- Partial rollback preserves successfully processed batches while reverting failed ones.
- Dependency conflict detection prevents cascading data integrity issues across related batches.
- Automated recovery engines retry or restart failed imports with configurable strategies.
- Manual recovery tools allow administrators to inspect, resume, or cancel stuck imports.
- Cleanup policies purge old snapshots, change logs, and completed jobs to manage storage.
