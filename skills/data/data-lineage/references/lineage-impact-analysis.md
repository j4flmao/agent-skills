# Lineage Impact Analysis

## Impact Analysis Framework

Impact analysis determines the downstream effects of schema changes, pipeline modifications, or data quality issues.

### Impact Assessment

```python
class ImpactAnalyzer:
    def __init__(self, lineage_graph: LineageGraph):
        self.graph = lineage_graph
        self.analysis_cache: dict[str, ImpactReport] = {}

    def analyze_change(self, changed_node: str, change_type: ChangeType) -> ImpactReport:
        if changed_node in self.analysis_cache:
            return self.analysis_cache[changed_node]

        downstream = self.graph.get_downstream(changed_node, depth=10)

        affected = {
            "direct": [],     # Immediate downstream consumers
            "indirect": [],   # Further downstream (depth > 1)
            "critical": [],   # Production pipelines
            "dashboards": [], # Reporting dependencies
        }

        for path in downstream:
            depth = len(path.path) - 1
            last_node = self.graph.graph.nodes[path.target]

            if last_node.get("critical_path"):
                affected["critical"].append(path)
            if last_node.get("type") == "dashboard":
                affected["dashboards"].append(path)
            if depth == 1:
                affected["direct"].append(path)
            else:
                affected["indirect"].append(path)

        report = ImpactReport(
            changed_node=changed_node,
            change_type=change_type,
            total_downstream=len(downstream),
            affected=affected,
            recommendations=self._generate_recommendations(affected, change_type),
        )

        self.analysis_cache[changed_node] = report
        return report

    def _generate_recommendations(
        self, affected: dict, change_type: ChangeType
    ) -> list[str]:
        recommendations = []

        if affected["critical"]:
            recommendations.append(
                "Notify upstream consumers before making changes"
            )

        if change_type == ChangeType.SCHEMA_BREAKING:
            recommendations.append(
                "Create new version instead of modifying existing schema"
            )

        if affected["dashboards"]:
            recommendations.append(
                "Verify dashboard compatibility after change"
            )

        return recommendations
```

### Producer-Consumer Notification

```python
class ChangeNotificationService:
    def __init__(self, lineage: LineageGraph, notifier: Notifier):
        self.lineage = lineage
        self.notifier = notifier

    def notify_downstream(self, changed_node: str, message: ChangeMessage):
        downstream = self.lineage.get_downstream(changed_node)
        affected_owners = set()

        for path in downstream:
            node_data = self.lineage.graph.graph.nodes[path.target]
            owner = node_data.get("owner")
            if owner:
                affected_owners.add(owner)

        for owner in affected_owners:
            self.notifier.send(
                recipient=owner,
                subject=f"Change impact: {changed_node}",
                body=f"""
                A change to {changed_node} may affect your dataset.
                Change type: {message.change_type}
                Description: {message.description}
                Effective date: {message.effective_date}
                Migration guide: {message.migration_guide or 'N/A'}
                """,
                priority=message.priority,
            )

    def get_subscribers(self, dataset: str) -> list[Subscriber]:
        downstream = self.lineage.get_downstream(dataset)
        subscribers = []

        for path in downstream:
            target = path.target
            data = self.lineage.graph.graph.nodes[target]
            subscribers.append(Subscriber(
                dataset=target,
                owner=data.get("owner"),
                pipeline=data.get("pipeline_name"),
                criticality=data.get("criticality", "low"),
            ))

        return subscribers
```

### Risk Assessment

```python
class RiskAssessor:
    def assess_risk(self, report: ImpactReport) -> RiskLevel:
        risk_score = 0

        # Critical path impact
        risk_score += len(report.affected["critical"]) * 10

        # Dashboard impact
        risk_score += len(report.affected["dashboards"]) * 5

        # Total downstream
        if report.total_downstream > 50:
            risk_score += 15
        elif report.total_downstream > 20:
            risk_score += 8
        elif report.total_downstream > 5:
            risk_score += 3

        # Change type
        if report.change_type == ChangeType.SCHEMA_BREAKING:
            risk_score += 20
        elif report.change_type == ChangeType.PIPELINE_MODIFICATION:
            risk_score += 10

        if risk_score >= 30:
            return RiskLevel.HIGH
        elif risk_score >= 15:
            return RiskLevel.MEDIUM
        return RiskLevel.LOW
```

## Key Points

- Impact analysis identifies all downstream consumers of a dataset
- Notification workflow alerts affected owners before changes
- Risk assessment scores changes by criticality and reach
- Change type determines severity: schema breaking > pipeline mod > data refresh
- Direct vs indirect downstream classification helps prioritize testing
- Critical path flagging for production-sensitive pipelines
- Dashboard impact analysis prevents broken reporting
- Cached analysis avoids redundant computation for repeated queries
- Migration guides attached to change notifications
- Subscriber list enables targeted communication with dataset consumers
