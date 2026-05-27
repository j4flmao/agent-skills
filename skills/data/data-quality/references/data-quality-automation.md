# Data Quality Automation

## Automating Quality Checks
Manual data quality validation doesn't scale. Automation ensures that every pipeline run includes appropriate quality checks, with standardized reporting and alerting.

## Quality Check Automation Framework

### Configuration-Driven Checks
```python
from typing import List, Dict, Any
from dataclasses import dataclass
import yaml

@dataclass
class QualityCheck:
    name: str
    type: str
    table: str
    column: str = None
    params: Dict[str, Any] = None
    severity: str = "error"
    tags: List[str] = None

class QualityAutomation:
    def __init__(self, config_path: str):
        with open(config_path) as f:
            self.config = yaml.safe_load(f)

    def generate_checks(self) -> List[QualityCheck]:
        checks = []
        for check_config in self.config.get("checks", []):
            check = QualityCheck(
                name=check_config["name"],
                type=check_config["type"],
                table=check_config["table"],
                column=check_config.get("column"),
                params=check_config.get("params"),
                severity=check_config.get("severity", "error"),
                tags=check_config.get("tags", [])
            )
            checks.append(check)
        return checks

    def execute_check(self, check: QualityCheck) -> Dict[str, Any]:
        if check.type == "not_null":
            result = self._check_not_null(check)
        elif check.type == "unique":
            result = self._check_unique(check)
        elif check.type == "row_count":
            result = self._check_row_count(check)
        elif check.type == "freshness":
            result = self._check_freshness(check)
        elif check.type == "accepted_values":
            result = self._check_accepted_values(check)
        elif check.type == "custom_sql":
            result = self._check_custom_sql(check)
        else:
            raise ValueError(f"Unknown check type: {check.type}")

        return result
```

### Automated Check Generation
```python
class AutoCheckGenerator:
    def __init__(self, warehouse):
        self.warehouse = warehouse

    def analyze_table(self, table_name: str) -> List[QualityCheck]:
        """Analyze table schema and data to auto-generate quality checks."""
        checks = []
        columns = self.warehouse.get_columns(table_name)

        for col in columns:
            # Primary key columns should be unique and not null
            if col.get("is_primary_key"):
                checks.append(QualityCheck(
                    name=f"{table_name}_{col['name']}_not_null",
                    type="not_null",
                    table=table_name,
                    column=col["name"],
                    severity="error"
                ))
                checks.append(QualityCheck(
                    name=f"{table_name}_{col['name']}_unique",
                    type="unique",
                    table=table_name,
                    column=col["name"],
                    severity="error"
                ))

            # Foreign key columns should not have orphans
            if col.get("foreign_key"):
                checks.append(QualityCheck(
                    name=f"{table_name}_{col['name']}_fk_integrity",
                    type="relationships",
                    table=table_name,
                    column=col["name"],
                    params={"to": col["references_table"],
                            "field": col["references_column"]},
                    severity="error"
                ))

            # Timestamp columns should be monitored for freshness
            if col["type"] in ("timestamp", "timestamptz", "datetime"):
                checks.append(QualityCheck(
                    name=f"{table_name}_{col['name']}_freshness",
                    type="freshness",
                    table=table_name,
                    column=col["name"],
                    params={"max_lag_hours": 24},
                    severity="warning"
                ))

        return checks
```

## Integration with Orchestration

### Airflow Quality Task
```python
from airflow.decorators import task
from airflow.operators.python import get_current_context

@task
def run_quality_checks(table: str, checks: List[str]):
    from quality_automation import QualityAutomation

    automation = QualityAutomation(config_path="quality_config.yaml")
    results = []

    for check_name in checks:
        check = automation.get_check(check_name)
        result = automation.execute_check(check)
        results.append(result)

        if not result["passed"] and check.severity == "error":
            raise ValueError(
                f"Quality check failed: {check_name}\n"
                f"Expected: {result.get('expected')}\n"
                f"Actual: {result.get('actual')}"
            )

    return results

# DAG usage
with DAG("quality_pipeline", ...):
    etl_data = run_etl()
    quality_results = run_quality_checks(
        table="fact_orders",
        checks=["order_id_not_null", "total_amount_positive", "freshness_check"]
    )
    etl_data >> quality_results
```

## Quality Check Templates

### Standard Templates Library
```sql
-- template_not_null.sql
SELECT
    '{{ table }}' as table_name,
    '{{ column }}' as column_name,
    'not_null' as check_type,
    COUNT(*) as failures,
    '{{ column }} should not contain NULL values' as description
FROM {{ table }}
WHERE {{ column }} IS NULL

-- template_unique.sql
SELECT
    '{{ table }}' as table_name,
    '{{ column }}' as column_name,
    'unique' as check_type,
    COUNT(*) - COUNT(DISTINCT {{ column }}) as failures,
    '{{ column }} should contain unique values' as description
FROM {{ table }}

-- template_freshness.sql
SELECT
    '{{ table }}' as table_name,
    '{{ column }}' as column_name,
    'freshness' as check_type,
    EXTRACT(EPOCH FROM (NOW() - MAX({{ column }})))/3600 as hours_since_update,
    'Data should be no older than {{ max_hours }} hours' as description
FROM {{ table }}
```

### Automated Execution
```python
def apply_template(template_name: str, params: Dict[str, Any]) -> str:
    """Apply parameters to a quality check template."""
    with open(f"templates/{template_name}.sql") as f:
        template = f.read()

    for key, value in params.items():
        template = template.replace("{{ " + key + " }}", str(value))

    return template

def run_template_checks(checks_config: List[Dict], warehouse):
    """Run multiple template-based checks."""
    results = []
    for check in checks_config:
        sql = apply_template(check["template"], check["params"])
        result = warehouse.query(sql)
        result["check_name"] = check["name"]
        result["passed"] = result.get("failures", 0) <= check.get("threshold", 0)
        results.append(result)
    return results
```

## Continuous Monitoring Pipeline

### Streaming Quality Checks
```python
from pyflink.datastream import StreamExecutionEnvironment
from pyflink.datastream.functions import ProcessFunction

class QualityEnrichFunction(ProcessFunction):
    def process_element(self, value, ctx):
        """Enrich stream records with quality metadata."""
        quality_checks = {
            "has_required_fields": all(
                field in value for field in ["order_id", "customer_id", "amount"]
            ),
            "valid_amount": value.get("amount", 0) >= 0,
            "valid_timestamp": self._is_valid_timestamp(value.get("event_time")),
        }

        value["_quality"] = quality_checks
        value["_quality_passed"] = all(quality_checks.values())

        if not value["_quality_passed"]:
            value["_quality_action"] = self._determine_action(quality_checks)

        yield value

    def _determine_action(self, checks):
        if not checks["has_required_fields"]:
            return "reject"
        elif not checks["valid_amount"]:
            return "flag_review"
        return "accept_with_warning"
```

## Key Points
- Automate quality checks with configuration-driven frameworks
- Auto-generate basic checks from table schema analysis
- Integrate quality checks into orchestration pipelines (Airflow, Dagster, Prefect)
- Use template-based SQL checks for rapid deployment
- Implement severities (error, warning, info) for appropriate response
- Track quality check execution history for trend analysis
- Enrich streaming data with real-time quality metadata
- Fail pipelines on critical quality violations, flag on warnings
- Generate quality reports and dashboards automatically
- Continuously evolve check thresholds based on historical patterns
