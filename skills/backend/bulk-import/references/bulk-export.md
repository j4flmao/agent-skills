# Bulk Export

## Export Architecture

### Design Principles
- Stream results — never load entire dataset into memory
- Support multiple formats (CSV, JSON, Parquet, Excel)
- Provide paginated or incremental export for large datasets
- Implement cancel/resume for multi-hour exports
- Track export job state for monitoring and audit

### Export Flow
```
Request → Create Export Job → Generate → Stream → Complete → Notify
                    ↑                                  |
                    └───────── Resume ──────────────────┘
```

## Streaming Export

### File Streaming
```python
import csv
import io
from fastapi.responses import StreamingResponse

async def export_users_csv(db_session):
    async def generate():
        buffer = io.StringIO()
        writer = csv.writer(buffer)

        # Header
        writer.writerow(["id", "email", "name", "created_at"])
        yield buffer.getvalue()
        buffer.seek(0)
        buffer.truncate()

        # Stream rows
        async for row in db_session.stream(
            select(User).execution_options(yield_per=1000)
        ):
            writer.writerow([row.id, row.email, row.name, row.created_at.isoformat()])
            yield buffer.getvalue()
            buffer.seek(0)
            buffer.truncate()

    return StreamingResponse(generate(), media_type="text/csv", headers={
        "Content-Disposition": "attachment; filename=users.csv"
    })
```

### JSON Streaming (NDJSON)
```python
async def export_orders_ndjson(order_repo):
    async def generate():
        async for batch in order_repo.stream_all(batch_size=500):
            for order in batch:
                yield json.dumps(order.to_dict()) + "\n"

    return StreamingResponse(
        generate(),
        media_type="application/x-ndjson",
        headers={"Content-Disposition": "attachment; filename=orders.ndjson"},
    )
```

### Parquet Export
```python
import pyarrow as pa
import pyarrow.parquet as pq

async def export_to_parquet(query, output_path: str, batch_size: int = 10000):
    writer = None
    try:
        async for batch in stream_query(query, batch_size):
            table = pa.Table.from_pydict({
                "id": [r.id for r in batch],
                "email": [r.email for r in batch],
                "name": [r.name for r in batch],
                "created_at": [r.created_at for r in batch],
            })
            if writer is None:
                writer = pq.ParquetWriter(output_path, table.schema)
            writer.write_table(table)
    finally:
        if writer:
            writer.close()
```

## Paginated Export

### Cursor-Based Pagination
```python
class ExportPaginator:
    def __init__(self, repo, page_size: int = 10000):
        self.repo = repo
        self.page_size = page_size

    async def export_all(self, writer):
        cursor = None
        total = 0
        while True:
            batch, cursor = await self.repo.fetch_page(
                limit=self.page_size, after=cursor
            )
            if not batch:
                break
            writer.write_batch(batch)
            total += len(batch)
            print(f"Exported {total} records")
        return total
```

### Time-Based Partitioning
```python
async def export_by_date_range(
    repo, start_date: date, end_date: date, output_dir: str
):
    current = start_date
    while current <= end_date:
        next_day = current + timedelta(days=1)
        rows = await repo.fetch_by_date(current, next_day)
        if rows:
            filepath = Path(output_dir) / f"export_{current.isoformat()}.csv"
            write_csv(filepath, rows)
        current = next_day
```

## Job-Based Export

### Export Job Model
```python
from enum import Enum
from datetime import datetime
from dataclasses import dataclass, field

class ExportStatus(Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"

@dataclass
class ExportJob:
    id: str
    status: ExportStatus
    export_type: str
    filters: dict
    format: str
    output_path: str | None
    total_records: int = 0
    processed_records: int = 0
    error_message: str | None = None
    created_at: datetime = field(default_factory=datetime.utcnow)
    completed_at: datetime | None = None
```

### Export Job Manager
```python
class ExportJobManager:
    def __init__(self, job_store, export_runner, notification_service):
        self.job_store = job_store
        self.export_runner = export_runner
        self.notification_service = notification_service

    async def create_job(self, export_type: str, filters: dict, format: str) -> ExportJob:
        job = ExportJob(
            id=generate_id(),
            status=ExportStatus.PENDING,
            export_type=export_type,
            filters=filters,
            format=format,
        )
        await self.job_store.save(job)
        asyncio.create_task(self.process_job(job.id))
        return job

    async def process_job(self, job_id: str):
        job = await self.job_store.get(job_id)
        job.status = ExportStatus.RUNNING
        await self.job_store.save(job)

        try:
            output_path = await self.export_runner.run(job, self._progress_callback)
            job.output_path = output_path
            job.status = ExportStatus.COMPLETED
            job.completed_at = datetime.utcnow()
            await self.job_store.save(job)
            await self.notification_service.notify_complete(job)
        except Exception as e:
            job.status = ExportStatus.FAILED
            job.error_message = str(e)
            await self.job_store.save(job)
            await self.notification_service.notify_failure(job)

    async def _progress_callback(self, job_id: str, processed: int, total: int):
        job = await self.job_store.get(job_id)
        job.processed_records = processed
        job.total_records = total
        await self.job_store.save(job)
```

## Format Conversion

### CSV Writer
```python
import csv
from pathlib import Path

class CsvExportWriter:
    def __init__(self, filepath: Path, columns: list[str]):
        self.filepath = filepath
        self.file = open(filepath, "w", newline="", encoding="utf-8")
        self.writer = csv.writer(self.file)
        self.writer.writerow(columns)

    def write_batch(self, rows: list[list]):
        for row in rows:
            self.writer.writerow(row)

    def close(self):
        self.file.close()
```

### Excel Writer (Multi-Sheet)
```python
from openpyxl import Workbook

class ExcelExportWriter:
    def __init__(self, filepath: Path):
        self.filepath = filepath
        self.workbook = Workbook()

    def add_sheet(self, name: str, columns: list[str], rows: list[list]):
        ws = self.workbook.create_sheet(title=name)
        ws.append(columns)
        for row in rows:
            ws.append(row)

    def save(self):
        self.workbook.save(self.filepath)
```

## Compression and Packaging

### Gzip Compression
```python
import gzip
import shutil

def compress_file(source: Path, target: Path):
    with open(source, "rb") as f_in:
        with gzip.open(target, "wb") as f_out:
            shutil.copyfileobj(f_in, f_out)
```

### Multi-File Archive (ZIP)
```python
import zipfile

def create_archive(files: list[Path], output: Path):
    with zipfile.ZipFile(output, "w", zipfile.ZIP_DEFLATED) as zf:
        for file in files:
            zf.write(file, arcname=file.name)
```

## Large File Handling

### Memory-Mapped Files
```python
import mmap

def process_large_file(filepath: Path):
    with open(filepath, "r+b") as f:
        with mmap.mmap(f.fileno(), 0) as mm:
            while position < mm.size():
                chunk_end = mm.find(b"\n", position)
                if chunk_end == -1:
                    break
                line = mm[position:chunk_end].decode()
                process_line(line)
                position = chunk_end + 1
```

### Disk-Based Sorting
```python
def external_sort(input_file: Path, output_file: Path, chunk_size: int = 100000):
    chunks = []
    with open(input_file) as f:
        chunk = []
        for line in f:
            chunk.append(line)
            if len(chunk) >= chunk_size:
                chunk.sort()
                chunk_path = input_file.parent / f"chunk_{len(chunks)}.tmp"
                with open(chunk_path, "w") as cf:
                    cf.writelines(chunk)
                chunks.append(chunk_path)
                chunk = []
        if chunk:
            chunk.sort()
            chunk_path = input_file.parent / f"chunk_{len(chunks)}.tmp"
            with open(chunk_path, "w") as cf:
                cf.writelines(chunk)
            chunks.append(chunk_path)

    merge_sorted_files(chunks, output_file)
```

## Security and Access Control

### Row-Level Filtering
```python
class SecureExportService:
    def __init__(self, auth_service):
        self.auth_service = auth_service

    async def get_export_query(self, user_id: str, export_type: str) -> Query:
        base_query = self.get_base_query(export_type)
        permissions = await self.auth_service.get_permissions(user_id)
        return base_query.where(
            and_(
                Organization.user_id == user_id,
                Organization.plan.in_(permissions.allowed_plans),
            )
        )
```

### Sensitive Field Masking
```python
FIELD_MASKS = {
    "email": lambda v: v[:3] + "***" + v[v.index("@"):],
    "phone": lambda v: v[:4] + "****" + v[-4:],
    "ssn": lambda v: "***-**-" + v[-4:],
}

def mask_fields(row: dict, sensitive_fields: list[str]) -> dict:
    masked = row.copy()
    for field in sensitive_fields:
        if field in masked and field in FIELD_MASKS:
            masked[field] = FIELD_MASKS[field](masked[field])
    return masked
```

## Key Points
- Stream export results to avoid memory exhaustion on large datasets
- NDJSON enables streaming JSON export line by line
- Job-based export with progress tracking handles multi-hour exports
- Parquet is preferred for analytical exports due to columnar storage and compression
- Time-based partitioning enables incremental/resumable exports
- Format conversion (CSV, Excel, Parquet) should be decoupled from data fetching
- External sorting handles datasets too large for in-memory sorting
- Row-level filtering and field masking enforce export security
