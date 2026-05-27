# Clean Room Supported Data Types

## Data Type Support

Clean rooms support different data types with varying privacy implications.

### Supported Types Matrix

```python
from enum import Enum

class DataCategory(Enum):
    IDENTIFIER = "identifier"        # Directly identifying
    QUASI_IDENTIFIER = "quasi"       # Could identify in combination
    SENSITIVE = "sensitive"          # Protected data
    BEHAVIORAL = "behavioral"        # Derived/observed
    DERIVED = "derived"             # Computed metrics
    AGGREGATE = "aggregate"          # Statistical summaries

class DataTypePolicy:
    def __init__(self, data_type: DataCategory):
        self.category = data_type
        self.policies = {
            DataCategory.IDENTIFIER: IdentifierPolicy(),
            DataCategory.QUASI_IDENTIFIER: QuasiIdentifierPolicy(),
            DataCategory.SENSITIVE: SensitivePolicy(),
            DataCategory.BEHAVIORAL: BehavioralPolicy(),
            DataCategory.DERIVED: DerivedPolicy(),
            DataCategory.AGGREGATE: AggregatePolicy(),
        }

    def can_share(self, use_case: str) -> bool:
        policy = self.policies[self.category]
        return policy.allowed_use_cases.get(use_case, False)

    def get_transformation(self, use_case: str) -> Transformation:
        policy = self.policies[self.category]
        return policy.transformations.get(use_case, NoOpTransformation())
```

### Type Transformations

```python
class Transformation(ABC):
    @abstractmethod
    def apply(self, value: Any) -> Any:
        pass

    @abstractmethod
    def information_loss(self) -> float:
        pass

class HashTransform(Transformation):
    def __init__(self, salt: str = None):
        self.salt = salt or str(uuid.uuid4())

    def apply(self, value: Any) -> str:
        return hashlib.sha256(
            f"{value}{self.salt}".encode()
        ).hexdigest()[:16]

    def information_loss(self) -> float:
        return 0.0  # Deterministic, same input = same output

class BucketTransform(Transformation):
    def __init__(self, bucket_size: int):
        self.bucket_size = bucket_size

    def apply(self, value: float) -> str:
        bucket = (value // self.bucket_size) * self.bucket_size
        return f"{bucket}-{bucket + self.bucket_size}"

    def information_loss(self) -> float:
        return 0.3  # ~30% precision loss

class GeneralizeTransform(Transformation):
    def apply(self, value: str) -> str:
        if "@" in value:  # Email
            return value.split("@")[1]
        if len(value) == 10 and value.isdigit():  # Phone
            return f"{value[:3]}-XXX-XXXX"
        return f"{value[:1]}***"
```

## Schema Mapping

```python
class CleanRoomSchemaMapper:
    def __init__(self):
        self.type_mappings: dict[str, list[TransformDefinition]] = {
            "email": [
                TransformDefinition(HashTransform(), required=True),
                TransformDefinition(GeneralizeTransform(), required=True),
            ],
            "phone": [
                TransformDefinition(HashTransform(), required=True),
            ],
            "date_of_birth": [
                TransformDefinition(
                    BucketTransform(365),  # Year granularity
                    required=True,
                ),
            ],
            "revenue": [
                TransformDefinition(
                    BucketTransform(1000),
                    required=False,
                ),
            ],
        }

    def build_schema(self, input_columns: list[ColumnDef], privacy_level: str) -> QuerySchema:
        schema = QuerySchema()
        for col in input_columns:
            mapping = self.type_mappings.get(col.data_type, [])
            for transform_def in mapping:
                if transform_def.required or privacy_level == "high":
                    column_def = ColumnDef(
                        source=col.name,
                        alias=f"{col.name}_{type(transform_def.transform).__name__}",
                        transform=transform_def.transform,
                    )
                    schema.add_column(column_def)
        return schema
```

## Key Points

- Classify data types by privacy sensitivity: identifier, quasi-identifier, sensitive, etc.
- Each data category has different sharing policies and transformations
- Hash transformations for join keys enable matching without revealing values
- Bucketing and generalization reduce precision to prevent re-identification
- Schema mapper applies appropriate transformations per data type
- Information loss metric quantifies utility reduction
- Privacy level determines which transformations are required vs optional
- Column-level policies can override type-level defaults
- Audit log tracks which transformations were applied per query
- Reversible transformations blocked for all privacy-sensitive data types
