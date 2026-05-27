# Excel and CSV Export

## Overview
Excel and CSV export are essential for data-driven applications. ExcelJS provides comprehensive Excel file generation with formatting, formulas, and multi-sheet support. Streamed CSV export handles large datasets efficiently.

## ExcelJS Fundamentals

### Basic Workbook Creation

```typescript
import ExcelJS from 'exceljs';

async function createWorkbook(): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Report System';
  workbook.created = new Date();
  workbook.modified = new Date();
  workbook.lastPrinted = new Date();

  // Set workbook properties
  workbook.properties = {
    date1904: false,
    defaultTableStyle: 'TableStyleMedium2',
    filterPrivacy: false,
  };

  return workbook;
}
```

### Worksheet Management

```typescript
async function manageWorksheets(workbook: ExcelJS.Workbook): Promise<void> {
  // Add worksheet
  const sheet = workbook.addWorksheet('Sales Data', {
    views: [
      { state: 'frozen', xSplit: 0, ySplit: 1, activeCell: 'A2' },
    ],
    pageSetup: {
      paperSize: 9,    // A4
      orientation: 'landscape',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: {
        left: 0.7, right: 0.7,
        top: 0.75, bottom: 0.75,
        header: 0.3, footer: 0.3,
      },
    },
    properties: {
      tabColor: { argb: 'FF1a1a1a' },
      outlineLevelCol: 1,
      defaultColWidth: 12,
      defaultRowHeight: 20,
    },
  });

  // Duplicate worksheet
  const copy = await workbook.addWorksheet('Backup');
  copy.model = { ...sheet.model };

  // Remove worksheet
  workbook.removeWorksheet('temp');

  // Access by index or name
  const firstSheet = workbook.getWorksheet(1);
  const namedSheet = workbook.getWorksheet('Sales Data');
}
```

### Column Definitions

```typescript
interface ColumnDefinition {
  header: string;
  key: string;
  width?: number;
  style?: Partial<ExcelJS.Style>;
  hidden?: boolean;
  outlineLevel?: number;
}

function defineColumns(sheet: ExcelJS.Worksheet): void {
  sheet.columns = [
    { header: 'Date', key: 'date', width: 15, style: { numFmt: 'yyyy-mm-dd' } },
    { header: 'Product', key: 'product', width: 30 },
    { header: 'Category', key: 'category', width: 20 },
    { header: 'Quantity', key: 'quantity', width: 12, style: { numFmt: '#,##0' } },
    { header: 'Unit Price', key: 'unitPrice', width: 15, style: { numFmt: '$#,##0.00' } },
    { header: 'Total', key: 'total', width: 15, style: { numFmt: '$#,##0.00' } },
    { header: 'Status', key: 'status', width: 15 },
  ];

  // Multi-line header
  const headerRow = sheet.getRow(1);
  headerRow.height = 30;
  headerRow.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
}
```

## Data Writing

### Row and Cell Operations

```typescript
function writeData(sheet: ExcelJS.Worksheet, data: Record<string, unknown>[]): void {
  // Method 1: Add rows as arrays (matches column order)
  data.forEach(row => {
    sheet.addRow([
      row.date,
      row.product,
      row.category,
      row.quantity,
      row.unitPrice,
      row.quantity * row.unitPrice,
      row.status,
    ]);
  });

  // Method 2: Add rows as objects (uses column keys)
  data.forEach(row => sheet.addRow(row));

  // Method 3: Direct cell access
  const cell = sheet.getCell('A1');
  cell.value = 'Title';
  cell.font = { bold: true, size: 14 };

  // Method 4: Range operations
  const range = sheet.getCell('C3:E5');
  range.eachCell(cell => {
    cell.alignment = { horizontal: 'center' };
  });

  // Insert row at position
  sheet.insertRow(3, ['Total', '', '', '', '', '=SUM(F4:F100)']);

  // Duplicate row
  sheet.duplicateRow(2, 5); // Duplicate row 2, 5 times
}

function writeBulkData(sheet: ExcelJS.Worksheet, data: Record<string, unknown>[]): void {
  // Use bulk insertion for performance
  const rows = data.map(item => [
    item.date,
    item.product,
    item.category,
    item.quantity,
    item.unitPrice,
    item.total,
    item.status,
  ]);

  // Insert all rows at once
  sheet.addRows(rows);
}
```

## Cell Styling

### Style Definitions

```typescript
function applyStyles(sheet: ExcelJS.Worksheet): void {
  // Header row styling
  const headerRow = sheet.getRow(1);
  headerRow.font = {
    name: 'Inter',
    size: 11,
    bold: true,
    color: { argb: 'FFFFFFFF' },
  };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1a1a1a' },
  };
  headerRow.alignment = {
    vertical: 'middle',
    horizontal: 'center',
    wrapText: true,
  };
  headerRow.border = {
    bottom: { style: 'medium', color: { argb: 'FF333333' } },
  };

  // Alternating row colors
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber > 1 && rowNumber % 2 === 0) {
      row.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF4F4F6' },
      };
    }
  });

  // Conditional cell styling
  sheet.eachRow((row) => {
    const statusCell = row.getCell('status');
    if (statusCell.value === 'Completed') {
      statusCell.font = { color: { argb: 'FF00C853' }, bold: true };
    } else if (statusCell.value === 'Pending') {
      statusCell.font = { color: { argb: 'FFFF9800' }, bold: true };
    } else if (statusCell.value === 'Failed') {
      statusCell.font = { color: { argb: 'FFF44336' }, bold: true };
    }
  });
}
```

### Rich Text

```typescript
function writeRichText(sheet: ExcelJS.Worksheet, cellAddress: string): void {
  const cell = sheet.getCell(cellAddress);
  cell.value = {
    richText: [
      { text: 'Report ', font: { bold: true, size: 14 } },
      { text: 'Generated ', font: { italic: true, color: { argb: 'FF666666' } } },
      { text: 'on ', font: { size: 11 } },
      { text: new Date().toLocaleDateString(), font: { color: { argb: 'FF0066FF' }, underline: true } },
    ],
  };
}
```

## Formulas and Functions

### Excel Formulas

```typescript
function addFormulas(sheet: ExcelJS.Worksheet): void {
  // SUM formula in total row
  const lastRow = sheet.rowCount + 1;
  sheet.getCell(`D${lastRow}`).value = { formula: `SUM(D2:D${lastRow - 1})`, result: 0 };
  sheet.getCell(`E${lastRow}`).value = { formula: `SUM(E2:E${lastRow - 1})`, result: 0 };

  // Row-level formula
  sheet.getCell('F2').value = { formula: 'D2*E2', result: 0 };

  // Average
  sheet.getCell(`D${lastRow + 1}`).value = { formula: `AVERAGE(D2:D${lastRow - 1})`, result: 0 };

  // Conditional count
  sheet.getCell('A1').value = { formula: `COUNTIF(G2:G${lastRow},"Completed")`, result: 0 };

  // VLOOKUP example
  sheet.getCell('H2').value = { formula: `VLOOKUP(B2,Pricing!A:B,2,FALSE)`, result: 0 };

  // IF statement
  sheet.getCell('I2').value = {
    formula: `IF(F2>1000,"High","Low")`,
    result: '',
  };
}
```

## Multi-Sheet Workbooks

### Complex Workbook Structure

```typescript
async function createMultiSheetWorkbook(data: ReportData): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook();

  // Sheet 1: Summary
  const summarySheet = workbook.addWorksheet('Summary');
  setupSummarySheet(summarySheet, data.summary);

  // Sheet 2: Detailed Data
  const detailSheet = workbook.addWorksheet('Details');
  setupDetailSheet(detailSheet, data.details);

  // Sheet 3: Charts (data for chart sheet)
  const chartSheet = workbook.addWorksheet('Chart Data', {
    state: 'veryHidden',  // Will not show in Excel UI
  });
  setupChartData(chartSheet, data.chartData);

  // Sheet 4: Pivot data
  const pivotSheet = workbook.addWorksheet('Pivot Source', {
    state: 'hidden',
  });

  // Data validation across sheets
  const dropdownCell = detailSheet.getCell('A1');
  dropdownCell.dataValidation = {
    type: 'list',
    formulae: ['"Option1,Option2,Option3"'],
    allowBlank: true,
    showErrorMessage: true,
    errorTitle: 'Invalid option',
    error: 'Please select a valid option from the dropdown.',
  };

  return workbook;
}
```

### Cross-Sheet References

```typescript
function addCrossSheetReferences(sheet: ExcelJS.Worksheet): void {
  // Reference another sheet
  sheet.getCell('A1').value = {
    formula: '=Summary!B2',
    result: 0,
  };

  // 3D reference across sheets
  sheet.getCell('B1').value = {
    formula: '=SUM(Jan:Dec!C5)',
    result: 0,
  };
}
```

## CSV Export

### Basic CSV Generation

```typescript
function generateCsv(data: Record<string, unknown>[]): string {
  if (data.length === 0) return '';

  const headers = Object.keys(data[0]);
  const csvRows = [headers.join(',')];

  for (const row of data) {
    const values = headers.map(header => {
      const value = row[header];
      const escaped = String(value ?? '').replace(/"/g, '""');
      return `"${escaped}"`;
    });
    csvRows.push(values.join(','));
  }

  return csvRows.join('\r\n');
}
```

### Streamed CSV Export for Large Datasets

```typescript
import { Transform, Writable } from 'stream';
import { createWriteStream } from 'fs';

async function streamCsvToResponse(
  dataIterator: AsyncIterable<Record<string, unknown>[]>,
  headers: string[],
  response: ServerResponse,
  fileName: string,
): Promise<void> {
  response.setHeader('Content-Type', 'text/csv; charset=utf-8');
  response.setHeader('Content-Disposition', `attachment; filename="${fileName}.csv"`);
  response.setHeader('Transfer-Encoding', 'chunked');

  // Write BOM for Excel UTF-8 compatibility
  response.write('\uFEFF');

  // Write headers
  const headerRow = headers.map(h => `"${h}"`).join(',') + '\r\n';
  response.write(headerRow);

  // Stream data in batches
  for await (const batch of dataIterator) {
    const rows = batch.map(row => {
      return headers.map(header => {
        const value = row[header];
        if (value === null || value === undefined) return '';
        const escaped = String(value).replace(/"/g, '""');
        return `"${escaped}"`;
      }).join(',');
    }).join('\r\n') + '\r\n';

    response.write(rows);
  }

  response.end();
}
```

### CSV Stringifier with Object Support

```typescript
import { stringify } from 'csv-stringify';

function createObjectCsvStringifier(headers: { id: string; title: string }[]): Transform {
  const stringifier = stringify({
    header: true,
    columns: headers.map(h => ({ key: h.id, header: h.title })),
    delimiter: ',',
    record_delimiter: '\r\n',
    cast: {
      date: (value: Date) => value.toISOString().split('T')[0],
      number: (value: number) => value.toLocaleString('en-US'),
      boolean: (value: boolean) => value ? 'Yes' : 'No',
    },
  });

  return stringifier;
}
```

### Large CSV with File System Stream

```typescript
import { createReadStream, createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';

async function generateLargeCsvFile(
  query: string,
  batchSize: number,
  outputPath: string,
): Promise<void> {
  const writeStream = createWriteStream(outputPath, { encoding: 'utf-8' });

  // Write BOM
  writeStream.write('\uFEFF');

  // Write headers
  writeStream.write('"ID","Name","Email","Signup Date","Status"\r\n');

  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    const batch = await db.query(`${query} LIMIT ${batchSize} OFFSET ${offset}`);

    if (batch.length === 0) {
      hasMore = false;
    } else {
      for (const row of batch) {
        const escaped = [
          row.id,
          `"${(row.name || '').replace(/"/g, '""')}"`,
          `"${(row.email || '').replace(/"/g, '""')}"`,
          row.signup_date.toISOString().split('T')[0],
          `"${row.status}"`,
        ].join(',');
        writeStream.write(escaped + '\r\n');
      }
      offset += batchSize;

      // Flush periodically
      if (offset % (batchSize * 10) === 0) {
        await new Promise<void>(resolve => writeStream.write('', resolve));
      }
    }
  }

  writeStream.end();
}
```

## Large File Handling

### Memory-Efficient Processing

```typescript
class ExcelStreamWriter {
  private workbook: ExcelJS.Workbook;
  private rowCount = 0;
  private readonly maxRowsPerSheet = 1000000;

  constructor() {
    this.workbook = new ExcelJS.Workbook();
    this.addNewSheet();
  }

  async writeBatch(rows: Record<string, unknown>[]): Promise<void> {
    for (const row of rows) {
      if (this.rowCount >= this.maxRowsPerSheet) {
        this.addNewSheet();
      }
      this.currentSheet.addRow(row);
      this.rowCount++;
    }
  }

  private addNewSheet(): void {
    const sheetNumber = this.workbook.worksheets.length + 1;
    this.workbook.addWorksheet(`Data ${sheetNumber}`);
    this.rowCount = 0;
  }

  private get currentSheet(): ExcelJS.Worksheet {
    return this.workbook.worksheets[this.workbook.worksheets.length - 1];
  }

  async getBuffer(): Promise<Buffer> {
    return await this.workbook.xlsx.writeBuffer() as Buffer;
  }
}
```

### Compression

```typescript
import { createGzip } from 'zlib';

async function createCompressedCsv(data: Record<string, unknown>[], fileName: string): Promise<void> {
  const gzip = createGzip();
  const outputPath = `${fileName}.csv.gz`;

  const writeStream = createWriteStream(outputPath);
  const csvContent = generateCsv(data);

  return new Promise((resolve, reject) => {
    gzip.on('data', chunk => writeStream.write(chunk));
    gzip.on('end', () => {
      writeStream.end();
      resolve();
    });
    gzip.on('error', reject);
    gzip.end(Buffer.from(csvContent, 'utf-8'));
  });
}
```

## Formatting Best Practices

### Number and Date Formatting

```typescript
function applyNumberFormats(sheet: ExcelJS.Worksheet): void {
  // Currency formats
  sheet.getColumn('revenue').numFmt = '$#,##0.00';
  sheet.getColumn('cost').numFmt = '$#,##0.00';
  sheet.getColumn('margin').numFmt = '0.00%';

  // Date formats
  sheet.getColumn('created_at').numFmt = 'yyyy-mm-dd hh:mm:ss';
  sheet.getColumn('birth_date').numFmt = 'dd/mm/yyyy';

  // Scientific
  sheet.getColumn('measurement').numFmt = '0.00E+00';

  // Custom formats
  sheet.getColumn('phone').numFmt = '(@@) @@-@@@@';
  sheet.getColumn('zip').numFmt = '00000';
  sheet.getColumn('ssn').numFmt = '000-00-0000';
}
```

### Cell Protection

```typescript
function protectWorkbook(workbook: ExcelJS.Workbook, password: string): void {
  workbook.eachSheet(sheet => {
    // Protect sheet
    sheet.protect(password, {
      selectLockedCells: true,
      selectUnlockedCells: true,
      formatCells: false,
      formatColumns: false,
      formatRows: false,
      insertColumns: false,
      insertRows: false,
      deleteColumns: false,
      deleteRows: false,
      sort: true,
      autoFilter: true,
      pivotTables: true,
    });

    // Unlock specific cells for editing
    sheet.getCell('A1').protection = { locked: false };
    sheet.getCell('B1').protection = { locked: false };
  });
}
```

## Key Points

- Use ExcelJS for comprehensive Excel file generation with formatting, formulas, and multi-sheet support
- Always set header row styling (bold, background color, alignment) for professional output
- Use streaming for CSV export with datasets over 10K rows to avoid memory issues
- Write UTF-8 BOM (0xFEFF) for Excel compatibility with UTF-8 CSV files
- Implement batch processing with configurable batch sizes for large exports
- Use worksheet views (frozen panes, zoom level) for better user experience
- Apply appropriate number formats (currency, date, percentage) to columns
- Use rich text for mixed formatting within single cells
- Implement data validation and dropdown lists for interactive spreadsheets
- Use formulas for computed columns (totals, averages, percentages)
- Add alternating row colors for readability
- Protect worksheets with passwords when data should not be modified
- Create multi-sheet workbooks with summary, detail, and chart data sheets
- Use cross-sheet references for dashboard-style workbooks
- Implement compression (gzip) for large CSV files
- Handle special characters and commas in CSV values with proper quoting
- Test exports with various locale settings (decimal separators, date formats)
- Use page setup options for print-ready Excel exports
- Implement progress tracking for long-running exports
- Monitor memory usage and switch to disk-based processing for extremely large datasets
