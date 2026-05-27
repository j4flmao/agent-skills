# Data Quality Incident Management

## Incident Management for Data Quality

Data quality incidents require structured detection, triage, and resolution processes.

### Incident Detection

```python
from enum import Enum
from datetime import datetime, timedelta

class IncidentType(Enum):
    FRESHNESS = "freshness"             # Data not updated on time
    VOLUME_DROP = "volume_drop"         # Significant row count decrease
    VOLUME_SPIKE = "volume_spike"       # Unexpected row count increase
    NULL_INCREASE = "null_increase"     # More nulls than expected
    DUPLICATE = "duplicate"             # Duplicate records found
    SCHEMA_CHANGE = "schema_change"     # Unexpected schema modification
    DISTRIBUTION_SHIFT = "distribution_shift"  # Value distribution changed

class QualityIncident:
    def __init__(self, alert: QualityAlert):
        self.id = str(uuid.uuid4())
        self.type = alert.type
        self.table = alert.table
        self.severity = self._determine_severity(alert)
        self.status = "detected"
        self.detected_at = datetime.utcnow()
        self.severity_score = alert.deviation

    def _determine_severity(self, alert: QualityAlert) -> str:
        if alert.deviation > 0.5:
            return "critical"
        elif alert.deviation > 0.2:
            return "high"
        elif alert.deviation > 0.1:
            return "medium"
        return "low"
```

### Triage and Remediation

```python
class IncidentTriage:
    def __init__(self, lineage: LineageGraph):
        self.lineage = lineage

    def triage(self, incident: QualityIncident) -> TriageResult:
        # Identify potential root cause
        upstream = self.lineage.get_upstream(incident.table)
        root_cause = self._find_root_cause(incident, upstream)

        # Estimate impact scope
        downstream = self.lineage.get_downstream(incident.table)
        impacted_tables = len(downstream)
        impacted_pipelines = self._count_downstream_pipelines(downstream)

        # Determine remediation steps
        if incident.type == IncidentType.FRESHNESS:
            remediation = Remediation(
                action="restart_pipeline",
                pipeline=self._find_upstream_pipeline(incident.table),
                priority="high",
            )
        elif incident.type == IncidentType.VOLUME_DROP:
            remediation = Remediation(
                action="verify_source_data",
                priority="critical",
                steps=["Check source connector status",
                       "Verify source table row count",
                       "Review pipeline logs for errors"],
            )

        return TriageResult(
            incident=incident,
            root_cause=root_cause,
            impacted_tables=impacted_tables,
            impacted_pipelines=impacted_pipelines,
            recommended_remediation=remediation,
        )
```

## Reporting and SLA

```python
class IncidentReporter:
    def __init__(self):
        self.incidents: list[QualityIncident] = []

    def monthly_report(self, year: int, month: int) -> MonthlyQualityReport:
        month_incidents = [
            i for i in self.incidents
            if i.detected_at.year == year and i.detected_at.month == month
        ]

        report = MonthlyQualityReport(
            year=year,
            month=month,
            total_incidents=len(month_incidents),
            by_type=self._count_by_type(month_incidents),
            by_severity=self._count_by_severity(month_incidents),
            mean_time_to_resolve=self._avg_mttr(month_incidents),
            sla_violations=self._count_sla_violations(month_incidents),
            top_issues=self._top_tables(month_incidents, 5),
        )

        return report
```

## Key Points

- Six incident types: freshness, volume drop/spike, null increase, duplicates, schema change, distribution shift
- Severity determined by deviation magnitude: critical (>50%), high (>20%), medium (>10%)
- Triage identifies root cause via upstream lineage
- Remediation steps specific to incident type
- Impact assessment via downstream lineage
- MTTR tracking for continuous improvement
- Monthly quality reports for stakeholder visibility
- SLA monitoring with escalation for violations
- Post-incident review for recurring issue prevention
- Automated remediation for known incident patterns
