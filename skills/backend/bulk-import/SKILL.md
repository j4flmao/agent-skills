---
name: backend-bulk-import
description: >
  Enforce bulk data import patterns including CSV/Excel parsing, file upload handling,
  validation pipeline, progress tracking, batch processing, error reporting, rollback
  on failure, deduplication, and background processing. NOT for real-time data ingestion
  or streaming pipelines.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [backend, data, phase-10]
---

# Bulk Import Skill

## Purpose
Design robust bulk import systems that handle large CSV/Excel files with validation, progress tracking, error recovery, and audit trails.

## Architecture Decision Trees

### Import Mode Selection

| Criterion | Insert | Upsert | Replace |
|-----------|--------|--------|---------|
| Duplicate handling | Fails on conflict | Updates existing | Truncate all first |
| Performance | Fastest | Moderate (check per row) | Fast (truncate + insert) |
| Idempotent | No | Yes (by dedup field) | No (destructive) |
| Risk level | Low | Low | High (data loss) |
| Audit trail | All inserts | Updates logged | Lost on truncate |
| Rollback complexity | Simple (transaction) | Moderate | Complex (needs backup) |
| Use case | New data ingestion | Sync with external system | Full reimport/replace |

Decision: Upsert for production syncs. Insert for immutable audit data. Replace only with pre-import backup.

### Parsing Strategy

| Criterion | Streaming (CSV) | Full load (Excel) | Hybrid (chunked) |
|-----------|----------------|-------------------|------------------|
| Memory | O(1) rows in memory | Full file in memory | O(batch size) |
| Max file size | Unlimited | ~100MB practical | ~500MB |
| Row validation | Per-batch | All before processing | Per-batch |
| Error collection | Per-batch | Full before process | Per-batch |
| Progress tracking | Yes (real-time) | No (must parse first) | Yes (per chunk) |
| Random access | No | Yes | No |

Decision: Streaming for CSV. Chunked for Excel > 10MB. Full load for Excel < 10MB.

### Deduplication Strategy

| Approach | Precision | Performance | Implementation |
|----------|-----------|-------------|----------------|
| DB unique constraint | Exact | Fast (index) | Schema definition |
| Pre-check with SELECT | Exact | Slow on large tables | Query existing values |
| Hash-based (MD5 row hash) | Approximate | Fast | Hash + compare |
| External dedup (Redis set) | High | Very fast | SET + EXISTS check |

Decision: DB unique constraint for exact dedup. Redis Bloom filter for high-volume approximate dedup.

## Agent Protocol

### Trigger
User mentions bulk import, CSV upload, Excel import, data ingestion, batch processing, data migration, import pipeline, file upload processing, import validation, or ETL pipeline.

### Input Context
- Source file format (CSV, Excel, JSON)
- Expected file size and row count
- Data schema and validation rules
- Import mode (insert, upsert, replace)
- Deduplication strategy
- Error handling requirements
- Background processing needs
- Target system and database

### Output Artifact
SKILL.md adherence document plus implemented import pipeline, validation logic, progress tracking, error handling, and rollback mechanisms.

### Response Format
No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
- [ ] File upload endpoint with size/type validation implemented
- [ ] CSV/Excel parser configured with header mapping and encoding detection
- [ ] Validation pipeline with row-level error collection operational
- [ ] Preview step (show sample + errors before confirm) implemented
- [ ] Batch processing with progress tracking and throttling
- [ ] Import template with downloadable sample file ready
- [ ] Deduplication logic implemented (configurable per field)
- [ ] Rollback mechanism for partial failures
- [ ] Import history and audit log stored
- [ ] Webhook notification on import completion
- [ ] Rate limiting on import endpoints

### Max Response Length
4096 tokens

## Workflow

1. **File Upload & Validation**: Accept upload with strict type/size checks.

```typescript
import multer from 'multer';
import path from 'path';

const ALLOWED_MIME = [
  'text/csv',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];
const MAX_SIZE = 50 * 1024 * 1024; // 50MB

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_SIZE },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_MIME.includes(file.mimetype)) {
      cb(new Error('Unsupported file type. Only CSV and Excel files are allowed.'));
      return;
    }
    cb(null, true);
  },
});

app.post('/api/imports/upload', upload.single('file'), async (req, res) => {
  const importJob = await ImportJob.create({
    userId: req.user.id,
    fileName: req.file.originalname,
    fileSize: req.file.size,
    mimeType: req.file.mimetype,
    status: 'uploaded',
  });

  const buffer = req.file.buffer;
  const parsed = await parseFile(buffer, req.file.mimetype);
  importJob.rowCount = parsed.rows.length;
  importJob.columnCount = parsed.headers.length;
  importJob.preview = parsed.rows.slice(0, 5);
  await importJob.save();

  res.json({ jobId: importJob.id, preview: importJob.preview, totalRows: importJob.rowCount });
});
```

2. **CSV Parsing with Streaming**: Handle large files without memory overflow.

```typescript
import { parse } from 'csv-parse';
import { createReadStream } from 'fs';

async function* streamCsvRows(filePath: string, batchSize = 500): AsyncGenerator<Record<string, string>[]> {
  const parser = createReadStream(filePath).pipe(parse({
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true,
    encoding: 'utf-8',
    bom: true,
  }));

  let batch: Record<string, string>[] = [];

  for await (const record of parser) {
    batch.push(record);
    if (batch.length >= batchSize) {
      yield batch;
      batch = [];
    }
  }

  if (batch.length > 0) yield batch;
}
```

3. **Validation Pipeline**: Row-level validation with comprehensive error collection.

```typescript
class ImportValidator {
  private validators: Map<string, FieldValidator[]> = new Map();

  register(field: string, ...validators: FieldValidator[]): void {
    this.validators.set(field, [...(this.validators.get(field) || []), ...validators]);
  }

  async validate(rows: Record<string, unknown>[]): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const validRows: Record<string, unknown>[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowErrors: ValidationError[] = [];

      for (const [field, fieldValidators] of this.validators.entries()) {
        const value = row[field];
        for (const validator of fieldValidators) {
          const error = await validator.validate(field, value, row);
          if (error) rowErrors.push({ ...error, row: i + 1 });
        }
      }

      if (rowErrors.length > 0) {
        errors.push(...rowErrors);
      } else {
        validRows.push(row);
      }
    }

    return { validRows, errors, totalRows: rows.length, validCount: validRows.length, errorCount: errors.length };
  }
}

// Usage
const validator = new ImportValidator();
validator.register('email', { validate: async (field, value) => {
  if (!value || typeof value !== 'string') return { field, message: 'Email is required' };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return { field, message: 'Invalid email format' };
  return null;
}});
validator.register('age', { validate: async (field, value) => {
  const num = Number(value);
  if (isNaN(num) || num < 0 || num > 150) return { field, message: 'Age must be between 0 and 150' };
  return null;
}});
```

4. **Import Pipeline Lifecycle**: Upload → Validate → Preview → Confirm → Process.

```typescript
interface ImportJob {
  id: string;
  userId: string;
  fileName: string;
  fileSize: number;
  rowCount: number;
  status: ImportStatus;
  importMode: 'insert' | 'upsert' | 'replace';
  dedupField?: string;
  validationErrors?: ValidationError[];
  processingProgress?: { processed: number; total: number; failed: number };
  createdAt: Date;
  completedAt?: Date;
}

type ImportStatus =
  | 'uploaded'
  | 'validating'
  | 'validation_complete'
  | 'preview'
  | 'confirmed'
  | 'processing'
  | 'completed'
  | 'partial'
  | 'failed';

app.post('/api/imports/:id/confirm', async (req, res) => {
  const job = await ImportJob.findById(req.params.id);
  if (job.status !== 'validation_complete') {
    return res.status(400).json({ error: 'Import must complete validation first' });
  }

  job.status = 'confirmed';
  await job.save();

  await importQueue.add({
    importId: job.id,
    batchSize: req.body.batchSize || 500,
    importMode: job.importMode,
    dedupField: job.dedupField,
  });

  res.json({ status: 'processing', jobId: job.id });
});
```

5. **Batch Processing with Progress**: Process in batches with transaction support.

```typescript
import Bull from 'bull';

const importQueue = new Bull('import-processing', {
  redis: { host: process.env.REDIS_HOST, port: 6379 },
});

importQueue.process(async (job) => {
  const { importId, batchSize, importMode, dedupField } = job.data;
  const importJob = await ImportJob.findById(importId);

  importJob.status = 'processing';
  await importJob.save();

  const fileStream = createReadStream(importJob.filePath);
  const parser = fileStream.pipe(parse({ columns: true, skip_empty_lines: true }));

  let batch: Record<string, unknown>[] = [];
  let processed = 0;
  let failed = 0;
  const errors: ProcessingError[] = [];

  for await (const record of parser) {
    batch.push(record);

    if (batch.length >= batchSize) {
      const result = await processBatch(batch, importMode, dedupField);
      processed += result.processed;
      failed += result.failed;
      errors.push(...result.errors);

      importJob.processingProgress = { processed, total: importJob.rowCount, failed };
      await importJob.save();
      await job.progress({ processed, total: importJob.rowCount, failed });

      batch = [];
    }
  }

  if (batch.length > 0) {
    const result = await processBatch(batch, importMode, dedupField);
    processed += result.processed;
    failed += result.failed;
    errors.push(...result.errors);
  }

  importJob.status = failed > 0 && processed > 0 ? 'partial' : 'completed';
  importJob.completedAt = new Date();
  importJob.processingProgress = { processed, total: importJob.rowCount, failed };
  await importJob.save();

  await notifyWebhook(importJob);

  return { processed, failed, errors: errors.slice(0, 100) };
});

async function processBatch(
  rows: Record<string, unknown>[],
  mode: string,
  dedupField?: string
): Promise<{ processed: number; failed: number; errors: ProcessingError[] }> {
  const errors: ProcessingError[] = [];

  if (dedupField) {
    const existingValues = await getExistingValues(rows, dedupField);
    rows = filterDuplicates(rows, dedupField, existingValues);
  }

  const db = await getConnection();
  const trx = await db.transaction();

  try {
    switch (mode) {
      case 'insert':
        await trx('target_table').insert(rows);
        break;
      case 'upsert':
        await trx('target_table').insert(rows).onConflict(dedupField || 'id').merge();
        break;
      case 'replace':
        await trx('target_table').delete();
        await trx('target_table').insert(rows);
        break;
    }
    await trx.commit();
    return { processed: rows.length, failed: 0, errors: [] };
  } catch (error) {
    await trx.rollback();
    errors.push({ message: error.message, rows: rows.length });
    return { processed: 0, failed: rows.length, errors };
  }
}
```

6. **Import Templates**: Generate downloadable sample files.

```typescript
function generateImportTemplate(headers: ImportColumn[]): string {
  const headerRow = headers.map(h => h.label).join(',');
  const sampleRow = headers.map(h => h.example || '').join(',');
  return `${headerRow}\n${sampleRow}\n`;
}

app.get('/api/imports/templates/:type', (req, res) => {
  const template = getImportTemplateConfig(req.params.type);
  const csv = generateImportTemplate(template.columns);

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${template.name}-template.csv"`);
  res.send(csv);
});
```

## Implementation Patterns

### Pattern: Column Header Mapping

```typescript
interface ColumnMapping {
  displayName: string;    // From CSV header
  fieldName: string;      // Internal field name
  required: boolean;
  defaultValue?: unknown;
  transform?: (value: string) => unknown;
}

class HeaderMapper {
  async detectHeaders(file: Buffer, mimeType: string): Promise<ColumnMapping[]> {
    const headers = await this.parseHeaders(file, mimeType);
    const mapping = this.fuzzyMatch(headers, this.expectedColumns);
    const unmatched = headers.filter(h => !mapping.find(m => m.displayName === h));
    if (unmatched.length > 0) {
      throw new ImportError(`Unrecognized columns: ${unmatched.join(', ')}`);
    }
    return mapping;
  }

  private fuzzyMatch(actual: string[], expected: ColumnMapping[]): ColumnMapping[] {
    return actual.map(header => {
      const match = expected.find(e =>
        e.displayName.toLowerCase() === header.toLowerCase() ||
        e.fieldName.toLowerCase() === header.toLowerCase()
      );
      if (!match) return null;
      return { ...match, displayName: header };
    }).filter(Boolean) as ColumnMapping[];
  }
}
```

### Pattern: Error Report Generation

```typescript
interface ImportError {
  row: number;
  column: string;
  value: string;
  message: string;
  code: string;
}

async function generateErrorReport(errors: ImportError[], format: 'csv' | 'xlsx'): Promise<Buffer> {
  if (format === 'csv') {
    const header = 'Row,Column,Value,Error,Code\n';
    const rows = errors.map(e =>
      `"${e.row}","${e.column}","${e.value.replace(/"/g, '""')}","${e.message.replace(/"/g, '""')}","${e.code}"`
    ).join('\n');
    return Buffer.from(header + rows, 'utf-8');
  }

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Import Errors');
  sheet.columns = [
    { header: 'Row', key: 'row', width: 10 },
    { header: 'Column', key: 'column', width: 20 },
    { header: 'Value', key: 'value', width: 30 },
    { header: 'Error', key: 'message', width: 50 },
    { header: 'Code', key: 'code', width: 15 },
  ];
  errors.forEach(e => sheet.addRow(e));
  sheet.getRow(1).font = { bold: true };
  return await workbook.xlsx.writeBuffer() as Buffer;
}
```

### Pattern: Import Webhook Notifications

```typescript
interface ImportNotification {
  importId: string;
  status: 'completed' | 'partial' | 'failed';
  summary: { total: number; processed: number; failed: number; skipped: number };
  downloadUrl?: string;
  errorReportUrl?: string;
}

async function notifyImportComplete(job: ImportJob): Promise<void> {
  const notification: ImportNotification = {
    importId: job.id,
    status: job.status,
    summary: {
      total: job.rowCount,
      processed: job.processingProgress?.processed || 0,
      failed: job.processingProgress?.failed || 0,
      skipped: job.rowCount - (job.processingProgress?.processed || 0) - (job.processingProgress?.failed || 0),
    },
  };

  if (job.webhookUrl) {
    await fetch(job.webhookUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(notification),
    });
  }

  if (job.notifyUserId) {
    await notificationService.send(job.notifyUserId, {
      type: 'import_complete',
      title: `Import ${job.status}: ${job.fileName}`,
      ...notification,
    });
  }
}
```

## Production Considerations

### Scalability
- Queue workers: scale horizontally by import type; dedicated worker pools for large imports
- DB connections: batch processing uses pooled connections; release between batches
- Memory: streaming parsers for files > 50MB; never load entire file into memory
- Storage: upload files to S3/Blob storage; process from stream without local temp file

### Monitoring
- Metrics: import duration, rows/second, error rate by type, queue depth, failure rate
- Alerts: error rate > 5%, queue backlog > 100 jobs, same file re-upload > 3 times
- Logging: structured logs per import job (importId, userId, status, rowCount, duration)

### Error Recovery
- Partial success: import valid rows, report errors, allow retry of failed rows only
- Rollback: transaction per batch; failed batch rolls back without affecting previous batches
- Retry: exponential backoff for transient DB errors; manual retry for data errors after fix
- Cancellation: set cancel flag; worker checks flag between batches and stops gracefully

## Anti-Patterns

| Anti-Pattern | Why | Fix |
|-------------|-----|-----|
| Direct INSERT without validation | Bad data corrupts database | Validation pipeline before any insert |
| Single transaction for entire file | Failure loses all progress; locks table | Batch per transaction (500-1000 rows) |
| Processing on main thread | Blocks HTTP response; no retry | Background queue always |
| Ignoring BOM/encoding | Corrupted strings for special chars | Auto-detect encoding with `chardet` or `iconv-lite` |
| Overwriting data without backup | Replace mode can't be undone | Auto-backup before replace; transaction rollback |
| No header validation | Wrong column mapping = wrong data | Validate headers before processing any rows |
| Synchronous progress tracking | Users refresh waiting; no feedback | WebSocket push or poll endpoint for progress |
| Storing full file content in DB | DB bloat; file storage is cheaper | Object storage with metadata reference in DB |
| Too-large batch size (10K+) | Long transaction; deadlock risk | Optimal batch size: 500-1000 rows |
| No dedup before import | Duplicate records; manual cleanup | Dedup check per batch; fail or skip duplicates |

## Security Considerations

- File validation: check MIME type + magic bytes (not extension); reject unknown types
- Upload path traversal: sanitize filename; use UUID-based storage keys, never user-provided names
- CSV injection: don't open generated CSV in Excel directly (formulas starting with =, +, -, @ can execute)
  - Mitigation: prefix dangerous-starting values with tab or single quote in CSV output
- Rate limiting: per-user, per-hour import limits (e.g., 5 imports/hour, 500MB/hour total)
- PII: mask sensitive fields in preview; enforce field-level access control
- Audit: log every import action (upload, validate, confirm, cancel) with userId, timestamp, row count
- File retention: auto-delete uploaded files after 30 days; allow user-triggered immediate deletion

## Testing Strategies

```typescript
import { describe, it, expect } from 'vitest';
import { parse } from 'csv-parse';

describe('Bulk Import', () => {
  it('parses CSV with headers', async () => {
    const csv = 'name,email,age\nAlice,alice@test.com,30\nBob,bob@test.com,25';
    const records: Record<string, string>[] = [];
    const parser = parse(csv, { columns: true, skip_empty_lines: true });
    for await (const record of parser) records.push(record);
    expect(records).toHaveLength(2);
    expect(records[0].name).toBe('Alice');
  });

  it('validates required fields', async () => {
    const validator = new ImportValidator();
    validator.register('email', { validate: async (f, v) => !v ? { field: f, message: 'Required' } : null });
    const result = await validator.validate([{ email: '' }, { email: 'test@test.com' }]);
    expect(result.errorCount).toBe(1);
    expect(result.validCount).toBe(1);
  });

  it('detects encoding', async () => {
    const buf = Buffer.from('name,email\nJalapeño,test@test.com', 'utf-8');
    const encoding = await detectEncoding(buf);
    expect(encoding).toBe('UTF-8');
  });

  it('rejects oversized files', () => {
    const file = { size: 100 * 1024 * 1024, mimetype: 'text/csv' };
    expect(validateFile(file, { maxSize: 50 * 1024 * 1024 })).toBe(false);
  });

  it('processes batch with transaction rollback on error', async () => {
    const result = await processBatch(
      [{ id: 1, name: 'Valid' }, { id: 2, name: null }],
      'insert',
      undefined,
      mockDb
    );
    expect(result.processed).toBe(0);
    expect(result.failed).toBe(2);
  });

  it('generates downloadable error report', async () => {
    const errors = [{ row: 1, column: 'email', value: 'bad', message: 'Invalid format', code: 'INVALID_EMAIL' }];
    const report = await generateErrorReport(errors, 'csv');
    expect(report.toString()).toContain('Row,Column,Value,Error,Code');
    expect(report.toString()).toContain('1,"email","bad","Invalid format","INVALID_EMAIL"');
  });
});
```

- Test with real CSV/Excel files containing edge cases: BOM, UTF-16, emoji, null bytes, quote-escaped fields
- Load test: 500K rows CSV, measure throughput (target > 5K rows/second)
- Test cancel: start import, cancel mid-way, verify no partial data committed
- Test replace mode: verify old data is backed up before truncate, can be restored

## Rules

## References
  - references/bulk-export.md — Bulk Export
  - references/bulk-import-advanced.md — Bulk Import Advanced Topics
  - references/bulk-import-fundamentals.md — Bulk Import Fundamentals
  - references/csv-parsing.md — CSV Parsing
  - references/import-monitoring.md — Import Monitoring
  - references/import-workflow.md — Import Workflow
  - references/rollback-recovery.md — Rollback and Recovery
  - references/validation-pipeline.md — Validation Pipeline
## Handoff
- `backend/report-generation` — Export/import round-trip patterns
- `data/etl` — ETL pipeline integration for bulk imports
- `management/task-queues` — Queue management for import jobs
