---
name: backend-report-generation
description: >
  Enforce report generation patterns including PDF generation (Puppeteer, wkhtmltopdf),
  Excel/CSV export, async generation with queues, report scheduling, large dataset handling,
  template rendering, and report API design. NOT for real-time dashboards or live charting.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [backend, reporting, phase-10]
---

# Report Generation Skill

## Purpose
Generate complex reports in multiple formats (PDF, Excel, CSV) from large datasets with async processing, scheduling, and reliable delivery.

## Architecture Decision Trees

### Format Selection

| Criterion | PDF | Excel (XLSX) | CSV | HTML |
|-----------|-----|-------------|-----|------|
| Human readability | Excellent (fixed layout) | Good (tabular) | Poor (raw data) | Excellent (responsive) |
| Machine parsability | Poor | Good | Excellent | Poor |
| Page size control | Full control | Print layout | N/A | CSS print |
| File size (10K rows) | ~5-10MB (rendered) | ~1-2MB | ~500KB | ~2-3MB |
| Streaming support | No (full render) | Partial (worksheet) | Yes (row-by-row) | Yes |
| Interactive features | No | Formulas, filters | No | Links, JS |
| Accessibility | Poor (screen reader limited) | Moderate | Excellent | Excellent |
| Best for | Invoices, contracts, compliance | Financials, data analysis | Data export, ETL | Dashboards, email |

Decision: PDF for presentation/output. CSV for data export. Excel for analysis. HTML for screen display.

### Rendering Strategy

| Criterion | Puppeteer/Chrome | wkhtmltopdf | PDFKit/jsPDF | Server-side lib (iText, TCPDF) |
|-----------|-----------------|-------------|-------------|-------------------------------|
| CSS support | Full (Chrome) | Limited (WebKit) | None (manual) | Limited |
| JavaScript rendering | Yes | No | No | No |
| Page headers/footers | Full HTML templates | Basic HTML | Manual | Built-in |
| Performance | Slow (~2s/page) | Medium | Fast | Fast |
| Memory | High (~200MB per browser) | Medium | Low | Low |
| Dependency | Chromium binary | wkhtmltopdf binary | Pure JS | Language-specific |

Decision: Puppeteer for complex visual reports. PDFKit for programmatic simple PDFs. wkhtmltopdf only if Puppeteer is too heavy.

### Async Processing Decision

| Condition | Sync | Background Queue | Streaming |
|-----------|------|-----------------|-----------|
| Rows < 1K | Yes | No | No |
| Rows 1K-100K | No (timeout risk) | Yes | For CSV only |
| Rows > 100K | No | Yes (chunked) | Yes (CSV only) |
| Format = PDF | No (slow) | Yes | No |
| Format = CSV | Possible | Overkill | Yes (preferred) |
| Scheduled reports | No | Yes | No |

Decision: Background queue for PDF/Excel > 1K rows. Stream CSV for any size.

## Agent Protocol

### Trigger
User mentions PDF generation, report export, Excel export, CSV download, report templates, report scheduling, async reports, Puppeteer, wkhtmltopdf, ExcelJS, Handlebars reports, or large dataset export.

### Input Context
- Report format requirements (PDF, Excel, CSV, or all)
- Data sources and expected dataset sizes
- Template requirements and variable injection
- Scheduling needs (one-time, recurring, cron)
- Delivery method (email, download, CDN, webhook)
- Locale/i18n requirements

### Output Artifact
SKILL.md adherence document plus implemented report generation code, templates, queue workers, scheduling config, and API endpoints.

### Response Format
No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
- [ ] Report generation service implemented for all required formats
- [ ] HTML templates created with Handlebars/EJS for PDF rendering
- [ ] Async generation with queue system (Bull/Sidekiq) configured
- [ ] Chunked export for large datasets (>100K rows) implemented
- [ ] Report scheduling with cron expressions operational
- [ ] Download/storage strategy defined (local/CDN/S3)
- [ ] Report API endpoints (generate, status, download, list) implemented
- [ ] Error handling and retry logic for failed generations
- [ ] Report localization per locale
- [ ] Rate limiting on report generation endpoints

### Max Response Length
4096 tokens

## Workflow

1. **Format Selection & Setup**: Choose libraries per format — Puppeteer for PDF, ExcelJS for XLSX, native streams for CSV.

```typescript
// Puppeteer PDF generation
import puppeteer from 'puppeteer';

async function generatePdf(html: string): Promise<Buffer> {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'networkidle0' });
  const pdf = await page.pdf({
    format: 'A4',
    margin: { top: '20mm', bottom: '20mm', left: '15mm', right: '15mm' },
    printBackground: true,
    displayHeaderFooter: true,
    headerTemplate: '<div style="font-size:8px;margin-left:15mm;">{{title}}</div>',
    footerTemplate: '<div style="font-size:8px;text-align:center;width:100%;">Page <span class="pageNumber"></span> of <span class="totalPages"></span></div>',
  });
  await browser.close();
  return pdf;
}
```

2. **Template Rendering**: Use Handlebars or EJS with report-specific helpers.

```handlebars
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: 'Inter', Arial, sans-serif; font-size: 12px; }
    table { width: 100%; border-collapse: collapse; }
    th { background: #1a1a1a; color: white; padding: 8px; text-align: left; }
    td { padding: 8px; border-bottom: 1px solid #e0e0e0; }
    .header { text-align: center; margin-bottom: 20px; }
    .header h1 { font-size: 24px; margin: 0; }
    .header p { color: #666; font-size: 14px; }
    .summary { display: flex; gap: 16px; margin-bottom: 24px; }
    .summary-card { flex: 1; padding: 16px; background: #f8f8f8; border-radius: 8px; text-align: center; }
    .summary-card .value { font-size: 28px; font-weight: bold; }
    .summary-card .label { font-size: 12px; color: #666; }
    .footer { text-align: center; color: #999; font-size: 10px; margin-top: 40px; }
    .page-break { page-break-after: always; }
  </style>
</head>
<body>
  <div class="header">
    <h1>{{reportTitle}}</h1>
    <p>Generated: {{generatedAt}} | Period: {{startDate}} - {{endDate}}</p>
  </div>

  <div class="summary">
    {{#each summaryCards}}
    <div class="summary-card">
      <div class="value">{{value}}</div>
      <div class="label">{{label}}</div>
    </div>
    {{/each}}
  </div>

  <table>
    <thead>
      <tr>
        {{#each columns}}<th>{{this}}</th>{{/each}}
      </tr>
    </thead>
    <tbody>
      {{#each rows}}
      <tr>
        {{#each cells}}<td>{{this}}</td>{{/each}}
      </tr>
      {{/each}}
    </tbody>
  </table>

  <div class="footer">
    <p>{{companyName}} — Confidential</p>
  </div>
</body>
</html>
```

3. **Excel Export with ExcelJS**: Handle multi-sheet workbooks, formatting, formulas.

```typescript
import ExcelJS from 'exceljs';

async function generateExcel(data: ReportData[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Report System';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('Report Data');

  sheet.columns = [
    { header: 'Date', key: 'date', width: 15 },
    { header: 'Revenue', key: 'revenue', width: 15 },
    { header: 'Orders', key: 'orders', width: 12 },
    { header: 'Customers', key: 'customers', width: 15 },
    { header: 'Conversion', key: 'conversion', width: 12 },
  ];

  sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1a1a1a' } };

  data.forEach(row => {
    sheet.addRow(row);
  });

  const totalRow = sheet.addRow({
    date: 'TOTAL',
    revenue: data.reduce((s, r) => s + r.revenue, 0),
    orders: data.reduce((s, r) => s + r.orders, 0),
    customers: data.reduce((s, r) => s + r.customers, 0),
    conversion: data.reduce((s, r) => s + r.conversion, 0) / data.length,
  });
  totalRow.font = { bold: true };

  return await workbook.xlsx.writeBuffer() as Buffer;
}
```

4. **Large CSV Export with Streaming**: Process datasets >100K rows without memory overflow.

```typescript
import { createObjectCsvStringifier } from 'csv-writers';
import { Transform } from 'stream';

async function* fetchDataBatches(batchSize = 1000): AsyncGenerator<Record<string, unknown>[]> {
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    const batch = await db.query(`SELECT * FROM large_table LIMIT $1 OFFSET $2`, [batchSize, offset]);
    if (batch.length === 0) hasMore = false;
    else {
      yield batch;
      offset += batchSize;
    }
  }
}

app.get('/reports/csv', async (req, res) => {
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="report.csv"');

  const csvStringifier = createObjectCsvStringifier({
    header: [
      { id: 'id', title: 'ID' },
      { id: 'name', title: 'Name' },
      { id: 'email', title: 'Email' },
      { id: 'created_at', title: 'Created At' },
    ],
  });

  res.write(csvStringifier.getHeaderString());

  const transform = new Transform({
    writableObjectMode: true,
    readableObjectMode: true,
    transform(chunk, encoding, callback) {
      this.push(csvStringifier.stringifyRecords(chunk));
      callback();
    },
  });

  const batchIterator = fetchDataBatches();
  for await (const batch of batchIterator) {
    transform.write(batch);
  }
  transform.end();
  transform.pipe(res);
});
```

5. **Async Report Queue**: Use Bull or Sidekiq for reports exceeding processing thresholds.

```typescript
import Bull from 'bull';

const reportQueue = new Bull('report-generation', {
  redis: { host: process.env.REDIS_HOST, port: 6379 },
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: 100,
    removeOnFail: 50,
  },
});

reportQueue.process(async (job) => {
  const { reportId, format, params } = job.data;
  const report = await ReportModel.findById(reportId);

  try {
    report.status = 'processing';
    await report.save();

    const data = await fetchReportData(params);
    let output: Buffer;

    switch (format) {
      case 'pdf':
        output = await generatePdf(await renderTemplate(report.templateId, data));
        break;
      case 'xlsx':
        output = await generateExcel(data);
        break;
      case 'csv':
        output = await generateCsv(data);
        break;
    }

    const storagePath = await uploadToStorage(reportId, format, output);
    report.status = 'completed';
    report.storagePath = storagePath;
    report.completedAt = new Date();
    await report.save();

    await notifyUser(report.userId, reportId);
  } catch (error) {
    report.status = 'failed';
    report.error = error.message;
    await report.save();
    throw error;
  }
});
```

6. **Report Scheduling**: Support one-time and recurring schedules with cron expressions.

```typescript
interface ReportSchedule {
  id: string;
  reportType: string;
  format: 'pdf' | 'xlsx' | 'csv';
  cronExpression: string; // e.g., '0 8 * * 1' = every Monday 8AM
  params: Record<string, unknown>;
  recipients: string[];
  nextRunAt: Date;
  lastRunAt?: Date;
}

async function evaluateSchedules(): Promise<void> {
  const now = new Date();
  const dueSchedules = await ReportSchedule.find({
    nextRunAt: { $lte: now },
    enabled: true,
  });

  for (const schedule of dueSchedules) {
    const report = await createReportFromSchedule(schedule);
    await reportQueue.add({
      reportId: report.id,
      format: schedule.format,
      params: schedule.params,
    });

    const nextRun = cronParser.parseExpression(schedule.cronExpression);
    schedule.nextRunAt = nextRun.next().toDate();
    schedule.lastRunAt = now;
    await schedule.save();
  }
}
```

## Implementation Patterns

### Pattern: Puppeteer Pool for PDF Generation

```typescript
import puppeteer, { Browser, Page } from 'puppeteer';
import { createPool, Pool } from 'generic-pool';

const browserPool: Pool<Browser> = createPool({
  create: async () => await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
  }),
  destroy: async (browser) => await browser.close(),
}, { max: 3, min: 1, maxWaitingClients: 10 });

async function generatePdfFromUrl(url: string, options: PdfOptions = {}): Promise<Buffer> {
  const browser = await browserPool.acquire();
  const page = await browser.newPage();
  try {
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });
    await page.emulateMediaType('print');
    return await page.pdf({
      format: options.format || 'A4',
      margin: { top: '20mm', bottom: '20mm', left: '15mm', right: '15mm' },
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: options.headerTemplate,
      footerTemplate: options.footerTemplate || '<div style="font-size:8px;text-align:center;width:100%;">Page <span class="pageNumber"></span> of <span class="totalPages"></span></div>',
    }) as Buffer;
  } finally {
    await page.close();
    await browserPool.release(browser);
  }
}
```

### Pattern: Report Status API

```typescript
// report-api.ts
interface ReportJob {
  id: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  format: string;
  progress: { processed: number; total: number; percentage: number };
  downloadUrl?: string;
  expiresAt?: Date;
  error?: string;
  createdAt: Date;
}

app.post('/api/reports', async (req, res) => {
  const { format, params, schedule } = req.body;
  const job = await ReportJobModel.create({
    userId: req.user.id,
    format,
    params,
    status: 'queued',
    createdAt: new Date(),
  });
  await reportQueue.add({ jobId: job.id, format, params, userId: req.user.id });
  res.status(202).json({ jobId: job.id, status: 'queued' });
});

app.get('/api/reports/:id', async (req, res) => {
  const job = await ReportJobModel.findById(req.params.id);
  if (!job) return res.status(404).json({ error: 'Report not found' });
  if (job.userId !== req.user.id && !req.user.isAdmin) return res.status(403).json({ error: 'Forbidden' });
  res.json(formatJobResponse(job));
});

app.get('/api/reports/:id/download', async (req, res) => {
  const job = await ReportJobModel.findById(req.params.id);
  if (job.status !== 'completed') return res.status(400).json({ error: 'Report not ready' });
  if (job.expiresAt && job.expiresAt < new Date()) return res.status(410).json({ error: 'Report expired' });
  const stream = await storageService.download(job.storagePath);
  res.setHeader('Content-Type', getContentType(job.format));
  res.setHeader('Content-Disposition', `attachment; filename="report.${job.format}"`);
  stream.pipe(res);
});
```

### Pattern: Chunked Excel with Multiple Sheets

```typescript
import ExcelJS from 'exceljs';
import { Transform } from 'stream';

async function generateMultiSheetExcel(dataBySheet: Record<string, any[]>, summaryData?: any): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.created = new Date();
  workbook.modified = new Date();

  for (const [sheetName, rows] of Object.entries(dataBySheet)) {
    if (rows.length === 0) continue;
    const sheet = workbook.addWorksheet(sheetName, {
      views: [{ state: 'frozen', ySplit: 1 }],
      pageSetup: { orientation: 'landscape', fitToPage: true, paperSize: 9 },
    });

    const headers = Object.keys(rows[0]);
    sheet.columns = headers.map(h => ({ header: h, key: h, width: Math.max(h.length * 2, 12) }));
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2D3748' } };
    sheet.getRow(1).alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: headers.length } };

    rows.forEach(row => sheet.addRow(row));
  }

  if (summaryData) {
    const summary = workbook.addWorksheet('Summary');
    Object.entries(summaryData).forEach(([key, value], i) => {
      summary.getCell(`A${i + 1}`).value = key;
      summary.getCell(`B${i + 1}`).value = value;
    });
  }

  return await workbook.xlsx.writeBuffer() as Buffer;
}
```

### Pattern: Report Template Versioning

```typescript
interface ReportTemplate {
  id: string;
  name: string;
  type: 'handlebars' | 'mjml' | 'ejs';
  source: string;
  version: number;
  compiled?: string;
  variables: string[];
  schema: Record<string, unknown>; // JSON Schema for variable validation
  createdAt: Date;
  updatedAt: Date;
}

class ReportTemplateManager {
  private cache = new Map<string, { compiled: HandlebarsTemplateFunction; version: number }>();

  async getCompiler(templateId: string): Promise<HandlebarsTemplateFunction> {
    const cached = this.cache.get(templateId);
    const template = await ReportTemplate.findById(templateId);
    if (cached && cached.version === template.version) return cached.compiled;
    const compiled = Handlebars.compile(template.source, { noEscape: true });
    this.cache.set(templateId, { compiled, version: template.version });
    return compiled;
  }

  async render(templateId: string, variables: Record<string, unknown>): Promise<string> {
    const template = await ReportTemplate.findById(templateId);
    const errors = validateAgainstSchema(variables, template.schema);
    if (errors.length > 0) throw new Error(`Template variable validation failed: ${errors.join(', ')}`);
    const compiler = await this.getCompiler(templateId);
    return compiler(variables);
  }
}
```

## Production Considerations

### Resource Management
- Puppeteer: limit concurrent browsers to 3-5 per node; reuse via pool; kill zombie processes
- Memory: PDF generation is memory-intensive — isolate to dedicated worker with 2-4GB RAM
- Disk: use tmpfs for temporary files; clean up generated files after download or TTL expiry
- CPU: report generation workers should be CPU-optimized instances (compute-optimized AWS EC2)

### Storage Strategy
- Short-term (30 days): local disk or S3 with expiring URLs
- Long-term (archive): S3 Glacier or equivalent cold storage
- Never store generated files in database — use blob storage with metadata in DB
- File naming: `{reportType}/{userId}/{date}/{uuid}.{format}`

### Performance Optimization
- Pre-compile Handlebars/EJS templates at deploy time, not render time
- Use Redis caching for template source (prevent DB load on every render)
- Stream CSV to response — never buffer full file in memory
- For Excel > 100MB, consider splitting into multiple workbook files
- PDF: wait for `networkidle0` only for pages with async content; use `domcontentloaded` for faster simple reports

## Anti-Patterns

| Anti-Pattern | Why | Fix |
|-------------|-----|-----|
| Generating PDF in request handler | Blocks response for seconds; timeout risk | Queue + worker pattern |
| wkhtmltopdf for complex CSS | Limited CSS support; inconsistent rendering | Puppeteer for anything beyond basic tables |
| Single browser for PDF | Cold starts + memory leak per request | Browser pool with max 3-5 instances |
| No query pagination | OOM on datasets > 100K rows | Batch query with offset/keyset pagination |
| Storing files in DB | DB bloat; slow backups | Object storage with metadata pointer |
| Hardcoded page size | A4 and Letter differ; layout breaks | Dynamic page size based on locale/request |
| Not setting PDF timeout | Infinite hang on slow page load | Always set 30s timeout on page.goto and page.pdf |
| Serverless for PDF | Cold start + 15min limit + heavy Chromium | Use long-running worker or dedicated service |
| No progress tracking | Users don't know if report is stuck | Update status via queue → DB → poll endpoint |

## Security Considerations

- Never render user-supplied HTML in Puppeteer — use template variables only; sanitize via DOMPurify
- Signed download URLs with short expiry (5-15 minutes) — never expose direct S3 paths
- Validate authorization: user can only access reports they created unless admin
- No internal data in error responses: return generic "Generation failed" with log correlation ID
- Timeout enforcement: kill Puppeteer processes that exceed limit (prevents resource exhaustion DoS)
- Template sandbox: disable `eval`, `require`, `process` in Handlebars templates
- Rate limiting: per-user, per-hour on report generation (e.g., 5/hour, 50/day)
- File size validation: reject requests that would produce files > 100MB before processing

## Testing Strategies

```typescript
import { describe, it, expect } from 'vitest';
import puppeteer from 'puppeteer';
import ExcelJS from 'exceljs';

describe('Report Generation', () => {
  it('generates PDF from HTML template', async () => {
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();
    await page.setContent('<h1>Test Report</h1><p>Content</p>', { waitUntil: 'networkidle0' });
    const pdf = await page.pdf({ format: 'A4' });
    expect(pdf.byteLength).toBeGreaterThan(100);
    await browser.close();
  });

  it('generates valid Excel with formulas', async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Data');
    sheet.addRow(['Item', 'Value']);
    sheet.addRow(['A', 10]);
    sheet.addRow(['B', 20]);
    sheet.getCell('B4').value = { formula: 'SUM(B2:B3)' };
    const buf = await workbook.xlsx.writeBuffer();
    const wb2 = await new ExcelJS.Workbook().xlsx.readBuffer(buf);
    expect(wb2.getWorksheet('Data').getCell('B4').value).toEqual({ formula: 'SUM(B2:B3)', result: 30 });
  });

  it('streams CSV without buffering full payload', async () => {
    const rows = Array.from({ length: 100000 }, (_, i) => ({ id: i, name: `User ${i}` }));
    let chunkCount = 0;
    for await (const chunk of streamCsv(rows)) {
      chunkCount++;
      expect(chunk.length).toBeLessThan(65536);
    }
    expect(chunkCount).toBeGreaterThan(1);
  });

  it('handles queue job lifecycle', async () => {
    const job = await reportQueue.add({ jobId: 'test', format: 'csv', params: {} });
    expect(job.id).toBeDefined();
    const state = await job.getState();
    expect(['waiting', 'active']).toContain(state);
  });

  it('validates template variables against schema', () => {
    const errors = validateAgainstSchema({ name: 'Test' }, { type: 'object', required: ['name', 'email'] });
    expect(errors.length).toBe(1);
    expect(errors[0]).toContain('email');
  });
});
```

- Use Puppeteer's `screenshot` for visual diff testing of PDF output
- Validate PDF accessibility with axe-core in Puppeteer
- Test report generation with empty datasets (edge case: 0 rows)
- Load test: generate 50 PDFs concurrently via queue, measure throughput
- Test file size limits: verify rejection of oversized requests

## Rules
  - references/excel-csv-export.md — Excel and CSV Export
  - references/pdf-generation.md — PDF Generation
  - references/report-distribution.md — Report Distribution and Delivery
  - references/report-generation-advanced.md — Report Generation Advanced Topics
  - references/report-generation-fundamentals.md — Report Generation Fundamentals
  - references/report-scheduling.md — Report Scheduling
  - references/report-templates.md — Report Templates
  - references/report-visualization.md — Report Visualization and Charts
## Handoff
- `backend/bulk-import` — CSV/Excel parsing and validation patterns
- `data/analytics` — Report data aggregation and query patterns
- `management/task-queues` — Queue management and worker scaling
