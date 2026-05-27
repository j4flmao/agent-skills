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

## Rules

1. Never trust file extensions — validate MIME types and content signatures.
2. Always implement file size limits at both proxy and application level.
3. Never process imports synchronously for files over 10K rows.
4. Always strip BOM and detect encoding (UTF-8, UTF-16, Latin-1) on CSV files.
5. Never assume column order — always use header mapping by name.
6. Always trim whitespace from CSV values during parsing.
7. Never allow import into production without preview step.
8. Always implement idempotent imports to prevent duplicate processing.
9. Never expose internal column names — use display labels in templates.
10. Always implement import cancellation for long-running jobs.
11. Never allow import of PII without audit trail.
12. Always implement row count limits per import job.
13. Never swallow validation errors — collect and return all errors.
14. Always use streaming parsers for files > 10MB.
15. Never import into tables without backup for replace mode.
16. Always provide downloadable error report with row numbers.
17. Never process files that fail header validation.
18. Always enforce rate limits per user per time window.
19. Never store raw uploaded files without retention policy.
20. Always test imports with edge cases (empty rows, special chars, quotes, commas in values).

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
