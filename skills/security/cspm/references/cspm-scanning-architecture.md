# CSPM: Scanning Architecture & Multi-Account Strategy

## Overview

This reference defines the architecture for cloud security posture management scanning at scale — the system design for continuous discovery, assessment, and monitoring of cloud resources across multi-account, multi-region, multi-cloud environments. It covers scanning engine design, multi-account topology, API rate management, and the trade-offs between agent-based and agentless scanning approaches.

## Core Architecture Concepts

### Scanning Engine Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         CSPM Scanning Engine                                │
│                                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌────────────────┐ │
│  │  Discovery    │  │  Assessment  │  │  Compliance  │  │  Reporting     │ │
│  │  Engine       │  │  Engine      │  │  Engine      │  │  Engine        │ │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────┬─────────┘ │
│         │                 │                 │                 │           │
│  ┌──────┴───────┐  ┌──────┴───────┐  ┌──────┴───────┐  ┌──────┴─────────┐ │
│  │ AWS APIs     │  │ CIS Bench-   │  │ SOC 2       │  │ Findings       │ │
│  │ Azure RM     │  │ marks        │  │ PCI DSS     │  │ Dashboard      │ │
│  │ GCP RM       │  │ NIST CSF     │  │ HIPAA       │  │ Slack/Teams    │ │
│  │ Kubernetes   │  │ Custom Rules │  │ Custom       │  │ SIEM/SOAR      │ │
│  └──────────────┘  └──────────────┘  └──────────────┘  └────────────────┘ │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Multi-Account Topology

```
Management Account (Read-only access to all accounts)
├── Centralized CSPM deployment
├── Read-only cross-account IAM role
├── Aggregated findings view
├── Centralized compliance reporting
└── Automation trigger for remediation

Workload Accounts (Production, Staging, Development)
├── Scanned at regular intervals (every 15-60 min)
├── Resource discovery and inventory
├── Configuration assessment
├── Real-time event-driven scanning (Config rules, Azure Policy)
└── Findings forwarded to management account

Security Tooling Account
├── CSPM data lake
├── Historical compliance snapshots
├── Integration endpoints (SIEM, SOAR)
├── Remediation automation runners
└── Cross-account IAM roles for scanning

Log Archive Account
├── Immutable audit trail of CSPM findings
├── Compliance evidence storage
├── Long-term retention (7+ years)
└── Legal hold support
```

### Scanning Frequency Model

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Scanning Frequency by Severity                    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  CRITICAL Findings: Event-driven (real-time)                        │
│  ├── Public S3 bucket → Immediate alert                             │
│  ├── IAM policy changes → Immediate re-assessment                   │
│  ├── Security group change → Immediate check                        │
│  └── Root activity → Immediate alert                                │
│                                                                      │
│  HIGH Findings: Every 15-30 minutes                                  │
│  ├── Encryption status                                              │
│  ├── Network ACL changes                                            │
│  ├── KMS key rotation status                                        │
│  └── Instance configuration drift                                   │
│                                                                      │
│  MEDIUM Findings: Every 1-4 hours                                   │
│  ├── Tagging compliance                                              │
│  ├── Resource type limits                                            │
│  ├── Backup configuration                                            │
│  └── Cost allocation tagging                                        │
│                                                                      │
│  LOW Findings: Daily                                                 │
│  ├── Unused resources                                                │
│  ├── Idle instances                                                  │
│  ├── Old AMI snapshots                                               │
│  └── Certificate expiry (>90 days)                                  │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

## Architecture Decision Trees

### Decision 1: Agentless vs Agent-Based Scanning

```
Question: Agentless cloud API scanning or deploy agents on workloads?
├── Agentless (Cloud API-based)
│   ├── Architecture: CSPM calls cloud provider APIs (Describe*, List*, Get*)
│   ├── Pros:
│   │   ├── No agent deployment or management
│   │   ├── Coverage of all resources (including serverless)
│   │   ├── No performance impact on workloads
│   │   └── Immediate coverage for new resources
│   ├── Cons:
│   │   ├── API rate limits (throttling at high volume)
│   │   ├── Snapshot-based (may miss ephemeral resources)
│   │   ├── Limited in-depth inspection (can't check running process)
│   │   └── Cloud provider API costs
│   └── Best for: Cloud-native, serverless-heavy, multi-cloud

├── Agent-based (Workload-installed scanner)
│   ├── Architecture: Agent on each workload → reports to CSPM
│   ├── Pros:
│   │   ├── Deep visibility (OS config, running services, open ports)
│   │   ├── Real-time changes (not dependent on API polling)
│   │   ├── Works in disconnected/air-gapped environments
│   │   └── No API rate limits
│   ├── Cons:
│   │   ├── Agent lifecycle management (install, update, decommission)
│   │   ├── Performance overhead on workloads
│   │   ├── Coverage gaps (serverless, PaaS, container images)
│   │   └── Security concerns (agent with privileged access)
│   └── Best for: VMs, on-premises, air-gapped, regulated environments

└── Hybrid (recommended for enterprise)
    ├── Agentless: Cloud-native services (S3, Lambda, RDS, IAM)
    ├── Agent-based: VMs, containers, databases
    ├── Agentless for 80% coverage, agent for remaining 20% depth
    └── Unified findings view regardless of scanning method
```

### Decision 2: Scanning Interval Strategy

```
Question: How often to scan each resource type?
├── Event-driven (real-time)
│   ├── Trigger: CloudTrail/EventBridge → CSPM re-scans affected resources
│   ├── Latency: <1 minute
│   ├── Coverage: All critical security controls
│   ├── Cost: Moderate (per-event processing)
│   └── Best for: IAM, storage, network controls
├── Frequent polling (5-15 minutes)
│   ├── Trigger: Scheduled scanner
│   ├── Latency: 5-15 minutes
│   ├── Coverage: High-risk resources
│   ├── Cost: Higher (API calls every cycle)
│   └── Best for: Compute, container orchestration
├── Moderate polling (1-4 hours)
│   ├── Trigger: Scheduled scanner
│   ├── Latency: 1-4 hours
│   ├── Coverage: Moderate-risk resources
│   ├── Cost: Moderate
│   └── Best for: Database, networking, monitoring
└── Daily polling (24 hours)
    ├── Trigger: Scheduled scanner
    ├── Latency: 24 hours
    ├── Coverage: Low-risk resources
    ├── Cost: Low
    └── Best for: Cost optimization, unused resource detection
```

### Decision 3: Multi-Cloud Aggregation

```
Question: Single CSPM platform vs per-cloud tool?
├── Single multi-cloud CSPM (Wiz, Prisma Cloud, Orca)
│   ├── Pros: Unified dashboard, consistent policies, cross-cloud correlation
│   ├── Cons: Vendor lock-in, may not support all services
│   └── Best for: Multi-cloud from start, central security team
├── Per-cloud native tools (Security Hub + Azure SC + GCP SCC)
│   ├── Pros: Best per-service coverage, lowest cost, native integrations
│   ├── Cons: Fragmented view, inconsistent policies, higher operational burden
│   └── Best for: Single-cloud, cost-sensitive, or compliance-driven
└── Hybrid
    ├── Native tools for deep per-cloud coverage
    ├── Third-party aggregator for unified view
    ├── Pros: Best coverage + unified view
    ├── Cons: Higher total cost, integration complexity
    └── Best for: Enterprise with multi-cloud and compliance requirements
```

## Implementation Strategies

### Phase 1: Multi-Account Setup (Weeks 1-3)
- Deploy CSPM read-only role across all accounts using IaC
- Configure cross-account trust relationships
- Establish management account for centralized scanning
- Set up event-driven scanning via CloudTrail/Azure Monitor/GCP Audit Logs
- Verify scanning coverage across all regions

### Phase 2: Baseline Assessment (Weeks 4-6)
- Run full inventory scan (all resources, all regions)
- Apply CIS benchmark scanning for each cloud provider
- Establish baseline posture score and finding counts
- Triage and classify initial findings by severity
- Configure auto-remediation for known-safe findings (e.g., enforce encryption)

### Phase 3: Continuous Scanning (Weeks 7-10)
- Implement scheduled scanning at tiered intervals
- Configure real-time event-driven scanning for critical controls
- Deploy compliance framework mappings (SOC 2, PCI DSS, HIPAA)
- Set up findings pipeline to SIEM/SOAR
- Create stakeholder dashboards

### Phase 4: Scale and Optimize (Weeks 11-16)
- Onboard additional accounts (new business units, acquisitions)
- Implement custom rules for organization-specific policies
- Optimize scanning intervals based on change frequency
- Deploy CIEM capabilities for permission analysis
- Implement auto-remediation with approval workflows

## Integration Patterns

### Multi-Account Scanning Pattern

```hcl
# Terraform: CSPM cross-account IAM role
resource "aws_iam_role" "cspm_scanner" {
  name = "CSPM-Scanner-Role"
  
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::MANAGEMENT_ACCOUNT:role/CSPM-Scanner"
        }
        Action = "sts:AssumeRole"
        Condition = {
          Bool = {
            "aws:MultiFactorAuthPresent": "true"
          }
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "cspm_readonly" {
  role       = aws_iam_role.cspm_scanner.name
  policy_arn = "arn:aws:iam::aws:policy/SecurityAudit"
}

resource "aws_iam_role_policy_attachment" "cspm_readonly_billing" {
  role       = aws_iam_role.cspm_scanner.name
  policy_arn = "arn:aws:iam::aws:policy/AWSBillingReadOnlyAccess"
}
```

### Event-Driven Scanning Pattern

```yaml
# AWS EventBridge → CSPM scanner trigger
event_pattern:
  source:
    - "aws.s3"
    - "aws.iam"
    - "aws.ec2"
    - "aws.lambda"
  detail-type:
    - "AWS API Call via CloudTrail"
  detail:
    eventName:
      - "PutBucketAcl"
      - "PutBucketPolicy"
      - "PutBucketPublicAccessBlock"
      - "CreateRole"
      - "AttachRolePolicy"
      - "PutRolePolicy"
      - "AuthorizeSecurityGroupIngress"
      - "RevokeSecurityGroupIngress"
      - "CreateSecurityGroup"
  
target:
  - "arn:aws:lambda:us-east-1:MANAGEMENT_ACCOUNT:function:cspm-scanner"

# Lambda scanner function behavior
scanner:
  on_trigger:
    - "Extract affected resource ARN from event"
    - "Fetch current resource configuration"
    - "Evaluate against applicable policies"
    - "Compare with last known good state"
    - "If drift detected: create finding, publish to SNS"
    - "If no drift: update last-scanned timestamp"
```

### Findings Pipeline Pattern

```
CSPM Finding → Event Bus → Processors → Destinations
                                │
  Finding:                      ▼
├── id: "cspm-2026-05-001" ────────────────┐
├── severity: "CRITICAL"                    │
├── resource: "s3://prod-customer-data"     ├──→ SIEM (Splunk/Elastic)
├── rule: "S3_BLOCK_PUBLIC_ACCESS"          │
├── status: "OPEN"                          ├──→ SOAR (auto-remediation)
├── compliance:                             │
│   ├── cis: "2.1"                          ├──→ Ticketing (Jira/ServiceNow)
│   ├── soc2: "CC6.1"                      │
│   └── pci: "1.2.1"                       ├──→ Chat (Slack/Teams)
├── remediation:                            │
│   └── automate: true                      ├──→ Dashboard (Grafana/CSPM UI)
├── timestamp: "2026-05-31T10:00:00Z"       │
└── evidence: {}                            └──→ S3 Archive + SNS notify
```

## Performance Optimization

### API Rate Management

| Cloud Provider | API Limits | Strategy |
|---------------|-----------|----------|
| AWS | 1 req/sec per account per API (some have burst) | List all resources first, then describe in parallel batches |
| Azure | 12,000 req/hour per subscription per Azure RM | Throttle to 3 req/sec, use resource graph for inventory |
| GCP | 20 req/second per project per API | Batch requests, use aggregated list APIs |
| Kubernetes | Varies by apiserver configuration | Watch API for real-time, list for inventory (pagination) |

### Optimization Strategies

```
Parallel scanning:
├── Per-account threads (configurable: 5-50 concurrent accounts)
├── Per-service threads (list all S3 buckets, then all EC2, etc.)
├── Per-region threads (scan all regions in parallel)
└── Resource-level batching (describe 20 resources per API call)

Incremental scanning:
├── Full scan: Every 24 hours
├── Incremental scan: Every 15 minutes (only changed resources)
├── Change detection: Event-driven for watched resources
└── Snapshot comparison: Compare current vs. last-known-good state

Data optimization:
├── Compress scan results (Snappy/Zstd)
├── Deduplicate across scan cycles
├── Aggregate findings by resource and rule
└── Tiered storage: Hot (7d), Warm (90d), Cold (1y+)
```

## Security Considerations

### Scanner Security
```
Scanner IAM Role (least privilege):
├── List* permissions for discovery
├── Get*/Describe* for configuration
├── No write/put/create/delete permissions
├── No data access (cannot read S3 objects, DB contents)
├── Resource-scoped for production accounts
├── Boundary policy to prevent privilege escalation
└── CloudTrail logging for all scanner API calls

Scanner Instance Security:
├── No inbound access (scanner initiates all connections)
├── Encrypted storage for temporary scan data
├── Secrets rotated every 30 days
├── Scanner code signed and integrity-verified
└── Isolated network (no internet egress except to cloud APIs)
```

### Finding Classification
```
Classification criteria:
├── CRITICAL: Active exploit, data exposure, privilege escalation
├── HIGH: Misconfiguration exploitable with existing tools
├── MEDIUM: Deviates from best practice but not directly exploitable
├── LOW: Informational, optimization opportunity
└── INFO: Inventory data, no security impact

False positive handling:
├── Auto-suppress known false positives (with review)
├── User-reported false positive → suppress for 30 days
├── Re-evaluate on rule update
└── Quarterly false positive review
```

## Operational Excellence

### Scanning Operations

| Metric | Description | Target |
|--------|-------------|--------|
| Scan Coverage | % resources scanned in last 24h | >99% |
| Scan Latency | Resource change to finding | <5 min |
| API Error Rate | Failed API calls / total | <1% |
| Finding Accuracy | % findings verified as valid | >90% |
| Account Onboarding | New account to first scan | <1 hour |
| False Positive Rate | False findings / total | <10% |

### Scanning Hygiene
- Weekly review of scan coverage gaps
- Monthly API rate limit analysis and optimization
- Quarterly scanner role audit (least privilege)
- Continuous monitoring of scanner health
- Automated on-boarding for new accounts/projects

## Testing Strategy

### Scanner Testing
- **Unit tests**: Each cloud API wrapper with mocked responses
- **Integration tests**: Scan a known-configured test account, verify expected findings
- **Regression tests**: Re-scan historical baseline, verify no regression in coverage
- **Performance tests**: Scan 100+ accounts with 10K resources each
- **Resilience tests**: API throttling, network failures, partial responses
- **Upgrade tests**: Scanner version upgrade with data migration

## Common Pitfalls

| Pitfall | Symptom | Root Cause | Prevention |
|---------|---------|------------|------------|
| API throttling | Scans incomplete, missing resources | Too many API calls in parallel | Rate limiting, exponential backoff |
| Coverage gaps | New resources not scanned | Event-driven scanner misses event | Full daily scan + event-driven |
| Finding fatigue | Critical findings ignored | Too many low-severity findings | Strict severity classification, auto-close known-good |
| Scanner privilege creep | Scanner role has unnecessary permissions | No periodic review | Quarterly IAM review, automated drift detection |
| Multi-account delay | New account not scanned for days | Manual onboarding | Automated account discovery + onboarding |
| State explosion | Scan database grows unbounded | Storing every scan snapshot | Incremental scanning, snapshot archiving |

## Key Takeaways

- Design CSPM scanning with tiered frequency: event-driven for critical, scheduled for standard
- Use agentless scanning for 80% cloud-native coverage, agent-based for deep workload inspection
- Deploy in hub-and-spoke multi-account topology with management account
- Implement rate limiting with exponential backoff to manage cloud API throttling
- Use incremental scanning for efficiency, full scans for completeness
- Integrate findings pipeline to SIEM, SOAR, and ticketing systems
- Keep scanner roles strictly read-only with periodic least-privilege audit
- Classify findings by actual exploitability, not just configuration deviation
- Automate account onboarding to eliminate scanning gaps

## Related References
- references/cspm-platforms.md — CSPM platform comparison
- references/compliance-frameworks.md — Compliance framework mapping
- references/automated-remediation.md — Remediation patterns
- references/ciem-permissions.md — CIEM and permissions analysis
- references/cspm-integration.md — Integration patterns
- references/cspm-fundamentals.md — Foundational concepts
