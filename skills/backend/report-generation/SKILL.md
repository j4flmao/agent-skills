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

## Rules

1. Never render user-supplied HTML directly in Puppeteer — sanitize all content.
2. Always implement timeouts for PDF generation (Puppeteer default: 30s).
3. Never block API requests for report generation — always use async queues for >10K rows.
4. Always stream CSV exports — never buffer entire file in memory.
5. Never use eval() in report templates — use strict template engines only.
6. Always validate template variables at compile time with schema.
7. Never expose full database query results in error responses.
8. Always implement file size limits and enforce them before generation.
9. Never store generated reports indefinitely — implement TTL cleanup.
10. Always compress large reports (gzip for CSV, ZIP for multiple files).
11. Never overwrite existing reports without versioning.
12. Always provide download URLs with signed/expiring tokens.
13. Never generate reports with PII accessible to unauthorized users.
14. Always implement report-specific row limits and warn if exceeded.
15. Never use synchronous generation for PDFs on serverless (cold start + timeout).
16. Always implement retry with exponential backoff for failed generations.
17. Never include absolute file paths or internal server details in reports.
18. Always test PDF rendering across multiple page sizes (A4, Letter, Legal).
19. Never assume all data fits in memory — implement paginated/chunked queries.
20. Always provide generation progress tracking (status, percentage, ETA).

## References
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
