# DAST Tools

## OWASP ZAP

### Installation
```bash
# Docker (recommended for CI)
docker pull ghcr.io/zaproxy/zaproxy:stable

# Desktop
# Download from https://www.zaproxy.org/download/
```

### Scanning Profiles
**Automated Scan**: spider (AJAX spider for JS-heavy apps) → passive scan (no modification, safe) → active scan (injects payloads). **API scan**: OpenAPI/Swagger import, GraphQL introspection, SOAP WSDL. **Baseline scan**: passive-only, safe for production environments. **Full scan**: complete active scan with all rules, best for staging.

### Context Configuration
```yaml
# .zap/context.yaml
env:
  contexts:
    - name: "app-staging"
      urls:
        - "https://staging.example.com"
      includePaths:
        - "https://staging.example.com/.*"
      excludePaths:
        - "https://staging.example.com/logout"
        - "https://staging.example.com/reset-password"
      authentication:
        method: "form"
        loginUrl: "https://staging.example.com/login"
        loginData: "username={%username%}&password={%password%}"
      sessionManagement:
        method: "cookie"
      users:
        - name: "scanner-user"
          credentials:
            username: "scanner@example.com"
            password: "${ZAP_SCAN_PASSWORD}"
```

### Authenticated Scanning
Context-based authentication: define URL regex for login page, form-based auth with credentials, session token extraction. Bearer token: set header `Authorization: Bearer <token>` in environment. Session management: cookie-based, header-based, OAuth token refresh. For OAuth flows, use ZAP's script-based authentication with a JavaScript or Python authentication script that handles the OAuth handshake.

### CI Pipeline
```yaml
- name: ZAP Full Scan
  uses: zaproxy/action-full-scan@v0
  with:
    target: ${{ env.STAGING_URL }}
    token: ${{ secrets.ZAP_API_KEY }}
    rules_file_name: .zap/rules.tsv
    cmd_options: "-a -j"
```
Exclude patterns: `/logout`, `/reset-password`, bulk delete endpoints, mass-upload endpoints.

### Alert Management
Risk levels: High (exploitable vulnerability), Medium (potential risk requiring investigation), Low (information leak), Informational (best practice suggestion). Confidence: High (confirmed with evidence), Medium (strong indicator, likely valid), Low (weak indicator, likely FP). False positive: suppress with reason and evidence in `.zap/false-positives.tsv`.

## Burp Suite

### Installation
Download from https://portswigger.net/burp. Community Edition is free with core features. Professional Edition adds automated scanning, advanced scanner, and CI integration.

### Target Scope Configuration
In-scope: project-specific domains and subdomains. Out-of-scope: third-party CDN (cdn.example.com), analytics (analytics.google.com), auth providers (auth0.com, login.example.com), monitoring endpoints. Attack surface: all HTTP/HTTPS endpoints including API versions (v1, v2), WebSocket endpoints (wss://), GraphQL endpoints, and file upload endpoints.

### Scanning Phases
**Crawl**: discover all endpoints, parameters, static files, API routes. Uses the Burp Spider and the embedded browser for JavaScript-heavy single-page applications. **Audit**: automated vulnerability scanning with active checks for SQLi, XSS, command injection, SSRF, XXE, directory traversal, and file inclusion. **Intruder**: targeted fuzzing for race conditions, parameter tampering, rate limit bypass, and parameter pollution. Supports payload positions, payload sets, and attack types (Sniper, Battering ram, Pitchfork, Cluster bomb). **Repeater**: manual request modification and replay for deep investigation of specific endpoints.

### Extensions (BApp Store)
- **Autorize**: automated authorization bypass detection — tests each endpoint with different user roles
- **JSON Web Tokens**: JWT manipulation, signature verification, algorithm confusion attacks
- **Collaborator Everywhere**: out-of-band (OOB) detection via Burp Collaborator
- **ActiveScan++**: enhanced active scan checks for deeper coverage
- **403 Bypasser**: automated 403 response bypass techniques
- **Turbo Intruder**: high-speed custom fuzzing for race conditions and brute force
- **Backslash Powered Scanner**: advanced detection for non-standard injection contexts

## Acunetix

### Installation
Commercial product available as on-premises appliance, cloud service, or Docker container. Requires license key.

### Key Features
- Deep scanning for over 7000 vulnerabilities
- Multi-step form authentication with macro recording
- Sequential crawling for complex single-page applications
- Integration with Jira, GitHub, GitLab, and Azure DevOps
- PCI DSS and OWASP Top 10 compliance reports
- Scheduled scanning with automatic retry on failure

### Configuration Example
```
Target URL: https://staging.example.com
Scan Type: Full Scan with DeepScan
Authentication: Form-based with macro
Login Macro: Recorded sequence of: navigate to /login → fill form → submit → verify dashboard
Excluded: /logout, /reset-password, /admin/delete-*
Schedule: Daily at 2:00 AM
Notifications: Email on High severity findings, Slack on scan completion
```

## Authentication Scanning

### Session Management Strategies
**Cookie-based**: capture login request/response, extract session cookie, maintain session across all scan requests. **Bearer token**: set Authorization header with token, refresh on 401 response. **OAuth 2.0**: script-based authentication handling the full OAuth flow: redirect → login → consent → token exchange → API access.

### Session Handling Workflow
1. Login sequence is recorded or scripted: send credentials → receive session token
2. Session token is automatically injected into all scan requests
3. Session expiry is detected (401 response, redirect to login page)
4. Re-authentication is triggered automatically
5. Scan resumes from where it was paused

### Multi-Role Scanning
Test the application from multiple privilege levels:
- **Anonymous**: endpoints that should be accessible without authentication
- **Regular User**: standard user with basic permissions
- **Admin User**: administrative user with elevated permissions
- **Privilege Escalation**: attempt to access admin endpoints with user token

Each role gets its own authentication context. Compare results across roles to detect authorization gaps.

## CI Pipeline Integration

### Pipeline Stages
```
Build → Deploy to Staging → DAST Scan → Gate Check → Deploy to Production
```
SAST runs first (fast, minutes), DAST runs after deployment (slow, 15min-4hrs). Full DAST: nightly schedule, 2-4 hours. Quick DAST: on PR deploy, 15 min (crawl + passive scan only).

### Results Gate
```
Block deployment on:
- Any HIGH severity DAST finding
- Any MEDIUM severity DAST finding

Report only (no block):
- LOW severity findings
- INFORMATIONAL findings

Fail condition:
- Any regression from baseline (finding that was not present in last scan)
```

### Scan Artifacts Storage
Store DAST results for 90 days minimum: scan ID, timestamp, target URL, scan profile, finding count by severity, and raw scan report (HTML or JSON). Archive reports to S3 or equivalent with lifecycle policy. Compare scans over time to track vulnerability remediation velocity.

## Correlation Between SAST and DAST

### Finding Mapping
Map SAST findings to affected DAST endpoints by analyzing the code path from the SAST finding to the exposed endpoint. A SAST finding in a controller maps directly to a DAST endpoint. Prioritize findings that appear in both SAST and DAST (confirmed exploitable). Track finding age across both tools for remediation SLA enforcement.

### Correlation Matrix
| Finding | SAST (code) | DAST (runtime) | Priority |
|---|---|---|---|
| SQL injection in /api/users | src/controllers/users.js:45 | POST /api/users — confirmed SQL error | CRITICAL |
| XSS in search field | src/views/search.ejs:12 | GET /search?q=<script> — reflected | HIGH |
| Hardcoded API key | src/config/keys.js:5 | N/A (no endpoint mapping) | MEDIUM |

### Weekly Trend Report
Generate a weekly report with: new findings by severity, remediated findings, aging findings (>30 days old), SAST-only findings (code issues), DAST-only findings (runtime issues), and correlated findings (confirmed exploitable). Share with the engineering team during the weekly security review.
