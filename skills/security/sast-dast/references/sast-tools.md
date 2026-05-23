# SAST Tools

## Semgrep

### Installation
```bash
pip install semgrep
# Verify
semgrep --version
```

### Rule Writing
Semgrep rules use YAML with a pattern-matching syntax:

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

Rule anatomy: `id` (unique kebab-case identifier), `patterns` (match logic with sub-patterns for inclusion, exclusion, and condition), `message` (finding description shown to developers), `severity` (ERROR/WARN/INFO), `languages` (target language array). Test rules with `semgrep --test`.

### Advanced Pattern Features
Semgrep supports metavariables (`$X`, `$EXPR`), ellipsis (`...`) for matching any sequence, and deep expression matching. Use `pattern-inside` to constrain matches to specific contexts (e.g., Flask routes), and `pattern-not-inside` to exclude false positives. For inter-file analysis, use `pattern-sources`, `pattern-sinks`, and `pattern-sanitizers` to model data flow.

### Built-in Rule Packs
- `p/security-audit`: general security rules covering OWASP Top 10
- `p/owasp-top-ten`: explicit OWASP Top 10 2021 coverage
- `p/command-injection`: shell injection patterns (all languages)
- `p/backticks`: unsafe shell execution via backtick operator
- `p/secrets`: credential patterns in code (API keys, tokens, passwords)
- `p/sql-injection`: SQL injection patterns per ORM/framework
- `p/xss`: cross-site scripting patterns (frontend frameworks)
- `p/jwt`: JWT security misconfiguration patterns

### CI Integration (GitHub Actions)
```yaml
- uses: semgrep/semgrep-action@v1
  with:
    config: p/security-audit
    audit_on: push
    generate_config: true
```
Diff-aware: `--baseline-commit` for PR diffs only. Full scan on main branch.

### Rule Testing
Create `test.py` with positive and negative test cases:
```python
# ruleid: sql-injection-django
User.objects.raw("SELECT * FROM users WHERE id = " + user_input)

# ok: sql-injection-django
User.objects.raw("SELECT * FROM users WHERE id = %s", [user_id])
```
Annotate: `ruleid: <rule-id>` for true positive, `ok: <rule-id>` for true negative. Run `semgrep --test` to validate.

## CodeQL

### Installation
```bash
# GitHub CLI extension
gh extension install github/gh-codeql
gh codeql version
```

### Query Types
Standard query suites: `codeql-suites/security-and-quality.qls`, `codeql-suites/security-extended.qls`. Custom queries: write QL for project-specific patterns. QL is a declarative, object-oriented query language with classes, predicates, and modules optimized for code analysis.

### Custom Query Example
```ql
import java
import semmle.code.java.dataflow.DataFlow
import semmle.code.java.security.QueryInjection

from Command injection
where injection.getAFlowSource().(RemoteFlowSource).isSource()
select injection, "This command execution is potentially vulnerable to injection."
```

### CI Integration (GitHub Actions)
```yaml
- uses: github/codeql-action/analyze@v3
  with:
    queries: security-and-quality
```
Free for public repos, included in GitHub Advanced Security for private repos.

## SonarQube

### Installation
```bash
docker run -d --name sonarqube \
  -p 9000:9000 \
  sonarqube:community-latest
```

### Quality Gate Configuration
Conditions: no new blocker issues, <5% duplicated lines on new code, >80% coverage on new code, no security hotspots. Gate status: Passed (green), Failed (red), Warn (yellow). Gate is evaluated per PR and can block the merge.

### Profile Configuration
Activate rules per language. Override severity per project. Deactivate rules that cause excessive false positives. Rule sets: SonarWay (default, balanced), SonarWay Recommended (stricter, for security-sensitive projects), Security Hotspot rules (requires manual review). Custom rules can be written using the SonarQube plugin API for Java-based analysis.

### CI Integration
```yaml
- name: SonarQube Scan
  uses: sonarsource/sonarqube-scan-action@master
  with:
    args: >
      -Dsonar.qualitygate.wait=true
```

### Metrics Tracked
| Metric | Description | Threshold |
|---|---|---|
| Reliability | Bugs and crash-causing issues | A grade (0 bugs) |
| Security | Vulnerability count | A grade (0 vulns) |
| Maintainability | Code smell remediation effort | A grade (<5% tech debt) |
| Coverage | Line and branch coverage by tests | >80% on new code |
| Duplications | Duplicated lines | <5% on new code |
| Security Hotspots | Needs manual security review | Review all |

## Snyk Code

### Installation
```bash
npm install -g snyk
snyk auth
```

### Configuration
```yaml
# .snyk file
exclude:
  - "tests/**"
  - "**/vendor/**"
patch:
  - SNYK-JS-LODASH-567746:
      - patches/lodash.patch
```

### CI Integration
```yaml
- uses: snyk/actions/security-code@master
  with:
    args: --severity-threshold=high
  env:
    SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
```

## False Positive Management

### Triage Workflow
1. Automated deduplication groups similar findings by file, line, and pattern.
2. Security team reviews grouped findings in a weekly triage meeting.
3. Each finding is classified: FP (false positive), WONT-FIX (acknowledged, low risk), ACCEPTED-RISK (risk accepted by security team), or ACTIONABLE (requires fix).
4. Decisions stored in `.sast-fps.yml` per project with reason and expiry date.

### FP Suppression File Format
```yaml
# .sast-fps.yml
version: 1
suppressions:
  - rule: sql-injection-django
    file: src/utils/export.py
    reason: "Query uses parameterized input — Semgrep can't detect the sanitization wrapper"
    expires: "2026-12-31"
    reviewer: "security-team"
  - rule: hardcoded-api-key
    file: tests/test_config.py
    reason: "Test API key, not production — excluded in test config"
    expires: null  # permanent
```

### Quarterly Review
Review all suppressed rules quarterly. Remove suppressions where the FP reason no longer applies (code changes, tool updates). Flag suppressions older than 1 year for mandatory re-review. Generate a report of active suppressions by team and rule.

## CI Integration

### SAST Pipeline Stages
```
PR Created → Lint → TypeCheck → Unit Tests → SAST (diff-aware) → Security Review
Main Branch → Full SAST Scan → Quality Gate → Artifact Build
```

### Quality Gate Policy
```
Gate: Block on ERROR
- Zero ERROR severity findings → PASS
- Zero new CRITICAL code smells → PASS
- Coverage on new code > 80% → PASS
- No security hotspots on new code → PASS
```
All conditions must pass for the gate to succeed.

### Scan Storage
Store all scan results for 90 days minimum. Results include: finding ID, rule ID, file path, line number, severity, timestamp, commit SHA, branch name, and CI run ID. Export results to a security dashboard (Splunk, ELK, or custom) for trend analysis.
