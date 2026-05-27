# Safety Monitoring

## Overview

Safety monitoring provides continuous visibility into the effectiveness of AI safety measures. By tracking guardrail performance, violation trends, and incident patterns, teams can detect emerging threats, tune defenses, and demonstrate compliance. This reference covers safety metrics, logging frameworks, dashboards, post-incident analysis, and automated response workflows.

## Safety Metrics Framework

### Core Metrics

```python
from dataclasses import dataclass
from typing import List, Dict, Optional
from collections import defaultdict
import time

@dataclass
class SafetyEvent:
    timestamp: float
    event_type: str  # "input_blocked", "output_blocked", "guardrail_triggered", "red_team_finding"
    layer: str  # which safety layer triggered
    category: str  # toxicity, jailbreak, pii, etc.
    severity: int  # 1-5
    model: str
    user_id: Optional[str] = None
    input_text: Optional[str] = None
    output_text: Optional[str] = None
    action_taken: str  # "blocked", "flagged", "passed"
    latency_ms: float = 0.0

class SafetyMetricsCollector:
    def __init__(self):
        self.events: List[SafetyEvent] = []
        self._daily_counts = defaultdict(int)

    def record_event(self, event: SafetyEvent):
        self.events.append(event)
        day_key = time.strftime("%Y-%m-%d", time.localtime(event.timestamp))
        self._daily_counts[f"{day_key}:{event.event_type}"] += 1

    def block_rate(self, hours: int = 24) -> float:
        cutoff = time.time() - hours * 3600
        window = [e for e in self.events if e.timestamp >= cutoff]
        if not window:
            return 0.0
        return sum(1 for e in window if e.action_taken == "blocked") / len(window)

    def violation_rate_by_category(self, hours: int = 24) -> Dict[str, float]:
        cutoff = time.time() - hours * 3600
        window = [e for e in self.events if e.timestamp >= cutoff]
        category_counts = defaultdict(int)
        for e in window:
            category_counts[e.category] += 1
        total = len(window) or 1
        return {cat: count / total for cat, count in category_counts.items()}

    def guardrail_latency_p99(self, hours: int = 24) -> float:
        cutoff = time.time() - hours * 3600
        latencies = [
            e.latency_ms for e in self.events
            if e.timestamp >= cutoff and e.latency_ms > 0
        ]
        if not latencies:
            return 0.0
        sorted_lat = sorted(latencies)
        idx = int(len(sorted_lat) * 0.99)
        return sorted_lat[idx]

    def severity_distribution(self, hours: int = 24) -> Dict[int, int]:
        cutoff = time.time() - hours * 3600
        dist = defaultdict(int)
        for e in self.events:
            if e.timestamp >= cutoff:
                dist[e.severity] += 1
        return dict(sorted(dist.items()))

    def daily_report(self) -> str:
        lines = [
            "Safety Monitoring Daily Report",
            "=" * 40,
            f"Block Rate (24h): {self.block_rate():.2%}",
            f"Total Events: {len([e for e in self.events if e.timestamp > time.time() - 86400])}",
            "",
            "Violations by Category:",
        ]
        for cat, rate in self.violation_rate_by_category().items():
            lines.append(f"  {cat}: {rate:.2%}")
        lines.append("")
        lines.append("Severity Distribution:")
        for sev, count in self.severity_distribution().items():
            lines.append(f"  Severity {sev}: {count}")
        lines.append(f"\nGuardrail P99 Latency: {self.guardrail_latency_p99():.0f}ms")
        return "\n".join(lines)
```

### Effectiveness Metrics

```python
class SafetyEffectiveness:
    def __init__(self, collector: SafetyMetricsCollector):
        self.collector = collector

    def prevention_rate(self, red_team_attempts: int, successful_attacks: int) -> float:
        if red_team_attempts == 0:
            return 1.0
        return 1 - (successful_attacks / red_team_attempts)

    def mean_time_to_detect(self, incidents: List[Dict]) -> float:
        if not incidents:
            return 0.0
        detection_times = [
            inc["detected_at"] - inc["occurred_at"]
            for inc in incidents if "detected_at" in inc and "occurred_at" in inc
        ]
        return sum(detection_times) / len(detection_times) if detection_times else 0.0

    def mean_time_to_respond(self, incidents: List[Dict]) -> float:
        if not incidents:
            return 0.0
        response_times = [
            inc["responded_at"] - inc["detected_at"]
            for inc in incidents if "responded_at" in inc and "detected_at" in inc
        ]
        return sum(response_times) / len(response_times) if response_times else 0.0

    def coverage_gaps(self) -> List[str]:
        gaps = []
        input_events = [e for e in self.collector.events if e.event_type == "input_blocked"]
        output_events = [e for e in self.collector.events if e.event_type == "output_blocked"]
        if len(input_events) < len(output_events) * 0.1:
            gaps.append("Input blocking rate significantly lower than output - possible ingress gap")
        return gaps
```

## Structured Safety Logging

### Log Format and Schema

```python
import json
import logging
from datetime import datetime

class SafetyLogger:
    def __init__(self, log_file: str = "safety_events.log"):
        self.logger = logging.getLogger("safety")
        handler = logging.FileHandler(log_file)
        handler.setFormatter(logging.Formatter("%(message)s"))
        self.logger.addHandler(handler)
        self.logger.setLevel(logging.INFO)

    def log_safety_event(self, event: SafetyEvent, metadata: Dict = None):
        log_entry = {
            "timestamp": datetime.fromtimestamp(event.timestamp).isoformat(),
            "event_type": event.event_type,
            "layer": event.layer,
            "category": event.category,
            "severity": event.severity,
            "model": event.model,
            "user_id": event.user_id,
            "action_taken": event.action_taken,
            "latency_ms": event.latency_ms,
        }
        if metadata:
            log_entry["metadata"] = metadata
        self.logger.info(json.dumps(log_entry))

    def log_incident(self, incident_id: str, description: str, severity: int, affected_model: str):
        log_entry = {
            "timestamp": datetime.now().isoformat(),
            "event_type": "incident",
            "incident_id": incident_id,
            "description": description,
            "severity": severity,
            "model": affected_model,
        }
        self.logger.warning(json.dumps(log_entry))
```

### Real-Time Safety Stream

```python
import asyncio
from typing import AsyncIterator, Callable

class SafetyEventBus:
    def __init__(self):
        self.subscribers: List[Callable] = []
        self.event_queue: asyncio.Queue = asyncio.Queue()

    def subscribe(self, handler: Callable):
        self.subscribers.append(handler)

    async def publish(self, event: SafetyEvent):
        await self.event_queue.put(event)
        for handler in self.subscribers:
            try:
                await handler(event)
            except Exception as e:
                print(f"Safety event handler failed: {e}")

    async def event_stream(self) -> AsyncIterator[SafetyEvent]:
        while True:
            event = await self.event_queue.get()
            yield event

class SafetyDashboardUpdater:
    def __init__(self, event_bus: SafetyEventBus):
        self.event_bus = event_bus
        self.latest_events: List[SafetyEvent] = []

    async def start(self):
        async for event in self.event_bus.event_stream():
            self.latest_events.append(event)
            self.latest_events = self.latest_events[-100:]  # keep last 100

    def get_recent_alerts(self, min_severity: int = 3) -> List[SafetyEvent]:
        return [e for e in self.latest_events if e.severity >= min_severity]

    def get_violation_count(self, category: str, minutes: int = 60) -> int:
        cutoff = time.time() - minutes * 60
        return sum(
            1 for e in self.latest_events
            if e.category == category and e.timestamp >= cutoff
        )
```

## Automated Response Workflows

### Response Actions

```python
from enum import Enum

class ResponseAction(Enum):
    BLOCK_REQUEST = "block_request"
    FLAG_FOR_REVIEW = "flag_for_review"
    TRUNCATE_OUTPUT = "truncate_output"
    REPLACE_CONTENT = "replace_content"
    RATE_LIMIT_USER = "rate_limit_user"
    SUSPEND_USER = "suspend_user"
    ESCALATE_HUMAN = "escalate_to_human"
    LOG_ONLY = "log_only"

class AutomatedResponder:
    def __init__(self, event_bus: SafetyEventBus):
        self.event_bus = event_bus
        self.action_counts = defaultdict(int)
        self.user_violations = defaultdict(list)

    async def handle_event(self, event: SafetyEvent) -> ResponseAction:
        if event.severity >= 4:
            action = ResponseAction.BLOCK_REQUEST
        elif event.severity >= 3:
            action = ResponseAction.FLAG_FOR_REVIEW
        elif event.event_type == "red_team_finding":
            action = ResponseAction.ESCALATE_HUMAN
        else:
            action = ResponseAction.LOG_ONLY

        if event.user_id:
            self.user_violations[event.user_id].append(event.timestamp)
            recent = [
                t for t in self.user_violations[event.user_id]
                if t > time.time() - 3600
            ]
            if len(recent) >= 5:
                action = ResponseAction.SUSPEND_USER
                self.user_violations[event.user_id] = recent

        self.action_counts[action.value] += 1
        return action

    async def execute_action(self, action: ResponseAction, event: SafetyEvent):
        if action == ResponseAction.BLOCK_REQUEST:
            print(f"[ACTION] Blocked {event.event_type} from {event.user_id}")
        elif action == ResponseAction.SUSPEND_USER:
            print(f"[ACTION] Suspended user {event.user_id}")
        elif action == ResponseAction.ESCALATE_HUMAN:
            print(f"[ACTION] Escalating {event.category} to human review")
        await self.event_bus.publish(event)
```

## Post-Incident Analysis

### Incident Reporting

```python
from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional

@dataclass
class SafetyIncident:
    id: str
    title: str
    severity: int
    description: str
    root_cause: str
    detected_at: datetime
    resolved_at: Optional[datetime] = None
    affected_users: int = 0
    mitigation_steps: List[str] = field(default_factory=list)
    preventive_measures: List[str] = field(default_factory=list)

class IncidentAnalyzer:
    def __init__(self, collector: SafetyMetricsCollector):
        self.collector = collector
        self.incidents: List[SafetyIncident] = []

    def analyze_trend(self, days: int = 30) -> Dict:
        cutoff = time.time() - days * 86400
        recent = [e for e in self.collector.events if e.timestamp >= cutoff]
        daily_counts = defaultdict(int)
        for e in recent:
            day = datetime.fromtimestamp(e.timestamp).strftime("%Y-%m-%d")
            daily_counts[day] += 1
        values = list(daily_counts.values())
        if not values:
            return {"trend": "stable", "avg_daily": 0, "change_pct": 0}
        first_half = sum(values[:len(values)//2]) / max(len(values)//2, 1)
        second_half = sum(values[len(values)//2:]) / max(len(values) - len(values)//2, 1)
        change = ((second_half - first_half) / first_half * 100) if first_half > 0 else 0
        trend = "increasing" if change > 20 else "decreasing" if change < -20 else "stable"
        return {
            "trend": trend,
            "avg_daily": sum(values) / len(values),
            "change_pct": change,
        }

    def generate_postmortem(self, incident_id: str) -> str:
        for inc in self.incidents:
            if inc.id == incident_id:
                lines = [
                    f"Post-Mortem: {inc.title}",
                    f"ID: {inc.id}",
                    f"Severity: SEV{inc.severity}",
                    f"Detected: {inc.detected_at}",
                    f"Resolved: {inc.resolved_at or 'N/A'}",
                    f"Affected Users: {inc.affected_users}",
                    "",
                    "Description:",
                    f"  {inc.description}",
                    "",
                    "Root Cause:",
                    f"  {inc.root_cause}",
                    "",
                    "Mitigation Steps:",
                ]
                for step in inc.mitigation_steps:
                    lines.append(f"  - {step}")
                lines.append("")
                lines.append("Preventive Measures:")
                for measure in inc.preventive_measures:
                    lines.append(f"  - {measure}")
                return "\n".join(lines)
        return f"Incident {incident_id} not found"
```

## Compliance and Audit

### Audit Trail

```python
import hashlib

class SafetyAuditTrail:
    def __init__(self, storage_path: str = "audit_trail.jsonl"):
        self.storage_path = storage_path
        self.entries: List[Dict] = []

    def append(self, entry: Dict):
        entry["hash"] = self._hash_entry(entry)
        entry["sequence"] = len(self.entries)
        self.entries.append(entry)
        with open(self.storage_path, "a") as f:
            f.write(json.dumps(entry) + "\n")

    def _hash_entry(self, entry: Dict) -> str:
        serialized = json.dumps(entry, sort_keys=True)
        return hashlib.sha256(serialized.encode()).hexdigest()

    def verify_integrity(self) -> bool:
        with open(self.storage_path) as f:
            stored = [json.loads(line) for line in f if line.strip()]
        for i, entry in enumerate(stored):
            expected_hash = entry.get("hash", "")
            entry_copy = {k: v for k, v in entry.items() if k != "hash"}
            actual_hash = self._hash_entry(entry_copy)
            if expected_hash != actual_hash:
                return False
        return True

    def query(self, filters: Dict) -> List[Dict]:
        results = self.entries
        for key, value in filters.items():
            results = [e for e in results if e.get(key) == value]
        return results
```

## Key Points

- Track block rate, violation rate by category, severity distribution, and guardrail latency.
- Measure prevention rate through red team testing to quantify safety effectiveness.
- Log every safety event with structured schema including timestamp, layer, category, and action.
- Use an event bus architecture for real-time safety monitoring and automated responses.
- Implement automated response actions scaled by severity: log, flag, block, suspend.
- Track user-level violation patterns to detect coordinated attacks.
- Generate daily safety reports with trend analysis and coverage gap detection.
- Conduct post-incident analysis with root cause identification and preventive measures.
- Maintain an immutable audit trail with cryptographic hash verification.
- Monitor guardrail latency as a performance metric — slow moderation causes user friction.
- Calculate mean time to detect (MTTD) and mean time to respond (MTTR) for safety incidents.
- Review severity distribution weekly to ensure thresholds remain calibrated.
- Cross-reference safety events with feedback data to identify false positives.
- Automate escalation to human reviewers for high-severity or ambiguous events.
- Test automated response workflows in staging before enabling in production.
- Store all safety logs for the duration required by compliance regulations.
- Periodically audit the safety monitoring system itself for gaps and blind spots.
