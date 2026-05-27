# Safety Policy Frameworks

## Overview
A safety policy framework defines the rules, thresholds, and response procedures for AI system behavior. It translates ethical principles into enforceable technical guardrails. A good framework balances safety with utility — overly restrictive policies reduce usefulness.

## Policy Architecture

### Policy Hierarchy
```
┌─────────────────────────────────┐
│        Constitutional           │
│        Principles               │
│  (human dignity, fairness,      │
│   transparency, accountability) │
└──────────────┬──────────────────┘
               ▼
┌─────────────────────────────────┐
│      Domain Policies            │
│  (safety, bias, privacy,        │
│   security, compliance)         │
└──────────────┬──────────────────┘
               ▼
┌─────────────────────────────────┐
│     Technical Rules             │
│  (blocklists, thresholds,       │
│   moderation categories,        │
│   restriction levels)           │
└──────────────┬──────────────────┘
               ▼
┌─────────────────────────────────┐
│      Enforcement                │
│  (guardrails, filters,          │
│   human review, logging)        │
└─────────────────────────────────┘
```

### Policy Definition Format
```yaml
# safety-policies.yaml
policies:
  hate_speech:
    severity: critical
    categories:
      - racial_slurs
      - religious_hate
      - gender_discrimination
    action: block_output
    moderation_threshold: 0.8
    human_review: true
    exceptions:
      - educational_context
      - quoted_content_with_warning

  self_harm:
    severity: critical
    categories:
      - suicide_instructions
      - self_injury_methods
      - eating_disorder_promotion
    action: block_and_escalate
    crisis_resources: true
    escalation: safety_team_pagerduty

  misinformation:
    severity: high
    categories:
      - medical_falsehoods
      - election_fraud
      - scientific_denial
    action: flag_and_review
    threshold: 0.7
    disclaimer_required: true
```

## Policy Evaluation

### Policy Testing Suite
```python
class PolicyTester:
    def __init__(self, policies: dict):
        self.policies = policies
        self.results = []

    def test_policy_coverage(self, test_cases: list[dict]) -> dict:
        covered = 0
        for case in test_cases:
            for policy_name, policy in self.policies.items():
                if self._matches_policy(case, policy):
                    covered += 1
                    break
        return {
            "coverage": covered / max(len(test_cases), 1),
            "uncovered": [c for c in test_cases if not self._any_policy_matches(c)],
        }

    def test_policy_precision(self, benign_cases: list[dict]) -> dict:
        false_positives = 0
        for case in benign_cases:
            for policy in self.policies.values():
                if self._matches_policy(case, policy):
                    false_positives += 1
                    break
        return {
            "false_positive_rate": false_positives / max(len(benign_cases), 1),
            "false_positives": false_positives,
        }

    def _matches_policy(self, case: dict, policy: dict) -> bool:
        return any(
            cat in case.get("categories", [])
            for cat in policy.get("categories", [])
        )
```

### Threshold Calibration
```python
class ThresholdCalibrator:
    def __init__(self, policies: dict):
        self.policies = policies

    def calibrate(self, historical_data: list[dict]) -> dict:
        recommendations = {}
        for policy_name, policy in self.policies.items():
            scores = [d["score"] for d in historical_data if d["policy"] == policy_name]
            labels = [d["actual"] for d in historical_data if d["policy"] == policy_name]

            if not scores:
                continue

            best_f1 = 0
            best_threshold = policy.get("moderation_threshold", 0.5)

            for threshold in [t / 100 for t in range(50, 100, 5)]:
                tp = sum(1 for s, l in zip(scores, labels) if s >= threshold and l == "harmful")
                fp = sum(1 for s, l in zip(scores, labels) if s >= threshold and l == "benign")
                fn = sum(1 for s, l in zip(scores, labels) if s < threshold and l == "harmful")

                precision = tp / max(tp + fp, 1)
                recall = tp / max(tp + fn, 1)
                f1 = 2 * precision * recall / max(precision + recall, 0.001)

                if f1 > best_f1:
                    best_f1 = f1
                    best_threshold = threshold

            recommendations[policy_name] = {
                "current_threshold": policy.get("moderation_threshold"),
                "recommended_threshold": best_threshold,
                "expected_f1": best_f1,
                "f1_improvement": best_f1 - self._current_f1(policy, scores, labels),
            }
        return recommendations
```

## Policy Enforcement

### Multi-Layer Enforcement
```python
class PolicyEnforcer:
    def __init__(self, policies: dict):
        self.policies = policies

    def enforce_input(self, user_input: str) -> dict:
        violations = []
        for name, policy in self.policies.items():
            if policy.get("scope", "both") in ["input", "both"]:
                score = self.classify(user_input, policy)
                if score >= policy.get("moderation_threshold", 0.5):
                    violations.append({
                        "policy": name,
                        "severity": policy.get("severity"),
                        "score": score,
                        "action": self.determine_action(policy, score),
                        "requires_review": policy.get("human_review", False),
                    })

        return {
            "blocked": any(v["action"] == "block" for v in violations),
            "violations": violations,
            "requires_review": any(v["requires_review"] for v in violations),
        }

    def enforce_output(self, model_output: str, user_input: str) -> dict:
        violations = []
        for name, policy in self.policies.items():
            if policy.get("scope", "both") in ["output", "both"]:
                score = self.classify(model_output, policy)
                if score >= policy.get("moderation_threshold", 0.5):
                    action = self.determine_action(policy, score)
                    violations.append({
                        "policy": name,
                        "severity": policy.get("severity"),
                        "score": score,
                        "action": action,
                    })
                    if action in ["block", "block_and_escalate"]:
                        return {"blocked": True, "violations": violations}

        return {"blocked": False, "violations": violations}

    def determine_action(self, policy: dict, score: float) -> str:
        if score >= 0.95:
            return policy.get("action", "block")
        elif score >= policy.get("moderation_threshold", 0.5):
            return policy.get("action", "flag")
        return "allow"
```

## Policy Versioning

```python
class PolicyVersionManager:
    def __init__(self, storage_path: str):
        self.storage = storage_path
        self.current_version = self._load_latest()

    def create_version(self, policies: dict, author: str, changelog: str) -> str:
        version = f"v{int(time.time())}"
        entry = {
            "version": version,
            "author": author,
            "timestamp": datetime.utcnow().isoformat(),
            "changelog": changelog,
            "policies": policies,
        }
        with open(f"{self.storage}/policy-{version}.json", "w") as f:
            json.dump(entry, f, indent=2)
        return version

    def rollback(self, version: str) -> dict:
        with open(f"{self.storage}/policy-{version}.json") as f:
            return json.load(f)["policies"]

    def diff_versions(self, v1: str, v2: str) -> dict:
        policies_v1 = self.load_version(v1)["policies"]
        policies_v2 = self.load_version(v2)["policies"]
        changes = {"added": [], "removed": [], "modified": []}

        for name in set(list(policies_v1.keys()) + list(policies_v2.keys())):
            if name not in policies_v1:
                changes["added"].append(name)
            elif name not in policies_v2:
                changes["removed"].append(name)
            elif policies_v1[name] != policies_v2[name]:
                changes["modified"].append(name)

        return changes
```

## Policy Review Workflow

```python
class PolicyReviewWorkflow:
    def __init__(self):
        self.review_queue = []

    def propose_change(self, policy_name: str, changes: dict, reason: str, author: str):
        proposal = {
            "id": str(uuid.uuid4()),
            "policy": policy_name,
            "changes": changes,
            "reason": reason,
            "author": author,
            "status": "draft",
            "created": datetime.utcnow().isoformat(),
        }
        self.review_queue.append(proposal)
        return proposal["id"]

    def submit_for_review(self, proposal_id: str):
        proposal = next(p for p in self.review_queue if p["id"] == proposal_id)
        proposal["status"] = "in_review"
        self.notify_reviewers(proposal)

    def approve(self, proposal_id: str, reviewer: str, comment: str = ""):
        proposal = next(p for p in self.review_queue if p["id"] == proposal_id)
        proposal["status"] = "approved"
        proposal["reviewer"] = reviewer
        proposal["reviewed_at"] = datetime.utcnow().isoformat()
        proposal["review_comment"] = comment

    def reject(self, proposal_id: str, reviewer: str, reason: str):
        proposal = next(p for p in self.review_queue if p["id"] == proposal_id)
        proposal["status"] = "rejected"
        proposal["reviewer"] = reviewer
        proposal["rejection_reason"] = reason
```

## Key Points
- Policies should form a hierarchy: principles → domain → rules → enforcement
- Define policies as machine-readable YAML/JSON for automated enforcement
- Test policy coverage on known harmful content (target >95%)
- Calibrate thresholds using F1 optimization on historical data
- Use multi-layer enforcement (input + output checks)
- Version control all policy changes with changelogs
- Require human review for critical policy changes
- Monitor false positive rates to prevent over-blocking
- Include exception mechanisms for legitimate use cases
- Review policies quarterly against emerging harm patterns
