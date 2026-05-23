# Schema Evolution Policies

## Compatibility Mode Definitions

| Mode | Producer Side | Consumer Side | Use Case |
|------|--------------|---------------|----------|
| BACKWARD | Can delete columns, add optional fields | Must read old schema | Default batch pipelines |
| FORWARD | Can add columns, delete optional | Tolerate unknown fields | Stream consumers, CDC |
| FULL | Add optional only | Read any version | Strict governance, regulated |
| NONE | Any change allowed | Recompile required | Dev, prototyping |

## Breaking vs Non-Breaking Changes

```json
{
  "schema_version": "2.0.0",
  "breaking_changes": [
    {
      "change": "DROP_COLUMN",
      "field": "legacy_field",
      "impact": "All consumers reading this column will fail",
      "action": "MINOR bump with deprecation notice, MAJOR on removal"
    },
    {
      "change": "RENAME_COLUMN",
      "field": "old_name -> new_name",
      "impact": "Consumers referencing old name break",
      "action": "Add new column, deprecate old, remove in MAJOR"
    },
    {
      "change": "TYPE_CHANGE",
      "field": "INT -> STRING",
      "impact": "Widening safe, narrowing breaks consumers",
      "action": "Allow widening only (INT->LONG->FLOAT->DOUBLE->STRING)"
    },
    {
      "change": "REQUIRED_ADD",
      "field": "nullable -> required",
      "impact": "Existing null values break consumers",
      "action": "Backfill nulls first, then switch to required"
    },
    {
      "change": "DEFAULT_CHANGE",
      "field": "default value modified",
      "impact": "New rows differ from old, subtle breakage",
      "action": "Add new column with new default, deprecate old"
    }
  ],
  "non_breaking_changes": [
    {
      "change": "ADD_OPTIONAL_COLUMN",
      "field": "new_field with default",
      "impact": "No consumer impact",
      "action": "Safe in any mode"
    },
    {
      "change": "ADD_DEFAULT",
      "field": "existing nullable field gets default",
      "impact": "No consumer impact",
      "action": "Safe in BACKWARD and FULL"
    },
    {
      "change": "EXTEND_ENUM",
      "field": "new enum value added",
      "impact": "Consumers not handling new value may break",
      "action": "Document new value, notify consumers"
    },
    {
      "change": "DESCRIPTION_CHANGE",
      "field": "metadata only",
      "impact": "None",
      "action": "Always safe"
    }
  ]
}
```

## Evolution Workflow

1. **Propose change** — PR with updated contract YAML
2. **Detect compatibility** — CI compares old vs new schema
3. **Classify change** — breaking vs non-breaking
4. **Notify consumers** — if breaking, send notice with 14-day review window
5. **Version bump** — MAJOR (breaking), MINOR (additive), PATCH (fixes/annotations)
6. **Consumer acknowledgment** — all consumers must approve MAJOR changes
7. **Deploy** — after quorum approval, merge and deploy

## Automated Check Script

```python
def check_compatibility(old_schema, new_schema, mode):
    if mode == "BACKWARD":
        for field in old_schema.fields:
            if field.name not in new_schema.fields_map:
                raise BreakingChange(f"Missing field: {field.name}")
            new_field = new_schema.fields_map[field.name]
            if not is_type_compatible(field.type, new_field.type):
                raise BreakingChange(f"Type mismatch: {field.name}")
    elif mode == "FORWARD":
        for field in new_schema.fields:
            if field.required and field.name not in old_schema.fields_map:
                raise BreakingChange(f"New required field: {field.name}")
    return {"compatible": True, "mode": mode}
```

## Schema Registry Integration

| Registry | Contract Format | Compatibility Check |
|----------|---------------|-------------------|
| Confluent Schema Registry | Avro / Protobuf / JSON Schema | Built-in. Config per subject |
| AWS Glue Schema Registry | Avro / JSON Schema | API-based compatibility check |
| Apicurio Registry | Avro / Protobuf / OpenAPI | Rules engine with policies |
| dbt + dbt-af | YAML (dbt contracts) | CI-based with git diff |

Set `compatibility = BACKWARD` as default. Override per subject to FORWARD for CDC streams. Audit all compatibility failures.
