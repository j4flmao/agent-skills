# Zero Trust Advanced Topics

## Introduction
Advanced Zero Trust covers just-in-time/just-enough-access (JIT/JEA), workload identity with SPIFFE/SPIRE, Zero Trust for CI/CD pipelines, Zero Trust Network Access (ZTNA) architectures, data-centric zero trust, and zero trust for OT/ICS environments.

## JIT/JEA (Just-In-Time / Just-Enough-Access)
- **JIT**: Temporary elevation of privileges for specific tasks, auto-revoked
- **JEA**: Minimal privileges required to perform a task, no standing privileges
- Implementation: PIM (Privileged Identity Management) systems like Azure AD PIM, CyberArk
- Audit: Every elevation request is logged, approved, and time-bound

## Workload Identity (SPIFFE/SPIRE)
SPIFFE provides a framework for workload identity without human credentials:
- Each workload gets a unique identity (SPIFFE ID) in format `spiffe://trust-domain/workload-path`
- SPIRE is the implementation: server issues identities to workloads
- Workloads use mTLS with SPIFFE certificates for service-to-service auth
- Eliminates static secrets for service communication

## Zero Trust for CI/CD
- Pipeline jobs get ephemeral workload identity
- No static credentials in CI variables
- Access to production requires approval with time-bound tokens
- Code signing with attestation prevents tampered deployments
- Artifact integrity verification before deployment

## Key Points
- JIT/JEA eliminates standing privileges — elevate only when needed, auto-revoke
- Workload identity (SPIFFE/SPIRE) removes static secrets for service communication
- ZTNA provides per-app, identity-based access without VPN
- Data-centric ZT enforces policies based on data classification and sensitivity
- Zero Trust for CI/CD applies ZT principles to the build and deploy pipeline
- Continuous verification with session monitoring detects compromised sessions
- Zero Trust is applicable to all environments including OT/ICS
- mTLS provides workload identity and encryption for service-to-service communication
- Phased adoption: identity → device → network → app → data → infrastructure
