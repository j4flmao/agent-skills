# CDC Schema Evolution

## Handling Schema Changes

Change Data Capture pipelines must handle source schema evolution without breaking downstream consumers.

### Schema Registry Integration

```python
from confluent_kafka.schema_registry import SchemaRegistryClient
from confluent_kafka.schema_registry.avro import AvroSerializer

class CDCSchemaManager:
    def __init__(self, registry_url: str):
        self.client = SchemaRegistryClient({"url": registry_url})
        self.compatibility_cache: dict[str, bool] = {}

    def register_or_update(self, subject: str, schema: str) -> int:
        registered = self.client.register(subject, schema)
        compatibility = self.client.test_compatibility(subject, schema)
        if not compatibility:
            raise SchemaIncompatibleError(
                f"Schema for {subject} is not backward compatible"
            )
        return registered
```

### Schema Evolution Strategies

```python
from enum import Enum
from typing import Any

class EvolutionStrategy(Enum):
    BACKWARD = "backward"        # New reader can read old data
    FORWARD = "forward"          # Old reader can read new data
    FULL = "full"                # Both directions compatible
    NONE = "none"                # No compatibility required
    FORWARD_TRANSITIVE = "forward_transitive"
    BACKWARD_TRANSITIVE = "backward_transitive"
    FULL_TRANSITIVE = "full_transitive"

class SchemaEvolutionHandler:
    def __init__(self, strategy: EvolutionStrategy = EvolutionStrategy.BACKWARD):
        self.strategy = strategy

    def handle_add_column(self, column: ColumnDef, existing_data: dict) -> dict:
        # New column with default for existing records
        if column.default is not None:
            existing_data[column.name] = column.default
        elif column.nullable:
            existing_data[column.name] = None
        return existing_data

    def handle_rename_column(self, old_name: str, new_name: str, record: dict) -> dict:
        if old_name in record:
            record[new_name] = record.pop(old_name)
        return record

    def handle_delete_column(self, column_name: str, record: dict) -> dict:
        record.pop(column_name, None)
        return record

    def handle_type_change(self, column: str, new_type: str, record: dict) -> dict:
        converter = TypeConverter()
        record[column] = converter.safe_cast(record[column], new_type)
        return record
```

## Handling Schema Drift

```python
class SchemaDriftDetector:
    def __init__(self, baseline_schema: dict):
        self.baseline = baseline_schema
        self.detected_changes: list[SchemaChange] = []

    def compare(self, current_schema: dict) -> list[SchemaChange]:
        changes = []

        # Detect new columns
        for col in current_schema["columns"]:
            if col["name"] not in {c["name"] for c in self.baseline["columns"]}:
                changes.append(SchemaChange(
                    type="add_column",
                    column=col["name"],
                    data_type=col["type"],
                ))

        # Detect removed columns
        for col in self.baseline["columns"]:
            if col["name"] not in {c["name"] for c in current_schema["columns"]}:
                changes.append(SchemaChange(
                    type="remove_column",
                    column=col["name"],
                    data_type=col["type"],
                ))

        # Detect type changes
        baseline_types = {c["name"]: c["type"] for c in self.baseline["columns"]}
        for col in current_schema["columns"]:
            if col["name"] in baseline_types:
                if col["type"] != baseline_types[col["name"]]:
                    changes.append(SchemaChange(
                        type="type_change",
                        column=col["name"],
                        old_type=baseline_types[col["name"]],
                        new_type=col["type"],
                    ))

        self.detected_changes.extend(changes)
        return changes
```

## Transform Layer

```python
class CDCSchemaTransform:
    def __init__(self, target_schema: dict):
        self.target = target_schema
        self.mappings: dict[str, ColumnMapping] = {}

    def add_mapping(self, source: str, target: str, transform: str | None = None):
        self.mappings[source] = ColumnMapping(source=source, target=target, transform=transform)

    def transform(self, source_record: dict) -> dict:
        result = {}
        for source_col, mapping in self.mappings.items():
            value = source_record.get(source_col)
            if mapping.transform:
                value = self._apply_transform(value, mapping.transform)
            result[mapping.target] = value

        # Include unmapped columns that exist in target
        for col in self.target["columns"]:
            if col["name"] not in result:
                result[col["name"]] = source_record.get(col["name"])

        return result
```

## Key Points

- Register schemas with Schema Registry for compatibility enforcement
- Choose evolution strategy: backward, forward, full, or transitive
- Default values for new columns ensure backward compatibility
- Detect schema drift automatically and alert on changes
- Maintain column mappings for source-to-target transformations
- Version all schema changes and maintain changelog
- Test schema compatibility before deploying consumer changes
- Handle type changes with safe casting and overflow detection
- Keep baseline schema snapshot for comparison in drift detection
