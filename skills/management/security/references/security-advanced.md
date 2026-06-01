# Security Advanced Topics

## Introduction
Advanced security covers zero-trust architecture, security operations (SOC), cloud security, container security, supply chain security, security automation, and building a security program.

## Zero Trust Architecture

### Principles

**Never trust, always verify**: no implicit trust based on network location. Every access request is authenticated, authorized, and encrypted.

**Core principles**:
- Verify explicitly: authenticate and authorize based on all available data (identity, location, device, data sensitivity)
- Least privilege access: minimum access for minimum time (JIT/JEA)
- Assume breach: segment access, encrypt all traffic, monitor continuously

### Implementation

**Identity is the new perimeter**: 
- Strong identity (MFA, conditional access, risk-based policies)
- Device compliance check before access
- Continuous access evaluation (not just at login)

**Micro-segmentation**: divide network into small, isolated zones. Each zone has its own access policies. Compromise in one zone doesn't spread.

**Zero Trust for applications**:
- All traffic encrypted (internal and external)
- Application-level authentication and authorization
- API security (mTLS, API keys, rate limiting)
- Session management with short-lived tokens

## Security Operations (SOC)

### SOC Maturity Model

| Level | Characteristics |
|-------|----------------|
| Level 1 — Initial | No dedicated SOC, ad-hoc incident response, minimal tooling |
| Level 2 — Defined | Dedicated SOC team, SIEM deployed, basic runbooks, 8×5 coverage |
| Level 3 — Managed | 24×7 coverage, SOAR automation, threat intelligence integration, regular tabletop exercises |
| Level 4 — Optimized | Predictive analytics, automated response, threat hunting, continuous improvement |

### SIEM Tuning

**Log sources to ingest**:
- Authentication logs (SSO, VPN, AD)
- Network logs (firewall, proxy, DNS)
- Endpoint logs (EDR, AV)
- Cloud logs (CloudTrail, Audit Logs)
- Application logs (web server, API gateway)
- Database logs (access, changes)

**Alert tuning process**:
1. Baseline normal behavior (2-4 weeks of data)
2. Define detection rules based on known attack patterns
3. Review alerts weekly for false positives
4. Tune rules: increase threshold, reduce scope, add conditions
5. Retire rules that never fire or always false-positive
6. Repeat quarterly

### Threat Intelligence

**Intelligence sources**:
- Open source: MITRE ATT&CK, CVE feeds, AlienVault OTX
- Commercial: Recorded Future, Mandiant, CrowdStrike
- Industry ISACs: sector-specific intelligence sharing
- Internal: incident data, vulnerability scans, attacker behavior

**Operationalizing threat intel**:
- Map intelligence to MITRE ATT&CK framework
- Prioritize intelligence relevant to your industry and tech stack
- Update detection rules based on new intelligence
- Use intel for proactive threat hunting

## Cloud Security

### Shared Responsibility Model

Provider manages security OF the cloud. Customer manages security IN the cloud.

| Layer | SaaS | PaaS | IaaS | On-prem |
|-------|------|------|------|---------|
| Data | Customer | Customer | Customer | Customer |
| App | Provider | Customer | Customer | Customer |
| OS | Provider | Provider | Customer | Customer |
| Network | Provider | Provider | Provider | Customer |
| Physical | Provider | Provider | Provider | Customer |

### Cloud Security Best Practices

**Identity and access**:
- Use cloud-native IAM (AWS IAM, Azure AD, GCP Cloud IAM)
- Principle of least privilege for all roles
- No permanent access keys for humans (use SSO + short-term credentials)
- Service roles for applications, not access keys

**Data protection**:
- Encrypt all data at rest (S3 SSE, EBS encryption, RDS encryption)
- Encrypt all data in transit (TLS 1.2+ for all endpoints)
- Key management with customer-managed keys for sensitive data
- Automated backup with versioning for ransomware recovery

**Network security**:
- VPC segmentation (public, private, database subnets)
- Security groups (stateful firewall per resource)
- Network ACLs (stateless firewall per subnet)
- WAF for web applications
- DDoS protection (CloudFront, Shield, Cloud Armor)

**Monitoring**:
- CloudTrail / Cloud Audit Logs for all API calls
- GuardDuty / Security Center for threat detection
- Config / Asset Inventory for compliance monitoring
- Cost anomaly detection for financial security

## Container Security

### Image Security

**Secure image pipeline**:
1. Use minimal base images (Alpine, distroless)
2. Scan images for vulnerabilities (Trivy, Clair, Docker Scout)
3. Sign images with digital signatures (Cosign)
4. Store in private registry with access control
5. Re-scan regularly (new CVEs published daily)

**Image scanning policy**:
- Block deployment of images with critical/high vulnerabilities
- Allow medium/low with documented exceptions
- Re-scan base images weekly
- Automatically rebuild images when base image updated

### Runtime Security

**Pod security**:
- Run as non-root user
- Read-only root filesystem
- Drop all capabilities, add only needed
- Resource limits (CPU, memory)
- Seccomp/AppArmor profiles

**Network security**:
- Network policies (zero trust between pods)
- Service mesh for mTLS and policy
- No privileged containers
- Egress filtering for unexpected connections

**Monitoring**:
- Runtime anomaly detection (Falco, Sysdig)
- Container drift detection (unexpected process execution)
- Resource abuse alerts (container using too much CPU/memory)

## Supply Chain Security

### Software Bill of Materials (SBOM)

A machine-readable inventory of all software components:

**SBOM fields**: component name, version, supplier, dependency relationship, license, vulnerabilities.

**SBOM formats**: SPDX, CycloneDX, SWID.

**Automation**:
- Generate SBOM during build (Syft, Trivy, CycloneDX plugin)
- Store SBOM in artifact registry alongside image
- Query SBOM for vulnerability scanning
- Share SBOM with customers for transparency

### Dependency Management

**CI/CD pipeline for dependencies**:
1. Dependency scanning on every PR (Snyk, Dependabot, Renovate)
2. Block PR if critical vulnerability introduced
3. Auto-create fix PR for known vulnerabilities
4. Weekly full dependency audit
5. Retire unmaintained dependencies

**Vendor risk assessment**:
- Security questionnaire for new vendors
- Review vendor security certifications (SOC 2, ISO 27001)
- Contractual requirements for breach notification, security controls
- Regular vendor security reviews (annual)
- Exit plan for vendor-related security issues

## Security Automation

### Automating Compliance

**Infrastructure as Code (IaC) scanning**:
- Scan Terraform, CloudFormation, Pulumi before apply (Checkov, tfsec, Terrascan)
- Block deployment of non-compliant infrastructure
- Generate compliance reports automatically (CIS benchmarks, NIST, SOC 2)

**Policy as Code**:
- Define security policies in code (OPA, Kyverno)
- Enforce policies in CI/CD pipeline
- Automate compliance evidence collection
- Real-time policy violation alerts

### Automated Incident Response

**Common automation patterns**:
- Quarantine compromised instance (remove from load balancer, deny traffic)
- Disable compromised user account
- Rotate exposed credentials
- Capture forensic snapshot of compromised system
- Notify security team via incident management tool

**Playbook framework**:
```
Trigger: {alert name}
Actions:
  1. Verify alert (auto-check correlation with other sources)
  2. Isolate affected resource (automated quarantine)
  3. Collect forensics (snapshot, logs, memory dump)
  4. Notify team (incident channel, ticket)
  5. Await human decision for remediation
```

## Key Points
- Zero trust: never trust, always verify — identity is the new perimeter
- SOC maturity: initial → defined → managed → optimized
- Threat intelligence operationalized through MITRE ATT&CK mapping
- Cloud shared responsibility: customer owns security IN the cloud
- Container security: minimal base images, scan, sign, enforce at runtime
- SBOM generates machine-readable inventory of all software components
- Dependency scanning blocks vulnerable dependencies at PR time
- IaC scanning prevents insecure infrastructure from being deployed
- Policy as code enforces security rules automatically in CI/CD
- Automated incident response: detect → verify → isolate → notify
