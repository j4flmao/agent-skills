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

## Rules
- SAST runs on every PR diff, not full codebase
- DAST targets staging only — never production
- Custom Semgrep rules stored in `.semgrep/rules/` with tests
- False positives documented with rationale, not silently suppressed
- Quality gate blocks on any ERROR severity finding
- DAST excludes destructive endpoints (DELETE, mass-update)
- Scan results stored for 90 days minimum
- Container image scanning is handled by a separate skill

## References
- `references/sast-tools.md` — Semgrep, CodeQL, SonarQube, Snyk Code, rule writing, custom queries, CI integration, false positive management
- `references/dast-tools.md` — OWASP ZAP, Burp Suite, Acunetix, authenticated scanning, session handling, scan scope, CI pipeline

## Handoff
`security-api-security` for API-specific scanning and protection rules
`devops-ci-cd` for pipeline integration and deployment gates
