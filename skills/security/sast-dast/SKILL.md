---
name: security-sast-dast
description: >
  Use this skill when asked about SAST, DAST, static analysis, dynamic analysis, code scanning, SonarQube, Semgrep, Checkmarx, Fortify, OWASP ZAP, or Burp Suite. This skill enforces: SAST tool integration with custom rule writing, DAST scanning with authenticated sessions, false positive triage workflow, and CI pipeline gate configuration. Do NOT use for: dependency scanning (SBOM), container image scanning, or runtime security monitoring.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [security, testing, phase-10]
---

# Security SAST/DAST

## Purpose
Build a security scanning pipeline with static analysis rule sets, dynamic analysis scenarios, false positive management, and CI gating.

## Agent Protocol

### Trigger
Exact user phrases: "SAST", "DAST", "static analysis", "dynamic analysis", "code scanning", "SonarQube", "Semgrep", "Checkmarx", "Fortify", "OWASP ZAP", "Burp Suite", "security scan pipeline", "code quality gate", "scan results", "false positive".

### Input Context
Before activating, verify:
- Programming languages and frameworks in the codebase
- CI/CD platform (GitHub Actions, GitLab CI, Jenkins, CircleCI)
- SAST tool preference or existing tool (Semgrep, SonarQube, CodeQL, Checkmarx)
- DAST target environment (staging URL, authentication method, API endpoints)
- Existing scan frequency and gate thresholds

### Output Artifact
Security scanning pipeline configuration as YAML and rule set files.

### Response Format
```yaml
# SAST pipeline step
# Semgrep rules
# Quality gate thresholds
```
```bash
# DAST scan script
# CI integration snippet
```

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
- [ ] SAST tool configured with language-appropriate rule packs
- [ ] Custom rules written for project-specific patterns
- [ ] False positive triage workflow defined
- [ ] DAST scan configured with authenticated session handling
- [ ] CI pipeline gates set with severity thresholds
- [ ] Scan results correlated between SAST and DAST findings

### Max Response Length
300 lines of configuration and rules.

## Architecture / Decision Trees

### SAST Tool Selection Decision Tree

```
What is the primary goal?
├── Custom rule writing per project patterns → Semgrep
├── Deep interprocedural / variant analysis → CodeQL
├── Quality gates and tech debt tracking → SonarQube
├── Unified platform (code + deps + containers) → Snyk Code
└── Enterprise compliance reporting → Checkmarx / Fortify

Is the repo public or private?
├── Public → Semgrep (free) + CodeQL (free for public repos)
├── Private with GitHub Advanced Security → CodeQL included
└── Private without GHAS → Semgrep (free) + SonarQube Community (free)

What languages are in the codebase?
├── Python, JavaScript/TypeScript, Java, Go → Any tool works
├── C/C++, C#, Kotlin, Swift → CodeQL or Semgrep
├── Ruby, PHP, Rust → Semgrep (best coverage)
├── Scala, Kotlin → CodeQL or Semgrep
└── 10+ languages → SonarQube (broadest support)

What is the team size?
├── <10 developers → Semgrep + ZAP (free, effective)
├── 10-50 developers → Semgrep + SonarQube + ZAP
├── 50-200 developers → Semgrep + SonarQube + Burp Pro + ZAP
└── >200 developers → Enterprise suite (Checkmarx/Fortify + Acunetix)
```

### DAST Tool Selection Decision Tree

```
What is the budget?
├── $0 → OWASP ZAP (full-featured, free)
├── $500-1000/year → ZAP + Burp Suite Community
├── $5000+/year → Burp Suite Professional
└── Enterprise budget → Acunetix or Burp Enterprise

What type of application?
├── Standard web app (HTML forms, links) → Any DAST tool
├── SPA (React, Angular, Vue) → ZAP (SPA-friendly crawler) or Burp
├── API-only (REST, GraphQL) → ZAP API scan (best for OpenAPI/GraphQL)
├── Mobile app backend → Burp (mobile proxy setup)
└── Internal enterprise app → Acunetix (macro auth)

What is the scan target?
├── CI/CD (automated, pipeline) → ZAP Docker (best CI integration)
├── Manual penetration testing → Burp Suite (best manual workflow)
├── Compliance scanning → Acunetix (comprehensive reporting)
└── Production passive scanning → ZAP baseline (safe, read-only)
```

### SAST + DAST Correlation Strategy

```
Findings correlation matrix:

Vulnerability Class          │ SAST Covers        │ DAST Covers
───────────────────────────────────────────────────────────────
SQL Injection                │ Source + sink      │ Confirms exploitability
XSS                          │ Sink only          │ Confirms with payload
Command Injection            │ Source + sink      │ Confirms exploitability
Path Traversal               │ Source + sink      │ Confirms exploitability
SSRF                         │ Source (limited)   │ Confirms endpoint
Authentication Bypass        │ Logic patterns     │ Confirms via session
Authorization Issues         │ Missing checks     │ Confirms via access
CSRF                         │ Missing tokens     │ Confirms via request
Insecure Deserialization     │ Dangerous calls    │ Confirms via payload
Sensitive Data Exposure      │ Hardcoded secrets  │ Confirms in response
Security Misconfiguration    │ Config analysis    │ Confirms headers/CSP
XXE                          │ Parser config      │ Confirms with payload

Workflow:
├── SAST finds potential vulnerability with file/line reference
├── Map to DAST-affected endpoint (if applicable)
├── DAST confirms exploitability with live payload
├── If SAST flags but DAST cannot confirm → manual review
├── If DAST finds but SAST didn't flag → improve SAST rules
└── Both-positive findings: highest priority for remediation
```

## SAST Tool Details

### Semgrep
Semgrep is the recommended default SAST tool for most projects. It is fast, multi-language, and excels at custom rule writing. Rule packs come from the Semgrep Registry. Rules are written in YAML with a pattern-matching syntax that can detect code patterns across function boundaries. Semgrep supports all major languages (Python, JavaScript/TypeScript, Java, Go, Rust, Ruby, C#, PHP, Kotlin, Scala) and runs in CI with diff-aware scanning. Install via `pip install semgrep` or use the official GitHub Action. Key strengths: pattern-based matching that goes beyond regex, support for metavariables and ellipsis operators, community-maintained rule packs, and a built-in rule testing framework.

### CodeQL
CodeQL is best for deep interprocedural analysis and variant analysis. Developed by GitHub, it uses a declarative query language (QL) to find vulnerabilities across the codebase. A single CodeQL query can find all variants of a vulnerability pattern (e.g., all paths where user input reaches a SQL query). CodeQL requires a compiled database of the codebase, which is built during the CI scan step. It supports C/C++, C#, Go, Java/Kotlin, JavaScript/TypeScript, Python, and Ruby. CodeQL is free for public repositories and included in GitHub Advanced Security for private repos. Key strengths: variant analysis, data flow tracking across function and file boundaries, and deep semantic understanding of the code.

### SonarQube
SonarQube is the best tool for quality gates, technical debt tracking, and broad language support. It tracks code quality metrics over time: coverage, duplicated lines, code smells, bugs, vulnerabilities, and hotspots. The quality gate is a configurable policy that blocks PRs when predefined thresholds are exceeded. SonarQube can be self-hosted (Community Edition is free) or used as SonarCloud (SaaS). It supports 30+ languages. Key strengths: historical trend tracking, quality gates as a PR policy, security hotspots that require manual review, and broad ecosystem integrations.

### Snyk Code
Snyk Code is a SAST tool integrated into the Snyk platform. It is particularly strong for finding vulnerabilities in open-source dependencies and container images combined with application-level code analysis. It uses deep semantic analysis and AI to find issues with low false positive rates. Snyk Code integrates with Snyk Open Source and Snyk Container for a unified vulnerability management experience. Key strengths: low false positive rate, IDE integration for real-time feedback, and unified platform with dependency scanning and container scanning.

## DAST Tool Details

### OWASP ZAP
OWASP ZAP (Zed Attack Proxy) is the recommended default DAST tool. It is free, open-source, and community-maintained. ZAP can be run as a desktop application, a daemon for CI integration, or a Docker container. Scan modes: automated scan (spider → passive → active), API scan (import OpenAPI/GraphQL schema), and baseline scan (passive-only, safe for production). ZAP supports authenticated scanning via context-based session management, bearer token injection, and form-based authentication. The HUD (Heads-Up Display) mode provides browser-based interaction for manual testing. Key strengths: free and open-source, extensive active scan rules, API scanning, and Docker-native CI integration.

### Burp Suite
Burp Suite is the professional standard for web application security testing. The Community Edition includes an HTTP proxy, repeater, decoder, and scanner. The Professional Edition adds automated scanning, advanced vulnerability detection, and CI integration. Burp's scanning phases: crawl (discover all endpoints), audit (automated vulnerability checks), and intruder (targeted fuzzing). Extensions from the BApp Store extend functionality: Autorize for auth bypass detection, JSON Web Tokens for JWT manipulation, and ActiveScan++ for enhanced scan coverage. Key strengths: manual testing workflow, extensive extension ecosystem, and industry-standard tooling.

### Acunetix
Acunetix is a commercial DAST tool with deep scanning capabilities. It is known for its comprehensive vulnerability database covering over 7000 vulnerabilities. Acunetix supports multi-step form authentication, macro recording for complex login sequences, and integration with issue trackers (Jira, GitHub Issues). Key strengths: deep scanning for complex vulnerabilities, macro-based authentication, and enterprise reporting.

## Workflow

### Step 1: SAST Tool Selection
Semgrep: best for custom rule writing, multi-language, fast. SonarQube: best for quality gates, technical debt tracking, broad language support. CodeQL: best for deep interprocedural analysis, variant analysis. Checkmarx/Fortify: enterprise-grade with compliance reporting. Default choice: Semgrep for SAST + SonarQube for quality gates.

### Step 2: Rule Configuration
Enable built-in rule packs: Semgrep `p/security-audit`, `p/owasp-top-ten`, `p/command-injection`. Write custom rules for project-specific patterns: hardcoded secrets, dangerous function usage, missing authorization checks, SQL injection via ORM bypass. Rule severity: ERROR (must fix), WARN (should fix), INFO (suggested). False positives: tag with `fp` metadata and documented reason.

### Step 3: CI Integration
SAST runs on every PR — diff-aware scanning for changed files only. Full scan on main branch daily. Quality gates: 0 ERROR severity findings, WARN count must not increase, coverage threshold for new code. DAST runs on staging deployment — weekly full scan, on-demand for critical releases. Pipeline blocks on critical findings.

### Step 4: DAST Scanning
OWASP ZAP: automated scan with API context, authenticated session management via bearer token or form auth. Burp Suite: manual testing with targeted scope. Scan profile: spider (crawl all pages), active scan (inject payloads), fuzzing (parameter mutation). Exclude logout, password change, and high-volume endpoints from active scanning.

### Step 5: False Positive Management
Triage workflow: automated deduplication → security review → mark as FP/WONT-FIX/ACCEPTED-RISK. Store decisions in `.sast-fps.yml` per project. Suppress known FP with reason comment and expiry date. Review suppressed rules quarterly.

### Step 6: Custom Query Writing
Semgrep custom rules follow a standard pattern: rule ID in kebab-case, severity (ERROR/WARN/INFO), languages array, and patterns (match, exclude, condition). Test rules with positive and negative test cases annotated with `ruleid:` and `ok:` comments. Run `semgrep --test` to validate. Store custom rules in `.semgrep/rules/` organized by vulnerability category. Each rule directory has a `tests/` subdirectory with test files.

### Step 7: Authenticated DAST Scanning
For applications requiring authentication, configure the scan context: define the login URL, authentication type (form-based, bearer token, OAuth), credentials, and session cookie name. ZAP uses a context file (.context) that defines the URL regex, authentication script, and session management. For API-focused applications, use API keys or bearer tokens in request headers. Test authentication before running a full scan by verifying the auth token/cookie is correctly injected into scan requests.

### Step 8: Scan Scope Management
Define the DAST scan scope precisely to avoid scanning out-of-scope endpoints. In-scope: the application's own domains and subdomains. Out-of-scope: third-party CDNs, analytics endpoints, authentication providers, social login. Scope is defined as URL regex patterns in the scan tool. For API scanning, scope is defined by the OpenAPI/Swagger specification paths. Exclude destructive endpoints (DELETE, mass-update) from active scanning.

### Step 9: Results Correlation
Map SAST findings to affected endpoints in DAST scope. Prioritize findings that appear in both analyses. Track finding age: 0-7 days (active), 7-30 days (aging), 30+ days (overdue). Generate weekly trend report by severity and category.

## SAST Tool Comparison Matrix

| Feature | Semgrep | CodeQL | SonarQube | Snyk Code |
|---|---|---|---|---|
| Primary strength | Custom rules, speed | Deep interprocedural, variant analysis | Quality gates, tech debt tracking | Low FP rate, IDE integration |
| Language support | 20+ languages | 7 languages | 30+ languages | 10+ languages |
| Rule format | YAML patterns | QL queries | Built-in rules + plugin API | Built-in + custom |
| CI integration | GitHub Action, CLI | GitHub Action | SonarScanner CLI, GitHub Action | Snyk CLI, GitHub Action |
| Diff-aware | Yes (--baseline-commit) | Yes (PR analysis) | Yes (new code analysis) | Yes |
| False positive rate | Low-Medium | Low | Medium | Very low |
| Licensing | Open source (LGPL) | Free for public repos | Community (free), Developer (paid) | Free tier, paid plans |
| Best for | General SAST + custom rules | Security research, variant analysis | Quality gates, coverage tracking | Platform approach (code + deps + containers) |

## DAST Tool Comparison Matrix

| Feature | OWASP ZAP | Burp Suite | Acunetix |
|---|---|---|---|
| Cost | Free | Community: free, Pro: $449/year | Commercial (custom pricing) |
| Scan modes | Automated, API, Baseline | Crawl, Audit, Intruder | DeepScan, QuickScan |
| CI integration | Docker + CLI action | Pro only (REST API) | Yes (CLI + REST API) |
| Authentication | Context-based, form, token | Macro-based, form, token | Macro recording |
| API scanning | OpenAPI, GraphQL, SOAP | OpenAPI via extension | OpenAPI, GraphQL |
| WebSocket testing | Limited | Yes (via extension) | Yes |
| Reporting | HTML, JSON, Markdown, PDF | HTML, XML, PDF | HTML, PDF, Excel |
| Extensibility | Scripts (JS, Python) | BApp Store (100+ extensions) | Limited |
| Best for | Budget-conscious teams, CI | Professional manual testing | Enterprise compliance |

## Scan Scheduling Matrix

| Scan Type | Tool | Frequency | Duration | Target | Gate |
|---|---|---|---|---|---|
| Diff SAST | Semgrep | Per PR | < 5 min | PR diff | Block on ERROR |
| Full SAST | SonarQube | Daily (main branch) | 15-60 min | Full codebase | Report only |
| Quick DAST | ZAP baseline | Per deployment | 15-30 min | Staging | Report only |
| Full DAST | ZAP active | Weekly | 2-4 hours | Staging | Block on HIGH/MEDIUM |
| Deep DAST | Burp/Acunetix | Monthly | 4-8 hours | Staging copy | Full report |
| Compliance DAST | Acunetix | Quarterly | Full day | Production (passive only) | Compliance report |

## Finding Severity Triage Flow

```
New Finding → Automated Dedup → Categorize Severity
  ├── CRITICAL: Immediate fix (24h SLA) → Hotfix PR required
  ├── HIGH: Fix in current sprint (72h SLA) → Bug ticket created
  ├── MEDIUM: Fix within 2 sprints → Backlog item
  └── LOW: Fix when convenient → Icebox
        │
        └── Review → Is it a real vulnerability?
              ├── Yes → Assign to team, create remediation ticket
              ├── FP → Add to .sast-fps.yml with reason
              └── WONT-FIX → Document accepted risk, get security team approval
```

## Remediation SLA Matrix

| Severity | Discovery to Fix | Verification | Reporting |
|---|---|---|---|
| CRITICAL | 24 hours | 12 hours | Within SLA |
| HIGH | 72 hours | 24 hours | Weekly report |
| MEDIUM | 2 sprints | 1 sprint | Monthly report |
| LOW | Indefinite | Per fix | Quarterly report |

## Common Pitfalls

### Pitfall 1: Running Full SAST on Every PR
Full codebase scans take 30-60 minutes, blocking CI pipelines. Use diff-aware scanning for PRs (Semgrep `--baseline-commit`, SonarQube new code analysis). Save full scans for nightly builds.

### Pitfall 2: DAST on Production Without Care
Active DAST scanning sends malicious payloads that can corrupt data, trigger alerts, or crash services. Always target staging or a dedicated test environment. Production scans must be passive-only (ZAP baseline, read-only checks).

### Pitfall 3: No False Positive Triage Backlog
Without a documented FP process, teams ignore scan results entirely. Create a `.sast-fps.yml` file per project, tag findings with rationale, and review quarterly.

### Pitfall 4: Ignoring SAST-DAST Correlation
SAST finds code-level issues. DAST finds runtime issues. They complement each other but are often run in isolation. Correlate findings: SAST flags the source, DAST confirms exploitability. Prioritize correlated findings.

### Pitfall 5: Overly Permissive Scan Scope
DAST scanning third-party endpoints, analytics services, or auth providers causes false positives and may violate terms of service. Define scope precisely with URL regex patterns.

### Pitfall 6: No Authenticated DAST Scanning
Scanning only unauthenticated pages misses 80% of application logic. Always configure authenticated sessions. Test authentication injection before full scan execution.

### Pitfall 7: Using Default Rules Only
Default rule packs are generic and miss project-specific patterns. Write custom rules for your framework, authentication model, and business logic.

### Pitfall 8: No Severity-Based SLA
Without severity-defined SLAs, critical findings sit alongside low-priority ones. Set SLAs: CRITICAL 24h, HIGH 72h, MEDIUM 2 sprints, LOW per backlog.

### Pitfall 9: Blocking CI on Everything
Blocking on WARN or INFO findings creates friction and leads to rule bypass. Block only on ERROR/CRITICAL. Use WARN to trend, not to block.

### Pitfall 10: No Historical Trend Tracking
Without trend data, you cannot tell if security posture is improving or degrading. SonarQube tracks metrics over time. Generate weekly trend reports by severity.

## Best Practices

- Run SAST on every PR diff (Semgrep `--baseline-commit`). Full scan nightly.
- Use multiple SAST tools in combination: Semgrep (custom rules, speed) + SonarQube (quality gates, trends).
- Run DAST on staging every full scan; quick baseline per deployment.
- Correlate SAST and DAST findings. Prioritize issues confirmed by both.
- Define severity-based SLAs with automated ticket creation.
- Store false positive decisions in version-controlled files with expiry dates.
- Write custom Semgrep rules for your framework and patterns. Test with `semgrep --test`.
- Write custom CodeQL queries for complex data-flow vulnerabilities.
- Test authentication injection before running full DAST scans.
- Exclude destructive and high-volume endpoints from DAST active scanning.
- Track finding age: 0-7d active, 7-30d aging, 30d+ overdue.
- Review false positive decisions quarterly. Remove stale entries.
- Generate weekly trend reports shared with the engineering team.
- Include SAST findings in code review PR template.

## Compared With

### Semgrep vs CodeQL
Semgrep is faster and easier for custom rule writing (YAML patterns, simple syntax). CodeQL provides deeper interprocedural analysis but requires a compiled database and QL query language. Choose Semgrep for quick custom rules, CodeQL for variant analysis and complex data-flow tracing.

### Semgrep vs SonarQube
Semgrep focuses on finding vulnerabilities with custom patterns. SonarQube tracks overall code health: coverage, duplication, code smells, technical debt. They are complementary. Use Semgrep for SAST detection. Use SonarQube for quality gates and trends.

### ZAP vs Burp Suite
ZAP is free, open-source, and CI-friendly (Docker, CLI). Burp Suite Pro offers better manual testing workflows and a rich extension ecosystem. Use ZAP for CI/CD automation. Use Burp for professional manual pentesting.

### ZAP vs Acunetix
ZAP is free with community support. Acunetix is commercial with deeper scanning, macro auth recording, and enterprise compliance reporting. Use ZAP for regular CI scanning. Use Acunetix for quarterly compliance scans.

### SAST vs DAST
SAST finds issues early in development (shift-left) with file/line precision. DAST finds runtime issues with exploitability confirmation. SAST has higher false positive rate. DAST has higher true positive rate but finds issues later. Use both for defense in depth.

## Performance Considerations

- Semgrep diff scan: <5s for typical PR diff (100-500 lines). Full scan: 1-5min per 100K lines.
- CodeQL database build: 5-30min depending on language and codebase size. Query execution: 1-10min.
- SonarQube scan: 15-60min for full codebase. New code analysis: <5min for PR.
- ZAP baseline scan: 15-30min for typical app. ZAP active scan: 2-4h for medium app.
- Burp Suite scan: 4-8h for full audit of medium application.
- Acunetix scan: 2-6h for full deep scan.
- CI pipeline time budget: SAST <5min, DAST baseline <30min, DAST active (nightly).
- Resource usage: SAST tools need 1-4GB RAM per concurrent scan. DAST tools need 2-8GB.
- Parallel scans: run SAST + DAST in parallel in CI. SAST gates before merge, DAST reports after.
- Scan frequency: PR-level SAST, daily full SAST, per-deployment DAST baseline, weekly DAST active.

## Rules
- DAST targets staging only — never production
- Custom Semgrep rules stored in `.semgrep/rules/` with tests
- False positives documented with rationale, not silently suppressed
- Quality gate blocks on any ERROR severity finding
- DAST excludes destructive endpoints (DELETE, mass-update)
- Scan results stored for 90 days minimum
- Container image scanning is handled by a separate skill

## References
  - references/dast-automation.md — DAST Automation
  - references/dast-tools.md — DAST Tools
  - references/sast-dast-advanced.md — Sast Dast Advanced Topics
  - references/sast-dast-fundamentals.md — Sast Dast Fundamentals
  - references/sast-rules-customization.md — SAST Rule Customization
  - references/sast-tools.md — SAST Tools
  - references/sast-tool-selection-integration.md — SAST tool selection and CI integration guide
  - references/dast-scoping-execution.md — DAST scoping, execution, and reporting patterns
## Handoff
`security-api-security` for API-specific scanning and protection rules
`devops-ci-cd` for pipeline integration and deployment gates
