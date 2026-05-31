# Internal Developer Platform: Security and Governance

## Overview

Internal Developer Platforms consolidate infrastructure access, deployment pipelines, and configuration management into a single interface. This centralization creates both opportunity and risk: the platform can enforce security consistently across all services, but a platform compromise grants access to the entire engineering ecosystem. This reference provides a deep architecture for securing IDPs while maintaining developer velocity.

## Core Architecture Concepts

### IDP Threat Model

The IDP occupies a privileged position in the engineering architecture. Threat modeling must consider:

```
Attack Surface:
├── Developer Portal (Backstage/Port): UI, API endpoints, plugin modules
├── Template Engine: Scaffolder, Crossplane, custom actions
├── Service Catalog: entity data, annotations, custom processors
├── CI/CD Integration: webhooks, token storage, pipeline definitions
├── Secret Store: vault access, credential rotation, audit logs
└── Infrastructure APIs: cloud provider access, Kubernetes API

Trust Boundaries:
├── Developer ↔ Portal (authenticated, authorized)
├── Portal ↔ Template Engine (internal, elevated)
├── Template Engine ↔ Cloud APIs (privileged, audited)
├── Portal ↔ CI/CD (webhook, token-based)
└── CI/CD ↔ Production (deployment credentials)
```

### Zero-Trust Platform Architecture

Apply zero-trust principles to the IDP itself:

| Principle | Platform Application | Implementation |
|-----------|---------------------|----------------|
| Verify explicitly | Every API call authenticated and authorized | OAuth2/OIDC + RBAC + ABAC |
| Least privilege | Minimal permissions for each component | Service accounts, scoped tokens |
| Assume breach | Design for compromised components | Audit logging, session isolation |
| Never trust, always verify | No implicit trust between platform services | mTLS, short-lived credentials |

### Security Decision Tree for Platform Features

```
Feature requests security implications:
├── Reads platform data → Read-only API key, audit logging
├── Writes to catalog → Write-scoped token, change approval
├── Provisions infrastructure → Crossplane provider credentials, approval gates
├── Deploys to production → Deployment keys, policy checks, change management
└── Modifies platform config → Admin elevation, second approval
```

## Architecture Decision Trees

### Authentication Strategy

```
Identity Provider Selection
├── Small org (< 50 devs) → GitHub OAuth + Backstage
├── Medium org (50-500) → OIDC (Okta/Azure AD) + SCIM provisioning
├── Large org (500+) → Federated SSO + Just-In-Time access + SCIM
└── Multi-org → OIDC federation + external identity brokering
```

### Authorization Model

```
Access Control Design
├── Simple role hierarchy → RBAC with 3 roles (admin, engineer, viewer)
├── Team-based access → RBAC + team membership (Group entities)
├── Attribute-based → ABAC with entity metadata (environment, cost center)
├── Multi-tenancy → ABAC + namespace isolation + resource quotas
└── Compliance-driven → ABAC + approval workflows + audit trails
```

### Secret Injection Strategy

```
Secret Access Pattern
├── CI/CD pipelines → Kubernetes Secrets + Sealed Secrets
├── Local development → Vault agent sidecar, short-lived tokens
├── Crossplane provisioning → Provider-specific secrets engine
├── Template scaffolding → Vault dynamic secrets, no static credentials
└── Platform components → Kubernetes CSI driver with Vault
```

## Implementation Strategies

### Secure Backstage Deployment

Backstage is the developer-facing component of most IDPs and requires careful security configuration:

```yaml
# Backstage security configuration
backend:
  # Authentication
  auth:
    providers:
      oidc:
        development:
          clientId: ${AUTH_OIDC_CLIENT_ID}
          clientSecret: ${AUTH_OIDC_CLIENT_SECRET}
          metadataUrl: ${AUTH_OIDC_METADATA_URL}
  
  # CORS and CSP
  cors:
    origin: https://developer.internal.company.com
    methods: [GET, POST, PUT, DELETE]
    credentials: true
  
  # Session management
  session:
    secret: ${SESSION_SECRET}
    secure: true
    httpOnly: true
    maxAge: 3600000  # 1 hour

# Catalog security
catalog:
  rules:
    - allow: [Component, System, Resource, API, Group, User]
  import:
    entityFilename: catalog-info.yaml
    pullRequestBranchPrefix: backstage-integration
```

### Template Security

Each golden path template must enforce security defaults:

| Security Control | Enforcement | Template Stage |
|-----------------|-------------|----------------|
| Repository visibility | Private default, opt-in public | publish action |
| Branch protection | Required, auto-configured | post-scaffold hook |
| Secret scanning | Enabled on all repos | post-publish hook |
| Dependency vuln scan | GitHub Dependabot, auto-PR | post-publish hook |
| Container scanning | Trivy/Grype in CI | pipeline template |
| SAST integration | CodeQL/Semgrep in CI | pipeline template |
| SBOM generation | CycloneDX output | build stage |
| License compliance | FOSSA/Snyk scan | post-build hook |
| Infrastructure drift | Terraform plan validation | pre-deploy check |
| Compliance labels | Required annotations | scaffold validation |

### Crossplane Security Hardening

Crossplane powers infrastructure provisioning and requires elevated privileges. Secure it with layered controls:

1. **Provider isolation**: Each cloud provider runs in a separate provider pod with dedicated credentials
2. **Claim-based access**: Developers create Claims (thin abstractions), not directly using ProviderConfigs
3. **Composition validation**: Pre-flight policy checks on every Composition before resource creation
4. **Credential rotation**: ProviderConfigs use short-lived tokens via Vault, rotated every hour
5. **Audit trail**: Every Crossplane resource creation includes owner, timestamp, and approval resource

## Integration Patterns

### Secure CI/CD Integration

The IDP integrates with CI/CD systems (GitHub Actions, GitLab CI, Jenkins). Each integration creates a trust boundary:

```
Integration Security Layers:
Layer 1: Webhook verification
  - Verify webhook signature (HMAC-SHA256)
  - Validate source IP (GitHub/GitLab IP ranges)
  - Rate limit webhook processing

Layer 2: Token management
  - Short-lived tokens (max 1 hour)
  - Scoped to specific repository/action
  - Audited on every use
  - Revoked on token leak detection

Layer 3: Pipeline isolation
  - Separate runner pools per team/environment
  - Ephemeral runners (no persistent credentials)
  - Network isolation between runner pools
  - Immutable runner images
```

### Policy-as-Code Integration

Embed policy enforcement into the IDP using OPA/Gatekeeper or Kyverno:

```rego
# OPA policy for template validation
package platform.templates

# Deny templates that request admin permissions
deny[msg] {
    input.kind == "Template"
    step := input.steps[_]
    step.action == "publish:github"
    step.input.repoVisibility == "public"
    msg := sprintf("Template %v: repositories must be private by default", [input.metadata.name])
}

# Require all templates to include monitoring
deny[msg] {
    input.kind == "Template"
    not template_has_monitoring_step(input)
    msg := sprintf("Template %v: must include monitoring dashboard creation", [input.metadata.name])
}

template_has_monitoring_step(template) {
    step := template.steps[_]
    step.action == "create-monitoring"
}
```

## Performance Optimization

### Security Overhead Management

Security controls add latency to platform operations. Optimize the balance between security and developer experience:

| Control | Latency Impact | Optimization Strategy |
|---------|---------------|----------------------|
| Auth token validation | 5-20ms | Token caching, JWKS rotation schedule |
| Policy evaluation | 10-50ms | Compiled policy, partial evaluation |
| Audit logging | 5-15ms | Async write, batch processing |
| Secret injection | 20-100ms | Cached dynamic secrets, connection pooling |
| Compliance scanning | 30s-5min | Parallel scanning, incremental analysis |

## Security Considerations

### Incident Response for Platform Compromise

If the IDP itself is compromised, the blast radius is massive. Predefine response procedures:

```
Severity 1: Platform admin credentials leaked
1. Revoke all admin tokens and sessions
2. Rotate all platform service credentials
3. Analyze audit logs for unauthorized access
4. Notify all engineering teams
5. Review all recent template executions

Severity 2: Template supply chain attack
1. Halt all template execution
2. Audit template content for malicious code
3. Roll back affected template versions
4. Scan all repos created from compromised templates
5. Implement template content signing

Severity 3: Developer credential compromise
1. Revoke individual developer tokens
2. Review developer's recent platform activity
3. Re-issue credentials after verification
4. Provide guidance on credential hygiene
5. Monitor for continued unauthorized activity
```

### Compliance and Audit

The IDP must support compliance requirements across regulated environments:

| Requirement | Implementation | Verification |
|-------------|---------------|--------------|
| Role-based access | RBAC in Backstage + Kubernetes | Monthly access review |
| Audit logging | All platform actions logged to SIEM | Log completeness check |
| Change approval | Deployment approval gates | Approval chain verification |
| Data retention | Configurable log retention per entity | Retention policy enforcement |
| Separation of duties | Admin vs developer roles enforced | Dual-control for sensitive actions |
| Encryption at rest | Platform data encrypted at storage layer | Encryption verification |
| Encryption in transit | TLS everywhere, mTLS between components | Certificate validity check |
| Vulnerability management | Automated scanning, CVE tracking | Scan completion verification |

## Operational Excellence

### Security Operations for IDP

| Activity | Frequency | Team |
|----------|-----------|------|
| Credential rotation | Every 24 hours | Platform team (automated) |
| Access review | Monthly | Platform lead + Security |
| Penetration testing | Quarterly | External security team |
| Dependency audit | Weekly | Platform team (automated) |
| Policy update | Per change | Platform + Security |
| Incident drill | Bi-annually | Platform + SRE + Security |

### Compliance Automation

Automate compliance evidence collection through the IDP:

1. **Catalog annotations**: Every entity includes compliance metadata (data classification, regulatory scope)
2. **Policy templates**: Golden path templates include compliance checks as scaffold steps
3. **Audit export**: Platform audit logs are automatically exported to the compliance SIEM
4. **Report generation**: Quarterly compliance reports generated from catalog and audit data
5. **Evidence storage**: Compliance artifacts stored in immutable, append-only storage

## Testing Strategy

### Security Testing in the Platform

| Test Type | Scope | Frequency |
|-----------|-------|-----------|
| SAST | Platform code (Backstage plugins, custom actions) | Every PR |
| DAST | Platform API endpoints | Daily |
| Dependency scan | All platform dependencies | Weekly |
| Container scan | Platform container images | Every build |
| Secret scan | Platform repository for leaked secrets | Every commit |
| Policy validation | Template and catalog policies | Every change |

### Chaos Engineering for Security

Inject security failure scenarios to test platform resilience:

```
Scenario: Template Engine credentials expire
Inject: Revoke Crossplane provider credentials
Expected: Template execution fails gracefully with clear error message
Verify: Developer sees actionable error, platform team alerted

Scenario: Auth provider unavailable
Inject: OIDC provider returns 503
Expected: Platform continues serving cached catalog data
Verify: Read operations succeed, write operations queued

Scenario: Secret store unreachable
Inject: Block network access to Vault
Expected: Running templates complete, new templates queued
Verify: No stale credentials exposed, no unencrypted data written
```

## Common Pitfalls

| Pitfall | Impact | Prevention |
|---------|--------|------------|
| Developer friction from security controls | Reduced platform adoption, shadow IT | Balance controls with developer experience |
| Over-privileged platform service accounts | Large blast radius if compromised | Least privilege per component |
| Secret sprawl in templates | Credentials leaked in scaffolded repos | Dynamic secrets, no static credentials |
| Neglecting platform audit logs | Inability to detect or investigate incidents | Centralized logging from day one |
| Ignoring plugin supply chain | Malicious plugin compromises platform | Plugin review, signing, sandboxing |
| Hardcoded compliance checks | Policies bypassed by modified templates | Runtime policy enforcement, not just scaffolding |
| Token reuse across environments | Non-production compromise affects production | Per-environment credentials, separate scopes |
| Missing revocation procedures | Compromised credentials remain active | Short-lived tokens, automated rotation |
| Authentication bypass in development | Developers get unauthorized access | Separate dev auth, mirror production security |
| Inadequate session management | Session hijacking vulnerabilities | HttpOnly cookies, short sessions, rotation |

## Key Takeaways

- The IDP is a high-value target; zero-trust architecture must apply to the platform itself, not just the services it manages
- Security controls must be invisible to developers or they will find workarounds; embed security into golden paths
- Template supply chain security is as important as runtime security — compromised templates affect every service
- Short-lived credentials and dynamic secrets eliminate the window of exposure for credential leaks
- Audit logging is non-negotiable; the platform must produce an immutable, searchable audit trail of every action
- Policy enforcement must happen at both scaffold time (template validation) and runtime (admission control)
- The security principle that platform components must justify their privileges independently, not inherit them from the platform
- Compliance automation turns the IDP from a compliance liability into a compliance asset
- Regular security testing of the platform itself (pen testing, dependency scanning) prevents platform-level vulnerabilities
- Developer feedback on security controls is essential — security that blocks work will be bypassed, not endured
