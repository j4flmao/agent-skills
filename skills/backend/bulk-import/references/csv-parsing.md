# CSV Parsing

## Overview
CSV parsing is the foundational layer of any bulk import system. Robust CSV handling must account for varied dialects, encoding issues, malformed rows, large files, and edge cases that commonly appear in user-uploaded data.

## CSV Dialect Detection

### Dialect Sniffing
Different systems export CSV with different delimiters, quoting rules, and line terminators. Dialect sniffing automatically detects these parameters:

```python
import csv
from typing import TextIO

class DialectSniffer:
    def sniff(self, file: TextIO, sample_size: int = 10240) -> csv.Dialect:
        sample = file.read(sample_size)
        file.seek(0)
        try:
            dialect = csv.Sniffer().sniff(sample)
            return dialect
        except csv.Error:
            return csv.excel

    def detect_delimiter(self, sample: str) -> str:
        delimiters = [",", "\t", ";", "|", "^"]
        counts = {d: sample.count(d) for d in delimiters}
        first_line = sample.split("\n")[0] if sample else ""
        line_counts = {d: first_line.count(d) for d in delimiters}
        for d in delimiters:
            if line_counts[d] > 0 and counts[d] % line_counts[d] == 0:
                return d
        return ","

    def detect_quoting(self, sample: str) -> str:
        if sample.count('"') > sample.count("'"):
            return '"'
        return "'"

sniffer = DialectSniffer()

with open("export.csv", "r", encoding="utf-8-sig") as f:
    dialect = sniffer.sniff(f)
    reader = csv.DictReader(f, dialect=dialect)
    for row in reader:
        print(row)
```

## Encoding Handling

### Encoding Detection

```python
import chardet
from codecs import lookup

class EncodingDetector:
    def __init__(self):
        self.preferred_order = [
            "utf-8", "utf-8-sig", "utf-16", "windows-1252",
            "iso-8859-1", "latin-1", "cp1252", "shift_jis",
            "euc-kr", "gb2312", "gbk", "big5"
        ]

    def detect(self, file_path: str) -> tuple[str, float]:
        with open(file_path, "rb") as f:
            raw = f.read(100000)
        result = chardet.detect(raw)
        encoding = result["encoding"]
        confidence = result["confidence"]
        if encoding and confidence > 0.8:
            return encoding.lower(), confidence
        for enc in self.preferred_order:
            try:
                lookup(enc)
                with open(file_path, "r", encoding=enc) as f:
                    f.read(1000)
                return enc, 0.5
            except (UnicodeDecodeError, LookupError):
                continue
        return "utf-8", 0.1

    def normalize_encoding(self, encoding: str) -> str:
        encoding = encoding.lower()
        if encoding in ("ascii",):
            return "utf-8"
        if encoding == "iso-8859-1":
            return "windows-1252"
        if encoding.startswith("utf"):
            return encoding.replace("utf", "utf")
        return encoding

class EncodedFileReader:
    def __init__(self, file_path: str):
        self.file_path = file_path
        self.detector = EncodingDetector()

    def open(self) -> TextIO:
        encoding, confidence = self.detector.detect(self.file_path)
        errors = "surrogateescape" if confidence < 0.9 else "strict"
        return open(
            self.file_path, "r",
            encoding=encoding,
            errors=errors
        )

    def read_with_fallback(self) -> str:
        try:
            with self.open() as f:
                return f.read()
        except UnicodeDecodeError:
            with open(self.file_path, "rb") as f:
                raw = f.read()
            for enc in ["utf-8", "windows-1252", "latin-1"]:
                try:
                    return raw.decode(enc)
                except UnicodeDecodeError:
                    continue
            return raw.decode("utf-8", errors="replace")
```

## Streaming Parsers

### Streaming CSV Parser for Large Files

```python
import io
from typing import Generator

class StreamingCSVParser:
    def __init__(self, chunk_size: int = 8192,
                 delimiter: str = ",",
                 quotechar: str = '"'):
        self.chunk_size = chunk_size
        self.delimiter = delimiter
        self.quotechar = quotechar

    def parse_stream(self, file_path: str) -> Generator[dict, None, None]:
        with open(file_path, "r", encoding="utf-8-sig",
                  newline="") as f:
            reader = csv.DictReader(
                f, delimiter=self.delimiter,
                quotechar=self.quotechar
            )
            for row_number, row in enumerate(reader, start=2):
                yield {
                    "row_number": row_number,
                    "data": {k.strip(): v for k, v in row.items()},
                    "raw": row
                }

    def parse_chunks(self, file_path: str) -> Generator[list[dict], None, None]:
        buffer = []
        for record in self.parse_stream(file_path):
            buffer.append(record)
            if len(buffer) >= 1000:
                yield buffer
                buffer = []
        if buffer:
            yield buffer
```

### Memory-Mapped Parsing

```python
import mmap
import re

class MMapCSVParser:
    def __init__(self, file_path: str):
        self.file_path = file_path

    def parse(self) -> Generator[list[str], None, None]:
        with open(self.file_path, "r+b") as f:
            with mmap.mmap(f.fileno(), 0, access=mmap.ACCESS_READ) as mm:
                content = mm.read().decode("utf-8-sig")
                lines = content.splitlines()
                header = self._parse_line(lines[0])
                yield header
                for line in lines[1:]:
                    if line.strip():
                        yield self._parse_line(line)

    def _parse_line(self, line: str) -> list[str]:
        fields = []
        current = []
        in_quotes = False
        for char in line:
            if char == '"':
                in_quotes = not in_quotes
            elif char == "," and not in_quotes:
                fields.append("".join(current).strip())
                current = []
            else:
                current.append(char)
        fields.append("".join(current).strip())
        return fields

    def count_rows(self) -> int:
        with open(self.file_path, "rb") as f:
            buf = f.read(65536)
            lines = buf.count(b"\n")
            f.seek(-min(65536, f.seek(0, 2)), 2)
            buf = f.read()
            lines += buf.count(b"\n")
        return max(0, lines - 1)
```

## Error Handling and Recovery

### Row-Level Error Handling

```python
class ParseError(Exception):
    def __init__(self, row_number: int, message: str,
                 raw_value: str | None = None):
        self.row_number = row_number
        self.message = message
        self.raw_value = raw_value
        super().__init__(f"Row {row_number}: {message}")

class CSVParseResult:
    def __init__(self):
        self.rows: list[dict] = []
        self.errors: list[ParseError] = []
        self.warnings: list[str] = []
        self.header: list[str] = []

    def add_error(self, error: ParseError):
        self.errors.append(error)

    def add_warning(self, warning: str):
        self.warnings.append(warning)

    @property
    def success_count(self) -> int:
        return len(self.rows)

    @property
    def error_count(self) -> int:
        return len(self.errors)

    @property
    def has_errors(self) -> bool:
        return len(self.errors) > 0

class ResilientCSVParser:
    def __init__(self, strict: bool = False):
        self.strict = strict

    def parse(self, file_path: str) -> CSVParseResult:
        result = CSVParseResult()
        with open(file_path, "r", encoding="utf-8-sig",
                  newline="") as f:
            reader = csv.reader(f)
            try:
                header = next(reader)
                result.header = [h.strip() for h in header]
            except StopIteration:
                result.add_error(ParseError(1, "Empty file"))
                return result

            for row_num, row in enumerate(reader, start=2):
                try:
                    if not row or all(cell.strip() == ""
                                      for cell in row):
                        continue
                    if len(row) != len(result.header):
                        raise ParseError(
                            row_num,
                            f"Expected {len(result.header)} columns, "
                            f"got {len(row)}",
                            raw_value=",".join(row)
                        )
                    record = {}
                    for i, field in enumerate(row):
                        col_name = result.header[i]
                        record[col_name] = field.strip()
                    result.rows.append(record)
                except ParseError as e:
                    if self.strict:
                        raise
                    result.add_error(e)
                except Exception as e:
                    if self.strict:
                        raise
                    result.add_error(
                        ParseError(row_num, str(e),
                                   raw_value=",".join(row))
                    )
        return result
```

## Type Coercion

### Automatic Type Detection and Casting

```python
from datetime import datetime
from decimal import Decimal
import re

class TypeCoercer:
    def __init__(self):
        self.coercers = [
            ("integer", self._to_int),
            ("decimal", self._to_decimal),
            ("boolean", self._to_bool),
            ("date", self._to_date),
            ("datetime", self._to_datetime),
            ("string", str)
        ]

    def coerce(self, value: str) -> tuple[Any, str]:
        for type_name, coercer in self.coercers:
            try:
                result = coercer(value)
                if result is not None:
                    return result, type_name
            except (ValueError, TypeError):
                continue
        return value, "string"

    def coerce_row(self, row: dict,
                   schema: dict[str, str]) -> dict:
        coerced = {}
        for column, value in row.items():
            expected_type = schema.get(column, "string")
            try:
                coercer = dict(self.coercers).get(expected_type, str)
                coerced[column] = coercer(value)
            except (ValueError, TypeError):
                coerced[column] = value
        return coerced

    def _to_int(self, value: str) -> int | None:
        cleaned = value.strip().replace(",", "")
        if not cleaned:
            return None
        return int(Decimal(cleaned))

    def _to_decimal(self, value: str) -> Decimal | None:
        cleaned = value.strip().replace(",", "").replace("$", "")
        if not cleaned:
            return None
        return Decimal(cleaned)

    def _to_bool(self, value: str) -> bool | None:
        truthy = {"true", "yes", "1", "y", "t", "on"}
        falsy = {"false", "no", "0", "n", "f", "off"}
        cleaned = value.strip().lower()
        if cleaned in truthy:
            return True
        if cleaned in falsy:
            return False
        return None

    def _to_date(self, value: str) -> datetime | None:
        formats = [
            "%Y-%m-%d", "%m/%d/%Y", "%d/%m/%Y",
            "%Y/%m/%d", "%m-%d-%Y", "%d-%m-%Y",
            "%Y.%m.%d", "%m.%d.%Y"
        ]
        cleaned = value.strip()
        for fmt in formats:
            try:
                return datetime.strptime(cleaned, fmt)
            except ValueError:
                continue
        return None

    def _to_datetime(self, value: str) -> datetime | None:
        formats = [
            "%Y-%m-%d %H:%M:%S",
            "%Y-%m-%dT%H:%M:%S",
            "%m/%d/%Y %H:%M:%S",
            "%Y-%m-%d %H:%M:%S.%f",
            "%Y-%m-%dT%H:%M:%S.%fZ",
            "%Y-%m-%dT%H:%M:%S%z"
        ]
        cleaned = value.strip()
        for fmt in formats:
            try:
                return datetime.strptime(cleaned, fmt)
            except ValueError:
                continue
        return None
```

## Large File Handling

### Chunked Processing

```python
class ChunkedCSVProcessor:
    def __init__(self, chunk_size: int = 5000,
                 max_rows: int | None = None):
        self.chunk_size = chunk_size
        self.max_rows = max_rows

    def process_in_chunks(self, file_path: str,
                          processor: callable) -> ChunkedResult:
        result = ChunkedResult()
        processed = 0

        for chunk in self._read_chunks(file_path):
            if self.max_rows and processed >= self.max_rows:
                break
            chunk_result = processor(chunk)
            result.merge(chunk_result)
            processed += len(chunk)
            result.chunks_processed += 1

        return result

    def _read_chunks(self, file_path: str) -> Generator[list[dict], None, None]:
        chunk = []
        with open(file_path, "r", encoding="utf-8-sig",
                  newline="") as f:
            reader = csv.DictReader(f)
            for row in reader:
                chunk.append(row)
                if len(chunk) >= self.chunk_size:
                    yield chunk
                    chunk = []
        if chunk:
            yield chunk

class ChunkedResult:
    def __init__(self):
        self.chunks_processed = 0
        self.total_rows = 0
        self.errors: list[ParseError] = []
        self.metrics: dict[str, int] = {}

    def merge(self, other: "ChunkedResult"):
        self.total_rows += other.total_rows
        self.errors.extend(other.errors)
        for k, v in other.metrics.items():
            self.metrics[k] = self.metrics.get(k, 0) + v
```

## Column Mapping

```python
class ColumnMapper:
    def __init__(self):
        self.mappings: dict[str, ColumnMapping] = {}

    def add_mapping(self, source_column: str,
                    target_field: str,
                    transform: callable | None = None,
                    required: bool = False):
        self.mappings[source_column] = ColumnMapping(
            source=source_column,
            target=target_field,
            transform=transform,
            required=required
        )

    def add_alias(self, source_column: str,
                  aliases: list[str]):
        if source_column in self.mappings:
            self.mappings[source_column].aliases = aliases

    def map_row(self, row: dict) -> tuple[dict, list[str]]:
        mapped = {}
        warnings = []
        for source_col, mapping in self.mappings.items():
            value = row.get(source_col)
            for alias in mapping.aliases:
                if value is None or value == "":
                    value = row.get(alias)
            if mapping.required and (value is None or value == ""):
                warnings.append(
                    f"Required column '{source_col}' is empty"
                )
            if value is not None and mapping.transform:
                try:
                    value = mapping.transform(value)
                except Exception as e:
                    warnings.append(
                        f"Transform failed for '{source_col}': {e}"
                    )
            mapped[mapping.target] = value
        return mapped, warnings

    def auto_detect(self, header: list[str],
                    known_columns: dict[str, str]):
        for col in header:
            normalized = col.lower().strip().replace(" ", "_")
            if normalized in known_columns:
                self.add_mapping(col, known_columns[normalized])
```

## Key Points

- Dialect sniffing detects delimiters, quoting, and line terminators automatically from file samples.
- Encoding detection with chardet handles UTF-8, Windows-1252, and other common encodings with fallback strategies.
- Streaming parsers process files row-by-row without loading entire files into memory.
- Row-level error handling captures parse failures per row without aborting the entire import.
- Type coercion automatically detects and converts integers, decimals, booleans, dates, and datetimes.
- Chunked processing splits large files into manageable batches for memory-efficient processing.
- Column mapping allows renaming, aliasing, and transforming source columns to match target schemas.
- Memory-mapped parsing enables efficient random access to large CSV files without full loading.
