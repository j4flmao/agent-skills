# SAST Rule Customization

## Custom Rule Examples (Semgrep)
`yaml
rules:
- id: hardcoded-api-key
  patterns:
    - pattern-either:
      - pattern: ' = "..."'
      - pattern: ' = "..." | where  =~ /(api|secret|token|key)/i'
  message: "Hardcoded API key detected"
  severity: ERROR
  languages: [python, javascript, go, java]
`

## Rule Tuning Strategy
- Start with default rule packs
- Monitor false positive rate
- Suppress known false positives with inline comments
- Create organization-specific rules for custom frameworks
- Review and update rules quarterly

## Language-Specific Rules
| Language | Common Rules |
|----------|-------------|
| Python | eval usage, SQL injection, command injection |
| JavaScript | XSS, prototype pollution, insecure random |
| Java | XXE, deserialization, path traversal |
| Go | SQL injection, command injection, hardcoded secrets |
| TypeScript | XSS, CSRF, insecure JWT handling |
