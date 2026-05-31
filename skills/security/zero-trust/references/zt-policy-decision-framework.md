# Zero Trust: Policy Decision Framework Architecture

## Overview

This reference defines the architecture of the Zero Trust Policy Decision Framework — the system that evaluates identity, device, environment, and risk signals to make real-time access decisions. It covers policy engine design, attribute-based access control (ABAC) models, trust scoring algorithms, and the decision lifecycle from request to enforcement.

## Core Architecture Concepts

### Policy Decision Lifecycle

```
Request → Identity Validation → Device Check → Context Evaluation → Risk Scoring → Decision → Enforcement → Audit
   │           │                   │               │                  │            │           │          │
   ▼           ▼                   ▼               ▼                  ▼            ▼           ▼          ▼
Access   Authenticate        Device         Location,          Compute        Allow/     Gateway     Log to
Attempt   User MFA           Posture        Time, Behavior     Risk Score     Deny/      Enforce     SIEM
                                                                              Step-up    Decision
```

### Policy Decision Point (PDP) Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                        Policy Decision Point (PDP)                    │
│                                                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────┐ │
│  │  Policy       │  │  Attribute    │  │  Risk         │  │ Decision │ │
│  │  Repository   │  │  Resolver     │  │  Engine       │  │ Executor │ │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └────┬─────┘ │
│         │                 │                 │                │        │
│  ┌──────┴───────┐  ┌──────┴───────┐  ┌──────┴───────┐       │        │
│  │ Policy        │  │ Attribute    │  │ Risk         │       │        │
│  │ (OPA, Cedar)  │  │ Sources      │  │ Indicators   │       │        │
│  │ Git-managed   │  │ IdP/Device/  │  │ Threat Intel │       │        │
│  │ Versioned     │  │ Geo/Time     │  │ UBA History  │       │        │
│  └───────────────┘  └──────────────┘  └──────────────┘       │        │
│                                                                      │
└──────────────────────────────────┬───────────────────────────────────┘
                                   │
                                   ▼
                    ┌─────────────────────────────┐
                    │  Policy Enforcement Point   │
                    │  (PEP — ZTNA Gateway /      │
                    │   Service Mesh / SDK)       │
                    └─────────────────────────────┘
```

### Attribute Categories

```
Subject Attributes (Who)
├── User ID, group membership, roles
├── Authentication method (password, MFA, hardware key)
├── Department, manager, employment status
├── Clearance level, training completion
└── Account creation date, last password change

Device Attributes (What)
├── Device ID, type (managed, BYOD, kiosk)
├── OS version, patch level
├── Disk encryption status
├── EDR/AV agent status and version
├── Firewall status, screen lock enabled
└── Certificate expiration, jailbreak/root status

Environment Attributes (Where/When)
├── Network location (office, home, VPN, cellular)
├── Geographic location (GPS, IP geolocation)
├── Time of day, day of week
├── Access frequency, typical resource pattern
├── Concurrent sessions count
└── Impossible travel detection

Resource Attributes (What)
├── Resource classification (public, internal, confidential, restricted)
├── Data sensitivity labels
├── Resource owner and department
├── Compliance requirements (PCI, HIPAA, PII)
└── Access method (API, UI, CLI, SFTP)

Action Attributes (How)
├── HTTP method (GET, POST, PUT, DELETE)
├── API endpoint path and parameters
├── Data volume requested
├── Action type (read, write, delete, admin)
└── Frequency of similar actions
```

## Architecture Decision Trees

### Decision 1: Policy Language

```
Question: Which policy language for ABAC?
├── Rego (Open Policy Agent)
│   ├── Declarative, purpose-built for policy
│   ├── Rich data types, partial evaluation
│   ├── Built-in functions (net, time, regex, graph)
│   ├── Performance: <1ms for typical policies
│   └── Best for: Cloud-native, Kubernetes, multi-cloud
├── Cedar (AWS)
│   ├── Simpler syntax than Rego
│   ├── AWS-native integration (Verified Permissions, S3)
│   ├── Automated reasoning for policy analysis
│   ├── Performance: <1ms for typical policies
│   └── Best for: AWS-native environments
├── Custom DSL
│   ├── Domain-specific, tailored to org needs
│   ├── Pros: Simple for non-engineers to write
│   ├── Cons: Development overhead, no community
│   └── Best for: Simple policy models, non-technical policy authors
└── Recommendation: Rego for flexibility, Cedar for AWS shops.
    Custom DSL only if team has dedicated policy engineering.
```

### Decision 2: Policy Evaluation Model

```
Question: Which evaluation model for access decisions?
├── First-match wins
│   ├── Evaluate rules in order, return first match
│   ├── Pros: Fast, predictable, easy to debug
│   ├── Cons: Rule ordering matters, may miss more specific rule
│   └── Best for: Simple allow/deny policies
├── Combine decisions (allow + deny)
│   ├── Evaluate all matching rules, combine result
│   ├── Deny override: any deny → deny
│   ├── Allow override: any allow → allow
│   ├── First applicable: most specific rule wins
│   └── Best for: Complex multi-dimensional policies
├── Risk-based evaluation
│   ├── Calculate risk score, compare to threshold
│   ├── Allow if score > threshold, else step-up or deny
│   ├── Pros: Adaptive, good user experience
│   └── Cons: Complex, requires tuning, less predictable
└── Recommendation: Combine decisions (deny-override) for foundation,
    add risk-based for step-up auth scenarios.
```

### Decision 3: Policy Distribution

```
Question: How to distribute policies to PEPs?
├── Push (PDP pushes to PEP)
│   ├── Low latency, immediate enforcement
│   ├── Cons: Requires PEP to be reachable, push infrastructure
│   └── Best for: Small deployments, synchronous decisions
├── Pull (PEP queries PDP on each request)
│   ├── Always up-to-date, no sync issues
│   ├── Cons: Adds request latency, PDP becomes bottleneck
│   └── Best for: Low-volume, centralized decisions
├── Bundled (PEP downloads policy bundle)
│   ├── PDP serves bundle, PEP evaluates locally
│   ├── Pros: Low latency, offline-capable, PDP not in request path
│   ├── Cons: Eventual consistency, bundle size
│   └── Best for: High-volume, distributed deployments (recommended)
└── Recommendation: Bundled distribution for production.
    OPA bundles with HTTP pull every 30-300s.
```

## Implementation Strategies

### Phase 1: Policy Foundation (Weeks 1-4)
- Define attribute taxonomy (subject, device, environment, resource, action)
- Implement attribute resolver integrating with IdP, MDM, and HR system
- Deploy PDP with basic Rego/Cedar policies
- Create allow/deny policies for top 10 applications
- Implement policy audit logging

### Phase 2: ABAC Model (Weeks 5-10)
- Implement attribute-based policies (department, location, device posture)
- Create conditional access rules (MFA for off-network, block non-compliant devices)
- Build policy testing framework with automated regression
- Implement policy version control and CI/CD
- Deploy policy bundle distribution to PEPs

### Phase 3: Risk-Based Access (Weeks 11-18)
- Implement trust scoring algorithm
- Integrate threat intelligence into risk calculation
- Build UBA integration for behavior-based scoring
- Deploy step-up authentication (MFA challenge on risk events)
- Implement session-level continuous evaluation

### Phase 4: Advanced Policy (Weeks 19-24)
- Implement just-in-time (JIT) policy for privileged access
- Build policy analytics (most denied requests, policy effectiveness)
- Deploy automated policy recommendations
- Implement cross-policy dependency analysis
- Create delegated policy administration for resource owners

## Integration Patterns

### Attribute Resolution Pattern

```
PEP receives access request → sends to PDP with request context

PDP attribute resolution:
1. Subject attributes: 
   ├── Query IdP: user groups, MFA status, roles
   ├── Query HR system: department, manager, employment status
   └── Cache: TTL 5 minutes

2. Device attributes:
   ├── Query MDM: device compliance, OS version
   ├── Query EDR: agent status, threat detected
   └── Cache: TTL 1 minute

3. Environment attributes:
   ├── Query geo-IP service: location
   ├── Query time service: current time, business hours
   └── Query UEBA: behavior score, anomaly flags
   └── Cache: TTL per request (real-time for location/time)

4. Resource attributes:
   ├── Query resource registry: classification, sensitivity
   ├── Query data governance: data labels
   └── Cache: TTL 1 hour

5. Risk calculation:
   ├── Aggregate all attributes
   ├── Compute risk score
   └── Compare to policy thresholds
```

### Rego Policy Example

```rego
package zero_trust.access

# Default: deny all
default allow = false
default step_up_auth = false

# Allow access if all conditions met
allow {
    # 1. User is authenticated with MFA
    input.auth.method == "mfa"
    
    # 2. Device is compliant
    device_compliant
    
    # 3. Access is during business hours or user has exception
    allowed_time
    
    # 4. Risk score is acceptable
    risk_score <= input.policy.max_risk_score
    
    # 5. User has explicit permission
    user_has_permission
}

# Step-up auth for moderate risk
step_up_auth {
    input.auth.method == "mfa"
    device_compliant
    allowed_time
    risk_score > input.policy.max_risk_score
    risk_score <= input.policy.step_up_threshold
}

# Device compliance check
device_compliant {
    input.device.managed == true
    input.device.disk_encrypted == true
    input.device.os_patch_level >= input.policy.min_patch_level
    input.device.edr_running == true
}

# Time-based access
allowed_time {
    input.environment.business_hours == true
}

allowed_time {
    input.environment.business_hours == false
    input.subject.has_off_hours_exception == true
}

# Permission check using ABAC
user_has_permission {
    # User's department matches resource department
    input.subject.department == input.resource.department
    
    # Or user has explicit role
    input.subject.roles[_] == input.resource.allowed_roles[_]
    
    # Resource sensitivity within user's clearance
    resource_sensitivity := input.resource.classification
    user_clearance := input.subject.clearance_level
    clearance_levels := {"public": 0, "internal": 1, "confidential": 2, "restricted": 3}
    clearance_levels[resource_sensitivity] <= clearance_levels[user_clearance]
}

# Risk score calculation
risk_score = score {
    # Base score
    base := 0
    
    # Add risk for non-corporate network
    network_bonus := 10 {
        input.environment.network != "corporate"
    }
    
    # Add risk for new device (first seen < 7 days)
    device_age_bonus := 5 {
        time.now_ns() - input.device.first_seen < 604800000000000  # 7 days in ns
    }
    
    # Add risk for unusual access time
    time_bonus := 15 {
        input.environment.business_hours == false
    }
    
    # Add risk from UEBA
    ueba_bonus := input.environment.ueba_anomaly_score * 0.5
    
    # Total score
    score := base + network_bonus + device_age_bonus + time_bonus + ueba_bonus
}
```

## Performance Optimization

### PDP Performance

| Component | Bottleneck | Strategy | Target Latency |
|-----------|-----------|----------|----------------|
| Attribute Resolver | External API calls | Asynchronous resolution, cache | <50ms |
| Policy Evaluation | Rule matching complexity | Indexed rules, partial evaluation | <5ms |
| Risk Calculation | Multiple attribute aggregation | Pre-computed risk factors | <10ms |
| Decision Logging | Write throughput | Async batch logging | <5ms |
| Bundle Distribution | Network transfer | Compression, differential updates | <1s sync |

### Caching Strategy

```
Cache Level 1: In-memory (PDP process)
├── Policy bundles (TTL: configurable 30-300s)
├── User attributes (TTL: 5 minutes)
├── Device attributes (TTL: 1 minute)
└── Recent decisions (TTL: 5 minutes, for same-session optimization)

Cache Level 2: Distributed (Redis)
├── Risk scores (TTL: session duration)
├── Step-up decisions (TTL: 1 hour)
└── Anomaly flags (TTL: 5 minutes)

Invalidation:
├── Webhook from IdP on user attribute change
├── Webhook from MDM on device status change
├── Scheduled refresh for environment data
└── Manual invalidation for policy updates
```

## Security Considerations

### PDP Security
- PDP accessible only by PEPs via mTLS
- All attribute queries authenticated and authorized
- PDP configuration immutable (signed policy bundles)
- Audit: every access decision logged with full context
- Rate limiting: PDP must not be DoS-able via excessive policy queries
- Secure cache: no sensitive attributes cached unencrypted

### Policy as Code Security
- Policies stored in Git with signed commits
- Policy review required (PR + approval)
- Policy testing in CI/CD (unit tests + integration tests)
- Policy version pinned per deployment environment
- Audit trail for all policy changes

## Operational Excellence

### Policy Operations

| Metric | Description | Target |
|--------|-------------|--------|
| Decision Latency | Request to decision time | <100ms p95 |
| Cache Hit Rate | % decisions from cache | >80% |
| False Rejection Rate | Legitimate users denied | <1% |
| Policy Coverage | % resources with policy | >95% |
| Attribute Coverage | % attributes available for decision | >90% |
| Bundle Sync Delay | Policy update to enforcement | <60s |

### Policy Lifecycle

```
Create → Test → Review → Deploy → Monitor → Iterate
  │       │       │         │        │         │
  ▼       ▼       ▼         ▼        ▼         ▼
Policy  Dry-run  PR with   Canary   Track     Adjust
Author  against  Policy    deploy   decision  thresholds
        test     Engineer  5% of    outcomes  based on
        cases    review    traffic  false     telemetry
                                   rejections
```

## Testing Strategy

### Policy Testing
- **Unit tests**: Test each policy rule with known inputs
- **Regression tests**: Historical access decisions produce expected results
- **Negative tests**: Verify block for non-compliant subjects, devices, environments
- **Performance tests**: 100K decisions/second, measure p50/p95/p99
- **Chaos tests**: Attribute service down, PDP cache loss, network partition
- **Migration tests**: Old vs new policy produce same results for known-good scenarios

## Common Pitfalls

| Pitfall | Symptom | Root Cause | Prevention |
|---------|---------|------------|------------|
| Attribute explosion | Policy complexity unmanageable | Too many unique attributes | Attribute taxonomy, dimensionality reduction |
| Cache staleness | Outdated decisions served | TTL too long | Risk-appropriate TTL, webhook invalidation |
| Policy fragmentation | Inconsistent decisions across PEPs | No central policy distribution | Bundled policy distribution |
| Decision latency | Slow application response | Synchronous PDP query per request | Local policy evaluation with bundles |
| False rejection spiral | Users locked out, support overwhelmed | Too aggressive risk thresholds | Graduated actions (step-up > block) |
| Policy rot | Policies never updated after creation | No policy review cadence | Quarterly policy audit with stakeholders |

## Key Takeaways

- Design PDP as separate component from PEP for scalability and consistency
- Use attribute-based access control (ABAC) for flexible, fine-grained policies
- Choose Rego (OPA) or Cedar based on cloud ecosystem and team expertise
- Implement bundled policy distribution for low-latency, offline-capable enforcement
- Cache attributes aggressively with risk-appropriate TTLs
- Use a graduated response model: allow → step-up auth → deny
- Store policies as code in Git with CI/CD testing pipeline
- Monitor false rejection rate as primary health metric
- Test policies with dry-run mode before enforcing in production
- Implement attribute resolution as async process with caching

## Related References
- references/core-principles.md — Zero Trust core principles
- references/identity-first-security.md — Identity-first security
- references/continuous-verification.md — Continuous verification
- references/zt-deployment-architecture.md — ZTA deployment
- references/zt-access-proxy.md — ZTNA proxy
- references/zero-trust-fundamentals.md — Foundational concepts
