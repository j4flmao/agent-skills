# LLM Ops Incident Management

## Overview
LLM operations incidents differ from traditional infrastructure incidents due to non-deterministic outputs, model drift, prompt-related failures, and the complexity of LLM-specific components. A robust incident management process covers detection, response, mitigation, and prevention.

## Incident Classification

### Incident Types
```python
INCIDENT_TYPES = {
    "availability": {
        "description": "Model endpoint unavailable or returning errors",
        "severity_default": "P0",
        "response_sla": "15 min",
        "examples": ["API rate limited", "Model deployment failed", "GPU OOM"]
    },
    "quality": {
        "description": "Output quality degradation",
        "severity_default": "P1",
        "response_sla": "1 hour",
        "examples": ["Hallucination spike", "Accuracy drop", "Refusal rate change"]
    },
    "safety": {
        "description": "Safety guardrail failure",
        "severity_default": "P0",
        "response_sla": "5 min",
        "examples": ["Toxic output", "Bias detected", "Prompt injection success"]
    },
    "cost": {
        "description": "Cost anomaly",
        "severity_default": "P2",
        "response_sla": "4 hours",
        "examples": ["Cost spike >3x", "Runaway agent loop", "Excessive retries"]
    },
    "latency": {
        "description": "Response time degradation",
        "severity_default": "P2",
        "response_sla": "2 hours",
        "examples": ["P99 >5s", "TTFT >2s", "Queue buildup"]
    },
    "drift": {
        "description": "Model or data drift",
        "severity_default": "P3",
        "response_sla": "1 week",
        "examples": ["Input distribution change", "Embedding drift", "Output length shift"]
    }
}
```

## Detection

### Automated Detection
```python
class IncidentDetector:
    def __init__(self):
        self.thresholds = {
            "error_rate": {"P0": 0.05, "P1": 0.02, "P2": 0.01},
            "latency_p99": {"P0": 10, "P1": 5, "P2": 3},
            "hallucination_rate": {"P0": 0.1, "P1": 0.05},
            "cost_daily_spike": {"P0": 5, "P1": 3, "P2": 2},
        }

    def evaluate_metrics(self, metrics: dict) -> list[dict]:
        incidents = []
        for metric_name, value in metrics.items():
            if metric_name in self.thresholds:
                for severity, threshold in self.thresholds[metric_name].items():
                    if value > threshold:
                        incidents.append({
                            "metric": metric_name,
                            "value": value,
                            "threshold": threshold,
                            "severity": severity,
                            "detected_at": datetime.utcnow().isoformat(),
                        })
        return incidents

    def check_health_endpoint(self) -> dict:
        checks = {
            "model_available": self.ping_model(),
            "latency_ok": self.check_latency(),
            "error_rate_ok": self.check_error_rate(),
            "memory_ok": self.check_memory(),
            "queue_depth_ok": self.check_queue(),
        }
        return {
            "healthy": all(checks.values()),
            "checks": checks,
            "timestamp": datetime.utcnow().isoformat(),
        }
```

## Response Playbooks

### Model Degradation Playbook
```python
class ModelDegradationPlaybook:
    def execute(self, incident: dict):
        steps = [
            self.verify_incident,
            self.identify_affected_scope,
            self.fallback_to_backup_model,
            self.investigate_root_cause,
            self.apply_fix,
            self.monitor_recovery,
            self.post_mortem,
        ]

        for step in steps:
            result = step(incident)
            if not result["success"]:
                self.escalate(result)

    def verify_incident(self, incident: dict) -> dict:
        test_cases = incident.get("test_cases", self.default_test_cases())
        failures = []

        for case in test_cases:
            response = self.call_model(case["prompt"])
            if not self.evaluate_quality(response, case):
                failures.append(case["name"])

        return {
            "success": True,
            "verified": len(failures) > 0,
            "failure_count": len(failures),
            "failure_ratio": len(failures) / max(len(test_cases), 1),
        }

    def fallback_to_backup_model(self, incident: dict) -> dict:
        routing_rules = self.load_routing_rules()
        failed_model = incident.get("model")
        backup = self.select_backup(failed_model)

        routing_rules.set_fallback(failed_model, backup)
        routing_rules.activate()

        return {
            "success": True,
            "failed_model": failed_model,
            "backup_model": backup,
            "activated_at": datetime.utcnow().isoformat(),
        }

    def investigate_root_cause(self, incident: dict) -> dict:
        causes = []
        if self.check_recent_deployments(incident["model"]):
            causes.append("recent_deployment")
        if self.check_prompt_changes(incident.get("prompt_version")):
            causes.append("prompt_change")
        if self.check_data_drift():
            causes.append("data_drift")
        if self.check_provider_outage(incident["model"]):
            causes.append("provider_outage")

        return {
            "success": True,
            "root_causes": causes,
            "primary": causes[0] if causes else "unknown",
        }
```

### Safety Incident Playbook
```python
class SafetyIncidentPlaybook:
    def execute(self, incident: dict):
        self.quarantine_output(incident)
        self.block_affected_prompt(incident)
        self.notify_security_team(incident)
        self.analyze_impact(incident)
        self.implement_hotfix(incident)

    def quarantine_output(self, incident: dict) -> dict:
        affected_range = incident.get("time_range", {"start": "1h ago", "end": "now"})
        traces = self.query_traces(
            model=incident["model"],
            timerange=affected_range,
        )

        quarantine_count = 0
        for trace in traces:
            if trace.get("safety_score", 1.0) < 0.5:
                self.mark_quarantined(trace.id)
                quarantine_count += 1

        return {"quarantined": quarantine_count, "success": True}

    def block_affected_prompt(self, incident: dict) -> dict:
        if incident.get("prompt_version"):
            self.prompt_registry.disable_version(incident["prompt_version"])
        if incident.get("pattern"):
            self.guardrails.add_block_pattern(incident["pattern"])
        return {"success": True}

    def implement_hotfix(self, incident: dict) -> dict:
        if incident["root_cause"] == "prompt_injection":
            self.guardrails.set_level("strict")
        elif incident["root_cause"] == "model_drift":
            self.routing.rollback_model(incident["model"])
        elif incident["root_cause"] == "guardrail_bypass":
            self.guardrails.add_rule(incident["bypass_method"], "block")
        return {"success": True, "hotfix_applied": incident["root_cause"]}
```

## Communication Templates

### Status Page Update
```python
def generate_status_update(incident: dict) -> str:
    templates = {
        "investigating": f"""
## Investigating
We are investigating reports of {incident['type']} affecting {incident['scope']}.
Time: {incident['detected_at']}
Impact: {incident.get('impact', 'Under assessment')}
""",
        "mitigating": f"""
## Mitigating
We have identified the cause and are applying mitigations.
Root cause: {incident.get('root_cause')}
Actions taken: {incident.get('actions_taken')}
""",
        "resolved": f"""
## Resolved
The incident has been resolved.
Duration: {incident.get('duration_minutes')} minutes
Resolution: {incident.get('resolution')}
A post-mortem will follow.
""",
    }
    return templates.get(incident["status"], "Status update pending.")
```

## Post-Mortem Process

```python
class IncidentPostMortem:
    def __init__(self):
        self.sections = ["summary", "timeline", "root_cause", "impact", "detection", "resolution", "action_items"]

    def create(self, incident: dict) -> str:
        return f"""# Post-Mortem: {incident['title']}

## Summary
- **Date**: {incident['start_time']}
- **Duration**: {incident['duration_minutes']} min
- **Severity**: {incident['severity']}
- **Type**: {incident['type']}
- **Impact**: {incident.get('impact', 'N/A')}

## Timeline
| Time | Event |
|------|-------|
{self._format_timeline(incident.get('events', []))}

## Root Cause
{incident.get('root_cause_analysis', 'Under investigation')}

## Detection
- **Detected by**: {incident.get('detected_by', 'Automated monitoring')}
- **Time to detect**: {incident.get('ttd_minutes', 'N/A')} min
- **Time to mitigate**: {incident.get('ttm_minutes', 'N/A')} min
- **Time to resolve**: {incident.get('ttr_minutes', 'N/A')} min

## Resolution
{incident.get('resolution_description', '')}

## Action Items
| Action | Owner | Due Date | Status |
|--------|-------|----------|--------|
{self._format_actions(incident.get('actions', []))}

## Lessons Learned
{incident.get('lessons', '')}
"""
```

## Key Points
- Classify incidents by type: availability, quality, safety, cost, latency, drift
- Define severity levels with specific response SLAs
- Automate detection with metric thresholds and health checks
- Maintain playbooks for common incident types
- Always verify incidents before declaring (reduce false alarms)
- Implement automatic fallback to backup models
- Quarantine affected outputs on safety incidents
- Communicate status updates during active incidents
- Conduct post-mortem for every P0/P1 incident
- Track TTD, TTM, TTR as key incident metrics
- Update playbooks based on incident learnings
