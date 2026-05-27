# PDF Generation

## Overview
PDF generation for reports requires converting HTML content to PDF with proper pagination, headers, footers, and styling. Puppeteer and wkhtmltopdf are the primary tools for server-side PDF generation from HTML templates.

## Puppeteer PDF Generation

### Basic Setup

```typescript
import puppeteer, { PDFOptions, PaperFormat } from 'puppeteer';

interface PdfGenerationOptions {
  html: string;
  format?: PaperFormat;
  margin?: { top: string; bottom: string; left: string; right: string };
  headerTemplate?: string;
  footerTemplate?: string;
  displayHeaderFooter?: boolean;
  printBackground?: boolean;
  landscape?: boolean;
  scale?: number;
  preferCSSPageSize?: boolean;
  pageRanges?: string;
  timeout?: number;
}

async function generatePdf(options: PdfGenerationOptions): Promise<Buffer> {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--single-process',
    ],
  });

  try {
    const page = await browser.newPage();

    await page.setContent(options.html, {
      waitUntil: 'networkidle0',
      timeout: options.timeout || 30000,
    });

    const pdfBuffer = await page.pdf({
      format: options.format || 'A4',
      margin: options.margin || {
        top: '20mm',
        bottom: '25mm',
        left: '15mm',
        right: '15mm',
      },
      headerTemplate: options.headerTemplate,
      footerTemplate: options.footerTemplate,
      displayHeaderFooter: options.displayHeaderFooter ?? true,
      printBackground: options.printBackground ?? true,
      landscape: options.landscape ?? false,
      scale: options.scale ?? 1,
      preferCSSPageSize: options.preferCSSPageSize ?? false,
      pageRanges: options.pageRanges,
    });

    return pdfBuffer;
  } finally {
    await browser.close();
  }
}
```

### Advanced Options

```typescript
// Memory-optimized for serverless environments
async function generatePdfServerless(html: string): Promise<Buffer> {
  const chromium = require('chrome-aws-lambda');

  const browser = await chromium.puppeteer.launch({
    args: chromium.args,
    defaultViewport: chromium.defaultViewport,
    executablePath: await chromium.executablePath,
    headless: chromium.headless,
  });

  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'networkidle0' });

  const pdf = await page.pdf({
    format: 'A4',
    printBackground: true,
    margin: { top: '20mm', bottom: '20mm', left: '15mm', right: '15mm' },
  });

  await browser.close();
  return pdf;
}

// Tagged PDF for accessibility
async function generateTaggedPdf(html: string): Promise<Buffer> {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.setContent(html);

  const pdf = await page.pdf({
    format: 'A4',
    tagged: true,
    displayHeaderFooter: true,
    headerTemplate: '<span></span>',
    footerTemplate: '<span></span>',
  });

  await browser.close();
  return pdf;
}
```

## Header and Footer Templates

### Custom Header/Footer

```typescript
// Header template with page context
const headerTemplate = `
<div style="
  font-size: 8px;
  font-family: Arial, sans-serif;
  color: #666;
  width: 100%;
  margin: 0 15mm;
  display: flex;
  justify-content: space-between;
  border-bottom: 1px solid #ddd;
  padding-bottom: 4px;
">
  <span>{{title}}</span>
  <span>{{date}}</span>
</div>
`;

// Footer template with page numbers
const footerTemplate = `
<div style="
  font-size: 8px;
  font-family: Arial, sans-serif;
  color: #999;
  width: 100%;
  margin: 0 15mm;
  display: flex;
  justify-content: space-between;
  border-top: 1px solid #ddd;
  padding-top: 4px;
">
  <span>Confidential</span>
  <span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
  <span>Generated: {{generatedAt}}</span>
</div>
`;

// Note: Puppeteer supports these CSS classes in headers/footers:
// .pageNumber - Current page number
// .totalPages - Total page count
// .date - Current date
// .title - Document title
// .url - Document URL
```

## Page Breaks

### CSS Page Break Control

```html
<!DOCTYPE html>
<html>
<head>
  <style>
    /* Page break before specific sections */
    .page-break {
      page-break-before: always;
    }

    .page-break-after {
      page-break-after: always;
    }

    .page-break-inside-avoid {
      page-break-inside: avoid;
    }

    /* Keep with next element */
    .keep-with-next {
      page-break-after: avoid;
    }

    /* Avoid orphan/widow lines */
    p {
      orphans: 3;
      widows: 3;
    }

    /* Table row page break control */
    tr {
      page-break-inside: avoid;
    }

    thead {
      display: table-header-group;
    }

    tfoot {
      display: table-footer-group;
    }

    /* Force full-page landscape for wide content */
    .landscape-section {
      page: landscape;
    }

    @page landscape {
      size: landscape;
    }
  </style>
</head>
<body>
  <section class="summary">
    <h1>Executive Summary</h1>
    <p>This section stays together.</p>
  </section>

  <section class="page-break">
    <h1>Detailed Analysis</h1>
    <p>Starts on a new page.</p>
  </section>

  <table>
    <thead>
      <tr>
        <th>Header (repeats on each page)</th>
      </tr>
    </thead>
    <tbody>
      <tr class="page-break-inside-avoid">
        <td>This row won't split across pages</td>
      </tr>
    </tbody>
  </table>
</body>
</html>
```

### Programmatic Page Breaks

```typescript
function addPageBreaks(html: string, maxSectionHeight: number): string {
  // Split HTML into sections at h1/h2 tags
  const sections = html.split(/(?=<h[12])/);
  let result = '';
  let currentHeight = 0;

  for (const section of sections) {
    const estimatedHeight = estimateSectionHeight(section);

    if (currentHeight + estimatedHeight > maxSectionHeight && currentHeight > 0) {
      result += '<div class="page-break"></div>';
      currentHeight = 0;
    }

    result += section;
    currentHeight += estimatedHeight;
  }

  return result;
}
```

## Styling for PDF

### PDF-Specific CSS

```html
<!DOCTYPE html>
<html>
<head>
  <style>
    @page {
      size: A4;
      margin: 20mm 15mm 25mm 15mm;

      @top-center {
        content: element(header);
      }

      @bottom-center {
        content: element(footer);
      }
    }

    @page :first {
      margin-top: 30mm;

      @top-center {
        content: none;
      }
    }

    @page :left {
      margin-left: 25mm;
      margin-right: 15mm;
    }

    @page :right {
      margin-left: 15mm;
      margin-right: 25mm;
    }

    body {
      font-family: 'Inter', 'DejaVu Sans', Arial, sans-serif;
      font-size: 11pt;
      line-height: 1.5;
      color: #1a1a1a;
    }

    h1 {
      font-size: 18pt;
      font-weight: 700;
      color: #1a1a1a;
      margin-top: 24pt;
      margin-bottom: 12pt;
      page-break-before: avoid;
      page-break-after: avoid;
    }

    h2 {
      font-size: 14pt;
      font-weight: 600;
      color: #333;
      margin-top: 20pt;
      margin-bottom: 8pt;
      page-break-before: avoid;
      page-break-after: avoid;
    }

    h3 {
      font-size: 12pt;
      font-weight: 600;
      color: #555;
      margin-top: 16pt;
      margin-bottom: 6pt;
    }

    p {
      margin-bottom: 6pt;
      text-align: justify;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 9pt;
      margin: 12pt 0;
    }

    table th {
      background-color: #1a1a1a;
      color: white;
      padding: 8pt 6pt;
      text-align: left;
      font-weight: 600;
    }

    table td {
      padding: 6pt;
      border-bottom: 0.5pt solid #ddd;
    }

    table tr:nth-child(even) {
      background-color: #f8f8f8;
    }

    table tr:hover {
      background-color: #f0f0f0;
    }

    .header {
      text-align: center;
      margin-bottom: 24pt;
      padding-bottom: 12pt;
      border-bottom: 2pt solid #1a1a1a;
    }

    .header h1 {
      font-size: 22pt;
      margin-bottom: 4pt;
    }

    .header p {
      color: #666;
      font-size: 10pt;
    }

    .footer {
      text-align: center;
      font-size: 8pt;
      color: #999;
      padding-top: 8pt;
      border-top: 0.5pt solid #ddd;
    }

    .summary-cards {
      display: flex;
      gap: 12pt;
      margin: 16pt 0;
    }

    .summary-card {
      flex: 1;
      padding: 12pt;
      background: #f4f4f6;
      border-radius: 4pt;
      text-align: center;
    }

    .summary-card .value {
      font-size: 22pt;
      font-weight: 700;
      color: #1a1a1a;
    }

    .summary-card .label {
      font-size: 8pt;
      color: #666;
      text-transform: uppercase;
      letter-spacing: 1pt;
    }

    .chart {
      width: 100%;
      margin: 16pt 0;
      page-break-inside: avoid;
    }

    .watermark {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: rotate(-45deg) translate(-50%, -50%);
      font-size: 48pt;
      color: rgba(200, 200, 200, 0.3);
      z-index: 1000;
      pointer-events: none;
    }

    .code-block {
      background: #f4f4f4;
      border: 0.5pt solid #ddd;
      border-radius: 3pt;
      padding: 8pt;
      font-family: 'Courier New', monospace;
      font-size: 8pt;
      line-height: 1.4;
      white-space: pre-wrap;
    }

    .highlight {
      background: #fff8e1;
      padding: 8pt;
      border-left: 3pt solid #ffc107;
      margin: 12pt 0;
    }

    .note {
      background: #e3f2fd;
      padding: 8pt;
      border-left: 3pt solid #2196f3;
      margin: 12pt 0;
      font-size: 9pt;
    }

    .signature-area {
      margin-top: 40pt;
      padding-top: 20pt;
      border-top: 0.5pt solid #ddd;
    }

    .signature-line {
      display: inline-block;
      width: 200pt;
      border-bottom: 1pt solid #1a1a1a;
      margin-bottom: 2pt;
    }

    ul, ol {
      margin: 6pt 0;
      padding-left: 20pt;
    }

    li {
      margin-bottom: 3pt;
    }

    img {
      max-width: 100%;
    }
  </style>
</head>
```

## Large Report Optimization

### Chunked PDF Generation

```typescript
async function generateLargeReportPdf(sections: ReportSection[]): Promise<Buffer> {
  const browser = await puppeteer.launch({ headless: 'new' });
  const pdfBuffers: Buffer[] = [];

  try {
    for (let i = 0; i < sections.length; i++) {
      const page = await browser.newPage();
      const html = renderSection(sections[i], i + 1);
      await page.setContent(html);

      const pdf = await page.pdf({
        format: 'A4',
        margin: { top: '20mm', bottom: '20mm', left: '15mm', right: '15mm' },
        printBackground: true,
      });

      pdfBuffers.push(pdf);
      await page.close();
    }

    return await mergePdfBuffers(pdfBuffers);
  } finally {
    await browser.close();
  }
}
```

### PDF Merging

```typescript
import { PDFDocument } from 'pdf-lib';

async function mergePdfBuffers(buffers: Buffer[]): Promise<Buffer> {
  const mergedPdf = await PDFDocument.create();

  for (const buffer of buffers) {
    const pdf = await PDFDocument.load(buffer);
    const pageIndices = pdf.getPageIndices();
    const copiedPages = await mergedPdf.copyPages(pdf, pageIndices);

    for (const page of copiedPages) {
      mergedPdf.addPage(page);
    }
  }

  return Buffer.from(await mergedPdf.save());
}
```

### Memory-Efficient Streaming

```typescript
import { PassThrough, Writable } from 'stream';
import { PDFDocument } from 'pdf-lib';

class PdfStreamWriter extends Writable {
  private document: PDFDocument;

  constructor() {
    super({ objectMode: true });
    this.document = PDFDocument.create();
  }

  async _write(chunk: ReportChunk, encoding: string, callback: () => void): Promise<void> {
    try {
      const pdfChunk = await PDFDocument.load(chunk.pdfBuffer);
      const pages = await this.document.copyPages(pdfChunk, pdfChunk.getPageIndices());
      pages.forEach(page => this.document.addPage(page));
      callback();
    } catch (error) {
      callback(error);
    }
  }

  async getResult(): Promise<Buffer> {
    return Buffer.from(await this.document.save());
  }
}
```

## wkhtmltopdf Alternative

### wkhtmltopdf Configuration

```typescript
import wkhtmltopdf from 'wkhtmltopdf';

interface WkHtmlToPdfOptions {
  pageSize?: string;
  orientation?: 'Portrait' | 'Landscape';
  marginTop?: string;
  marginBottom?: string;
  marginLeft?: string;
  marginRight?: string;
  headerHtml?: string;
  footerHtml?: string;
  enableForms?: boolean;
  noImages?: boolean;
  grayscale?: boolean;
  lowquality?: boolean;
  encoding?: string;
  javascriptDelay?: number;
  noStopSlowScripts?: boolean;
  userStyleSheet?: string;
  title?: string;
}

function generatePdfWkhtmltopdf(html: string, options: WkHtmlToPdfOptions = {}): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const buffers: Buffer[] = [];

    const stream = wkhtmltopdf(html, {
      pageSize: options.pageSize || 'A4',
      orientation: options.orientation || 'Portrait',
      marginTop: options.marginTop || '20mm',
      marginBottom: options.marginBottom || '20mm',
      marginLeft: options.marginLeft || '15mm',
      marginRight: options.marginRight || '15mm',
      headerHtml: options.headerHtml,
      footerHtml: options.footerHtml,
      encoding: options.encoding || 'UTF-8',
      enableForms: options.enableForms || false,
      noImages: options.noImages || false,
      grayscale: options.grayscale || false,
      title: options.title,
      noStopSlowScripts: true,
      javascriptDelay: options.javascriptDelay || 1000,
    });

    stream.on('data', (data: Buffer) => buffers.push(data));
    stream.on('end', () => resolve(Buffer.concat(buffers)));
    stream.on('error', reject);
  });
}
```

## Error Handling

### Robust PDF Generation

```typescript
class PdfGenerationError extends Error {
  constructor(
    message: string,
    public stage: 'launch' | 'content' | 'render' | 'save',
    public originalError?: Error,
  ) {
    super(message);
    this.name = 'PdfGenerationError';
  }
}

async function safeGeneratePdf(html: string, options: PdfGenerationOptions = {}): Promise<Buffer> {
  const maxRetries = 2;
  let lastError: Error;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await generatePdf({ ...options, html });
    } catch (error) {
      lastError = error;

      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise(r => setTimeout(r, delay));
        continue;
      }
    }
  }

  throw new PdfGenerationError(
    `PDF generation failed after ${maxRetries + 1} attempts`,
    'render',
    lastError,
  );
}
```

### Timeout Handling

```typescript
async function generatePdfWithTimeout(html: string, timeoutMs = 30000): Promise<Buffer> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox'],
    });

    const page = await browser.newPage();

    await Promise.race([
      page.setContent(html),
      new Promise((_, reject) => {
        controller.signal.addEventListener('abort', () => {
          reject(new Error('PDF generation timed out'));
        });
      }),
    ]);

    const pdf = await page.pdf({ format: 'A4' });
    await browser.close();
    return pdf;
  } finally {
    clearTimeout(timeout);
  }
}
```

## Key Points

- Use Puppeteer for modern HTML-to-PDF conversion with full CSS and JavaScript support
- Use wkhtmltopdf as a lighter alternative for simpler PDFs
- Define proper page margins to accommodate headers and footers
- Use CSS page-break properties (page-break-before, page-break-inside, page-break-after) for pagination control
- Always set printBackground: true to preserve background colors and images
- Implement timeout handling to prevent hanging on complex pages
- Use `networkidle0` wait condition for pages with async content loading
- Set `displayHeaderFooter: true` with custom header/footer templates including page numbers
- Close browser instances in finally blocks to prevent resource leaks
- Handle font loading (use @font-face or system fonts like DejaVu Sans for Unicode support)
- Test PDF output with different page sizes (A4, Letter, Legal)
- Use pdf-lib for merging multiple PDF buffers
- Implement retry logic with exponential backoff for transient failures
- Tag PDFs for accessibility compliance when required
- Optimize for serverless environments using chrome-aws-lambda
- Add watermarks for draft/confidential documents
- Use running headers and footers for multi-page consistency
- Generate table of contents for multi-section reports
- Control page orientation per section with named @page rules
- Monitor memory usage during large PDF generation and implement chunking as needed
