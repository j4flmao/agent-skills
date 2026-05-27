# Data Contracts in Modeling

## Contract-Driven Data Modeling

Data contracts formalize the interface between data producers and consumers at the model level.

### Contract Definition for Models

```python
from pydantic import BaseModel
from typing import Any
from datetime import datetime

class ModelContract(BaseModel):
    model_name: str
    version: str
    domain: str
    owner: str
    consumers: list[str]

class ColumnContract(BaseModel):
    name: str
    type: str
    nullable: bool
    description: str
    constraints: list[str] = []
    pii_classification: str | None = None
    allowed_values: list[Any] | None = None

class ContractSchema(BaseModel):
    model: ModelContract
    columns: list[ColumnContract]
    primary_key: list[str]
    foreign_keys: list[ForeignKey] = []
    freshness_sla: int  # max minutes since last update
    row_volume_sla: VolumeSLAPolicy | None = None
```

### Contract Enforcement

```python
class ModelContractEnforcer:
    def __init__(self, registry: ContractRegistry):
        self.registry = registry

    def validate_schema(self, model_name: str, actual_schema: dict) -> ValidationResult:
        contract = self.registry.get_contract(model_name)
        violations = []

        for col in contract.columns:
            actual_col = actual_schema.get(col.name)
            if not actual_col:
                violations.append(f"Missing column: {col.name}")
                continue

            if col.type != actual_col.get("type"):
                violations.append(
                    f"Type mismatch for {col.name}: expected {col.type}, got {actual_col['type']}"
                )

            if not col.nullable and actual_col.get("nullable"):
                violations.append(
                    f"Column {col.name} should be NOT NULL"
                )

        return ValidationResult(
            passed=len(violations) == 0,
            violations=violations,
            model=model_name,
            timestamp=datetime.utcnow(),
        )

    def validate_data(self, model_name: str, sample: list[dict]) -> ValidationResult:
        contract = self.registry.get_contract(model_name)
        violations = []

        for col in contract.columns:
            for row in sample:
                value = row.get(col.name)
                if value is None and not col.nullable:
                    violations.append(f"NULL value in NOT NULL column {col.name}")
                if col.allowed_values and value not in col.allowed_values:
                    violations.append(f"Invalid value {value} for {col.name}")

        return ValidationResult(
            passed=len(violations) == 0,
            violations=violations,
            model=model_name,
            timestamp=datetime.utcnow(),
        )
```

## Contract Evolution

```python
class ContractEvolutionPolicy:
    def evaluate_change(self, old: ContractSchema, new: ContractSchema) -> ChangeImpact:
        changes = []
        impact = ChangeImpact()

        old_cols = {c.name: c for c in old.columns}
        new_cols = {c.name: c for c in new.columns}

        for name in new_cols:
            if name not in old_cols:
                changes.append(EvolutionChange(
                    type="add_column",
                    column=name,
                    backward_compatible=True,
                ))
                impact.additions += 1
            elif new_cols[name].type != old_cols[name].type:
                changes.append(EvolutionChange(
                    type="modify_column",
                    column=name,
                    backward_compatible=False,
                ))
                impact.breaking_changes += 1

        for name in old_cols:
            if name not in new_cols:
                changes.append(EvolutionChange(
                    type="drop_column",
                    column=name,
                    backward_compatible=False,
                ))
                impact.breaking_changes += 1

        return impact
```

## Key Points

- Model contracts define schema, constraints, and SLAs for data products
- Column-level contracts specify type, nullability, PII classification
- Contract enforcement validates both schema and sample data
- Evolution policy detects breaking vs non-breaking changes
- Freshness SLA defines maximum staleness per model
- Volume SLA policies alert on unexpected row count changes
- PII classification drives downstream masking policies
- Consumer list enables change notification
- Primary and foreign key constraints enforced at contract level
- Allowed values constraint prevents data quality issues
