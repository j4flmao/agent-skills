# Validation Pipeline

## Overview
The validation pipeline is a configurable chain of validators that inspect, sanitize, and enrich imported data before it reaches the persistence layer. A well-designed pipeline catches errors early, provides actionable feedback, and prevents corrupt data from entering the system.

## Pipeline Architecture

### Pipeline Model

```python
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Generator

class ValidationSeverity(Enum):
    ERROR = "error"
    WARNING = "warning"
    INFO = "info"

@dataclass
class ValidationResult:
    row_number: int
    column: str | None
    severity: ValidationSeverity
    code: str
    message: str
    rejected_value: Any = None
    expected_value: Any = None

@dataclass
class ValidationContext:
    row: dict
    row_number: int
    headers: list[str]
    schema: dict[str, Any]
    existing_data: dict[str, Any] | None = None
    results: list[ValidationResult] = field(default_factory=list)

class Validator(ABC):
    @abstractmethod
    def validate(self, ctx: ValidationContext) -> list[ValidationResult]:
        pass

    def __or__(self, other: "Validator") -> "Validator":
        return AnyOf([self, other])

    def __and__(self, other: "Validator") -> "Validator":
        return AllOf([self, other])
```

### Pipeline Implementation

```python
class ValidationPipeline:
    def __init__(self):
        self.validators: list[Validator] = []
        self.fail_fast = False
        self.max_errors = 100

    def add_validator(self, validator: Validator,
                      position: int | None = None):
        if position is not None:
            self.validators.insert(position, validator)
        else:
            self.validators.append(validator)

    def remove_validator(self, validator_type: type):
        self.validators = [
            v for v in self.validators
            if not isinstance(v, validator_type)
        ]

    def validate_row(self, row: dict, row_number: int,
                     schema: dict,
                     existing: dict | None = None) -> list[ValidationResult]:
        ctx = ValidationContext(
            row=row,
            row_number=row_number,
            headers=list(row.keys()),
            schema=schema,
            existing_data=existing
        )
        for validator in self.validators:
            results = validator.validate(ctx)
            ctx.results.extend(results)
            errors = [r for r in results
                      if r.severity == ValidationSeverity.ERROR]
            if self.fail_fast and errors:
                break
            if len([r for r in ctx.results
                    if r.severity == ValidationSeverity.ERROR]
                  ) >= self.max_errors:
                break
        return ctx.results

    def validate_batch(self, rows: list[dict],
                       schema: dict) -> list[list[ValidationResult]]:
        return [
            self.validate_row(row, i + 1, schema)
            for i, row in enumerate(rows)
        ]
```

## Built-in Validators

### Type Validator

```python
class TypeValidator(Validator):
    def __init__(self, expected_types: dict[str, str]):
        self.expected_types = expected_types
        self.type_map = {
            "string": str,
            "integer": int,
            "decimal": (float, Decimal),
            "boolean": bool,
            "date": datetime,
            "email": str,
            "phone": str
        }

    def validate(self, ctx: ValidationContext) -> list[ValidationResult]:
        results = []
        for column, expected_type in self.expected_types.items():
            value = ctx.row.get(column)
            if value is None or value == "":
                continue
            py_type = self.type_map.get(expected_type)
            if py_type and not isinstance(value, py_type):
                results.append(ValidationResult(
                    row_number=ctx.row_number,
                    column=column,
                    severity=ValidationSeverity.ERROR,
                    code="TYPE_MISMATCH",
                    message=f"Expected {expected_type}, got {type(value).__name__}",
                    rejected_value=str(value),
                    expected_value=expected_type
                ))
        return results
```

### Required Fields Validator

```python
class RequiredFieldsValidator(Validator):
    def __init__(self, required_fields: list[str],
                 allow_empty_strings: bool = False):
        self.required_fields = required_fields
        self.allow_empty_strings = allow_empty_strings

    def validate(self, ctx: ValidationContext) -> list[ValidationResult]:
        results = []
        for field in self.required_fields:
            value = ctx.row.get(field)
            if value is None:
                results.append(ValidationResult(
                    row_number=ctx.row_number,
                    column=field,
                    severity=ValidationSeverity.ERROR,
                    code="REQUIRED_FIELD_MISSING",
                    message=f"Required field '{field}' is missing",
                ))
            elif not self.allow_empty_strings and (
                isinstance(value, str) and value.strip() == ""
            ):
                results.append(ValidationResult(
                    row_number=ctx.row_number,
                    column=field,
                    severity=ValidationSeverity.ERROR,
                    code="REQUIRED_FIELD_EMPTY",
                    message=f"Required field '{field}' is empty",
                    rejected_value=value
                ))
        return results
```

### Format Validators

```python
import re

class FormatValidator(Validator):
    def __init__(self, patterns: dict[str, str]):
        self.patterns = {
            col: re.compile(pat)
            for col, pat in patterns.items()
        }

    def validate(self, ctx: ValidationContext) -> list[ValidationResult]:
        results = []
        for column, pattern in self.patterns.items():
            value = ctx.row.get(column)
            if value is None or value == "":
                continue
            if not pattern.match(str(value)):
                results.append(ValidationResult(
                    row_number=ctx.row_number,
                    column=column,
                    severity=ValidationSeverity.ERROR,
                    code="FORMAT_MISMATCH",
                    message=f"Value '{value}' does not match required format",
                    rejected_value=str(value)
                ))
        return results

class EmailValidator(Validator):
    EMAIL_PATTERN = re.compile(
        r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"
    )

    def __init__(self, columns: list[str]):
        self.columns = columns

    def validate(self, ctx: ValidationContext) -> list[ValidationResult]:
        results = []
        for column in self.columns:
            value = ctx.row.get(column)
            if value and not self.EMAIL_PATTERN.match(str(value)):
                results.append(ValidationResult(
                    row_number=ctx.row_number,
                    column=column,
                    severity=ValidationSeverity.ERROR,
                    code="INVALID_EMAIL",
                    message=f"Invalid email format: {value}",
                    rejected_value=str(value)
                ))
        return results
```

### Range Validator

```python
class RangeValidator(Validator):
    def __init__(self, ranges: dict[str, tuple[Any | None, Any | None]]):
        self.ranges = ranges

    def validate(self, ctx: ValidationContext) -> list[ValidationResult]:
        results = []
        for column, (min_val, max_val) in self.ranges.items():
            value = ctx.row.get(column)
            if value is None:
                continue
            if min_val is not None and value < min_val:
                results.append(ValidationResult(
                    row_number=ctx.row_number,
                    column=column,
                    severity=ValidationSeverity.ERROR,
                    code="VALUE_BELOW_MINIMUM",
                    message=f"Value {value} is below minimum {min_val}",
                    rejected_value=str(value),
                    expected_value=str(min_val)
                ))
            if max_val is not None and value > max_val:
                results.append(ValidationResult(
                    row_number=ctx.row_number,
                    column=column,
                    severity=ValidationSeverity.ERROR,
                    code="VALUE_ABOVE_MAXIMUM",
                    message=f"Value {value} exceeds maximum {max_val}",
                    rejected_value=str(value),
                    expected_value=str(max_val)
                ))
        return results
```

### Uniqueness Validator

```python
from collections import defaultdict

class UniquenessValidator(Validator):
    def __init__(self, unique_columns: list[str],
                 existing_values: set | None = None):
        self.unique_columns = unique_columns
        self.seen_values: dict[str, set] = defaultdict(set)
        self.existing_values = existing_values or set()

    def validate(self, ctx: ValidationContext) -> list[ValidationResult]:
        results = []
        for column in self.unique_columns:
            value = ctx.row.get(column)
            if value is None:
                continue
            key = f"{column}:{value}"
            if key in self.seen_values[column]:
                results.append(ValidationResult(
                    row_number=ctx.row_number,
                    column=column,
                    severity=ValidationSeverity.ERROR,
                    code="DUPLICATE_VALUE",
                    message=f"Duplicate value '{value}' in column '{column}'",
                    rejected_value=str(value)
                ))
            elif value in self.existing_values:
                results.append(ValidationResult(
                    row_number=ctx.row_number,
                    column=column,
                    severity=ValidationSeverity.WARNING,
                    code="EXISTING_VALUE",
                    message=f"Value '{value}' already exists in database",
                    rejected_value=str(value)
                ))
            self.seen_values[column].add(key)
        return results
```

### Cross-Field Validator

```python
class CrossFieldValidator(Validator):
    def __init__(self, rules: list[CrossFieldRule]):
        self.rules = rules

    def validate(self, ctx: ValidationContext) -> list[ValidationResult]:
        results = []
        for rule in self.rules:
            if not rule.condition(ctx.row):
                results.append(ValidationResult(
                    row_number=ctx.row_number,
                    column=rule.column,
                    severity=ValidationSeverity.ERROR,
                    code="CROSS_FIELD_VIOLATION",
                    message=rule.message(ctx.row),
                ))
        return results

@dataclass
class CrossFieldRule:
    column: str
    condition: callable
    message: callable

class DateRangeValidator(CrossFieldValidator):
    def __init__(self, start_column: str, end_column: str):
        rule = CrossFieldRule(
            column=end_column,
            condition=lambda r: (
                r.get(start_column) is None or
                r.get(end_column) is None or
                r.get(end_column) >= r.get(start_column)
            ),
            message=lambda r: (
                f"End date {r.get(end_column)} is before "
                f"start date {r.get(start_column)}"
            )
        )
        super().__init__([rule])
```

### Reference Validator

```python
class ReferenceValidator(Validator):
    def __init__(self, foreign_keys: dict[str, ReferenceLookup]):
        self.foreign_keys = foreign_keys

    def validate(self, ctx: ValidationContext) -> list[ValidationResult]:
        results = []
        for column, lookup in self.foreign_keys.items():
            value = ctx.row.get(column)
            if value is None or value == "":
                continue
            if not lookup.exists(value):
                results.append(ValidationResult(
                    row_number=ctx.row_number,
                    column=column,
                    severity=ValidationSeverity.ERROR,
                    code="REFERENCE_NOT_FOUND",
                    message=f"Referenced value '{value}' not found in {lookup.table}",
                    rejected_value=str(value)
                ))
        return results

@dataclass
class ReferenceLookup:
    table: str
    column: str
    db_session: Any

    def exists(self, value: Any) -> bool:
        query = f"SELECT COUNT(1) FROM {self.table} WHERE {self.column} = %s"
        result = self.db_session.execute(query, (value,))
        return result.scalar() > 0
```

## Conditional Validation

```python
class ConditionalValidator(Validator):
    def __init__(self, condition: callable,
                 validator: Validator):
        self.condition = condition
        self.validator = validator

    def validate(self, ctx: ValidationContext) -> list[ValidationResult]:
        if self.condition(ctx.row):
            return self.validator.validate(ctx)
        return []

class AnyOf(Validator):
    def __init__(self, validators: list[Validator]):
        self.validators = validators

    def validate(self, ctx: ValidationContext) -> list[ValidationResult]:
        all_results = []
        for v in self.validators:
            results = v.validate(ctx)
            errors = [r for r in results
                      if r.severity == ValidationSeverity.ERROR]
            if not errors:
                return []
            all_results.extend(results)
        return all_results

class AllOf(Validator):
    def __init__(self, validators: list[Validator]):
        self.validators = validators

    def validate(self, ctx: ValidationContext) -> list[ValidationResult]:
        results = []
        for v in self.validators:
            results.extend(v.validate(ctx))
        return results
```

## Transformation Validators

### Data Sanitizer

```python
class SanitizerValidator(Validator):
    def __init__(self, sanitizers: dict[str, callable]):
        self.sanitizers = sanitizers

    def validate(self, ctx: ValidationContext) -> list[ValidationResult]:
        for column, sanitizer in self.sanitizers.items():
            if column in ctx.row:
                ctx.row[column] = sanitizer(ctx.row[column])
        return []

def strip_whitespace(value: Any) -> str:
    if isinstance(value, str):
        return value.strip()
    return value

def normalize_email(value: Any) -> str:
    if isinstance(value, str):
        return value.strip().lower()
    return value

def remove_non_numeric(value: Any) -> str:
    if isinstance(value, str):
        return re.sub(r"[^\d.]", "", value)
    return value
```

## Error Aggregation

```python
class ErrorAggregator:
    def __init__(self):
        self.errors_by_code: dict[str, list[ValidationResult]] = {}
        self.errors_by_column: dict[str, list[ValidationResult]] = {}

    def add_results(self, results: list[ValidationResult]):
        for result in results:
            if result.code not in self.errors_by_code:
                self.errors_by_code[result.code] = []
            self.errors_by_code[result.code].append(result)
            if result.column:
                if result.column not in self.errors_by_column:
                    self.errors_by_column[result.column] = []
                self.errors_by_column[result.column].append(result)

    def summary(self) -> dict:
        return {
            "total_errors": sum(
                len(v) for v in self.errors_by_code.values()
            ),
            "error_codes": {
                code: len(results)
                for code, results in self.errors_by_code.items()
            },
            "columns_with_errors": {
                col: len(results)
                for col, results in self.errors_by_column.items()
            },
            "most_common_errors": sorted(
                self.errors_by_code.items(),
                key=lambda x: len(x[1]),
                reverse=True
            )[:5]
        }

    def generate_report(self) -> str:
        lines = ["# Validation Report\n"]
        summary = self.summary()
        lines.append(f"Total Errors: {summary['total_errors']}\n")
        lines.append("\n## Errors by Code\n")
        for code, count in summary["error_codes"].items():
            lines.append(f"- **{code}**: {count}")
        lines.append("\n## Errors by Column\n")
        for col, count in summary["columns_with_errors"].items():
            lines.append(f"- **{col}**: {count}")
        return "\n".join(lines)
```

## Custom Validator Example

```python
class BusinessRuleValidator(Validator):
    def __init__(self, rules: list[BusinessRule]):
        self.rules = rules

    def validate(self, ctx: ValidationContext) -> list[ValidationResult]:
        results = []
        for rule in self.rules:
            try:
                violations = rule.evaluate(ctx.row)
                for violation in violations:
                    results.append(ValidationResult(
                        row_number=ctx.row_number,
                        column=violation.column,
                        severity=ValidationSeverity.ERROR,
                        code=rule.code,
                        message=violation.message,
                        rejected_value=violation.value
                    ))
            except Exception as e:
                results.append(ValidationResult(
                    row_number=ctx.row_number,
                    column=None,
                    severity=ValidationSeverity.ERROR,
                    code="RULE_EVALUATION_ERROR",
                    message=f"Business rule '{rule.name}' failed: {e}"
                ))
        return results

@dataclass
class BusinessRule:
    name: str
    code: str
    evaluate: callable

# Example usage
order_limit_rule = BusinessRule(
    name="Order Limit Check",
    code="ORDER_LIMIT_EXCEEDED",
    evaluate=lambda row: (
        [FieldViolation("total", "Order total exceeds limit", row["total"])]
        if float(row.get("total", 0)) > 10000
        else []
    )
)
```

## Key Points

- A validation pipeline is a composable chain of validators processing each row sequentially.
- Validators cover types, required fields, formats, ranges, uniqueness, cross-field constraints, and reference integrity.
- Conditional validators apply rules only when specific row conditions are met.
- Validation results carry severity levels (error, warning, info) for differentiated handling.
- Error aggregation groups failures by error code and column for reporting and analysis.
- Sanitizer validators clean and normalize data inline during the validation pass.
- Composable validators (AnyOf, AllOf) support complex boolean logic in validation rules.
- Business rule validators encapsulate domain-specific logic separate from structural validation.
