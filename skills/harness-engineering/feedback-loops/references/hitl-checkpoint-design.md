# Human-in-the-Loop (HITL) Checkpoint Design

## Overview

Human-in-the-Loop (HITL) checkpoints are critical control points in agent pipelines
where human judgment is required before proceeding. They serve as safety nets for
high-risk operations, quality assurance gates, and learning opportunities. Effective
HITL design balances agent autonomy with human oversight based on risk assessment.

## 1. HITL Architecture

### 1.1 System Overview

```
┌──────────────────────────────────────────────────────────┐
│                    HITL CONTROL PLANE                     │
│                                                          │
│  ┌──────────┐   ┌─────────────┐   ┌──────────────┐     │
│  │  AGENT   │──▶│ CHECKPOINT  │──▶│   ROUTING    │     │
│  │ Pipeline │   │  EVALUATOR  │   │   ENGINE     │     │
│  └──────────┘   └─────────────┘   └──────────────┘     │
│                        │                │                │
│                        ▼                ▼                │
│                  ┌───────────┐   ┌────────────┐         │
│                  │   AUTO    │   │   HUMAN    │         │
│                  │  APPROVE  │   │  REVIEW    │         │
│                  └───────────┘   └────────────┘         │
│                        │              │                  │
│                        ▼              ▼                  │
│                  ┌───────────────────────────┐           │
│                  │    DECISION RECORDER      │           │
│                  │  (Audit + Learning)        │           │
│                  └───────────────────────────┘           │
└──────────────────────────────────────────────────────────┘
```

### 1.2 Checkpoint Types

| Type | Trigger | Timeout Behavior | Example |
|------|---------|------------------|---------|
| **Blocking** | Always fires | Wait indefinitely | File deletion approval |
| **Non-blocking** | Always fires | Auto-approve after timeout | Style review |
| **Conditional** | Risk score exceeds threshold | Escalate to manager | Large refactors |
| **Sampling** | Random sample of N% | Auto-approve if not sampled | Routine changes |
| **Progressive** | First N, then sample | Reduce after trust builds | New agent onboarding |

## 2. Approval Gate Framework

### 2.1 Gate Definition

```python
from dataclasses import dataclass, field
from enum import Enum, auto
from typing import Any, Callable, Optional
from datetime import datetime, timedelta
import uuid
import asyncio


class ApprovalStatus(Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    TIMEOUT = "timeout"
    ESCALATED = "escalated"
    AUTO_APPROVED = "auto_approved"


class RiskLevel(Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


@dataclass
class ApprovalRequest:
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    checkpoint_name: str = ""
    description: str = ""
    artifact: Any = None
    artifact_summary: str = ""
    risk_level: RiskLevel = RiskLevel.MEDIUM
    context: dict = field(default_factory=dict)
    requested_at: datetime = field(default_factory=datetime.now)
    timeout: timedelta = field(default_factory=lambda: timedelta(hours=1))
    status: ApprovalStatus = ApprovalStatus.PENDING
    reviewer: Optional[str] = None
    review_comment: Optional[str] = None
    reviewed_at: Optional[datetime] = None
    auto_approve_eligible: bool = False


@dataclass
class CheckpointConfig:
    name: str
    description: str
    risk_threshold: RiskLevel = RiskLevel.MEDIUM
    timeout: timedelta = field(default_factory=lambda: timedelta(hours=1))
    timeout_action: str = "block"  # "block", "auto_approve", "escalate"
    required_approvers: int = 1
    auto_approve_conditions: list[Callable[[Any], bool]] = field(
        default_factory=list
    )
    escalation_chain: list[str] = field(default_factory=list)
    sampling_rate: float = 1.0  # 1.0 = 100% review


class ApprovalGate:
    """A single approval gate in the agent pipeline."""

    def __init__(self, config: CheckpointConfig):
        self.config = config
        self.pending_requests: dict[str, ApprovalRequest] = {}
        self.history: list[ApprovalRequest] = []
        self._approval_events: dict[str, asyncio.Event] = {}

    async def request_approval(
        self,
        artifact: Any,
        risk_level: RiskLevel,
        context: dict | None = None,
    ) -> ApprovalRequest:
        """Submit an artifact for approval."""
        import random

        # Sampling check
        if random.random() > self.config.sampling_rate:
            return self._auto_approve(artifact, "Sampling bypass")

        # Auto-approve conditions
        for condition in self.config.auto_approve_conditions:
            if condition(artifact):
                return self._auto_approve(artifact, "Auto-approve condition met")

        # Risk-based routing
        if risk_level.value < self.config.risk_threshold.value:
            return self._auto_approve(artifact, "Below risk threshold")

        # Create approval request
        request = ApprovalRequest(
            checkpoint_name=self.config.name,
            description=self.config.description,
            artifact=artifact,
            artifact_summary=str(artifact)[:500],
            risk_level=risk_level,
            context=context or {},
            timeout=self.config.timeout,
        )

        self.pending_requests[request.id] = request
        event = asyncio.Event()
        self._approval_events[request.id] = event

        # Wait for approval or timeout
        try:
            await asyncio.wait_for(
                event.wait(), timeout=self.config.timeout.total_seconds()
            )
        except asyncio.TimeoutError:
            request = self._handle_timeout(request)

        return request

    def approve(
        self, request_id: str, reviewer: str, comment: str = ""
    ) -> ApprovalRequest:
        """Approve a pending request."""
        request = self.pending_requests.pop(request_id)
        request.status = ApprovalStatus.APPROVED
        request.reviewer = reviewer
        request.review_comment = comment
        request.reviewed_at = datetime.now()
        self.history.append(request)

        if request_id in self._approval_events:
            self._approval_events[request_id].set()

        return request

    def reject(
        self, request_id: str, reviewer: str, comment: str
    ) -> ApprovalRequest:
        """Reject a pending request."""
        request = self.pending_requests.pop(request_id)
        request.status = ApprovalStatus.REJECTED
        request.reviewer = reviewer
        request.review_comment = comment
        request.reviewed_at = datetime.now()
        self.history.append(request)

        if request_id in self._approval_events:
            self._approval_events[request_id].set()

        return request

    def _auto_approve(self, artifact: Any, reason: str) -> ApprovalRequest:
        request = ApprovalRequest(
            checkpoint_name=self.config.name,
            artifact=artifact,
            status=ApprovalStatus.AUTO_APPROVED,
            review_comment=reason,
            reviewed_at=datetime.now(),
        )
        self.history.append(request)
        return request

    def _handle_timeout(self, request: ApprovalRequest) -> ApprovalRequest:
        self.pending_requests.pop(request.id, None)

        if self.config.timeout_action == "auto_approve":
            request.status = ApprovalStatus.AUTO_APPROVED
            request.review_comment = "Timeout auto-approval"
        elif self.config.timeout_action == "escalate":
            request.status = ApprovalStatus.ESCALATED
        else:
            request.status = ApprovalStatus.TIMEOUT

        request.reviewed_at = datetime.now()
        self.history.append(request)
        return request
```

## 3. Review Queue System

### 3.1 Priority Review Queue

```python
import heapq
from threading import Lock


@dataclass
class ReviewItem:
    priority: int  # Lower = higher priority
    request: ApprovalRequest
    assigned_to: Optional[str] = None
    assigned_at: Optional[datetime] = None

    def __lt__(self, other):
        return self.priority < other.priority


RISK_PRIORITY = {
    RiskLevel.CRITICAL: 0,
    RiskLevel.HIGH: 1,
    RiskLevel.MEDIUM: 2,
    RiskLevel.LOW: 3,
}


class ReviewQueue:
    """Priority-based review queue for HITL checkpoints."""

    def __init__(self):
        self._queue: list[ReviewItem] = []
        self._lock = Lock()
        self._items_by_id: dict[str, ReviewItem] = {}

    def enqueue(self, request: ApprovalRequest) -> ReviewItem:
        """Add a request to the review queue."""
        priority = RISK_PRIORITY.get(request.risk_level, 2)

        # Boost priority for time-sensitive items
        time_remaining = (
            request.requested_at + request.timeout - datetime.now()
        ).total_seconds()
        if time_remaining < 300:  # Less than 5 minutes
            priority = max(0, priority - 1)

        item = ReviewItem(priority=priority, request=request)

        with self._lock:
            heapq.heappush(self._queue, item)
            self._items_by_id[request.id] = item

        return item

    def dequeue(self, reviewer_id: str) -> ReviewItem | None:
        """Get the next highest-priority item for review."""
        with self._lock:
            while self._queue:
                item = heapq.heappop(self._queue)
                if item.request.status == ApprovalStatus.PENDING:
                    item.assigned_to = reviewer_id
                    item.assigned_at = datetime.now()
                    return item
        return None

    def get_queue_stats(self) -> dict:
        """Get current queue statistics."""
        with self._lock:
            pending = [i for i in self._queue if i.request.status == ApprovalStatus.PENDING]
            return {
                "total_pending": len(pending),
                "by_risk": {
                    risk.value: sum(
                        1 for i in pending if i.request.risk_level == risk
                    )
                    for risk in RiskLevel
                },
                "avg_wait_seconds": (
                    sum(
                        (datetime.now() - i.request.requested_at).total_seconds()
                        for i in pending
                    ) / max(len(pending), 1)
                ),
                "oldest_request": (
                    min(i.request.requested_at for i in pending).isoformat()
                    if pending
                    else None
                ),
            }
```

### 3.2 TypeScript Review Queue

```typescript
interface ReviewItem {
  id: string;
  priority: number;
  request: ApprovalRequest;
  assignedTo?: string;
  assignedAt?: number;
}

interface ApprovalRequest {
  id: string;
  checkpointName: string;
  description: string;
  artifactSummary: string;
  riskLevel: "low" | "medium" | "high" | "critical";
  status: "pending" | "approved" | "rejected" | "timeout";
  requestedAt: number;
  timeoutMs: number;
}

class PriorityReviewQueue {
  private queue: ReviewItem[] = [];
  private readonly riskPriority: Record<string, number> = {
    critical: 0,
    high: 1,
    medium: 2,
    low: 3,
  };

  enqueue(request: ApprovalRequest): ReviewItem {
    const item: ReviewItem = {
      id: request.id,
      priority: this.riskPriority[request.riskLevel] ?? 2,
      request,
    };

    this.queue.push(item);
    this.queue.sort((a, b) => a.priority - b.priority);
    return item;
  }

  dequeue(reviewerId: string): ReviewItem | null {
    const idx = this.queue.findIndex((i) => i.request.status === "pending");
    if (idx === -1) return null;

    const item = this.queue.splice(idx, 1)[0];
    item.assignedTo = reviewerId;
    item.assignedAt = Date.now();
    return item;
  }

  getStats(): Record<string, unknown> {
    const pending = this.queue.filter((i) => i.request.status === "pending");
    return {
      totalPending: pending.length,
      byRisk: Object.fromEntries(
        ["critical", "high", "medium", "low"].map((r) => [
          r,
          pending.filter((i) => i.request.riskLevel === r).length,
        ])
      ),
    };
  }
}
```

## 4. Escalation Triggers

### 4.1 Escalation Engine

```python
@dataclass
class EscalationRule:
    name: str
    condition: Callable[[ApprovalRequest, dict], bool]
    escalation_target: str
    priority_boost: int = 0
    notification_channels: list[str] = field(default_factory=list)
    message_template: str = ""


class EscalationEngine:
    """Manages escalation paths for HITL checkpoints."""

    def __init__(self):
        self.rules: list[EscalationRule] = []
        self.escalation_log: list[dict] = []

    def register_rule(self, rule: EscalationRule) -> None:
        self.rules.append(rule)

    def evaluate(
        self, request: ApprovalRequest, context: dict
    ) -> list[EscalationRule]:
        """Evaluate which escalation rules are triggered."""
        triggered = []
        for rule in self.rules:
            if rule.condition(request, context):
                triggered.append(rule)
                self.escalation_log.append({
                    "rule": rule.name,
                    "request_id": request.id,
                    "target": rule.escalation_target,
                    "timestamp": datetime.now().isoformat(),
                })
        return triggered

    def build_default_rules(self) -> None:
        """Register standard escalation rules."""
        # Rule 1: Critical risk always escalates
        self.register_rule(EscalationRule(
            name="critical_risk",
            condition=lambda req, _: req.risk_level == RiskLevel.CRITICAL,
            escalation_target="security_team",
            priority_boost=2,
            notification_channels=["slack", "pagerduty"],
            message_template="CRITICAL: Agent action requires immediate review: {description}",
        ))

        # Rule 2: Timeout escalation
        self.register_rule(EscalationRule(
            name="timeout_escalation",
            condition=lambda req, ctx: (
                (datetime.now() - req.requested_at).total_seconds()
                > req.timeout.total_seconds() * 0.8
            ),
            escalation_target="team_lead",
            priority_boost=1,
            notification_channels=["slack"],
            message_template="Approaching timeout: {description}",
        ))

        # Rule 3: Repeated rejection escalation
        self.register_rule(EscalationRule(
            name="repeated_rejection",
            condition=lambda req, ctx: ctx.get("rejection_count", 0) >= 3,
            escalation_target="engineering_manager",
            priority_boost=1,
            notification_channels=["email", "slack"],
            message_template="Agent output rejected 3+ times: {description}",
        ))

        # Rule 4: High cost action
        self.register_rule(EscalationRule(
            name="high_cost_action",
            condition=lambda req, ctx: ctx.get("estimated_cost_usd", 0) > 100,
            escalation_target="finance_approver",
            priority_boost=0,
            notification_channels=["email"],
            message_template="High-cost action (${estimated_cost_usd}): {description}",
        ))
```

## 5. User Feedback Collection

### 5.1 Feedback Schema

```python
@dataclass
class UserFeedback:
    request_id: str
    reviewer_id: str
    decision: str  # "approve", "reject", "modify"
    quality_rating: int  # 1-5
    categories: list[str]  # e.g., ["incorrect", "incomplete", "style"]
    free_text: str = ""
    suggested_correction: str = ""
    time_spent_seconds: float = 0.0
    timestamp: datetime = field(default_factory=datetime.now)


class FeedbackCollector:
    """Collect and aggregate user feedback from HITL reviews."""

    def __init__(self):
        self.feedback_store: list[UserFeedback] = []

    def collect(self, feedback: UserFeedback) -> None:
        self.feedback_store.append(feedback)

    def get_approval_rate(self, checkpoint_name: str | None = None) -> float:
        """Calculate approval rate for a checkpoint."""
        relevant = self.feedback_store
        if checkpoint_name:
            relevant = [f for f in relevant if f.request_id.startswith(checkpoint_name)]
        if not relevant:
            return 0.0
        approved = sum(1 for f in relevant if f.decision == "approve")
        return approved / len(relevant)

    def get_common_rejection_reasons(self, top_n: int = 5) -> list[tuple[str, int]]:
        """Get most common rejection categories."""
        from collections import Counter
        categories: list[str] = []
        for f in self.feedback_store:
            if f.decision == "reject":
                categories.extend(f.categories)
        return Counter(categories).most_common(top_n)

    def get_avg_review_time(self) -> float:
        """Average time spent reviewing."""
        times = [f.time_spent_seconds for f in self.feedback_store if f.time_spent_seconds > 0]
        return sum(times) / max(len(times), 1)

    def generate_report(self) -> dict:
        """Generate a feedback summary report."""
        return {
            "total_reviews": len(self.feedback_store),
            "approval_rate": self.get_approval_rate(),
            "avg_quality_rating": (
                sum(f.quality_rating for f in self.feedback_store)
                / max(len(self.feedback_store), 1)
            ),
            "avg_review_time_seconds": self.get_avg_review_time(),
            "common_rejection_reasons": self.get_common_rejection_reasons(),
            "reviews_by_decision": {
                decision: sum(1 for f in self.feedback_store if f.decision == decision)
                for decision in ["approve", "reject", "modify"]
            },
        }
```

## 6. Async Approval Workflows

### 6.1 Webhook-Based Async Approval

```python
from enum import Enum
import json


class WebhookEvent(Enum):
    APPROVAL_REQUESTED = "approval.requested"
    APPROVAL_GRANTED = "approval.granted"
    APPROVAL_DENIED = "approval.denied"
    APPROVAL_TIMEOUT = "approval.timeout"
    APPROVAL_ESCALATED = "approval.escalated"


@dataclass
class WebhookPayload:
    event: WebhookEvent
    request_id: str
    checkpoint_name: str
    timestamp: str
    data: dict

    def to_json(self) -> str:
        return json.dumps({
            "event": self.event.value,
            "request_id": self.request_id,
            "checkpoint_name": self.checkpoint_name,
            "timestamp": self.timestamp,
            "data": self.data,
        })


class AsyncApprovalWorkflow:
    """Manages asynchronous approval workflows with webhook notifications."""

    def __init__(self, webhook_url: str, callback_url: str):
        self.webhook_url = webhook_url
        self.callback_url = callback_url
        self.pending: dict[str, ApprovalRequest] = {}
        self.callbacks: dict[str, Callable] = {}

    async def submit(
        self,
        request: ApprovalRequest,
        on_complete: Callable[[ApprovalRequest], None],
    ) -> str:
        """Submit an async approval request."""
        self.pending[request.id] = request
        self.callbacks[request.id] = on_complete

        # Send webhook notification
        payload = WebhookPayload(
            event=WebhookEvent.APPROVAL_REQUESTED,
            request_id=request.id,
            checkpoint_name=request.checkpoint_name,
            timestamp=datetime.now().isoformat(),
            data={
                "description": request.description,
                "risk_level": request.risk_level.value,
                "artifact_summary": request.artifact_summary,
                "callback_url": f"{self.callback_url}/approve/{request.id}",
                "timeout": request.timeout.total_seconds(),
            },
        )

        await self._send_webhook(payload)
        return request.id

    async def handle_callback(
        self, request_id: str, decision: str, reviewer: str, comment: str
    ) -> None:
        """Handle approval callback from reviewer."""
        request = self.pending.pop(request_id, None)
        if not request:
            return

        if decision == "approve":
            request.status = ApprovalStatus.APPROVED
        elif decision == "reject":
            request.status = ApprovalStatus.REJECTED
        else:
            request.status = ApprovalStatus.ESCALATED

        request.reviewer = reviewer
        request.review_comment = comment
        request.reviewed_at = datetime.now()

        callback = self.callbacks.pop(request_id, None)
        if callback:
            callback(request)

        # Send completion webhook
        payload = WebhookPayload(
            event=(
                WebhookEvent.APPROVAL_GRANTED
                if decision == "approve"
                else WebhookEvent.APPROVAL_DENIED
            ),
            request_id=request_id,
            checkpoint_name=request.checkpoint_name,
            timestamp=datetime.now().isoformat(),
            data={
                "decision": decision,
                "reviewer": reviewer,
                "comment": comment,
            },
        )
        await self._send_webhook(payload)

    async def _send_webhook(self, payload: WebhookPayload) -> None:
        """Send webhook notification."""
        import aiohttp
        async with aiohttp.ClientSession() as session:
            await session.post(
                self.webhook_url,
                json=json.loads(payload.to_json()),
                headers={"Content-Type": "application/json"},
            )
```

## 7. Risk-Based HITL Routing

### 7.1 Risk Assessment Engine

```python
@dataclass
class RiskFactor:
    name: str
    weight: float
    scorer: Callable[[Any, dict], float]  # Returns 0.0-1.0


class RiskRouter:
    """Route agent actions to appropriate review paths based on risk."""

    def __init__(self):
        self.factors: list[RiskFactor] = []
        self.routes: dict[RiskLevel, Callable] = {}

    def add_factor(self, factor: RiskFactor) -> None:
        self.factors.append(factor)

    def set_route(self, level: RiskLevel, handler: Callable) -> None:
        self.routes[level] = handler

    def assess_risk(self, artifact: Any, context: dict) -> tuple[RiskLevel, float]:
        """Calculate risk score and determine risk level."""
        if not self.factors:
            return RiskLevel.MEDIUM, 0.5

        total_weight = sum(f.weight for f in self.factors)
        weighted_score = sum(
            f.weight * f.scorer(artifact, context) for f in self.factors
        )
        risk_score = weighted_score / total_weight

        # Map score to level
        if risk_score >= 0.8:
            level = RiskLevel.CRITICAL
        elif risk_score >= 0.6:
            level = RiskLevel.HIGH
        elif risk_score >= 0.3:
            level = RiskLevel.MEDIUM
        else:
            level = RiskLevel.LOW

        return level, risk_score

    async def route(self, artifact: Any, context: dict) -> ApprovalRequest:
        """Assess risk and route to appropriate handler."""
        level, score = self.assess_risk(artifact, context)
        context["risk_score"] = score
        context["risk_level"] = level.value

        handler = self.routes.get(level)
        if handler:
            return await handler(artifact, context)

        # Default: create pending request
        return ApprovalRequest(
            description=f"Risk-routed action (score: {score:.2f})",
            artifact=artifact,
            risk_level=level,
            context=context,
        )

    def build_default_factors(self) -> None:
        """Register standard risk assessment factors."""
        # File operation risk
        self.add_factor(RiskFactor(
            name="file_operation_risk",
            weight=0.3,
            scorer=lambda artifact, ctx: (
                1.0 if ctx.get("operation") in ["delete", "overwrite"] else
                0.5 if ctx.get("operation") in ["create", "modify"] else
                0.1
            ),
        ))

        # Scope risk (number of files affected)
        self.add_factor(RiskFactor(
            name="scope_risk",
            weight=0.25,
            scorer=lambda artifact, ctx: min(
                ctx.get("files_affected", 1) / 20.0, 1.0
            ),
        ))

        # Reversibility risk
        self.add_factor(RiskFactor(
            name="reversibility_risk",
            weight=0.25,
            scorer=lambda artifact, ctx: (
                0.0 if ctx.get("reversible", True) else 1.0
            ),
        ))

        # Agent confidence risk (inverse)
        self.add_factor(RiskFactor(
            name="confidence_risk",
            weight=0.2,
            scorer=lambda artifact, ctx: 1.0 - ctx.get("agent_confidence", 0.5),
        ))
```

## 8. Progressive Trust Model

### 8.1 Trust Score Tracker

```python
@dataclass
class TrustProfile:
    agent_id: str
    trust_score: float = 0.5  # 0.0-1.0
    total_actions: int = 0
    approved_actions: int = 0
    rejected_actions: int = 0
    auto_approve_threshold: float = 0.85
    review_sample_rate: float = 1.0
    created_at: datetime = field(default_factory=datetime.now)
    last_updated: datetime = field(default_factory=datetime.now)


class TrustManager:
    """Track and update agent trust scores for progressive autonomy."""

    def __init__(self, decay_rate: float = 0.01):
        self.profiles: dict[str, TrustProfile] = {}
        self.decay_rate = decay_rate

    def get_profile(self, agent_id: str) -> TrustProfile:
        if agent_id not in self.profiles:
            self.profiles[agent_id] = TrustProfile(agent_id=agent_id)
        return self.profiles[agent_id]

    def record_outcome(
        self, agent_id: str, approved: bool, risk_level: RiskLevel
    ) -> TrustProfile:
        """Update trust score based on review outcome."""
        profile = self.get_profile(agent_id)
        profile.total_actions += 1

        # Risk-weighted update
        risk_weight = {
            RiskLevel.LOW: 0.05,
            RiskLevel.MEDIUM: 0.1,
            RiskLevel.HIGH: 0.15,
            RiskLevel.CRITICAL: 0.25,
        }[risk_level]

        if approved:
            profile.approved_actions += 1
            profile.trust_score = min(
                1.0, profile.trust_score + risk_weight * 0.5
            )
        else:
            profile.rejected_actions += 1
            profile.trust_score = max(
                0.0, profile.trust_score - risk_weight * 2.0
            )

        # Update sample rate based on trust
        profile.review_sample_rate = self._compute_sample_rate(profile)
        profile.last_updated = datetime.now()

        return profile

    def should_require_review(
        self, agent_id: str, risk_level: RiskLevel
    ) -> bool:
        """Determine if review is required based on trust and risk."""
        profile = self.get_profile(agent_id)

        # Critical always requires review
        if risk_level == RiskLevel.CRITICAL:
            return True

        # High trust + low risk = skip review
        if (
            profile.trust_score >= profile.auto_approve_threshold
            and risk_level == RiskLevel.LOW
        ):
            return False

        # Sample-based review
        import random
        return random.random() < profile.review_sample_rate

    def _compute_sample_rate(self, profile: TrustProfile) -> float:
        """Compute review sampling rate based on trust score."""
        if profile.trust_score >= 0.9:
            return 0.1  # 10% sampling
        elif profile.trust_score >= 0.8:
            return 0.25
        elif profile.trust_score >= 0.6:
            return 0.5
        else:
            return 1.0  # 100% review
```

## 9. HITL Checkpoint Pipeline Integration

### 9.1 Pipeline with Checkpoints

```python
class CheckpointPipeline:
    """Agent pipeline with integrated HITL checkpoints."""

    def __init__(self, trust_manager: TrustManager, risk_router: RiskRouter):
        self.trust = trust_manager
        self.router = risk_router
        self.checkpoints: dict[str, ApprovalGate] = {}
        self.execution_log: list[dict] = []

    def register_checkpoint(self, gate: ApprovalGate) -> None:
        self.checkpoints[gate.config.name] = gate

    async def execute_with_checkpoints(
        self,
        agent_id: str,
        pipeline_steps: list[Callable],
        context: dict,
    ) -> dict:
        """Execute pipeline steps with HITL checkpoints."""
        results = []

        for step in pipeline_steps:
            # Execute step
            artifact = await step(context)

            # Find matching checkpoint
            checkpoint_name = context.get("checkpoint", None)
            gate = self.checkpoints.get(checkpoint_name) if checkpoint_name else None

            if gate:
                # Assess risk
                risk_level, risk_score = self.router.assess_risk(artifact, context)

                # Check trust-based bypass
                if not self.trust.should_require_review(agent_id, risk_level):
                    self.execution_log.append({
                        "step": checkpoint_name,
                        "action": "trust_bypass",
                        "risk_score": risk_score,
                    })
                    results.append(artifact)
                    continue

                # Request approval
                request = await gate.request_approval(
                    artifact, risk_level, context
                )

                if request.status in (
                    ApprovalStatus.APPROVED,
                    ApprovalStatus.AUTO_APPROVED,
                ):
                    self.trust.record_outcome(agent_id, True, risk_level)
                    results.append(artifact)
                elif request.status == ApprovalStatus.REJECTED:
                    self.trust.record_outcome(agent_id, False, risk_level)
                    raise Exception(
                        f"Checkpoint rejected: {request.review_comment}"
                    )
                else:
                    raise Exception(f"Checkpoint {request.status.value}")
            else:
                results.append(artifact)

        return {"results": results, "log": self.execution_log}
```

## 10. Best Practices

1. **Default to review, relax with trust**: Start with 100% review and progressively reduce.
2. **Always log decisions**: Every approval/rejection must be recorded for auditability.
3. **Set appropriate timeouts**: Too short frustrates reviewers; too long blocks agents.
4. **Provide rich context in reviews**: Include diffs, summaries, and risk assessments.
5. **Implement escalation chains**: Unreviewed items must escalate, never silently timeout.
6. **Track reviewer fatigue**: Monitor review times and quality; rotate reviewers.
7. **Separate risk assessment from approval**: Risk scoring should be automated; approval is human.
8. **Build feedback loops from reviews**: Rejection patterns should feed back into agent training.

## 11. Anti-Patterns

| Anti-Pattern | Problem | Solution |
|-------------|---------|----------|
| Approve-all culture | Reviewers rubber-stamp everything | Track approval rates; flag > 98% |
| Review bottleneck | Single reviewer blocks all progress | Multiple reviewers with load balancing |
| Silent timeout | Items expire without anyone noticing | Mandatory escalation on timeout |
| Over-reviewing | Every trivial action needs approval | Risk-based routing with trust model |
| No audit trail | Can't trace who approved what | Immutable decision log |
| Missing context | Reviewers can't understand what to approve | Rich diffs, summaries, and risk scores |

## Related References

- `implement-verify-fix-cycles.md` — IVF loops that trigger HITL escalation
- `correction-trigger-mechanisms.md` — Triggers that can route to HITL
- `quality-gate-frameworks.md` — Quality gates with HITL review stages
- `continuous-improvement-loops.md` — Learning from HITL feedback
