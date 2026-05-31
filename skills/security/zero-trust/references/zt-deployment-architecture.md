# Zero Trust: ZTA Deployment Architecture & Migration Strategy

## Overview

This reference defines the architectural patterns, migration strategies, and deployment models for implementing Zero Trust Architecture (ZTA) in production environments. It covers NIST SP 800-207 deployment models, phased migration approaches, and the system design decisions required to transition from perimeter-based security to identity-based, continuously verified access.

## Core Architecture Concepts

### NIST SP 800-207 Deployment Models

```
Option 1: Identity Gateway (Enhanced Perimeter)
├── Architecture: ZT Gateway sits in front of resources
├── Policy: Identity-based access control at gateway
├── Traffic: All access through gateway (north-south)
├── Maturity: Initial ZTA step
└── Best for: Remote access replacement (VPN)

Option 2: Micro-perimeter per Resource
├── Architecture: Each resource has its own gateway
├── Policy: Per-resource access policies
├── Traffic: Gateway-per-resource (north-south + east-west)
├── Maturity: Intermediate
└── Best for: Data center with sensitive workloads

Option 3: Resource Portal
├── Architecture: Portal aggregates access to resources
├── Policy: Single policy engine for all resources
├── Traffic: Application-layer routing
├── Maturity: Advanced
└── Best for: SaaS-heavy environments

Option 4: Device-Initiated (Endpoint-Centric)
├── Architecture: Endpoint enforces policy before connecting
├── Policy: Device posture + identity → access decision
├── Traffic: Client-side enforcement
├── Maturity: Most advanced
└── Best for: Fully managed endpoints, zero-trust maturity
```

### ZTA Reference Architecture

```
┌────────────┐     ┌─────────────────────────────────────────────────────┐
│   User     │────▶│              Policy Enforcement Point (PEP)          │
│  Device    │     │  ┌──────────┐  ┌──────────┐  ┌──────────────────┐  │
└────────────┘     │  │ Identity │  │  Device  │  │  Access Gateway   │  │
                   │  │  Aware   │  │ Posture  │  │  (ZTNA Proxy)     │  │
                   │  │  Proxy   │  │  Check   │  │                   │  │
                   │  └────┬─────┘  └────┬─────┘  └────────┬─────────┘  │
                   └───────┼──────────────┼─────────────────┼────────────┘
                           │              │                 │
                           ▼              ▼                 ▼
                   ┌────────────────────────────────────────────────────┐
                   │               Policy Decision Point (PDP)          │
                   │  ┌──────────┐  ┌──────────┐  ┌─────────────────┐  │
                   │  │  Policy  │  │  Threat  │  │   Trust        │  │
                   │  │  Engine  │  │  Intel   │  │   Algorithm    │  │
                   │  └──────────┘  └──────────┘  └─────────────────┘  │
                   └─────────────────────┬──────────────────────────────┘
                                         │
                                         ▼
                   ┌────────────────────────────────────────────────────┐
                   │                    Resources                        │
                   │  ┌──────────┐  ┌──────────┐  ┌─────────────────┐  │
                   │  │ Internal │  │  Cloud   │  │   SaaS Apps     │  │
                   │  │  Apps    │  │ Services │  │                 │  │
                   │  └──────────┘  └──────────┘  └─────────────────┘  │
                   └────────────────────────────────────────────────────┘
```

### ZTA Components

| Component | Function | Examples | Scaling |
|-----------|----------|---------|---------|
| Identity Provider (IdP) | User authentication, MFA, SSO | Okta, Azure AD, Keycloak | Horizontal, stateless sessions |
| Device Posture Service | Endpoint health verification | Jamf, Intune, SentinelOne | Per endpoint agent |
| Policy Engine (PDP) | Access decision based on policy | OpenPolicyAgent, custom | Stateless, anycast |
| Policy Enforcement (PEP) | Execute access decisions | Pomerium, Teleport, Envoy | Gateway per resource group |
| Trust Algorithm | Risk score calculation | Custom, vendor-provided | Stateful, per-session |
| Session Manager | Maintain access state | Redis, browser cookie | Horizontal with sticky sessions |
| Audit Service | Log all access decisions | SIEM, data lake | Write-optimized |

## Architecture Decision Trees

### Decision 1: Deployment Model Selection

```
Question: Which NIST ZTA deployment model?
├── Organization type
│   ├── Cloud-native (Kubernetes, SaaS)
│   │   └── Option 3 (Resource Portal) — aggregate via ingress/service mesh
│   ├── Hybrid (on-prem + cloud)
│   │   └── Option 1 or 2 — gateway at network edge + per-app proxies
│   └── Legacy data center
│       └── Option 2 (Micro-perimeter) — segment critical apps first
├── Maturity level
│   ├── Starting ZTA journey → Option 1 (quick wins, familiar architecture)
│   ├── Mid-maturity → Option 2 (granular control, application-aware)
│   └── Advanced → Option 4 (full zero trust, highest security)
└── Budget and timeline
    ├── Fast, low-cost → Option 1 (replace VPN with ZTNA)
    ├── Comprehensive → Option 2 (full microsegmentation)
    └── Best-in-class → Option 3 or 4 (requires mature endpoint management)
```

### Decision 2: Policy Engine Architecture

```
Question: Centralized or distributed policy engine?
├── Centralized PDP
│   ├── Single policy decision point for all resources
│   ├── Pros: Consistent policy, single audit point, simpler management
│   ├── Cons: Single point of failure, latency for global deployments
│   └── Best for: <10K users, single region
├── Distributed PDP
│   ├── Local PDP instances per region/datacenter
│   ├── Pros: Low latency, regional autonomy, no SPOF
│   ├── Cons: Policy sync complexity, eventual consistency
│   └── Best for: Global deployments, >10K users
└── Hybrid PDP
    ├── Global policy base centrally managed
    ├── Local PDP caches and enforces
    ├── Pros: Best of both approaches
    └── Recommended for most enterprise deployments
```

### Decision 3: Trust Algorithm Design

```
Question: Binary trust vs continuous score?
├── Binary (allow/deny)
│   ├── Every request evaluated against static policy
│   ├── Pros: Simple, predictable, low latency
│   ├── Cons: No adaptive security, rigid
│   └── Best for: Initial ZTA deployment
├── Score-based (continuous trust)
│   ├── Risk score from: identity, device, location, behavior, threat intel
│   ├── Threshold-based: score > threshold → allow, else step-up auth
│   ├── Pros: Adaptive, risk-aware, better user experience
│   ├── Cons: Complex to tune, may block legitimate access
│   └── Best for: Mature ZTA with good data sources
└── Hybrid
    ├── Binary for known/good patterns (short TTL)
    ├── Score-based for anomalous patterns
    ├── Pros: Performance + security
    └── Recommended for most deployments
```

## Implementation Strategies

### Phase 1: Identity Foundation (Weeks 1-6)
- Deploy or verify IdP with MFA for all users
- Implement SSO for all applications
- Create identity-aware proxy for remote access (replace VPN)
- Establish device inventory and basic posture checks
- Define initial access policies (who can access what)

### Phase 2: Access Control (Weeks 7-14)
- Deploy ZTNA gateway for internal applications
- Implement just-in-time access (JIT) for privileged accounts
- Enable service-to-service mTLS for east-west traffic
- Deploy policy engine with attribute-based access control (ABAC)
- Implement session logging and audit

### Phase 3: Microsegmentation (Weeks 15-24)
- Map application dependencies and data flows
- Define workload segments (security zones by data sensitivity)
- Implement network microsegmentation (Cilium/Calico for K8s, Illumio for VMs)
- Deploy application-layer policies (L7 for HTTP, L4 for DB)
- Implement continuous monitoring of segmentation policies

### Phase 4: Continuous Verification (Weeks 25-36)
- Deploy real-time device posture assessment
- Implement user behavior analytics (UBA) for anomaly detection
- Deploy adaptive trust scoring engine
- Enable automatic step-up authentication for risk events
- Implement session termination on policy violation

## Integration Patterns

### ZTNA Gateway Pattern

```
User → ZTNA Gateway → IdP Authentication → Device Posture Check → Policy Decision → Resource
  │                                                                    │
  └──────────────── 1. User connects to gateway ──────────────────────┘
  └──────────────── 2. Gateway redirects to IdP for auth ─────────────┘
  └──────────────── 3. IdP returns auth token ────────────────────────┘
  └──────────────── 4. Gateway checks device posture ─────────────────┘
  └──────────────── 5. Gateway queries policy engine ─────────────────┘
  └──────────────── 6. Access granted/denied ─────────────────────────┘
  └──────────────── 7. Session established, continuous monitoring ────┘
```

### Service Mesh mTLS Pattern

```
Service A (Pod) → Sidecar Proxy (Envoy) → mTLS → Sidecar Proxy (Envoy) → Service B (Pod)
  │                   │                                    │                   │
  ├── Cert issued by  ├── SPIFFE identity                  ├── mTLS verify    ├── Receiver
  │   SPIRE CA        │   Cert: spiffe://cluster/ns/sa/a   │   identity        │   validates
  │   Identity:       │                                    │   from Service A  │   SPIFFE ID
  │   spiffe://.../sa  │                                    │                   │
  │   /my-service     │                                    │                   │
  └───────────────────┴────────────────────────────────────┴───────────────────┘

Configuration:
- PeerAuthentication: STRICT mTLS (reject plaintext)
- AuthorizationPolicy: Allow only specific service accounts
- DestinationRule: mTLS mode, connection pool settings
```

### JIT Elevation Pattern

```
User requests elevated access
├── → PAM Portal (user + MFA + justification + ticket number)
├── → Policy Engine (validate: time window, role, risk score)
├── → Approval Gate (if required: manager, security)
├── → Temporary credential generation
│   ├── AWS: STS AssumeRole with session tag
│   ├── Kubernetes: temporary impersonation
│   ├── Database: temporary account with specific grants
│   └── SSH: signed certificate by CA (default 4h TTL)
├── → Session Recording (all activity logged)
└── → Auto-revocation on TTL expiry
```

## Performance Optimization

### ZTNA Gateway Performance

| Component | Bottleneck | Strategy |
|-----------|-----------|----------|
| TLS Termination | CPU for handshake | Session resumption, TLS 1.3, hardware acceleration |
| Policy Evaluation | PDP query latency | Cache decisions (TTL: 5-60s depending on sensitivity) |
| Logging | Write throughput | Async batch logging, sampled for high-volume |
| Auth Redirect | IdP round-trip | Session tokens, cookie-based re-authentication |
| Connection Pool | Memory per connection | HTTP/2 multiplexing, connection limits per user |

### Trust Score Computation

```
Real-time score (per request):
  score = f(identity, device, location, behavior, resource_sensitivity)
  
Identity Score (0-100)
├── MFA method (hardware token=100, push=80, SMS=50, none=0)
├── Account age (>90d=100, >30d=80, new=50)
├── Failed login count (0=100, 1-3=80, >3=50)
└── Privilege level (regular=100, privileged=80, admin=60)

Device Score (0-100)
├── Managed device (yes=100, no=30)
├── OS patch level (current=100, behind <30d=80, behind >30d=40)
├── Disk encryption (enabled=100, disabled=20)
└── EDR agent (running=100, paused=50, missing=10)

Location Score (0-100)
├── Known office IP (100)
├── Known home IP (80)
├── Travel (geofence match=60)
├── Unknown VPN (40)
└── High-risk country (10) (source: threat intel)

Behavior Score (0-100)
├── Normal login time (yes=100, no=50)
├── Normal resource access pattern (yes=100, no=40)
├── Data download volume (normal=100, abnormal=30)
└── Impossible travel (no=100, yes=10 → block)

Composite score = Σ(component_score × weight) / Σ(weights)
Default weights: identity=0.35, device=0.30, location=0.15, behavior=0.20
```

## Security Considerations

### Policy Engine Hardening
- PDP must be available during IdP outage (cache last-known-good policy)
- All PDP communication over mTLS
- Policy audit trail: every decision logged (who, what, when, decision, reason)
- Rate limiting on PDP to prevent denial-of-service via policy evaluation
- Secure PDP configuration: signed policy bundles, integrity verification

### Continuous Verification Architecture
```
Per-session monitoring:
├── Session refresh interval: 5-60 minutes (configurable by risk)
├── Re-evaluation triggers:
│   ├── Device posture changes (EDR detects compromise)
│   ├── Location changes (IP geolocation shift)
│   ├── Behavior anomalies (mass data download)
│   ├── Threat intel match (C2 communication detected)
│   └── Time-based (session TTL expiry)
├── Actions on risk increase:
│   ├── Step-up authentication (MFA challenge)
│   ├── Session termination
│   ├── Access scope reduction
│   └── Alert security team
└── Logging: All re-evaluation events to SIEM
```

## Operational Excellence

### ZTA Operations

| Metric | Description | Target |
|--------|-------------|--------|
| Access Latency | Request to decision time | <500ms p95 |
| Policy Evaluation Rate | Decisions/second per PEP | >1000 |
| Session Rejection Rate | % sessions denied | <5% (target <1% false positives) |
| MFA Success Rate | % MFA challenges completed | >95% |
| Posture Compliance | % devices meeting baseline | >90% |
| mTLS Coverage | % services with mTLS | >95% |
| Policy Coverage | % resources behind ZTNA | >90% |

### Migration Strategy

```
Phase 1: Identify and classify (4 weeks)
├── Inventory all applications and services
├── Classify by data sensitivity (public, internal, confidential, restricted)
├── Map access patterns (who, what, from where)
└── Prioritize migration waves

Phase 2: Low-risk first (4 weeks)
├── Migrate internal tools (HR portal, IT ticketing)
├── Validate policy engine and gateway
├── Train users on new access model
├── Measure and iterate on user experience
└── Document lessons learned

Phase 3: Business applications (8 weeks)
├── Migrate CRM, ERP, finance applications
├── Implement application-level policies
├── Enable JIT for privileged functions
├── Deploy continuous verification
└── Parallel run with legacy access for rollback

Phase 4: Critical systems (8 weeks)
├── Migrate production databases, CI/CD, admin interfaces
├── Full microsegmentation for data centers
├── Service mesh for east-west traffic
├── Continuous verification with step-up auth
└── Decommission legacy VPN and perimeter controls
```

## Testing Strategy

### ZTA Testing
- **Policy validation tests**: Every policy → correct allow/deny decision
- **Performance tests**: 10K concurrent connections through ZTNA gateway
- **Failure mode tests**: IdP down, PDP down, device posture service down
- **Migration tests**: Parallel run with legacy access, verify no regression
- **Security tests**: Attempt to bypass gateway, use stolen token, replay attack
- **Chaos tests**: Random component failures, measure recovery time

## Common Pitfalls

| Pitfall | Symptom | Root Cause | Prevention |
|---------|---------|------------|------------|
| VPN replacement fallacy | ZTNA used exactly like VPN | No app-level policies | Implement granular per-app policies |
| Policy sprawl | 10K+ difficult-to-audit rules | No policy review process | Regular policy audit, least-privilege defaults |
| Performance degradation | Slow application access | Too many policy checks per request | Cache policies, batch claims |
| User friction | High support tickets for access | Overly strict policies | Risk-based access, step-up vs. block |
| Legacy breakage | Applications fail behind proxy | Hardcoded IPs, no SNI support | App discovery and compatibility testing |
| Partial adoption | Only remote access covered | No east-west segmentation | Phased approach covering all traffic |

## Key Takeaways

- Choose NIST SP 800-207 deployment model based on maturity, budget, and architecture
- Deploy ZTA in phases: identity foundation → access control → microsegmentation → continuous verification
- Design trust algorithm as hybrid: binary for good patterns, score-based for anomalies
- Implement distributed PDP with local caching for global scale
- Cache trust decisions with risk-appropriate TTLs
- Plan migration from perimeter to zero trust in waves by risk level
- Monitor access latency, policy coverage, and false rejection rate
- Test failure modes: every component must degrade gracefully
- Never treat ZTNA as a VPN replacement — enforce app-level policies

## Related References
- references/core-principles.md — Zero Trust core principles
- references/identity-first-security.md — Identity-first security model
- references/microsegmentation.md — Network segmentation patterns
- references/continuous-verification.md — Continuous verification
- references/zt-access-proxy.md — ZTNA proxy deployment
- references/zero-trust-networking.md — Networking for ZTA
- references/zero-trust-fundamentals.md — Foundational concepts
