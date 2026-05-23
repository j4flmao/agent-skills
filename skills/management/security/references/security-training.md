# Security Training

## Training Levels

| Level | Audience | Frequency | Duration | Content |
|-------|----------|-----------|----------|---------|
| 1 — Awareness | All employees | Annually | 60 min | Phishing, password hygiene, data handling |
| 2 — Developer | Engineering team | Annually + on join | 120 min | Secure coding, OWASP Top 10, dependency safety |
| 3 — Advanced | Security champions | Quarterly | 90 min | Threat modeling, incident response, advanced exploits |
| 4 — Leadership | Managers, executives | Annually | 60 min | Risk management, compliance, budget, strategy |

## Developer Security Training Curriculum

### Module 1: OWASP Top 10
| Topic | Duration | Format | Assessment |
|-------|----------|--------|------------|
| Broken Access Control | 20 min | Code examples + fix | Identify 3 IDOR vulnerabilities |
| Cryptographic Failures | 15 min | Config review | Fix weak TLS/encryption config |
| Injection (SQL, NoSQL, Command) | 25 min | Live coding | Write parameterized query |
| Insecure Design | 15 min | Architecture review | Identify design flaws in diagram |
| Security Misconfiguration | 15 min | Config audit | Harden default configuration |
| Vulnerable Components | 10 min | Dependency review | Identify CVE in dependency tree |
| Auth Failures | 20 min | Code review | Fix auth bypass vulnerability |
| Data Integrity Failures | 10 min | CI/CD review | Add integrity checks to pipeline |
| Logging & Monitoring | 10 min | Config review | Add audit logging for sensitive ops |
| SSRF | 10 min | Code review | Add URL allowlist |

### Module 2: Secure Coding Practices
- Input validation: whitelist approach, encoding, sanitization
- Output encoding: context-aware (HTML, JS, CSS, URL)
- Authentication: password hashing (bcrypt/argon2), session management, MFA
- Authorization: RBAC, ABAC, principle of least privilege
- Cryptography: correct algorithm selection, key management, no homegrown crypto
- Error handling: stack trace exposure, consistent error responses, logging
- File upload: type validation, size limits, path traversal prevention

### Module 3: CI/CD Security
- Secret scanning in pre-commit hooks (GitLeaks, TruffleHog)
- SAST integration in PR pipeline (Semgrep, CodeQL)
- Dependency scanning (Dependabot, Snyk)
- Container image scanning (Trivy, Grype)
- Infrastructure as code scanning (Checkov, tfsec)
- Supply chain integrity (SLSA, SBOM generation)

## Phishing Awareness

| Topic | Content |
|-------|---------|
| Red flags | Suspicious sender, urgency, unexpected attachments, generic greetings |
| Verification | Hover before clicking, verify URL, contact sender through known channel |
| Reporting | Report suspicious email via dedicated button, never forward |
| Simulation | Quarterly simulated phishing campaigns, 90% pass rate target |

## Security Champion Program

### Role
- One security champion per development team
- Embedded in daily workflow, not a separate team
- 10-15% time allocation to security activities

### Responsibilities
- Review PRs for security issues within their team
- Conduct threat modeling for new features
- Facilitate security incident response within their team
- Mentor other developers on secure coding practices
- Escalate security concerns to security team

### Training
- Advanced security training (Level 3) quarterly
- Monthly security community of practice meeting
- Annual security conference or training budget
- Bug bounty participation guidance

## Training Tracking

| Metric | Target | Measurement |
|--------|--------|-------------|
| Completion rate | 100% within 30 days of start | LMS report |
| Assessment score | > 80% | Post-training quiz |
| Phishing pass rate | > 90% | Simulation results |
| Time to complete | < 2 hours per module | LMS tracking |
| Retraining rate | < 5% annually | Follow-up assessment |
| Champion retention | > 80% YoY | Program records |

## Training Materials

- All training materials maintained in shared company drive
- Updated annually or when new vulnerabilities emerge
- Version-controlled with change log
- Available in multiple formats: video, written, interactive labs
- Translated for international teams where applicable
- Practical labs use isolated sandbox environments — never production
- Training completion tracked in HR system and linked to access grants
