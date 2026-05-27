# Model Change Management

## Version Control for Data Models

Data models require version control, review processes, and automated deployment similar to application code.

### Model Versioning

```python
from enum import Enum
from datetime import datetime

class ModelChangeType(Enum):
    ADD_TABLE = "add_table"
    ADD_COLUMN = "add_column"
    RENAME_TABLE = "rename_table"
    RENAME_COLUMN = "rename_column"
    MODIFY_TYPE = "modify_type"
    DROP_COLUMN = "drop_column"
    DROP_TABLE = "drop_table"

class ModelVersion:
    def __init__(self, version_id: str, model: DataModel):
        self.id = version_id
        self.model = model
        self.changes: list[ModelChange] = []
        self.created_at = datetime.utcnow()
        self.approved_by: str | None = None

    def add_change(self, change: ModelChange):
        self.changes.append(change)

    def get_sql_migration(self) -> str:
        statements = []
        for change in self.changes:
            if change.type == ModelChangeType.ADD_TABLE:
                statements.append(self._generate_create_table(change))
            elif change.type == ModelChangeType.ADD_COLUMN:
                statements.append(f"ALTER TABLE {change.table} ADD COLUMN {change.definition}")
            elif change.type == ModelChangeType.DROP_COLUMN:
                statements.append(f"ALTER TABLE {change.table} DROP COLUMN {change.column}")
        return ";\n".join(statements) + ";"
```

### Schema Diff

```python
class SchemaDiffer:
    def diff(self, old: DataModel, new: DataModel) -> SchemaDiff:
        changes = []

        old_tables = {t.name: t for t in old.tables}
        new_tables = {t.name: t for t in new.tables}

        # Detect added tables
        for name, table in new_tables.items():
            if name not in old_tables:
                changes.append(TableChange(type="added", table=name, definition=table))

        # Detect removed tables
        for name, table in old_tables.items():
            if name not in new_tables:
                changes.append(TableChange(type="removed", table=name))

        # Detect column changes
        for name in old_tables & new_tables:
            old_cols = {c.name: c for c in old_tables[name].columns}
            new_cols = {c.name: c for c in new_tables[name].columns}
            for col_name in new_cols:
                if col_name not in old_cols:
                    changes.append(ColumnChange(type="added", table=name, column=new_cols[col_name]))
                elif old_cols[col_name].type != new_cols[col_name].type:
                    changes.append(ColumnChange(type="type_changed", table=name,
                                                column=col_name, old_type=old_cols[col_name].type,
                                                new_type=new_cols[col_name].type))

        return SchemaDiff(changes=changes, backward_compatible=self._is_backward_compatible(changes))
```

## Migration Pipeline

```python
class ModelMigrationPipeline:
    def __init__(self, version_control: VersionControl, deployment: DeploymentTarget):
        self.vc = version_control
        self.deployment = deployment

    def promote(self, version: ModelVersion, environment: str):
        if environment == "production" and not version.approved_by:
            raise ValueError("Production promotion requires approval")

        migration_sql = version.get_sql_migration()
        self.deployment.execute(migration_sql, environment)
        self.vc.tag(version.id, environment)
```

## Key Points

- Data models versioned alongside application code in Git
- Automated schema diff generates migration SQL
- Backward compatibility check prevents breaking changes
- Approval required before production deployment
- Environment promotion pipeline: dev → staging → production
- Schema diff detects added, removed, and modified columns
- Column type changes flagged as potentially breaking
- Rollback scripts generated for each migration
- Migration history tracked for audit compliance
- Automated testing of migration against staging data
