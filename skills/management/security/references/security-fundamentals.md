# Security Fundamentals

## Overview
Security protects information systems, data, and infrastructure from threats, vulnerabilities, and unauthorized access. This reference covers fundamental concepts, security principles, common threats, and basic defense mechanisms.

## Core Concepts

### Concept 1: The CIA Triad

Three foundational security objectives:

**Confidentiality**: data is accessible only to authorized parties.
- Mechanisms: encryption (at rest and in transit), access control, data classification
- Violation: data breach, unauthorized access

**Integrity**: data is accurate, consistent, and not tampered with.
- Mechanisms: checksums, digital signatures, version control, audit logs
- Violation: data corruption, unauthorized modification

**Availability**: systems and data are accessible when needed.
- Mechanisms: redundancy, backup, disaster recovery, DDoS protection
- Violation: denial of service, ransomware, system outage

All security controls serve one or more CIA objectives. Tradeoffs exist — encryption adds latency (availability vs confidentiality).

### Concept 2: Authentication, Authorization, Accounting (AAA)

**Authentication**: verifying identity ("who are you?").
- Factors: something you know (password), something you have (token, phone), something you are (biometrics)
- Multi-factor authentication (MFA): use 2+ factors

**Authorization**: verifying permissions ("what are you allowed to do?").
- Models: RBAC (role-based), ABAC (attribute-based), ACLs (access control lists)
- Principle of least privilege: minimum permissions needed

**Accounting**: tracking what users did (audit logs).
- Log all access to sensitive data and systems
- Immutable logs prevent tampering
- Regular review for suspicious activity

### Concept 3: Threat Modeling

Systematic identification of threats to a system.

**STRIDE framework**:
- Spoofing: pretending to be someone else
- Tampering: modifying data without authorization
- Repudiation: denying an action without proof
- Information Disclosure: exposing data to unauthorized parties
- Denial of Service: making system unavailable
- Elevation of Privilege: gaining unauthorized access level

**Process**: define system scope → identify assets → enumerate threats → assess risk → prioritize mitigations.

### Concept 4: Common Threats

**Malware**: viruses, worms, trojans, ransomware. Enters via email, downloads, removable media.

**Phishing**: deceptive messages tricking users into revealing credentials or installing malware. Spear phishing targets specific individuals.

**Social Engineering**: manipulating people to bypass security controls. Pretexting, baiting, tailgating.

**Injection Attacks**: SQL injection, command injection, cross-site scripting (XSS). Untrusted input executed by interpreter.

**Man-in-the-Middle (MITM)**: attacker intercepts communication between two parties. Encrypted connections (TLS) prevent this.

**Denial of Service (DoS/DDoS)**: overwhelming system with traffic to make it unavailable. Rate limiting, CDN, auto-scaling as mitigations.

### Concept 5: Defense in Depth

Multiple layers of security controls so that if one fails, others provide protection:

```
Layer 1: Policies & Training (user awareness, security policies)
Layer 2: Physical Security (access control, cameras, locks)
Layer 3: Network Security (firewalls, IDS/IPS, VPN, segmentation)
Layer 4: Application Security (input validation, authentication, encryption)
Layer 5: Data Security (encryption at rest, access control, backup)
Layer 6: Monitoring & Response (logging, SIEM, incident response)
```

No single control is sufficient. Defense in depth assumes any layer can be breached.

### Concept 6: Secure Development Lifecycle (SDLC)

Integrating security into every phase of development:

**Plan**: security requirements, threat modeling, compliance needs
**Design**: security architecture review, threat model updated
**Develop**: secure coding standards, SAST (static analysis), dependency scanning
**Test**: DAST (dynamic analysis), penetration testing, fuzz testing
**Release**: security review, SBOM (software bill of materials), sign-off
**Deploy**: secure configuration, infrastructure scanning, secrets management
**Operate**: monitoring, incident response, vulnerability management, patching

Shift left: find and fix vulnerabilities as early as possible. Cost of fixing in production is 10-100x cost of fixing in design.

### Concept 7: Vulnerability Management

**Lifecycle**:
1. Discover: scanning, penetration testing, bug bounty, CVE monitoring
2. Prioritize: CVSS score, exploitability, business impact, asset criticality
3. Remediate: patch, configuration change, compensating control, accept risk
4. Verify: re-scan to confirm fix
5. Report: metrics, trends, SLAs, exception tracking

**SLAs by severity**: Critical (fix within 24-48 hours), High (1 week), Medium (1 month), Low (next release).

### Concept 8: Incident Response

**6-step process**:
1. Preparation: runbooks, tools, training, communication plan
2. Identification: detect anomaly, confirm incident, classify severity
3. Containment: isolate affected systems, preserve evidence
4. Eradication: remove threat, patch vulnerability
5. Recovery: restore from clean backup, verify normal operation
6. Lessons Learned: post-mortem, update runbooks, improve defenses

## Best Practices

| Practice | Description | Priority |
|----------|-------------|----------|
| Least Privilege | Minimum access for minimum time | High |
| Encrypt Everything | Data at rest and in transit | High |
| Patch Promptly | Known vulnerabilities are attacker's easiest path | High |
| Train Users | Human error is the #1 security risk | High |
| Assume Breach | Design for failure, not just prevention | Medium |
| Automate Security | Scanning, patching, monitoring in CI/CD | High |
| Back Up Regularly | Immutable backups for ransomware recovery | High |

## Common Pitfalls

### Pitfall 1: Security as Afterthought
Adding security controls after development is complete. Expensive, slow, and less effective.
Fix: integrate security into every phase of SDLC. Threat model before coding. Security review in definition of done.

### Pitfall 2: Alert Overload
Too many security alerts, most are false positives. Real threats lost in noise.
Fix: tune rules to reduce false positives. Prioritize by risk. Automate response for known patterns.

### Pitfall 3: Credential Mismanagement
Hardcoded secrets, shared passwords, no rotation, overly permissive IAM roles.
Fix: use secrets manager, rotate credentials, enforce MFA, audit access regularly.

### Pitfall 4: Configuration Drift
Production environment differs from hardened baseline. Security controls removed or weakened over time.
Fix: infrastructure as code, immutable deployments, configuration scanning, drift detection.

### Pitfall 5: Ignoring Supply Chain
Third-party libraries and vendors introduce risk. Log4j-style vulnerabilities affect dependency chains.
Fix: maintain SBOM, scan dependencies, vendor security assessment, limit third-party access.

## Tooling Ecosystem

### Scanning Tools
- SAST: SonarQube, Semgrep, CodeQL, Snyk Code
- DAST: OWASP ZAP, Burp Suite, Acunetix
- Dependency: Snyk, Dependabot, Renovate, Trivy
- Container: Trivy, Clair, Docker Scout, Anchore
- IaC: Checkov, tfsec, Terrascan, Bridgecrew

### Monitoring
- SIEM: Splunk, ELK, Sentinel, Sumo Logic
- EDR: CrowdStrike, SentinelOne, Defender
- Cloud Security: AWS GuardDuty, Azure Defender, GCP Security Command Center

## Key Points
- CIA triad is the foundation: Confidentiality, Integrity, Availability
- Defense in depth: multiple layers, assume any can fail
- Least privilege: minimum access for minimum time
- Shift left: find vulnerabilities early (cost grows 10x each phase)
- Threat model before building — STRIDE is a good starting framework
- Patch critical vulnerabilities within 48 hours
- Immutable backups protect against ransomware
- Train users — human error is the #1 root cause
- SBOM every dependency for supply chain visibility
- Incident response: prepare before you need it
