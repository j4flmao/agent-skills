# Batch Pipeline Monitoring

## Observability Dimensions

Batch pipelines require monitoring across execution, data quality, cost, and SLA dimensions.

### Metrics Collection

```python
@dataclass
class PipelineMetrics:
    pipeline_id: str
    run_id: str
    start_time: datetime
    end_time: datetime | None
    duration_seconds: float
    records_processed: int
    records_failed: int
    bytes_read: int
    bytes_written: int
    cpu_usage_peak: float
    memory_usage_peak: float
    shuffle_bytes: int
    stages_completed: int
    stages_failed: int

class MetricsCollector:
    def __init__(self, pipeline_name: str):
        self.pipeline_name = pipeline_name
        self.metrics: list[PipelineMetrics] = []

    def record_run(self, metrics: PipelineMetrics):
        self.metrics.append(metrics)
        self._emit_to_telemetry(metrics)

    def _emit_to_telemetry(self, metrics: PipelineMetrics):
        # Emit to monitoring system
        statsd.gauge(f"pipeline.{self.pipeline_name}.duration", metrics.duration_seconds)
        statsd.gauge(f"pipeline.{self.pipeline_name}.records", metrics.records_processed)
        statsd.gauge(f"pipeline.{self.pipeline_name}.failures", metrics.records_failed)
        statsd.gauge(f"pipeline.{self.pipeline_name}.bytes_read", metrics.bytes_read)
```

## SLA Monitoring

```python
class SLAMonitor:
    def __init__(self):
        self.slas: dict[str, SLA] = {}

    def register_sla(self, pipeline: str, sla: SLA):
        self.slas[pipeline] = sla

    def check_sla(self, pipeline: str, completion_time: datetime):
        sla = self.slas.get(pipeline)
        if not sla:
            return

        if completion_time > sla.deadline:
            alert = SLAAlert(
                pipeline=pipeline,
                expected_deadline=sla.deadline,
                actual_completion=completion_time,
                delay_seconds=(completion_time - sla.deadline).total_seconds(),
            )
            self._escalate(alert)

    def sla_report(self, date: str) -> dict:
        return {
            "total_runs": len(self.runs),
            "sla_met": sum(1 for r in self.runs if r.met_sla),
            "sla_violations": sum(1 for r in self.runs if not r.met_sla),
            "avg_delay": self._avg_delay(),
        }
```

## Trend Analysis

```python
class PipelineTrendAnalyzer:
    def analyze_trends(self, history: list[PipelineMetrics]) -> TrendReport:
        durations = [m.duration_seconds for m in history]
        records = [m.records_processed for m in history]

        report = TrendReport(
            duration_trend=self._compute_trend(durations),
            throughput_trend=self._compute_trend(records),
            failure_rate_trend=self._compute_failure_trend(history),
            data_volume_growth=self._compute_growth(records),
        )

        if report.duration_trend.slope > 0.1:
            self._alert_duration_increase(report)

        return report

    def _compute_trend(self, values: list[float]) -> Trend:
        if len(values) < 2:
            return Trend(slope=0, direction="stable")
        x = list(range(len(values)))
        slope, _ = np.polyfit(x, values, 1)
        direction = "increasing" if slope > 0.01 else "decreasing" if slope < -0.01 else "stable"
        return Trend(slope=slope, direction=direction)
```

## Key Points

- Collect execution, data quality, cost, and SLA dimensions
- Emit metrics to centralized telemetry system (StatsD, Prometheus)
- Track SLA deadlines and escalate violations immediately
- Trend analysis detects performance degradation over time
- Alert on failure rate thresholds and data volume anomalies
- Correlate pipeline failures with upstream data source changes
- Monitor resource utilization (CPU, memory, shuffle) for optimization
- Historical dashboards enable capacity planning and budget forecasting
