# Import Workflow

## Overview
A bulk import workflow orchestrates the complete lifecycle of importing data from file upload to final persistence. It manages state transitions, coordinates validation and processing stages, handles errors, and provides progress tracking and rollback capabilities.

## Workflow States

### State Machine

```python
from enum import Enum

class ImportStatus(Enum):
    PENDING = "pending"
    UPLOADED = "uploaded"
    VALIDATING = "validating"
    VALIDATION_ERROR = "validation_error"
    VALIDATION_PASSED = "validation_passed"
    PROCESSING = "processing"
    PROCESSING_ERROR = "processing_error"
    COMPLETED = "completed"
    PARTIALLY_COMPLETED = "partially_completed"
    ROLLING_BACK = "rolling_back"
    ROLLED_BACK = "rolled_back"
    CANCELLED = "cancelled"

class ImportWorkflow:
    TRANSITIONS = {
        ImportStatus.PENDING: [ImportStatus.UPLOADED, ImportStatus.CANCELLED],
        ImportStatus.UPLOADED: [ImportStatus.VALIDATING, ImportStatus.CANCELLED],
        ImportStatus.VALIDATING: [ImportStatus.VALIDATION_PASSED,
                                    ImportStatus.VALIDATION_ERROR],
        ImportStatus.VALIDATION_PASSED: [ImportStatus.PROCESSING,
                                          ImportStatus.CANCELLED],
        ImportStatus.VALIDATION_ERROR: [ImportStatus.VALIDATING,
                                         ImportStatus.CANCELLED],
        ImportStatus.PROCESSING: [ImportStatus.COMPLETED,
                                   ImportStatus.PARTIALLY_COMPLETED,
                                   ImportStatus.PROCESSING_ERROR],
        ImportStatus.PROCESSING_ERROR: [ImportStatus.ROLLING_BACK,
                                         ImportStatus.PROCESSING],
        ImportStatus.ROLLING_BACK: [ImportStatus.ROLLED_BACK],
    }

    @classmethod
    def can_transition(cls, current: ImportStatus,
                       target: ImportStatus) -> bool:
        return target in cls.TRANSITIONS.get(current, [])
```

## Import Job Model

```python
from dataclasses import dataclass, field
from datetime import datetime
from uuid import uuid4

@dataclass
class ImportJob:
    id: str = field(default_factory=lambda: str(uuid4()))
    filename: str = ""
    original_filename: str = ""
    file_size: int = 0
    mime_type: str = ""
    status: ImportStatus = ImportStatus.PENDING
    total_rows: int = 0
    processed_rows: int = 0
    error_rows: int = 0
    warning_count: int = 0
    import_config: dict = field(default_factory=dict)
    validation_results: list = field(default_factory=list)
    error_details: list = field(default_factory=list)
    progress: float = 0.0
    started_at: datetime | None = None
    completed_at: datetime | None = None
    created_by: str = ""
    created_at: datetime = field(default_factory=datetime.utcnow)
    updated_at: datetime = field(default_factory=datetime.utcnow)
```

## Workflow Orchestrator

```python
class ImportOrchestrator:
    def __init__(self, parser: StreamingCSVParser,
                 pipeline: ValidationPipeline,
                 processor: DataProcessor,
                 storage: ImportStorage):
        self.parser = parser
        self.pipeline = pipeline
        self.processor = processor
        self.storage = storage

    async def start_import(self, job: ImportJob) -> ImportJob:
        job.status = ImportStatus.UPLOADED
        job.started_at = datetime.utcnow()
        await self.storage.save_job(job)
        asyncio.create_task(self._run_workflow(job))
        return job

    async def _run_workflow(self, job: ImportJob):
        try:
            await self._validate(job)
            if job.status == ImportStatus.VALIDATION_ERROR:
                return
            await self._process(job)
        except Exception as e:
            job.status = ImportStatus.PROCESSING_ERROR
            job.error_details.append({
                "stage": "workflow",
                "error": str(e),
                "timestamp": datetime.utcnow().isoformat()
            })
            await self.storage.save_job(job)
            await self._rollback(job)

    async def _validate(self, job: ImportJob):
        job.status = ImportStatus.VALIDATING
        await self.storage.save_job(job)
        batch = []
        for i, record in enumerate(self.parser.parse_stream(job.filename)):
            results = self.pipeline.validate_row(
                record["data"], record["row_number"],
                job.import_config.get("schema", {})
            )
            errors = [r for r in results
                      if r.severity == ValidationSeverity.ERROR]
            if errors:
                job.error_rows += 1
                job.validation_results.extend(errors)
                job.error_details.append({
                    "row": record["row_number"],
                    "errors": [e.code for e in errors],
                    "timestamp": datetime.utcnow().isoformat()
                })
            else:
                batch.append(record["data"])
            job.total_rows = record["row_number"]
            if len(batch) >= 500:
                await self.storage.save_validated_batch(job.id, batch)
                batch = []
            job.progress = min(
                (record["row_number"] / max(job.total_rows, 1)) * 50, 50
            )
            if i % 100 == 0:
                await self.storage.save_job(job)

        if batch:
            await self.storage.save_validated_batch(job.id, batch)

        if job.error_rows > 0:
            max_error_rate = job.import_config.get(
                "max_error_rate", 0.1
            )
            error_rate = job.error_rows / max(job.total_rows, 1)
            if error_rate > max_error_rate:
                job.status = ImportStatus.VALIDATION_ERROR
            else:
                job.status = ImportStatus.VALIDATION_PASSED
        else:
            job.status = ImportStatus.VALIDATION_PASSED

        await self.storage.save_job(job)
```

## Processing Stage

```python
class DataProcessor:
    def __init__(self, batch_size: int = 500,
                 max_retries: int = 3):
        self.batch_size = batch_size
        self.max_retries = max_retries

    async def process_job(self, job: ImportJob,
                          storage: ImportStorage) -> ImportJob:
        job.status = ImportStatus.PROCESSING
        await storage.save_job(job)
        processed = 0
        batch_number = 0

        async for batch in storage.get_validated_batches(job.id):
            batch_number += 1
            try:
                result = await self._process_batch(
                    batch, job.import_config
                )
                processed += len(batch)
                job.processed_rows = processed
                job.progress = 50 + min(
                    (processed / max(job.total_rows, 1)) * 50, 50
                )
                await storage.save_processed_batch(
                    job.id, batch_number, result
                )
            except Exception as e:
                job.processed_rows = processed
                job.error_details.append({
                    "batch": batch_number,
                    "error": str(e),
                    "timestamp": datetime.utcnow().isoformat()
                })
                await self._handle_batch_error(job, batch, e, storage)
            await storage.save_job(job)

        if job.processed_rows == job.total_rows:
            job.status = ImportStatus.COMPLETED
        elif job.processed_rows > 0:
            job.status = ImportStatus.PARTIALLY_COMPLETED
        else:
            job.status = ImportStatus.PROCESSING_ERROR

        job.completed_at = datetime.utcnow()
        await storage.save_job(job)
        return job

    async def _process_batch(self, batch: list[dict],
                             config: dict) -> BatchResult:
        transformed = self._apply_transforms(batch, config)
        records = self._map_fields(transformed, config)
        async with db.transaction():
            inserted = await self._insert_records(records)
            await self._update_indexes(inserted, config)
            await self._trigger_post_process(inserted, config)
        return BatchResult(
            inserted=len(inserted),
            batch_size=len(batch),
            success=True
        )

    def _apply_transforms(self, batch: list[dict],
                          config: dict) -> list[dict]:
        transforms = config.get("transforms", {})
        transformed = []
        for row in batch:
            row_copy = dict(row)
            for column, transform_config in transforms.items():
                if column in row_copy:
                    transform_func = TRANSFORM_REGISTRY.get(
                        transform_config.get("type")
                    )
                    if transform_func:
                        row_copy[column] = transform_func(
                            row_copy[column],
                            **transform_config.get("params", {})
                        )
            transformed.append(row_copy)
        return transformed
```

## Rollback Handling

```python
class RollbackManager:
    def __init__(self, storage: ImportStorage):
        self.storage = storage

    async def rollback(self, job: ImportJob):
        job.status = ImportStatus.ROLLING_BACK
        await self.storage.save_job(job)
        try:
            async with db.transaction():
                await self.storage.delete_processed_data(job.id)
                await self.storage.restore_original_state(job.id)
            job.status = ImportStatus.ROLLED_BACK
        except Exception as e:
            job.status = ImportStatus.PROCESSING_ERROR
            job.error_details.append({
                "stage": "rollback",
                "error": str(e),
                "timestamp": datetime.utcnow().isoformat()
            })
        await self.storage.save_job(job)
```

## Progress Tracking

```python
class ProgressTracker:
    def __init__(self, storage: ImportStorage):
        self.storage = storage

    async def get_progress(self, job_id: str) -> dict:
        job = await self.storage.get_job(job_id)
        if not job:
            raise JobNotFoundError(f"Job {job_id} not found")
        return {
            "job_id": job.id,
            "status": job.status.value,
            "progress": job.progress,
            "total_rows": job.total_rows,
            "processed_rows": job.processed_rows,
            "error_rows": job.error_rows,
            "warning_count": job.warning_count,
            "started_at": job.started_at.isoformat() if job.started_at else None,
            "completed_at": job.completed_at.isoformat() if job.completed_at else None,
            "estimated_time_remaining": self._estimate_remaining(job),
            "errors": job.error_details[-10:] if job.error_details else []
        }

    def _estimate_remaining(self, job: ImportJob) -> int | None:
        if job.processed_rows <= 0 or not job.started_at:
            return None
        elapsed = (datetime.utcnow() - job.started_at).total_seconds()
        rate = job.processed_rows / elapsed if elapsed > 0 else 0
        remaining = job.total_rows - job.processed_rows
        return int(remaining / rate) if rate > 0 else None
```

## Concurrency Control

```python
class ConcurrentImportManager:
    def __init__(self, max_concurrent: int = 3):
        self.max_concurrent = max_concurrent
        self.active_imports: dict[str, ImportJob] = {}

    async def submit(self, job: ImportJob,
                     orchestrator: ImportOrchestrator) -> ImportJob:
        if len(self.active_imports) >= self.max_concurrent:
            raise ConcurrentImportLimitError(
                f"Maximum {self.max_concurrent} concurrent imports allowed"
            )
        self.active_imports[job.id] = job
        try:
            return await orchestrator.start_import(job)
        finally:
            self.active_imports.pop(job.id, None)

    def get_active_count(self) -> int:
        return len(self.active_imports)
```

## Key Points

- Import workflows follow a state machine model with clear status transitions for observability.
- The orchestrator coordinates validation, processing, and rollback phases asynchronously.
- Validation errors are collected per-row without aborting the entire import unless error rate exceeds threshold.
- Processing handles data in batches with configurable batch sizes and retry policies.
- Progress tracking provides real-time status including estimated time remaining.
- Rollback capabilities restore the system to its pre-import state on catastrophic failure.
- Concurrency controls prevent system overload from multiple simultaneous large imports.
- Error details are logged per-batch and per-row for debugging and reporting.
