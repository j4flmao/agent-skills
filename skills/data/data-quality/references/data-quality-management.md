# Data Quality Management

## Data Validation

```python
import pandera as pa
from pandera.typing import DataFrame, Series
from datetime import datetime
from typing import Optional

class SalesSchema(pa.DataFrameModel):
    order_id: str = pa.Field(unique=True, nullable=False)
    customer_id: str = pa.Field(nullable=False)
    product_id: str = pa.Field(nullable=False)
    quantity: int = pa.Field(ge=0, le=1000)
    unit_price: float = pa.Field(ge=0)
    total_amount: float = pa.Field(ge=0)
    order_date: datetime = pa.Field()
    region: str = pa.Field(isin=["NA", "EU", "APAC", "LATAM"])

    @pa.dataframe_check
    def total_amount_matches(cls, df):
        expected = df["quantity"] * df["unit_price"]
        return (df["total_amount"] - expected).abs() < 0.01

    @pa.dataframe_check
    def no_future_dates(cls, df):
        return df["order_date"] <= datetime.now()

def validate_sales_data(df) -> tuple:
    """Validate sales data against schema."""
    schema = SalesSchema

    try:
        validated_df = schema.validate(df, lazy=True)
        return True, validated_df, []
    except pa.errors.SchemaErrors as err:
        errors = []
        for failure in err.failures:
            errors.append({
                "column": failure.column,
                "check": failure.check,
                "index": failure.index,
                "value": failure.value,
            })
        return False, df, errors
```

## Data Quality Monitoring

```python
from dataclasses import dataclass
from typing import List, Dict, Any
import pandas as pd

@dataclass
class DataQualityCheck:
    name: str
    table: str
    column: str
    check_type: str
    threshold: float
    description: str

class DataQualityMonitor:
    def __init__(self, connection_string: str):
        self.connection = connection_string
        self.checks: List[DataQualityCheck] = []
        self.results: List[Dict[str, Any]] = []

    def add_check(self, check: DataQualityCheck):
        self.checks.append(check)

    def run_all_checks(self) -> pd.DataFrame:
        for check in self.checks:
            result = self.run_check(check)
            self.results.append(result)

        return pd.DataFrame(self.results)

    def run_check(self, check: DataQualityCheck) -> Dict[str, Any]:
        df = self.query_table(check.table)
        total_rows = len(df)

        if check.check_type == "null_check":
            null_count = df[check.column].isna().sum()
            null_rate = null_count / total_rows if total_rows > 0 else 0
            passed = null_rate <= check.threshold

        elif check.check_type == "uniqueness":
            unique_count = df[check.column].nunique()
            unique_rate = unique_count / total_rows if total_rows > 0 else 0
            passed = unique_rate >= check.threshold

        elif check.check_type == "freshness":
            fresh_count = self.check_freshness(check.table, check.column)
            passed = fresh_count > 0

        elif check.check_type == "volume":
            passed = total_rows >= check.threshold

        else:
            passed = True

        return {
            "check_name": check.name,
            "table": check.table,
            "column": check.column,
            "type": check.check_type,
            "passed": passed,
            "total_rows": total_rows,
            "timestamp": datetime.now().isoformat(),
        }
```

## Key Points

- Define schemas for validation with Pandera or Great Expectations
- Implement automated data quality checks
- Monitor null rates, uniqueness, and freshness
- Set up alerting for quality threshold breaches
- Track data quality metrics over time
- Implement data profiling for new data sources
- Use data contracts between producers and consumers
- Handle missing data with imputation strategies
- Document data quality SLAs for each dataset
- Implement data lineage tracking for root cause analysis
- Use data quality dashboards for visibility
- Automate data quality checks in data pipelines
