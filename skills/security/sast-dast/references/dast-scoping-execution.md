# DAST Scoping, Execution, and Reporting

## Overview

Dynamic Application Security Testing (DAST) analyzes running web applications for security vulnerabilities by simulating attacks. Unlike SAST, DAST finds runtime issues: misconfigurations, authentication flaws, and injection vulnerabilities in their exploitable context. This reference covers DAST tooling, scan scoping, authentication integration, execution patterns, reporting, and correlation with SAST findings.

## DAST Fundamentals

### How DAST Works

```
DAST scan phases:

1. Reconnaissance (Spider/Crawl)
├── Discover all pages, endpoints, and parameters
├── Follow links, submit forms, parse JavaScript (SPA support)
├── Identify API endpoints (REST, GraphQL, SOAP)
├── Map application structure and technology stack
└── Build attack surface inventory

2. Passive Analysis
├── Analyze all HTTP requests and responses
├── Check security headers (HSTS, CSP, X-Frame-Options)
├── Identify cookie attributes (Secure, HttpOnly, SameSite)
├── Detect information disclosure (stack traces, server banners)
├── Review TLS configuration and certificate validity
└── No injected payloads — safe for any environment

3. Active Analysis (Attack Phase)
├── Inject malicious payloads into parameters, headers, and body
├── Test for: SQL injection, XSS, command injection, SSRF, XXE
├── Fuzz parameters with mutation strategies
├── Test authentication and authorization bypass
├── Attempt path traversal and file inclusion
└── Only safe for staging/test environments

4. Verification
├── Confirm exploitability of detected vulnerabilities
├── Remove false positives (payload didn't trigger)
├── Rank findings by confidence level
├── Generate proof-of-concept (PoC) for critical findings
└── Produce final report

Vulnerability categories detected:
├── Injection: SQL, NoSQL, OS command, LDAP, XPath
├── XSS: Reflected, Stored, DOM-based
├── Authentication: Weak credentials, session fixation, missing MFA
├── Authorization: IDOR, privilege escalation, missing access controls
├── Security misconfiguration: Default creds, debug endpoints, open CORS
├── Sensitive data exposure: Credit cards, PII in responses, weak TLS
├── XXE: XML external entity injection
├── SSRF: Server-side request forgery
├── Deserialization: Insecure deserialization
├── CSP/Headers: Missing or misconfigured security policies
└── API-specific: Mass assignment, rate limiting, broken object auth
```

### DAST vs SAST vs IAST vs RASP

```
┌──────────────────────────────────────────────────────────────────┐
│ Aspect        │ DAST        │ SAST        │ IAST         │ RASP  │
├──────────────────────────────────────────────────────────────────┤
│ Timing        │ Runtime     │ Pre-compile │ Runtime      │ Runtime│
│ Integration   │ CI/CD + QA  │ IDE + PR    │ QA + Staging │ Prod  │
│ False Pos     │ Low-Medium  │ Med-High    │ Low          │ Low   │
│ False Neg     │ Medium      │ Low-Medium  │ Low          │ Medium│
│ Coverage      │ Live attack │ All code    │ Instrumented │ Same  │
│ Config req    │ Full app    │ None        │ Agent req    │ Agent │
│ Risk          │ Active may  │ Code only   │ Low          │ Block │
│               │ harm prod   │             │              │ only  │
│ Best for      │ Runtime vuln│ Code vulns  │ Precise vuln │ Protect│
│ Cost          │ Free-High   │ Free-High   │ Commercial   │ Comm. │
└──────────────────────────────────────────────────────────────────┘
```

## OWASP ZAP Deep Dive

### Installation and Modes

```
Installation:
├── Docker: docker pull zaproxy/zap-stable
├── Docker with webswing UI: docker pull zaproxy/zap-webswing
├── Homebrew: brew install zaproxy
├── Direct: download from zaproxy.org/download
├── GitHub Action: zaproxy/action-full-scan@v0.12
└── GitLab CI: owasp/zap2docker-stable image

ZAP execution modes:
├── Desktop mode: GUI with HUD (browser-integrated testing)
│   ├── Best for: exploratory testing, manual penetration testing
│   ├── Features: interactive spider, manual request editor, breakpoints
│   └── Command: zap.sh (launches GUI)
├── Daemon mode: headless, REST API
│   ├── Best for: CI/CD integration, automated scanning
│   ├── Features: REST API, event stream, automation framework
│   └── Command: zap.sh -daemon -port 8080
├── Command-line mode: scripted single-run scans
│   ├── Best for: quick scripts, automation
│   ├── Features: all config via command line
│   └── Command: zap-cli quick-scan --spider -r http://target.com
└── Automation mode: YAML-driven multi-step workflows
    ├── Best for: complex scan plans, authenticated scanning
    ├── Features: YAML plan files, environments, progress hooks
    └── Command: zap.sh -cmd -autorun /path/to/plan.yaml

Docker usage examples:
# Baseline scan (passive only, safe for production)
docker run -v $(pwd):/zap/wrk/:rw -t zaproxy/zap-stable \
  zap-baseline.py -t https://target.com \
  -r zap_report.html

# API scan (from OpenAPI specification)
docker run -v $(pwd):/zap/wrk/:rw -t zaproxy/zap-stable \
  zap-api-scan.py -t openapi.yaml \
  -f openapi -r zap_report.html

# Full active scan
docker run -v $(pwd):/zap/wrk/:rw -t zaproxy/zap-stable \
  zap-full-scan.py -t https://target.com \
  -r zap_report.html \
  -z "-config rules.dontDeleteCookies=true"
```

### Scan Configuration

```
Context configuration (.context file):
<?xml version="1.0" encoding="UTF-8"?>
<configuration>
  <context>
    <name>MyApp</name>
    <desc>My Application Context</desc>
    <inscope>true</inscope>
    <urls>https://app.example.com/.*</urls>
    <urls>https://api.example.com/.*</urls>
    <excludedUrls>https://app.example.com/logout</excludedUrls>
    <excludedUrls>https://app.example.com/health</excludedUrls>
    <excludedUrls>https://analytics.example.com/.*</excludedUrls>
    <authentication>
      <type>form</type>
      <loginUrl>https://app.example.com/login</loginUrl>
      <loginRequest>POST https://app.example.com/auth?username={%username%}&amp;password={%password%}</loginRequest>
      <loginPage>/login</loginPage>
      <loggedInIndicator>\QWelcome back\E</loggedInIndicator>
      <loggedOutIndicator>\QSign in\E</loggedOutIndicator>
    </authentication>
    <users>
      <user>
        <name>tester@example.com</name>
        <password>TestPassword123!</password>
      </user>
    </users>
    <sessionManagement>
      <method>cookie</method>
      <sessionTokens>JSESSIONID</sessionTokens>
    </sessionManagement>
    <techSet>
      <technology>Java</technology>
      <technology>Spring</technology>
      <technology>Tomcat</technology>
    </techSet>
  </context>
</configuration>

Automation plan (plan.yaml):
env:
  contexts:
    - name: MyApp
      urls:
        - https://app.example.com
      excludePaths:
        - https://app.example.com/logout
        - https://app.example.com/health
        - .*\.css
        - .*\.js
        - .*\.png
      authentication:
        method: browser
        loginPageUrl: https://app.example.com/login
        browserBasedAuthentication:
          usernameField: username
          passwordField: password
          submitButton: login-button
          loggedInIndicator: Welcome back
          loggedOutIndicator: Sign in
  parameters:
    failOnError: true
    progressToStdout: true

jobs:
  - type: spider
    parameters:
      context: MyApp
      maxChildren: 100
      maxDepth: 5
      handleParameters: true

  - type: activeScan
    parameters:
      context: MyApp
      maxRuleDurationInMins: 10
      maxScanDurationInMins: 60
      attackStrength: HIGH
      alertThreshold: MEDIUM
      policyDefinition:
        rules:
          - id: 40012  # Cross Site Scripting (Reflected)
            threshold: LOW
            strength: HIGH
          - id: 40018  # SQL Injection
            threshold: LOW
            strength: HIGH
          - id: 90019  # Server Side Code Injection
            threshold: LOW
            strength: HIGH

  - type: report
    parameters:
      report: "zap-report.html"
      reportDir: "/zap/wrk/"

  - type: passfail
    parameters:
      maxFail: 0
      pass: all
```

### Authentication Setup

```
Authentication methods in ZAP:

1. Form-based authentication:
├── Configure login URL, credentials, and form parameters
├── ZAP submits login form, captures session cookie
├── Verifies auth with loggedInIndicator string or regex
├── Detects sign-out via loggedOutIndicator
└── Re-authenticates when session expires

2. Bearer token authentication:
├── Configure Authorization header with token
├── Token can be static or obtained via login API
├── ZAP stores token and includes it in all subsequent requests
├── Refresh token flow when token expires
└── Best for: API scanning, SPAs with JWT auth

3. OAuth 2.0 flow:
├── Configure OAuth endpoints (authorize, token, refresh)
├── ZAP completes the OAuth dance to obtain access token
├── Supports: authorization_code, client_credentials, password
├── Automatically refreshes using refresh_token
└── Best for: applications using OAuth2

4. NTLM / Windows authentication:
├── Configure domain, username, password
├── ZAP handles NTLM challenge-response
├── Supports: NTLMv1, NTLMv2
└── Best for: enterprise intranet applications

5. Browser-based authentication (macro):
├── Record login sequence using browser
├── Play back the macro in ZAP
├── Supports: multi-step flows, CAPTCHA (manual), MFA
├── ZAP captures all cookies and tokens from the flow
└── Best for: complex login flows with redirects

Testing authentication:
# Verify authentication is working
curl -X GET "http://localhost:8080/JSON/authentication/view/testAuthStatus/"
# Returns: {"authStatus": "true"} or {"authStatus": "false"}

# Check session management
curl -X GET "http://localhost:8080/JSON/httpSessions/view/sessions/"
# Returns: list of active sessions

# Verify user context
curl -X GET "http://localhost:8080/JSON/context/view/contextUser/"
# Returns: user configuration with auth status
```

### API Scanning

```
OpenAPI (Swagger) scan:
# Based on OpenAPI specification
docker run -v $(pwd):/zap/wrk/:rw -t zaproxy/zap-stable \
  zap-api-scan.py \
  -t https://app.example.com/openapi.json \
  -f openapi \
  -c zap.conf \
  -r api_scan_report.html \
  -z "-configfile /zap/wrk/zap_options.conf"

# With bearer authentication
docker run -v $(pwd):/zap/wrk/:rw -t zaproxy/zap-stable \
  zap-api-scan.py \
  -t https://app.example.com/openapi.json \
  -f openapi \
  -O "bearer=eyJhbGciOiJIUzI1NiIs..." \
  -r api_report.html

GraphQL scan:
# Based on GraphQL schema introspection
docker run -v $(pwd):/zap/wrk/:rw -t zaproxy/zap-stable \
  zap-api-scan.py \
  -t https://api.example.com/graphql \
  -f graphql \
  -r graphql_report.html

# With GraphQL query file
docker run -v $(pwd):/zap/wrk/:rw -t zaproxy/zap-stable \
  zap-api-scan.py \
  -t https://api.example.com/graphql \
  -f graphql \
  -g graphql_queries.txt \
  -r graphql_report.html

API-specific checks:
├── Broken object level authorization (BOLA / IDOR)
├── Broken authentication
├── Broken function level authorization
├── Mass assignment
├── Excessive data exposure
├── Rate limiting check
├── Security misconfiguration
├── Injection (SQL, NoSQL, command)
└── Improper assets management (non-production endpoints)

OpenAPI configuration file (zap.conf):
# Scan strength per rule
rule 40012 strength=HIGH  # Reflected XSS
rule 40018 strength=HIGH  # SQL Injection
rule 40034 strength=LOW   # Command injection (careful)
rule 90019 strength=HIGH  # Server-side code injection

# Threshold per rule
rule 40012 threshold=LOW
rule 40018 threshold=LOW
rule 40034 threshold=HIGH
rule 90019 threshold=LOW

# Environment-specific exclusions
EXCLUDE https://api.example.com/admin
EXCLUDE https://api.example.com/internal
```

## Burp Suite Deep Dive

### Scanning Configuration

```
Burp Suite scan configuration:

Scope definition:
├── Target Scope tab → Add URL prefix or regex
├── Use advanced scope control for complex applications
├── Exclude out-of-scope items: logout, health, analytics
├── Scope coloring: in-scope blue, out-of-scope gray
└── Force use of scope for all automated operations

Crawl configuration:
├── Crawl Strategy: Fast (shallow) vs Thorough (deep)
├── Maximum crawl depth: 5-10 for standard app
├── Crawl in-scope only (uncheck include subdomains)
├── Application login: configure via recorded login macro
├── Form handling: auto-submit with configured values
└── Crawl limits: 1000 pages or 60 minutes

Audit configuration:
├── Audit speed: Fast (key checks only) vs Thorough (all checks)
├── Audit optimization: Faster (fewer checks) vs More thorough
├── Active scan insertion points: parameters, headers, body, cookies
├── Audit checks: select per vulnerability category
└── Attack surface: parameters + headers + body + URL + cookies

Scan launch:
├── New Scan → Crawl and Audit
├── URL: https://staging.example.com
├── Use login macro for authenticated scanning
├── Resource pool: limit to 5 concurrent requests
└── Schedule: immediate or time-windowed

Login macro recording:
1. Proxy → Record login sequence
2. Switch to Login Macro configuration
3. Select recorded items → Create macro
4. Set credential insertion points
5. Define logged-in / logged-out indicators
6. Test macro execution
7. Configure pre-scan login + periodic re-login
```

### Extensions for DAST

```
Essential Burp extensions:

1. Autorize (auth bypass detection)
├── Install: BApp Store → Autorize
├── Configuration: provide low-privilege cookie
├── Replays all requests with low-priv user
├── Detects: IDOR, privilege escalation, missing auth checks
├── Color coding: red (bypass detected), green (blocked)
└── Best for: discovering authorization flaws automatically

2. Backslash Powered Scanner
├── Install: BApp Store → Backslash Powered Scanner
├── Advanced SQL injection detection
├── Handles: complex filtering, WAF bypasses
├── Combines taint analysis with fuzzing
└── Best for: deep SQL injection testing

3. JSON Web Tokens
├── Install: BApp Store → JSON Web Tokens
├── JWT analysis and manipulation
├── Tests: algorithm confusion, key confusion, signature bypass
├── Decodes: header, payload, signature
└── Best for: applications using JWT auth

4. ActiveScan++
├── Install: BApp Store → ActiveScan++
├── Enhanced active scan checks
├── Covers: additional injection points and payloads
├── Integrates with main audit engine
└── Best for: extending default scan coverage

5. Param Miner
├── Install: BApp Store → Param Miner
├── Discover hidden parameters
├── Brute-force common parameter names
├── Cache/web cache deception detection
└── Best for: finding undocumented parameters

6. Collaborator Everywhere
├── Install: BApp Store → Collaborator Everywhere
├── Inject Collaborator payloads into all requests
├── Detects: SSRF, XXE, blind XSS, blind SQLi
├── Out-of-band vulnerability detection
└── Best for: finding blind vulnerabilities

7. Headers Analyzer
├── Install: BApp Store → Headers Analyzer
├── Security header analysis (HSTS, CSP, etc.)
├── Grades header implementations
├── Provides fix recommendations
└── Best for: security posture assessment
```

### Manual Testing Workflow

```
Professional manual DAST workflow:

Phase 1: Reconnaissance
├── Browse application manually (map features and flows)
├── Use Burp Proxy to capture all traffic
├── Review site map for all discovered endpoints
├── Note: authentication mechanism, user roles, sensitive operations
└── Identify: file upload, search, API endpoints, admin panels

Phase 2: Targeted Testing
├── SQL injection: parameter fuzzing with common payloads
├── XSS: reflected (URL params), stored (form inputs), DOM (client-side sinks)
├── IDOR: modify object IDs in URL and body
├── SSRF: test external URLs in parameters
├── XXE: upload XML with external entity
├── Command injection: OS commands in input fields
├── File upload: upload malicious files, check path traversal
└── Rate limiting: send burst requests, check for blocking

Phase 3: Authentication Testing
├── Weak password policy: test common passwords
├── Credential stuffing: enumerate valid usernames
├── Session management: token predictability, expiration
├── MFA bypass: skip MFA step, reuse old tokens
├── Password reset: token leakage, account enumeration
└── Remember-me: persistent token security

Phase 4: Business Logic Testing
├── Workflow bypass: skip steps in multi-step flows
├── Coupon/pricing manipulation: modify prices in request
├── Race condition: send concurrent requests
├── Integer overflow: large values in numeric fields
├── Mass assignment: extra fields in JSON body
└── Replay attack: replay captured requests

Phase 5: Reporting
├── Document each finding with steps-to-reproduce
├── Include: request/response evidence, screenshots
├── Severity rating (CVSS 3.1 scoring)
├── Remediation recommendation per finding
└── Executive summary for management
```

## Scan Scoping

### Scope Definition

```
In-scope patterns:
├── First-party domains only: app.example.com, api.example.com
├── Subdomains: *.example.com (if applicable)
├── CDN: only if hosting first-party content
├── API: /api/v1/*, /graphql, /rest/*
└── Admin: /admin/* (with authorization)

Out-of-scope patterns (exclude from active scan):
├── Third-party domains: analytics, CDN, social login
├── Authentication providers: login.example.com (SSO provider)
├── Logout: /logout, /signout (destroys session)
├── High-volume: /reports, /export, /batch
├── Destructive: /api/v1/delete*, /api/v1/bulk-update
├── Health: /health, /ready, /metrics
├── File upload: /upload (test manually)
└── Payment: /checkout, /payment (test manually with dummy data)

Scope definition in ZAP:
# URL regex patterns for inclusion
INCLUDE https://app\.example\.com/.*
INCLUDE https://api\.example\.com/v2/.*

# URL regex for exclusion
EXCLUDE https://app\.example\.com/logout
EXCLUDE https://app\.example\.com/health
EXCLUDE https://app\.example\.com/analytics
EXCLUDE .*\.js$
EXCLUDE .*\.css$
EXCLUDE .*\.png$

Scope definition in Burp:
├── Target → Scope → Include in Scope
├── Protocol: HTTPS
├── Host or IP range: *.example.com
├── Port: 443
├── File: /*.api, /*.html
└── Use advanced scope control for negative lookaheads
```

### Risk Assessment for Scoping

```
Risk-based scan intensity:

Low-risk endpoint (public information):
├── Scan intensity: Baseline
├── Alert threshold: HIGH (only report critical findings)
├── Active checks: None (passive only)
├── Examples: landing pages, documentation, status pages
└── False positive tolerance: Very low

Medium-risk endpoint (authenticated user content):
├── Scan intensity: Standard
├── Alert threshold: MEDIUM
├── Active checks: All common vulnerability checks
├── Examples: user profiles, dashboards, settings
└── False positive tolerance: Low

High-risk endpoint (sensitive operations):
├── Scan intensity: Thorough
├── Alert threshold: LOW (maximum detection)
├── Active checks: All checks including aggressive fuzzing
├── Examples: payment, admin, authentication, file operations
└── False positive tolerance: Higher (better to catch than miss)

Environment-based scan intensity:

Production:
├── Scan type: Baseline only (passive checks)
├── Active scanning: Never on production
├── Validate: no payloads, no aggressive crawling
├── Frequency: weekly
└── Risk: Information disclosure, header analysis only

Staging/QA:
├── Scan type: Full active scan
├── Active scanning: All checks enabled
├── Validate: destructive operations excluded
├── Frequency: per deployment, weekly full scan
└── Risk: Low (non-production data)

Development:
├── Scan type: Quick active scan
├── Active scanning: All checks, shorter duration
├── Validate: focus on new features' endpoints
├── Frequency: per feature branch deploy
└── Risk: Very low (development data)
```

## Execution Patterns

### CI/CD Integration

```
GitHub Action for ZAP baseline (production-safe):
name: zap-baseline-scan
on:
  schedule:
    - cron: '0 6 * * 1'  # Every Monday

jobs:
  zap-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: ZAP Baseline Scan
        uses: zaproxy/action-baseline@v0.12
        with:
          target: 'https://staging.example.com'
          token: ${{ secrets.ZAP_API_KEY }}
          rules_file_name: 'zap.conf'
          allow_issue_writing: false
          fail_action: true
          cmd_options: '-j -a'

      - name: Upload ZAP Report
        uses: actions/upload-artifact@v4
        with:
          name: zap-report
          path: zap_report.html

GitHub Action for ZAP full scan (staging only):
name: zap-full-scan
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  zap-scan:
    runs-on: ubuntu-latest
    services:
      # Start application for scanning
      app:
        image: myapp:latest
        ports:
          - 3000:3000
        env:
          NODE_ENV: test
          DATABASE_URL: postgres://postgres:test@db:5432/test

      db:
        image: postgres:15
        env:
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: test
          POSTGRES_DB: test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v4

      - name: Run ZAP Full Scan
        uses: zaproxy/action-full-scan@v0.12
        with:
          target: 'http://localhost:3000'
          rules_file_name: 'zap.conf'
          cmd_options: '-a -j'
          fail_action: true
          allow_issue_writing: true
          issue_title: 'ZAP Scan Results'
          token: ${{ secrets.GITHUB_TOKEN }}

      - name: Upload ZAP Report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: zap-report-${{ github.run_id }}
          path: zap_report.html

GitLab CI for ZAP:
zap-dast:
  stage: dast
  image: zaproxy/zap-stable
  variables:
    TARGET_URL: $CI_ENVIRONMENT_URL
  script:
    - mkdir -p /zap/wrk/
    - zap-full-scan.py -t $TARGET_URL -r /zap/wrk/report.html -z "-config rules.dontDeleteCookies=true"
  artifacts:
    paths:
      - report.html
    reports:
      dast: gl-dast-report.json
  only:
    - main
  except:
    variables:
      - $CI_ENVIRONMENT_URL == null
```

### Scan Scheduling

```
Recommended scan schedule:

Daily:
├── Type: SAST full scan (nightly)
├── Purpose: catch all code-level vulnerabilities
├── Duration: 15-60 min
└── Report: email digest to security team

Per deployment:
├── Type: ZAP baseline (passive + spider)
├── Purpose: check runtime config, new endpoints
├── Duration: 15-30 min
├── Gating: report only, non-blocking
└── Report: PR comment with finding summary

Weekly:
├── Type: ZAP full active scan (staging)
├── Purpose: comprehensive runtime vulnerability detection
├── Duration: 2-4 hours
├── Gating: block if CRITICAL or HIGH found
└── Report: full HTML report, SARIF upload

Monthly:
├── Type: Burp Suite professional scan (staging)
├── Purpose: deep analysis, business logic tests
├── Duration: 4-8 hours
├── Gating: manual review required
└── Report: executive summary + technical findings

Quarterly:
├── Type: External penetration test
├── Purpose: compliance, third-party validation
├── Duration: 1-2 weeks
├── Gating: all findings fixed before next quarter
└── Report: compliance-ready full assessment report

Per-release:
├── Type: Full SAST + full DAST
├── Purpose: release gate security validation
├── Gating: block on CRITICAL, HIGH, MEDIUM
└── Pass criteria: 0 CRITICAL, 0 HIGH, 0 MEDIUM, comments resolved
```

## Reporting and Findings Management

### Report Structure

```
Standard DAST finding format:

Finding ID: DAST-20250315-042
Severity: HIGH (CVSS 7.5)
CWE: CWE-89 (SQL Injection)
OWASP Top 10: A03:2021 (Injection)
Status: Open (0 days)

Description:
User input in the "id" parameter is passed directly to a SQL query
without sanitization or parameterization.

Endpoint: GET https://staging.example.com/api/users?id=123
Parameter: id (in URL query string)
Attack payload: 1' OR '1'='1
Evidence: Error message reveals SQL syntax: "unterminated quoted string"

Step to reproduce:
1. Send request: GET /api/users?id=1' OR '1'='1
2. Observe 500 response with SQL error in response body
3. Confirm in database logs: SELECT * FROM users WHERE id = 1' OR '1'='1

Impact:
An attacker can extract, modify, or delete database records.
All users' data in the users table is at risk.

Affected component: src/controllers/users.js:142
Fix recommendation:
Use parameterized queries:
  db.query('SELECT * FROM users WHERE id = $1', [id])
Instead of:
  db.query(`SELECT * FROM users WHERE id = ${id}`)

References:
- Remediation guide: /docs/sql-injection-fix.md
- CWE-89: https://cwe.mitre.org/data/definitions/89.html
- OWASP SQL Injection: https://owasp.org/www-community/attacks/SQL_Injection

Evidence:
Request:
GET /api/users?id=1' OR '1'='1 HTTP/1.1
Host: staging.example.com
Authorization: Bearer eyJhbGciOi...

Response:
HTTP/1.1 500 Internal Server Error
Content-Type: application/json
{
  "error": "unterminated quoted string at or near \"'1' or '1'='1\""
}
```

### CVSS 3.1 Scoring

```
CVSS 3.1 scoring for DAST findings:

Base Score:
├── Attack Vector (AV): Network (0.85) | Adjacent (0.62) | Local (0.55)
├── Attack Complexity (AC): Low (0.77) | High (0.44)
├── Privileges Required (PR): None (0.85) | Low (0.62) | High (0.27)
├── User Interaction (UI): None (0.85) | Required (0.62)
├── Scope (S): Unchanged | Changed
├── Confidentiality (C): None | Low (0.22) | High (0.56)
├── Integrity (I): None | Low (0.22) | High (0.56)
└── Availability (A): None | Low (0.22) | High (0.56)

Severity ranges:
├── CRITICAL: 9.0 - 10.0
├── HIGH: 7.0 - 8.9
├── MEDIUM: 4.0 - 6.9
├── LOW: 0.1 - 3.9
└── NONE: 0.0

Example scoring:
SQL injection with database access:
├── AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H
├── Score: 9.8 (CRITICAL)
└── Rationale: Network-accessible, low complexity, no privileges required

Reflected XSS:
├── AV:N/AC:L/PR:N/UI:R/S:U/C:L/I:L/A:N
├── Score: 5.4 (MEDIUM)
└── Rationale: Requires user interaction, limited impact

Missing security header (HSTS):
├── AV:N/AC:L/PR:N/UI:N/S:U/C:L/I:N/A:N
├── Score: 5.3 (MEDIUM)
└── Rationale: No direct exploit, increases attack surface
```

### Fix and Verification

```
Remediation workflow:

1. Triage (within severity SLA)
├── Security team reviews finding
├── Confirms exploitability
├── Assigns to development team
└── Creates fix ticket with evidence

2. Fix (within SLA)
├── Developer implements fix
├── Follows remediation guidance from report
├── Applies fix to all affected endpoints (variant analysis)
└── Commits with reference to finding ID

3. Verification (within verification SLA)
├── Security team retests the endpoint
├── SAST scan confirms code-level fix
├── DAST rescan confirms no longer exploitable
├── Variant analysis: check similar code patterns
└── Closes finding with verification evidence

4. Regression
├── Add test case for the vulnerability
├── SAST rule to catch new instances
├── Add integration test proving exploit no longer works
└── Monitor for recurrence in future scans

Verification steps:
1. Re-run DAST on the specific endpoint
2. Try the exact payload that previously triggered
3. Try variations (bypass techniques)
4. Verify fix in SAST (new scan on fixed code)
5. Re-open if any variation succeeds
```

## SAST and DAST Correlation

### Finding Correlation Strategy

```
Correlation workflow:

Step 1: Map SAST findings to endpoints
├── SAST finds: SQL injection in src/api/users.js:142
├── Map to endpoint: GET /api/users
├── Source variable: req.query.id
├── Sink function: db.query()
└── Confidence: HIGH (precise line reference)

Step 2: Verify with DAST
├── DAST scans: GET /api/users?id=...
├── Tests: SQL injection payloads on id parameter
├── Confirms: exploitability yes/no
├── If yes: automatically link findings, increase priority
└── If no: mark SAST finding for manual review (may need specific payload)

Step 3: Prioritize correlated findings
├── SAST + DAST confirmed: HIGHEST priority (code + runtime confirmed)
├── SAST only: MEDIUM priority (potential issue, needs manual verify)
├── DAST only: MEDIUM priority (runtime issue, needs code analysis)
└── Neither: LOW priority (false positive or mitigated by other controls)

Correlation matrix:

SAST Finding        │ DAST Endpoint       │ Correlation
───────────────────────────────────────────────────────────────
SQL injection       │ GET /api/users?id=  │ Direct (same parameter)
SQL injection       │ POST /api/search    │ Related (same vulnerability type)
XSS                 │ GET /search?q=      │ Direct
Command injection   │ GET /api/exec?cmd=  │ Direct (HIGH severity)
Path traversal      │ GET /files?path=    │ Direct
SSRF                │ POST /api/proxy     │ Direct
Hardcoded secret    │ N/A                 │ SAST only (no runtime equivalent)
Insecure config     │ All endpoints       │ DAST only (config-level issue)

Unified priority score:
priority = (sast_severity_weight × 2 if daist_confirmed)
severity_weight: CRITICAL=4, HIGH=3, MEDIUM=2, LOW=1
multiplier: confirmed_by_dast=2, sast_only=1, dast_only=1
```

### Cross-Tool Reports

```
Unified security dashboard metrics:

Current period:
├── Total findings (open): 42
├── SAST only: 28 (67%)
├── DAST only: 10 (24%)
├── Both (correlated): 4 (9%)
├── Critical findings: 2
├── High findings: 8
├── Medium findings: 18
├── Low findings: 14

Trend (week-over-week):
├── Total findings: +3 (+7%)
├── New this week: 8
├── Fixed this week: 5
├── Finding age (median): 12 days
├── SLA compliance (critical): 100%
├── SLA compliance (high): 75%
├── SLA compliance (medium): 60%
└── SLA compliance (low): 40%

OWASP Top 10 distribution:
├── A01:2021 (Broken Access Control): 12 findings
├── A02:2021 (Cryptographic Failures): 3 findings
├── A03:2021 (Injection): 8 findings
├── A04:2021 (Insecure Design): 1 finding
├── A05:2021 (Security Misconfiguration): 6 findings
├── A06:2021 (Vulnerable Components): 2 findings
├── A07:2021 (Identification Failures): 4 findings
├── A08:2021 (Integrity Failures): 1 finding
├── A09:2021 (Logging Failures): 3 findings
└── A10:2021 (SSRF): 2 findings

Top affected endpoints:
├── GET /api/users/: 8 findings (SQLi, IDOR, XSS)
├── POST /api/login: 5 findings (auth bypass, rate limiting)
├── GET /api/search: 4 findings (XSS, injection)
└── POST /api/upload: 2 findings (path traversal, XXE)
```

## Conclusion

Effective DAST implementation requires:

1. **Scope carefully**: Define in-scope and out-of-scope endpoints precisely. Never run active scans on production.
2. **Authenticate properly**: Configure login flows. Test authentication before full scan. Handle session expiry.
3. **Use the right tool**: ZAP for CI/CD automation and cost-sensitive teams. Burp Suite for professional manual testing.
4. **Schedule wisely**: Baseline per deployment, full scan weekly, deep scan monthly, pentest quarterly.
5. **Correlate with SAST**: Prioritize findings confirmed by both tools. Use SAST for code-level, DAST for runtime confirmation.
6. **Score with CVSS**: Consistent severity scoring across all findings. Use CVSS 3.1 for standardized measurement.
7. **Track remediation**: SLA per severity, verification step, regression prevention.
8. **Report clearly**: Steps to reproduce, evidence, fix recommendation, compliance mapping.
9. **Trend over time**: Track finding volume, MTTR, SLA compliance, OWASP distribution.
10. **Iterate**: Refine rules, expand scope, improve authentication, reduce false positives.

## References

- OWASP ZAP Documentation: `zaproxy.org/docs`
- ZAP Automation Framework: `zaproxy.org/docs/automation`
- Burp Suite Documentation: `portswigger.net/burp/documentation`
- OWASP Testing Guide: `owasp.org/www-project-web-security-testing-guide`
- OWASP WSTG Checklist: `owasp.org/www-project-web-security-testing-guide/stable/checklists`
- CVSS v3.1 Calculator: `first.org/cvss/calculator/3.1`
- GitHub Code Scanning: `docs.github.com/code-security/code-scanning`
- GitLab DAST: `docs.gitlab.com/ee/user/application_security/dast`
- NIST SP 800-115: Technical Guide to Information Security Testing: `csrc.nist.gov/publications/detail/sp/800-115/final`
