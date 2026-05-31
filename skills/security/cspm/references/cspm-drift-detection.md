# CSPM: Cloud Configuration Drift Detection & Remediation Engine

## Overview

Cloud configuration drift is the gradual divergence of actual cloud resource configurations from the intended secure baseline. This reference covers the architecture of automated drift detection and remediation engines — systems that continuously monitor cloud environments for unauthorized changes, compare against desired state, and execute automated remediation workflows with safety controls.

## Core Architecture Concepts

### Drift Detection Model

```
Desired State (Policy/Baseline)
├── CIS Benchmarks (provider-specific)
├── Organization security policies
├── Compliance framework mappings
├── Custom rules
└── Infrastructure-as-Code templates

Actual State (Cloud Resources)
├── Current resource configurations
├── Real-time event stream
├── Periodic snapshots
└── Change history

Drift = Desired State ≠ Actual State
├── Severity classification
├── Risk scoring
├── Auto-remediation path
└── Approval requirements
```

### Remediation Engine Architecture

```
┌────────────────────────────────────────────────────────────────────────────┐
│                        Remediation Engine                                  │
│                                                                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌───────────────┐ │
│  │ Drift        │  │ Policy       │  │ Remediation  │  │ Approval      │ │
│  │ Detector     │  │ Engine       │  │ Executor     │  │ Manager       │ │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └───────┬───────┘ │
│         │                 │                 │                  │         │
│  ┌──────┴───────┐  ┌──────┴───────┐  ┌──────┴───────┐  ┌──────┴───────┐ │
│  │ Event        │  │ Expected     │  │ Remediation  │  │ Approval     │ │
│  │ Sources      │  │ Config       │  │ Playbooks    │  │ Workflow     │ │
│  │ CloudTrail   │  │ Generator    │  │ Terraform    │  │ Manager      │ │
│  │ Config       │  │ IaC Parsing  │  │ CloudForm    │  │ Notify       │ │
│  │ EventBridge  │  │ Policy Rego  │  │ Azure RM     │  │ Escalate     │ │
│  └──────────────┘  └──────────────┘  └──────────────┘  └───────────────┘ │
│                                                                            │
│  ┌──────────────────────────────────────────────────────────────────────┐ │
│  │                        Safety Controls                                │ │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │ │
│  │  │ Blast    │ │ Rollback │ │ Rate     │ │ Approve  │ │ Dry-run  │  │ │
│  │  │ Radius   │ │ Plan     │ │ Limit    │ │ Gate     │ │ Mode     │  │ │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘  │ │
│  └──────────────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────────┘
```

### Remediation Classification

```
Auto-Remediation Classes:

Class 1: Safe Auto-Remediation (no approval needed)
├── Enable S3 Block Public Access
├── Enable EBS Encryption by Default
├── Enable RDS Minor Version Auto-Upgrade
├── Enable CloudTrail Multi-Region
├── Enable S3 Server Access Logging
└── Apply Resource Tags

Class 2: Conditional Auto-Remediation (notify + auto-fix)
├── Revoke Public S3 ACL (notify bucket owner)
├── Apply Default KMS Encryption to New Volumes
├── Enforce IAM Password Policy
├── Enable VPC Flow Logs (notify network team)
└── Rotate Expired SSL Certificates

Class 3: Manual Remediation (requires approval)
├── Modify Security Group Rules (could break connectivity)
├── Change IAM Policy Attachments (could break access)
├── Delete Unused Resources (could be needed)
├── Modify RDS Instance Type (could cause downtime)
└── Change Route Table Entries (could break routing)

Class 4: Escalated (requires security team)
├── Root Account Activity (potential compromise)
├── Suspicious IAM Role Creation (potential backdoor)
├── Unauthorized Resource Exfiltration
├── Crypto Mining Detection
└── Data Exfiltration Patterns
```

## Architecture Decision Trees

### Decision 1: Desired State Source

```
Question: Where does the desired/baseline configuration come from?
├── IaC Templates (Git as source of truth)
│   ├── Compare actual ↔ terraform plan / CloudFormation template
│   ├── Pros: Aligned with deployment pipeline, version-controlled
│   ├── Cons: Only covers IaC-managed resources, drift in IaC-managed is normal
│   └── Best for: Organizations with high IaC coverage
├── Policy-as-Code (Rego, Sentinel, Azure Policy)
│   ├── Define policies independent of IaC
│   ├── Pros: Covers all resources, flexible rules
│   ├── Cons: Policy maintenance, may conflict with IaC
│   └── Best for: Organizations with diverse resource management
├── Compliance Frameworks (CIS, NIST, SOC 2)
│   ├── Pre-defined benchmark controls
│   ├── Pros: Industry-standard, auditor-recognized
│   ├── Cons: May not cover org-specific policies
│   └── Best for: Compliance-driven organizations
└── Hybrid (recommended)
    ├── IaC for deployed resources
    ├── Policy-as-Code for security controls
    ├── Compliance frameworks for reporting
    └── Conflict resolution: Policy-as-Code wins (security over convenience)
```

### Decision 2: Remediation Execution Model

```
Question: Inline (synchronous) or Queue-based (async) remediation?
├── Inline
│   ├── Detect drift → immediately execute remediation
│   ├── Pros: Fastest remediation, simple pipeline
│   ├── Cons: Blocks pipeline, may cause cascading failures
│   └── Best for: Class 1 safe remediations
├── Queue-based
│   ├── Detect drift → publish to queue → worker executes
│   ├── Pros: Decoupled, retry-capable, can prioritize
│   ├── Cons: Higher latency, queue management overhead
│   └── Best for: Class 2-4, high-volume environments
└── Hybrid
    ├── Inline: Critical security controls (public S3, root activity)
    ├── Queue-based: Non-critical, high-volume remediations
    └── Recommended for production deployments
```

### Decision 3: Rollback Strategy

```
Question: How to handle failed or incorrect remediation?
├── Automatic rollback
│   ├── Pre-compute rollback plan before remediation
│   ├── Trigger: Remediation fails or impacts downstream
│   ├── Pros: Fastest recovery, minimal blast radius
│   └── Cons: May rollback legitimate changes if incorrectly triggered
├── Manual rollback
│   ├── Analyst reviews failed remediation, decides action
│   ├── Pros: Human judgment, prevents automated rollback loops
│   ├── Cons: Slower, requires on-call expertise
│   └── Best for: Complex or business-critical remediations
└── Hybrid
    ├── Auto-rollback for Class 1 (safe, reversible)
    ├── Manual rollback for Class 2-4
    └── All rollbacks logged and reported
```

## Implementation Strategies

### Phase 1: Detection Foundation (Weeks 1-4)
- Deploy event-driven change detection (CloudTrail/Azure Monitor/GCP Audit Logs)
- Establish resource inventory baseline
- Implement 20 critical CIS benchmark detections
- Build drift detection dashboard
- Set up alerting for critical findings

### Phase 2: Remediation Pipeline (Weeks 5-10)
- Deploy remediation worker with cloud provider SDK
- Implement Class 1 remediations (auto-fix) for top 10 safe controls
- Build approval workflow for Class 3-4 remediations
- Deploy rollback capability for each remediation
- Create remediation audit trail

### Phase 3: Advanced Drift Detection (Weeks 11-16)
- Implement desired state from IaC comparison
- Deploy policy-as-code rules (Rego/Sentinel)
- Build drift trend analysis and predictive detection
- Implement multi-cloud drift correlation
- Deploy remediation playbooks

### Phase 4: Self-Healing (Weeks 17-24)
- Deploy auto-remediation for all Class 1-2 controls
- Build remediation effectiveness scoring
- Implement cascading remediation (fix root cause, not symptoms)
- Deploy compliance evidence auto-collection
- Build CI/CD integration (pre-deploy drift check)

## Integration Patterns

### Event-Driven Remediation Pattern

```yaml
# AWS: S3 Public Access Auto-Remediation

trigger:
  event_source: "aws.s3"
  event_name: "PutBucketAcl"
  
detection:
  rule: "S3 bucket should not have public ACLs"
  check: "GetBucketAcl → any grantee = AllUsers or AuthenticatedUsers"
  severity: "CRITICAL"

remediation:
  action: "PutBucketAcl → private"
  class: 1  # Safe, auto-remediate
  
  steps:
    1: "Create snapshot of current ACL (for rollback)"
    2: "Apply private ACL"
    3: "Verify: GetBucketAcl → no public grants"
    4: "Notify: bucket owner, security team"
    5: "Log: full change record with before/after"
    
  rollback:
    type: "automatic"
    condition: "Remediation failed or notification returned error"
    action: "Restore ACL from snapshot"
    
  safety:
    blast_radius: "Single bucket"
    rate_limit: "10 remediations per minute"
    excluded_resources:
      - "arn:aws:s3:::public-content-bucket"
    time_window: "24/7"
```

### IaC Drift Detection Pattern

```python
class IaCDriftDetector:
    def __init__(self, provider, git_repo):
        self.provider = provider
        self.repo = git_repo
        
    def detect_drift(self, resource_type, resource_id):
        # 1. Get actual state from cloud provider
        actual = self.provider.get_resource_config(resource_id)
        
        # 2. Get desired state from IaC
        desired = self.repo.get_desired_config(resource_type, resource_id)
        
        if not desired:
            return DriftResult(
                resource_id=resource_id,
                drift_type="UNMANAGED",
                severity="MEDIUM",
                detail="Resource not defined in IaC"
            )
            
        # 3. Compare actual vs desired
        differences = self._compare(actual, desired)
        
        if not differences:
            return DriftResult(
                resource_id=resource_id,
                drift_type="IN_SYNC",
                severity="INFO"
            )
            
        # 4. Classify drift severity
        severity = self._classify_severity(differences)
        
        return DriftResult(
            resource_id=resource_id,
            drift_type="DRIFTED",
            severity=severity,
            differences=differences,
            remediation=DesiredStateRemediation(provider=self.provider, desired=desired)
        )
    
    def _classify_severity(self, differences):
        safety_critical = ["public_access", "encryption_disabled", "wide_ingress"]
        operational = ["instance_type", "tag_missing", "backup_config"]
        
        for diff in differences:
            if diff.field in safety_critical:
                return "CRITICAL"
            if diff.field in operational:
                return "MEDIUM"
        return "LOW"
```

### Approval Workflow Pattern

```
Drift Detection: CRITICAL → Auto-remediation blocked (Class 3)

Workflow:
1. Remediation request created
   ├── Resource: sg-0123456789abcdef0
   ├── Drift: Ingress 0.0.0.0/0:22 (SSH) open to internet
   ├── Proposed fix: Remove 0.0.0.0/0 ingress for port 22
   └── Risk: May block SSH access for legitimate users

2. Auto-assign to resource owner (via tag: Owner=security-team)
   ├── Notify via Slack/Teams
   ├── Timeout: 4 hours
   └── Escalation: Manager if no response

3. Approval gate
   ├── Approve: Execute remediation
   ├── Reject: Close finding, document reason
   ├── Defer: Re-scan in 7 days
   └── Modify: Suggest alternative fix

4. Post-approval
   ├── Execute remediation
   ├── Verify fix
   ├── Notify stakeholders
   └── Log approval + execution in audit trail
```

## Performance Optimization

### Remediation Worker Scaling

| Factor | Bottleneck | Strategy |
|--------|-----------|----------|
| API Rate Limits | Cloud provider throttling | Token bucket per account, queued remediations |
| Concurrent Remediations | Worker pool exhaustion | Auto-scaling based on queue depth |
| State Lookups | Cloud API latency | Cache resource state, batch queries |
| Rollback Preparation | Snapshot computation | Pre-compute before remediation |
| Audit Logging | Write throughput | Async batch logging |

### Drift Detection Latency

```
Detection Method          Latency          Coverage        Cost
Event-driven (real-time)  <1 minute        Critical only   Low
Scheduled (frequent)      5-15 minutes     High risk       Medium
Scheduled (moderate)      1-4 hours        Medium risk     Medium
Scheduled (daily)         24 hours         Low risk        Low
Full inventory                     Weekly            Complete          High
```

## Safety and Security Considerations

### Remediation Safety Controls

```
Pre-flight Checklist (before any remediation):
├── 1. Resource exists and is accessible
├── 2. Remediation is still applicable (re-check drift)
├── 3. Resource not in exclusion list
├── 4. Rate limit not exceeded
├── 5. Business hours or emergency override
├── 6. Rollback plan exists
└── 7. Approval obtained (if required)

Execution Guards:
├── Idempotency: Same remediation can run multiple times safely
├── Timeout: Max 5 minutes per remediation
├── Circuit Breaker: >10 failures/minute → stop auto-remediation
├── Concurrent Limit: Max 5 remediations per account
└── Rollback Trigger: Any failure → immediate rollback

Post-Execution:
├── Verify remediation succeeded
├── Run detection rule again to confirm compliance
├── Log full before/after state
├── Notify stakeholders
└── Update compliance evidence
```

### Remediation Security
- Remediation runner uses least-privilege IAM role per action type
- All remediation actions logged with full context
- Remediation code signed and version-controlled
- No human-in-the-loop override for safety controls
- Emergency stop capability for all auto-remediation

## Operational Excellence

### Remediation Metrics

| Metric | Description | Target |
|--------|-------------|--------|
| Time to Remediate | Drift to fix | <5 min (Class 1), <4h (Class 2) |
| Remediation Success Rate | Successful / attempted | >95% |
| Auto-Remediation Coverage | % drifts auto-fixed | >80% |
| Rollback Rate | Remediations rolled back | <2% |
| False Positive Rate | Incorrect drifts detected | <5% |
| Mean Time Between Failures | Remediation engine uptime | >30 days |

### Drift Trend Analysis
- Weekly drift report by resource type, severity, account
- Monthly trend: increasing or decreasing drifts
- Quarterly: root cause analysis of repeat drifts
- Annual: policy effectiveness review

## Testing Strategy

### Remediation Testing
- **Unit tests**: Each remediation action with mocked cloud API
- **Dry-run mode**: Remediation proposes changes without executing
- **Integration tests**: Remediate test resources, verify with re-scan
- **Rollback tests**: Execute remediation, verify rollback restores original
- **Chaos tests**: Simulate API failures, throttling, resource not found
- **Safety tests**: Verify exclusion lists, rate limiting, blast radius controls

## Common Pitfalls

| Pitfall | Symptom | Root Cause | Prevention |
|---------|---------|------------|------------|
| Remediation loop | Same resource fixed repeatedly | Resource recreated with bad config | IaC integration, fix source not symptom |
| Cascade failure | Fixing SGs breaks app connectivity | No dependency analysis | Dependency mapping before remediation |
| Rate limit abuse | Cloud API throttling all calls | Too many concurrent remediations | Token bucket concurrency limiter |
| Rollback loop | Remediation → rollback → remediate | Health check incorrect | Verify fix + stability window before completing |
| Exclusion rot | Resources never remediated | Exclusion list never reviewed | Quarterly exclusion list audit |
| Alert fatigue | Auto-remediation notifications ignored | Too many success notifications | Only notify on failure or escalation |

## Key Takeaways

- Drift detection: compare actual state against desired state from IaC, policy-as-code, or compliance frameworks
- Classify remediations: safe auto-fix, conditional, manual approval, escalated
- Use event-driven detection for critical controls, scheduled scanning for the rest
- Implement safety controls: blast radius, rate limiting, circuit breaker, rollback plan
- Pre-compute rollback before executing any remediation
- Monitor auto-remediation coverage and success rate as primary KPIs
- Test all remediations in dry-run mode before enabling auto-execution
- Fix root cause (IaC), not symptoms (manual re-configuration)
- Prevent remediation loops with idempotency and stability windows

## Related References
- references/cspm-platforms.md — Platform comparison
- references/compliance-frameworks.md — Compliance mapping
- references/automated-remediation.md — Remediation patterns
- references/ciem-permissions.md — CIEM and permissions
- references/cspm-integration.md — Integration patterns
- references/cspm-fundamentals.md — Foundational concepts
