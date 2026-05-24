---
name: zero-trust
description: >
  Zero Trust Architecture (ZTA) — "never trust, always verify". Design and implement
  zero trust networks, identity-first security, microsegmentation, and continuous verification.
  Use when the user asks about zero trust, ZTA, BeyondCorp, microsegmentation, zero trust proxy, or least privilege access.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [security, zero-trust, zta, phase-8]
---

# Zero Trust Architecture

## Purpose
Define and implement Zero Trust Architecture principles including identity-first security, network microsegmentation, zero trust access proxies, and continuous verification workflows.

## Agent Protocol

### Trigger
- "zero trust", "ZTA", "BeyondCorp", "never trust always verify"
- "microsegmentation", "identity-aware proxy", "zero trust network access", "ZTNA"
- "Pomerium", "Teleport", "Cloudflare Tunnel", "Tailscale", "Cilium", "Calico"
- "NIST SP 800-207", "continuous verification", "device posture", "JIT access"
- "least privilege access", "service-to-service mTLS", "workload identity"

### Input Context
- Current network architecture (on-prem, cloud, hybrid)
- Existing identity provider (IdP) and SSO solution
- Workload types: Kubernetes, VMs, serverless, legacy
- Compliance requirements (PCI, HIPAA, SOC 2)

### Output Artifact
- Zero Trust architecture diagrams, access policy configurations, microsegmentation rules, deployment plans

### Response Format
```
## Architecture Overview
{ZTA deployment model, components}

## Access Policies
{Identity-aware proxy rules, segmentation policies}

## Implementation Plan
{Phased rollout, migration strategy, success criteria}
```

### Completion Criteria
- [ ] ZTA deployment model selected (NIST SP 800-207 deployment option 1-4)
- [ ] Identity-aware access proxy configured with policy rules
- [ ] Microsegmentation policies defined for workload segments
- [ ] Continuous verification controls implemented (device posture, UBA)
- [ ] Least privilege access enforced with JIT elevation
- [ ] Service-to-service mTLS enabled for east-west traffic

## Workflow

1. **Assess current state** — Map network architecture, identity flows, existing controls
2. **Define trust zones** — Identify workload segments, data classifications, user cohorts
3. **Select deployment model** — Choose NIST SP 800-207 option (agent/GW, endpoint-initiated, resource portal, SaaS)
4. **Implement identity-aware proxy** — Deploy ZTNA gateway (Pomerium, Teleport, Cloudflare)
5. **Enforce microsegmentation** — Apply Cilium/Caliro network policies, workload identity
6. **Enable continuous verification** — Deploy device posture checks, UBA, risk scoring
7. **Iterate and audit** — Continuous monitoring, policy tuning, compliance validation

## Rules
- Every access request must be authenticated and authorized regardless of source network
- All traffic must be encrypted in transit (mTLS for service-to-service)
- Access must be dynamic and risk-aware, not static
- Assume breach: segment laterally, log everything
- Least privilege: grant only what's needed, just-in-time

## References
- `references/core-principles.md` — Zero Trust pillars and NIST SP 800-207 framework
- `references/identity-first-security.md` — BeyondCorp and Cloudflare Access model
- `references/microsegmentation.md` — Network microsegmentation with Cilium, Calico, Illumio
- `references/zt-access-proxy.md` — Zero Trust access proxy architecture (Pomerium, Teleport)
- `references/continuous-verification.md` — Continuous verification, UBA, and risk scoring

## Handoff
Zero Trust architecture artifacts can be handed to network-engineering for firewall configuration, platform-engineering for service mesh/mTLS, and security-engineering for SIEM integration.
