# Data Lake Governance and Access Control

## Access Control Models

Data lakes require fine-grained access control across tables, partitions, and columns.

### RBAC Implementation

```python
from enum import Enum
from dataclasses import dataclass

class Role(Enum):
    ADMIN = "admin"
    ENGINEER = "engineer"
    ANALYST = "analyst"
    DATA_SCIENTIST = "data_scientist"
    VIEWER = "viewer"
    AUDITOR = "auditor"

@dataclass
class Permission:
    zone: str          # bronze, silver, gold
    table: str         # table name or wildcard *
    columns: list[str] # column list or empty for all
    actions: list[str] # read, write, delete, alter
    row_filter: str | None = None

POLICIES = {
    Role.ADMIN: [Permission("*", "*", [], ["read", "write", "delete", "alter"])],
    Role.ENGINEER: [
        Permission("bronze", "*", [], ["read", "write"]),
        Permission("silver", "*", [], ["read", "write"]),
        Permission("gold", "*", [], ["read"]),
    ],
    Role.ANALYST: [
        Permission("gold", "*", [], ["read"]),
        Permission("silver", "dim_*", [], ["read"]),
    ],
}
```

### Column-Level Security

```python
class ColumnMasker:
    def __init__(self, config: ColumnMaskConfig):
        self.config = config

    def apply_masks(self, table_path: str, role: Role) -> str:
        rules = self._get_rules_for_table(table_path, role)
        if not rules:
            return table_path

        mask_statements = []
        for rule in rules:
            if rule.mask_type == "hide":
                mask_statements.append(
                    f"ALTER TABLE {table_path} "
                    f"ALTER COLUMN {rule.column} SET MASK POLICY hide_policy"
                )
            elif rule.mask_type == "partial":
                mask_statements.append(
                    f"ALTER TABLE {table_path} "
                    f"ALTER COLUMN {rule.column} "
                    f"SET MASK POLICY partial_mask_policy"
                )

        return "; ".join(mask_statements)

    def _get_rules_for_table(self, table: str, role: Role) -> list[MaskRule]:
        return [
            MaskRule(column="email", mask_type="partial"),
            MaskRule(column="phone", mask_type="partial"),
            MaskRule(column="ssn", mask_type="hide"),
        ]
```

## Audit Logging

```python
class LakeAuditLogger:
    def __init__(self, log_table: str):
        self.log_table = log_table

    def log_access(self, event: AccessEvent):
        query = f"""
        INSERT INTO {self.log_table}
        (user_id, action, resource, timestamp, ip_address, user_agent)
        VALUES (%s, %s, %s, %s, %s, %s)
        """
        execute(query, (
            event.user_id,
            event.action.value,
            event.resource,
            event.timestamp,
            event.ip_address,
            event.user_agent,
        ))

    def query_logs(self, filter: AuditFilter) -> list[AccessEvent]:
        conditions = []
        params = []

        if filter.user_id:
            conditions.append("user_id = %s")
            params.append(filter.user_id)
        if filter.date_from:
            conditions.append("timestamp >= %s")
            params.append(filter.date_from)
        if filter.action:
            conditions.append("action = %s")
            params.append(filter.action.value)

        where = " AND ".join(conditions) if conditions else "true"
        query = f"SELECT * FROM {self.log_table} WHERE {where} ORDER BY timestamp DESC"
        return execute(query, params)
```

## Key Points

- Role-based access control with zone-aware permissions
- Column masking for PII: partial, hide, or hash
- Row-level filters restrict access to specific data subsets
- Audit logging for all data access events
- Immutable audit log prevents tampering
- Regular access review recertification
- Integration with cloud IAM (AWS Lake Formation, GCP Dataplex)
- Data classification tags drive automatic policy application
- Time-bound access grants for temporary data sharing
- Cross-account access requires explicit resource-based policies
