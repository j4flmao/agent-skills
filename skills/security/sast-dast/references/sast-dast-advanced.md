# SAST/DAST Advanced Topics

## Introduction
Advanced SAST/DAST covers custom rule writing, interprocedural analysis, API-specific DAST, false positive management at scale, correlation between SAST and DAST findings, and integrating security testing into the full SDLC.

## Custom SAST Rules
### Semgrep Custom Rule Example
```yaml
# Detect unsafe redirect based on user input
rules:
  - id: open-redirect
    languages: [javascript, typescript, python]
    message: "Open redirect: user-controlled URL in redirect"
    severity: WARNING
    patterns:
      - pattern-either:
          - pattern: |
              redirect(request.$_GET["$URL"])
          - pattern: |
              redirect(request.$_GET.get("$URL"))
          - pattern: |
              redirect(request.$_POST["$URL"])
      - metavariable-regex:
          metavariable: $URL
          regex: "^(next|redirect|url|return|to)$"
    metadata:
      cwe: CWE-601
      owasp: A1
```

### CodeQL Custom Query Example
```ql
import javascript

from HTTP::ServerRedirectExpr redirect
where redirect.getLocation().getFile().getRelativePath().matches("%server%")
select redirect, "Open redirect vulnerability"
```

## Advanced DAST: API-Specific Scanning
- GraphQL introspection: discover all queries/mutations
- Rate limiting testing: automated rate limit bypass attempts
- JWT token manipulation: alg=none, expired tokens, weak signing keys
- API fuzzing: send unexpected data types to all endpoints
- BOLA/BFLA testing: automated IDOR checks across all object references
- Mass assignment: testing extra fields in request payload

## IAST (Interactive Application Security Testing)
IAST combines SAST and DAST by instrumenting the application at runtime:
- Agent deployed alongside the application
- Monitors actual code paths during functional/automated tests
- Correlates code paths with runtime data flow
- Very low false positive rate
- Can identify exact vulnerable code line
- Requires test coverage to trigger code paths (like DAST)

## Key Points
- Custom SAST rules (Semgrep, CodeQL) find project-specific vulnerability patterns
- IAST bridges SAST and DAST with runtime instrumentation and very low FP rate
- API-specific DAST testing focuses on GraphQL introspection, BOLA, rate limiting
- False positive management requires baseline, deduplication, and prioritization
- SAST + DAST + IAST correlation creates a unified vulnerability management view
- Tools: Semgrep, CodeQL, ZAP, Burp, Contrast (IAST), HCL AppScan
