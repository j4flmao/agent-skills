# SAST Practices

## Semgrep

### Rule Writing
```yaml
rules:
- id: sql-injection-django
  patterns:
  - pattern: |
      User.objects.raw(...)
  - pattern-not: |
      User.objects.raw("..." ...)
  message: "Detected raw SQL query — use ORM instead"
  severity: ERROR
  languages: [python]
```
Rule anatomy: `id` (unique), `patterns` (match logic), `message` (finding description), `severity` (ERROR/WARN/INFO), `languages` (target language). Test rules with `semgrep --test`.

### Built-in Rule Packs
- `p/security-audit`: general security rules
- `p/owasp-top-ten`: OWASP Top 10 coverage
- `p/command-injection`: shell injection patterns
- `p/backticks`: unsafe shell execution
- `p/secrets`: credential patterns in code

### CI Integration
GitHub Actions:
```yaml
- uses: semgrep/semgrep-action@v1
  with:
    config: p/security-audit
    audit_on: push
    generate_config: true
```
Diff-aware: `--baseline-commit` for PR diffs only.

### Rule Testing
Create `test.py` with positive and negative test cases. Annotate: `ruleid: <rule-id>` for true positive, `ok: <rule-id>` for true negative. Run `semgrep --test` to validate.

## SonarQube

### Quality Gate
Conditions: no new blocker issues, <5% duplicated lines on new code, >80% coverage on new code, no security hotspots. Gate status: Passed (green), Failed (red), Warn (yellow).

### Profile Configuration
Activate rules per language. Override severity per project. Deactivate rules that cause excessive false positives. Rule sets: SonarWay (default), SonarWay Recommended (stricter), Security Hotspot rules.

### CI Integration
```yaml
- name: SonarQube Scan
  uses: sonarsource/sonarqube-scan-action@master
  with:
    args: >
      -Dsonar.qualitygate.wait=true
```

## CodeQL

### Query Types
Standard: `codeql-suites/security-and-quality.qls`. Custom: write QL queries for project-specific patterns. Variant analysis: find all instances of a vulnerability pattern across the codebase.

### CI Integration
```yaml
- uses: github/codeql-action/analyze@v3
  with:
    queries: security-and-quality
```
