# Security Architecture Guide

## Overview

Security architecture is the practice of designing systems to protect data, maintain compliance, and resist attacks while enabling business functionality. Unlike point-solution security (a WAF, a firewall), security architecture embeds security as a structural property of the system. This guide covers threat modeling, security patterns, zero-trust principles, compliance mapping, and practical implementation guidance for solution architects.

## Threat Modeling

### STRIDE Framework

```yaml
threat_categories:
  spoofing:
    description: "Impersonating something or someone else"
    example: "Fake authentication token, credential theft"
    countermeasure: "Strong authentication, MFA, certificate-based auth"
    
  tampering:
    description: "Malicious modification of data or code"
    example: "Request tampering, supply chain attack"
    countermeasure: "Code signing, integrity checks, immutable infrastructure"
    
  repudiation:
    description: "Denying having performed an action"
    example: "User claims they didn't initiate a transaction"
    countermeasure: "Audit logging, non-repudiation, digital signatures"
    
  information_disclosure:
    description: "Exposure of data to unauthorized parties"
    example: "Data leak, misconfigured S3 bucket"
    countermeasure: "Encryption at rest/transit, access control, data classification"
    
  denial_of_service:
    description: "Denying service to legitimate users"
    example: "DDoS attack, resource exhaustion"
    countermeasure: "Rate limiting, auto-scaling, CDN, WAF"
    
  elevation_of_privilege:
    description: "Gaining capabilities without authorization"
    example: "Privilege escalation via IDOR, role bypass"
    countermeasure: "Least privilege, RBAC, authorization checks at every layer"
```

### Threat Modeling Process

```yaml
threat_modeling_process:
  step_1_scope:
    activity: "Define system boundaries and data flows"
    artifacts: ["System context diagram", "Data flow diagram", "Trust boundaries"]
    
  step_2_decompose:
    activity: "Break system into components and identify entry points"
    artifacts: ["Component inventory", "Entry point list", "Asset inventory"]
    
  step_3_identify:
    activity: "Apply STRIDE to each component and data flow"
    artifacts: ["Threat list", "Threat categorization"]
    
  step_4_rank:
    activity: "Prioritize threats by risk level"
    method: "DREAD: Damage, Reproducibility, Exploitability, Affected Users, Discoverability"
    artifacts: ["Risk-ranked threat list"]
    
  step_5_mitigate:
    activity: "Design countermeasures for each threat"
    artifacts: ["Mitigation plan", "Security requirements"]
    
  step_6_validate:
    activity: "Verify mitigations are effective"
    techniques: ["Penetration testing", "Security review", "Architecture validation"]
```

## Zero-Trust Architecture

### Core Principles

```yaml
zero_trust_principles:
  never_trust_always_verify:
    description: "No implicit trust based on network location"
    implementation: "Authenticate and authorize every request, not just at perimeter"
    
  least_privilege_access:
    description: "Give minimum permissions necessary"
    implementation: "Just-in-time access, just-enough-access, micro-segmentation"
    
  assume_breach:
    description: "Design as if the attacker is already inside"
    implementation: "End-to-end encryption, continuous monitoring, blast radius containment"
    
  explicit_verification:
    description: "Verify every access request against all available signals"
    signals: ["User identity", "Device health", "Location", "Behavior patterns", "Data sensitivity"]
```

### Zero-Trust Reference Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Policy Engine                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │
│  │  Identity    │  │  Device     │  │  Context     │  │
│  │  Provider    │  │  Trust      │  │  Signals     │  │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  │
└─────────┼────────────────┼────────────────┼──────────┘
          │                │                │
┌─────────▼────────────────▼────────────────▼──────────┐
│                  Policy Administrator                   │
│          (Evaluates: who + what + where + when + how)  │
└───────────────────────┬───────────────────────────────┘
                        │
┌───────────────────────▼───────────────────────────────┐
│                    Policy Enforcement Point              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │
│  │   API GW    │  │   Service   │  │   DB/Data   │  │
│  │   Gateway   │  │   Mesh      │  │   Access    │  │
│  └─────────────┘  └─────────────┘  └─────────────┘  │
└─────────────────────────────────────────────────────┘
```

## Security Patterns by Layer

### Network Security

```yaml
network_security_patterns:
  defense_in_depth:
    layers: ["CDN/DDoS protection", "WAF", "Load balancer", "Firewall", "Application"]
    enriches: true
    
  micro_segmentation:
    description: "Isolate workloads at the network level"
    implementation: "Kubernetes network policies, service mesh mTLS, VPC peering rules"
    
  private_endpoints:
    description: "Access services without exposing to public internet"
    pattern: "VPC-private resources, Private Link, service endpoints"
    use_case: "Data stores, internal APIs, message queues"
    
  bastion_host:
    description: "Jump box for administrative access"
    pattern: "Temporary, audited, MFA-protected access to private subnets"
```

### Application Security

```yaml
application_security_patterns:
  api_gateway_auth:
    pattern: "Centralize authentication and authorization at the API gateway"
    benefits: ["Consistent auth across services", "Reduced per-service security logic", "Centralized audit"]
    trade_offs: ["Gateway becomes critical path", "Potential bottleneck for auth flows"]
    
  token_based_auth:
    pattern: "Stateless authentication using signed tokens (JWT, OAuth2)"
    without: "Session-based auth with server-side state"
    considerations: ["Token expiry and rotation", "Refresh token strategy", "Revocation mechanisms"]
    
  input_validation:
    layer: "Every service boundary"
    rules: ["Schema validation", "Size limits", "Type enforcement", "Sanitize free text"]
    anti_pattern: "Trusting client-side validation only"
    
  rate_limiting:
    strategies: ["Token bucket", "Leaky bucket", "Sliding window", "Concurrent request limit"]
    enforcement: ["API gateway", "Application middleware", "Reverse proxy"]
    response: "429 Too Many Requests with Retry-After header"
```

### Data Security

```yaml
data_security_patterns:
  encryption_at_rest:
    scope: ["Databases", "Object storage", "Backups", "Logs"]
    key_management: "Hardware Security Module (HSM) or managed KMS"
    considerations: ["Key rotation", "Key hierarchy (master key → data key)", "Access to keys"]
    
  encryption_in_transit:
    standard: "TLS 1.2+ (TLS 1.3 preferred)"
    scope: ["External APIs", "Internal service-to-service", "Database connections", "Message queues"]
    enforcement: "mTLS for service mesh, HSTS for web, certificate pinning for mobile"
    
  data_classification:
    levels:
      public: "No restrictions — marketing content, public docs"
      internal: "Company confidential — not for external disclosure"
      sensitive: "PII, financial data — strict access control, encryption, audit"
      regulated: "PCI, HIPAA, GDPR data — compliance-specific controls"
    implementation: "Data labels, column-level encryption, access policies"
    
  tokenization:
    description: "Replace sensitive data with non-sensitive tokens"
    use_case: "Credit card numbers, SSNs, PII in non-production environments"
    pattern: "Token vault maps token ↔ original; tokens themselves reveal nothing"
```

### Identity and Access Management

```yaml
iam_patterns:
  federated_identity:
    protocols: ["OAuth 2.0", "OIDC", "SAML 2.0"]
    providers: ["Azure AD", "Okta", "Auth0", "Keycloak"]
    pattern: "Users authenticate with IdP; services trust IdP-issued tokens"
    
  role_based_access_control_rbac:
    structure: "User → Role(s) → Permission(s)"
    best_practice: "Roles map to job functions, not individuals"
    pitfalls: ["Role explosion", "Permission creep", "Over-privileged default roles"]
    
  attribute_based_access_control_abac:
    structure: "Policy evaluates attributes (user, resource, environment, context)"
    use_case: "Fine-grained access: 'Managers can view reports for their region during business hours'"
    complexity: "Higher than RBAC; requires policy engine"
    
  just_in_time_access:
    pattern: "Elevate privileges temporarily for specific tasks"
    implementation: "Approval workflow, time-bound grants, automatic revocation"
    audit: "Full audit trail of who requested what, when, and why"
```

## Compliance Architecture

### Mapping Controls to Frameworks

```yaml
compliance_framework_mapping:
  soc2:
    trust_principles: ["Security", "Availability", "Processing Integrity", "Confidentiality", "Privacy"]
    common_controls: ["Access control", "Change management", "Monitoring", "Incident response"]
    architecture_impact: ["Logging infrastructure", "Change approval gates", "Access reviews"]
    
  pci_dss:
    requirements_count: 12
    key_areas: ["Network security", "Data protection", "Access control", "Monitoring", "Policy"]
    architecture_impact: ["Tokenization or encryption of card data", "Network segmentation", "Strict logging"]
    
  hipaa:
    rules: ["Privacy Rule", "Security Rule", "Breach Notification Rule"]
    safeguards: ["Administrative", "Physical", "Technical"]
    architecture_impact: ["BAA with all subprocessors", "Access logs for 6+ years", "Encryption defaults"]
    
  gdpr:
    principles: ["Lawfulness", "Purpose limitation", "Data minimization", "Accuracy", "Storage limitation"]
    rights: ["Access", "Rectification", "Erasure", "Portability", "Objection"]
    architecture_impact: ["Data deletion flows", "Consent management", "DPIA process", "Data mapping"]
```

### Compliance-by-Design Approach

```yaml
compliance_by_design:
  phase_1_requirements:
    activity: "Identify applicable regulations and map requirements"
    output: "Compliance requirement traceability matrix"
    
  phase_2_architecture:
    activity: "Design controls into system architecture"
    output: "Control implementation plan with architecture decisions"
    examples:
      - "Encryption at rest → select KMS strategy"
      - "Access logging → design log pipeline"
      - "Data retention → architect deletion workflows"
    
  phase_3_implementation:
    activity: "Build controls as platform capabilities"
    approach: "Shared security services over per-team implementation"
    
  phase_4_validation:
    activity: "Verify controls through testing and audits"
    methods: ["Automated compliance checks", "Penetration testing", "Auditor walkthrough"]
    
  phase_5_continuous:
    activity: "Monitor controls and adapt to changes"
    automation: "Infrastructure-as-code compliance scanning, drift detection"
```

## Secure Software Development Lifecycle

```yaml
secure_sdlc:
  design:
    activities: ["Threat modeling", "Security architecture review", "Risk assessment"]
    gates: ["Security review required for all architecture changes"]
    
  development:
    activities: ["SAST scanning", "Dependency scanning", "Secret scanning", "Pre-commit hooks"]
    tools: ["Semgrep", "Snyk", "GitHub secret scanning", "SonarQube"]
    
  build:
    activities: ["Software Bill of Materials (SBOM)", "Container image scanning", "Supply chain attestation"]
    artifacts: ["Signed artifacts", "Provenance metadata", "Vulnerability report"]
    
  test:
    activities: ["DAST scanning", "Fuzz testing", "Integration security tests", "Compliance validation"]
    cadence: "Per build (automated) + quarterly (manual pentest)"
    
  deploy:
    activities: ["Infrastructure scanning", "Configuration validation", "Change approval"]
    controls: ["Immutable deployments", "Blue-green with rollback", "Canary analysis gates"]
    
  operate:
    activities: ["Runtime monitoring", "Vulnerability management", "Incident response"]
    automation: ["Auto-remediation", "Anomaly detection", "Threat intelligence feeds"]
```

## Security Architecture Anti-Patterns

```yaml
anti_patterns:
  perimeter_security_only:
    problem: "Hard shell, soft center — once inside, full access"
    solution: "Zero-trust with micro-segmentation and per-request auth"
    
  security_by_obscurity:
    problem: "Relying on secrets being hidden rather than strong controls"
    solution: "Assume attacker knows the design (Kerckhoffs's principle)"
    
  bolt_on_security:
    problem: "Adding security after the system is built"
    consequences: ["Poor integration", "High cost of retrofitting", "Inconsistent coverage"]
    solution: "Security architecture from day one"
    
  single_gatekeeper:
    problem: "All security flows through one component"
    risk: "Single point of failure, performance bottleneck, bypass temptation"
    solution: "Defense in depth — multiple independent controls"
    
  over_encryption:
    problem: "Encrypting everything indiscriminately"
    consequences: ["Performance impact", "Operational complexity", "Key management nightmare"]
    solution: "Classify data; encrypt based on sensitivity classification"
```

## Cloud Security Architecture

### Shared Responsibility Model

```yaml
shared_responsibility:
  iaas:
    provider_responsibility: ["Physical security", "Network infrastructure", "Hypervisor"]
    customer_responsibility: ["OS patches", "Application security", "Network ACLs", "Data", "IAM"]
    
  paas:
    provider_responsibility: ["Physical security", "OS", "Runtime", "Middleware"]
    customer_responsibility: ["Application code", "Data", "Access management", "Configuration"]
    
  saas:
    provider_responsibility: ["Everything except customer data and user access"]
    customer_responsibility: ["User access", "Data classification", "Integration security"]
```

### Cloud-Specific Patterns

```yaml
cloud_security_patterns:
  hub_and_spoke_network:
    description: "Centralized network security in hub VPC"
    components: ["Shared WAF", "Inspection VMs", "DNS firewall", "Log aggregation"]
    spoke: "Workload VPCs route through hub for inspection"
    
  infrastructure_as_code_security:
    scanning: "Policy-as-code on IaC templates before deployment"
    tools: ["Checkov", "tfsec", "OPA", "Cloudformation Guard"]
    rules: ["Public S3 buckets", "Overly permissive security groups", "Unencrypted storage"]
    
  cloud_identity_management:
    pattern: "Cloud IdP as source of truth, federate to on-prem"
    key_practices: ["Conditional access policies", "Privileged Identity Management", "Zero standing access"]
    
  container_security:
    layers: ["Image scanning", "Runtime protection", "Admission control", "Network policies"]
    image: "Minimal base images, non-root user, read-only filesystem, signed images"
    runtime: "Seccomp, AppArmor, Falco for anomaly detection"
```

## Incident Response Architecture

```yaml
incident_response_architecture:
  detection:
    sources: ["SIEM alerts", "Anomaly detection", "User reports", "Threat intelligence"]
    architectural_requirements: ["Centralized logging", "High-cardinality metric storage", "Alert routing"]
    
  containment:
    automated:
      - "Isolate compromised instance (remove from LB, block network)"
      - "Revoke credentials of compromised account"
      - "Enable read-only mode on affected service"
    manual: "Escalation to security team for forensics"
    
  eradication:
    activities: ["Remove attacker access", "Patch vulnerability", "Rotate all affected secrets"]
    architectural_requirements: ["Immutable infrastructure for fast rebuild", "Secret rotation tooling"]
    
  recovery:
    activities: ["Restore from clean backup", "Validate no persistence", "Gradually reintroduce traffic"]
    architectural_requirements: ["Automated rollback", "Canary with automatic gating"]
    
  lessons_learned:
    output: "Post-mortem with architecture recommendations"
    typical_findings: ["Gaps in logging", "Missing network isolation", "Overly broad permissions"]
```

## Architecture Decision Records for Security

### When to Write a Security ADR

- Choosing an authentication protocol (OAuth2 vs SAML vs custom)
- Selecting encryption strategy (KMS vs HSM vs application-level)
- Adopting zero-trust
- Choosing between shared responsibility models
- Selecting identity provider
- Designing secret management approach

### Security ADR Template Additions

```yaml
security_specific_adr_sections:
  threat_model_reference:
    description: "Link to threat model this decision addresses"
    
  compliance_impact:
    description: "Which compliance requirements are affected"
    
  audit_evidence:
    description: "What evidence this decision will generate for auditors"
    
  security_team_signoff:
    description: "Required approval from security architecture team"
    
  penetration_test_scope:
    description: "How penetration testing will validate this decision"
```
