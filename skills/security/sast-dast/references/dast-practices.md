# DAST Practices

## OWASP ZAP

### Scanning Profiles
Automated Scan: spider (AJAX spider for JS-heavy apps), passive scan (no modification, safe), active scan (injects payloads). API scan: OpenAPI/Swagger import, GraphQL introspection, SOAP WSDL.

### Authenticated Scanning
Context-based: define URL regex for login page, form-based auth with credentials, session token extraction. Bearer token: set header `Authorization: Bearer <token>` in environment. Session management: cookie-based, header-based, OAuth token refresh.

### CI Pipeline
```yaml
- name: ZAP Scan
  uses: zaproxy/action-full-scan@v0
  with:
    target: ${{ env.STAGING_URL }}
    token: ${{ secrets.ZAP_API_KEY }}
    rules_file_name: .zap/rules.tsv
```
Exclude patterns: `/logout`, `/reset-password`, bulk delete endpoints.

### Alert Management
Risk: High (exploitable), Medium (potential risk), Low (information leak), Informational (best practice). Confidence: High (confirmed), Medium (strong indicator), Low (weak indicator). False positive: suppress with reason and evidence.

## Burp Suite

### Target Scope
In-scope: project-specific domains and subdomains. Out-of-scope: third-party CDN, analytics, auth providers. Attack surface: all HTTP/HTTPS endpoints including API versions, WebSocket endpoints.

### Scanning Phases
Crawl: discover all endpoints, parameters, static files. Audit: automated vulnerability scanning with active checks. Intruder: targeted fuzzing for race conditions, parameter tampering, rate limit bypass. Repeater: manual request modification and replay.

### Extensions
- Autorize: auth bypass detection
- JSON Web Tokens: JWT manipulation
- Collaborator: out-of-band detection
- ActiveScan++: enhanced scan checks

## Authentication Scanning

### Session Management
Login sequence: capture login request/response, extract token/cookie, maintain session across requests. Session expiry: detect 401/redirect, re-authenticate, resume scan. Multi-role: scan as anonymous, user, admin to test authorization gaps.

### API Authentication Scanning
Test: missing auth header, expired token, malformed token, token from different user, weak signing algorithm. OAuth: missing PKCE, open redirect in callback, token leakage in referrer.

## CI Pipeline Integration

### Pipeline Stages
- Build → Deploy to staging → DAST scan → Gate check → Deploy to production
- SAST runs first (fast), DAST runs after deployment (slow)
- Full DAST: nightly schedule, 2-4 hours. Quick DAST: on PR deploy, 15 min (crawl + passive scan only)

### Results Gate
Block deployment on: high/medium findings from DAST. Report only: low/informational findings. Fail on: regression from baseline.
