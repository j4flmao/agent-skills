# SAST Tool Selection and Integration

## Overview

Static Application Security Testing (SAST) analyzes source code for security vulnerabilities without executing the application. This reference covers SAST tool selection criteria, integration patterns for CI/CD pipelines, custom rule writing for Semgrep and CodeQL, false positive management, and quality gate configuration.

## SAST Tool Landscape

### Tool Categories

```
Category 1: Pattern-based SAST
├── Tools: Semgrep, grep-based scanners
├── Mechanism: AST-based pattern matching with metavariables
├── Speed: Fast (<5min for 100K lines)
├── Custom rules: Easy (YAML for Semgrep)
├── False positive rate: Low-Medium (depending on rule quality)
├── Language coverage: 20+ languages (Semgrep)
├── Best for: Custom rule writing, project-specific patterns
└── Cost: Free (Semgrep is open-source)

Category 2: Compilation-based SAST (Interprocedural)
├── Tools: CodeQL, Checkmarx, Fortify
├── Mechanism: Builds intermediate representation (IR) / database
├── Speed: Slow (5-30min for database build + query execution)
├── Custom rules: Complex (needs query language knowledge)
├── False positive rate: Low (CodeQL), Medium (Checkmarx/Fortify)
├── Language coverage: 7-20+ languages
├── Best for: Deep data-flow analysis, variant analysis
└── Cost: Free for public repos (CodeQL), Enterprise pricing (others)

Category 3: Quality-focused SAST
├── Tools: SonarQube, Codacy, CodeClimate
├── Mechanism: Abstract syntax tree + data-flow + metrics
├── Speed: Moderate (15-60min for full scan)
├── Custom rules: Limited (SonarQube plugin API)
├── False positive rate: Medium
├── Language coverage: 30+ languages (SonarQube)
├── Best for: Quality gates, technical debt tracking, PR decoration
└── Cost: Free (SonarQube Community), paid tiers for advanced features

Category 4: Platform SAST
├── Tools: Snyk Code, GitLab SAST, GitHub Code Scanning
├── Mechanism: Multiple engines under unified platform
├── Speed: Varies by engine
├── Custom rules: Limited platform-level, full engine-level
├── False positive rate: Low (Snyk), Medium (GitLab/GitHub defaults)
├── Language coverage: 10+ languages
├── Best for: Unified vulnerability management across code + deps + containers
└── Cost: Free tier, paid for advanced features
```

### Tool Evaluation Criteria

```
Criteria for SAST tool selection:

1. Language support
├── Does it cover all languages in the codebase?
├── How well does it support each language (depth of analysis)?
├── Does it handle the framework (Spring, Django, React, Express)?
├── Does it support transpiled languages (TypeScript, Kotlin)?
└── Does it handle polyglot projects?

2. Accuracy
├── True positive rate: what % of findings are real vulnerabilities?
├── False positive rate: what % require manual dismissal?
├── How many vulnerabilities per 1000 lines of code?
├── Does it find known CVEs relevant to the codebase?
└── Can it distinguish between exploitable and theoretical issues?

3. Speed
├── Time for PR diff scan (target <5min)
├── Time for full scan (target <60min for 500K lines)
├── Parallel scanning capability
├── Incremental/diff-aware scanning support
└── Resource consumption (CPU, memory)

4. Customization
├── Can you write custom rules?
├── How complex is the rule language?
├── Can you suppress false positives granularly?
├── Can you adjust severity per rule?
└── Is there a rule testing framework?

5. Integration
├── CI/CD platform support (GitHub Actions, GitLab CI, Jenkins, CircleCI)
├── IDE plugin (VS Code, JetBrains, Eclipse)
├── PR decoration (inline comments on findings)
├── Issue tracker integration (Jira, GitHub Issues, GitLab)
└── API for custom integrations

6. Governance
├── Reporting and dashboards
├── Trend tracking over time
├── Compliance reporting (OWASP Top 10, CWE, PCI DSS)
├── Role-based access control
└── Audit logs
```

## Semgrep Deep Dive

### Installation and Setup

```
Installation methods:
├── pip: pip install semgrep
├── brew: brew install semgrep
├── Docker: docker pull semgrep/semgrep
├── GitHub Action: semgrep/semgrep-action@v2
├── GitLab CI: semgrep/semgrep image
└── VS Code: semgrep.vscode-semgrep extension

Initial setup:
# Create rule directory structure
mkdir -p .semgrep/rules/{security,correctness,best-practice}
mkdir -p .semgrep/rules/security/tests

# Create Semgrep config file
cat > .semgrep.yml << 'EOF'
rules:
  - path: .semgrep/rules/security/
  - path: .semgrep/rules/correctness/
  - path: .semgrep/rules/best-practice/
EOF

# Enable community rules
semgrep --config "p/default" --config "p/security-audit" .
```

### Rule Writing Guide

```
Semgrep rule structure:
---
rules:
  - id: my-custom-rule
    severity: ERROR  # ERROR | WARN | INFO
    languages:       # python | javascript | typescript | java | go | ...
      - python
    message: >
      Description of the vulnerability and how to fix it.
      Include CWE reference and remediation guidance.
    patterns:
      - pattern: dangerous_function($ARG)
      - pattern-not: dangerous_function(safe_value(...))
      - pattern-inside: |
          def $FUNC(...):
            ...
    metadata:
      cwe: "CWE-123"
      owasp: "A01:2021"
      category: security
      technology: django
      likelihood: MEDIUM
      impact: HIGH
      confidence: HIGH
    fix: safe_function($ARG)
    paths:
      include:
        - "*.py"
      exclude:
        - "tests/*"
        - "migrations/*"

Key operators:
├── pattern: exact match
├── pattern-not: exclude matching code
├── pattern-either: OR of multiple patterns
├── pattern-inside: match must be inside this pattern
├── pattern-not-inside: match must not be inside this pattern
├── pattern-regex: regex fallback (avoid when possible)
├── metavariable-regex: constrain metavariable value
├── metavariable-comparison: compare metavariable values
├── metavariable-pattern: nested pattern match on metavariable
├── focus-metavariable: highlight a specific part of match
└── requires: experimental dependencies between rules

Pattern syntax:
├── $VAR: metavariable (matches any expression)
├── ...: ellipsis (matches any sequence of arguments/statements)
├── "..." : string ellipsis (matches any string literal)
├── [ ... ]: list ellipsis (matches any list contents)
└── ${{VAR}}: typed metavariable for specific AST nodes
```

### Common Rule Examples

```
Python: Detect SQL injection

rules:
  - id: python-sql-injection
    severity: ERROR
    languages:
      - python
    message: >
      User input passed directly to raw SQL query.
      Use parameterized queries or an ORM instead.
    patterns:
      - pattern: |
          cursor.execute(f"...{...}...")
      - pattern: |
          cursor.execute("..." % ($X))
      - pattern-not: |
          cursor.execute("...", $ARGS)
    metadata:
      cwe: "CWE-89"
      owasp: "A03:2021"
    paths:
      exclude:
        - "tests/*"

JavaScript: Detect command injection

rules:
  - id: js-command-injection
    severity: ERROR
    languages:
      - javascript
      - typescript
    message: >
      User input passed to exec/spawn without sanitization.
      Use execFile or validate input against allowlist.
    patterns:
      - pattern-either:
          - pattern: exec($INPUT)
          - pattern: spawn($INPUT, ...)
          - pattern: execSync($INPUT)
          - pattern: spawnSync($INPUT, ...)
      - pattern-not: exec("...")
      - pattern-not: spawn("...", ...)
    metadata:
      cwe: "CWE-78"
      owasp: "A03:2021"

Python: Detect hardcoded secrets

rules:
  - id: python-hardcoded-password
    severity: ERROR
    languages:
      - python
    message: >
      Hardcoded password detected.
      Store secrets in environment variables or a vault.
    patterns:
      - pattern-either:
          - pattern: password = "..."
          - pattern: passwd = "..."
          - pattern: PASSWORD = "..."
          - pattern: secret = "..."
          - pattern: SECRET_KEY = "..."
      - pattern-not-regex: ".*test.*|.*example.*|.*placeholder.*"
    severity: ERROR
    metadata:
      cwe: "CWE-798"
      owasp: "A07:2021"

Java: Detect path traversal

rules:
  - id: java-path-traversal
    severity: ERROR
    languages:
      - java
    message: >
      User input used in file path construction.
      Validate and sanitize the input with a path allowlist.
    patterns:
      - pattern: |
          new File($USER_INPUT)
      - pattern: |
          new java.io.File($USER_INPUT)
      - pattern-not: |
          new File("...")
    metadata:
      cwe: "CWE-22"
      owasp: "A01:2021"

Go: Detect SSRF

rules:
  - id: go-ssrf
    severity: WARN
    languages:
      - go
    message: >
      User input used in HTTP request URL.
      Validate URL against an allowlist of permitted domains.
    patterns:
      - pattern-either:
          - pattern: http.Get($URL)
          - pattern: http.Post($URL, ...)
          - pattern: http.PostForm($URL, ...)
          - pattern: http.Head($URL)
          - pattern: client.Get($URL)
          - pattern: client.Post($URL, ...)
      - pattern-not: http.Get("...")
    metadata:
      cwe: "CWE-918"
      owasp: "A10:2021"
```

### Rule Testing

```
Test file structure:
.semgrep/rules/security/
├── sql-injection.yaml         # Rule definition
├── tests/
│   ├── sql-injection.py       # Test cases
│   ├── sql-injection.js       # Cross-language test
│   └── sql-injection.java     # Cross-language test

Test annotation format:
# ruleid: rule-id       → line MUST be flagged by rule
# ruleid:  [rule-id]    → alternate format
# ok: rule-id           → line MUST NOT be flagged by rule
# todoruleid: rule-id   → expected but not yet working (known issue)
# todook: rule-id       → same for ok

Example test file (sql-injection/tests/sql-injection.py):
# ruleid: python-sql-injection
cursor.execute(f"SELECT * FROM users WHERE id = {user_input}")

# ruleid: python-sql-injection
cursor.execute("SELECT * FROM users WHERE id = %s" % user_input)

# ok: python-sql-injection
cursor.execute("SELECT * FROM users WHERE id = %s", [user_id])

# ok: python-sql-injection
User.objects.filter(id=user_input)

Running tests:
semgrep --test .semgrep/rules/security/

Expected output:
┌─────────────────────────────┐
│ 1 files checked             │
│ 2 rules ran                 │
│ ✓ 2 passed                  │
│ 0 failed                    │
│ 0 findings (expected)       │
│ 0 findings (unexpected)     │
│ 0 findings (missing)        │
└─────────────────────────────┘

CI integration:
semgrep --test .semgrep/rules/ --strict
# --strict: fail on unexpected findings (test drift)
```

### CI Integration Patterns

```
GitHub Action for Semgrep:
name: semgrep-sast
on:
  pull_request:
    branches: [main]
  push:
    branches: [main]
  schedule:
    - cron: '0 6 * * *'

jobs:
  semgrep:
    runs-on: ubuntu-latest
    container:
      image: semgrep/semgrep
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Run Semgrep (PR diff scan)
        if: github.event_name == 'pull_request'
        run: |
          semgrep --config .semgrep.yml \
            --baseline-commit origin/main \
            --error \
            --sarif > semgrep-results.sarif
        env:
          SEMGREP_APP_TOKEN: ${{ secrets.SEMGREP_APP_TOKEN }}

      - name: Run Semgrep (full scan)
        if: github.event_name != 'pull_request'
        run: |
          semgrep --config .semgrep.yml \
            --sarif > semgrep-results.sarif

      - name: Upload SARIF to GitHub
        uses: github/codeql-action/upload-sarif@v3
        with:
          sarif_file: semgrep-results.sarif
          category: semgrep

GitLab CI for Semgrep:
semgrep-sast:
  stage: test
  image: semgrep/semgrep
  variables:
    SEMGREP_APP_TOKEN: $SEMGREP_APP_TOKEN
  script:
    - if [ "$CI_MERGE_REQUEST_IID" ]; then
        BASE_COMMIT=$CI_MERGE_REQUEST_DIFF_BASE_SHA;
        semgrep --config .semgrep.yml --baseline-commit $BASE_COMMIT --error;
      else
        semgrep --config .semgrep.yml --error;
      fi
  artifacts:
    reports:
      sast: gl-sast-report.json
  only:
    - merge_requests
    - main

CircleCI for Semgrep:
version: 2.1
jobs:
  semgrep-sast:
    docker:
      - image: semgrep/semgrep
    steps:
      - checkout:
          fetch-depth: 0
      - run:
          name: Run Semgrep
          command: |
            BASE_COMMIT=$(git merge-base HEAD origin/main)
            semgrep --config .semgrep.yml \
              --baseline-commit $BASE_COMMIT \
              --error
  sast-blocking:
    requires:
      - semgrep-sast
```

## CodeQL Deep Dive

### Database Build

```
CodeQL database build process:

GitHub Actions (recommended):
- name: Initialize CodeQL
  uses: github/codeql-action/init@v3
  with:
    languages: python, javascript
    queries: security-and-quality
    config-file: .github/codeql/codeql-config.yml

- name: Autobuild
  uses: github/codeql-action/autobuild@v3

- name: Perform CodeQL Analysis
  uses: github/codeql-action/analyze@v3

Manual build:
# Python
codeql database create codeqldb --language=python

# JavaScript/TypeScript
codeql database create codeqldb --language=javascript

# Java
codeql database create codeqldb --language=java --command="mvn clean package"

# Go
codeql database create codeqldb --language=go

# C/C++
codeql database create codeqldb --language=cpp --command="make"

# C#
codeql database create codeqldb --language=csharp --command="dotnet build"

# Ruby
codeql database create codeqldb --language=ruby

# Rust (experimental)
codeql database create codeqldb --language=rust

CodeQL database analyze:
codeql database analyze codeqldb --format=sarif-latest --output=results.sarif

CodeQL database upgrade (when CodeQL version changes):
codeql database upgrade codeqldb
```

### Custom Query Writing

```
QL query structure:
/**
 * @name SQL injection
 * @description User input flows into a SQL query without sanitization
 * @kind path-problem
 * @problem.severity error
 * @precision high
 * @id python/sql-injection
 * @tags security
 *       external/cwe/cwe-089
 */

import python
import semmle.python.security.strings.SqlInjection

from SqlInjectionFlowConfig cfg, SqlInjectionFlow::PathNode source,
     SqlInjectionFlow::PathNode sink
where cfg.hasFlowPath(source, sink)
select sink.getNode(), source, sink, "SQL injection: $@ flows to query",
  source.getNode(), "this user input"

Key QL concepts:
├── Classes: represent AST nodes (Function, Class, Expr, Stmt)
├── Predicates: logic conditions (exists, not, forall, forex)
├── Modules: organization units (import/export)
├── Types: primitive (int, string, boolean) and complex (class)
├── Data flow: DataFlow::Node, DataFlow::Configuration
├── Taint tracking: TaintTracking::Configuration
├── Paths: PathNode, PathGraph for multi-step flows
├── Local sources: relevant for function-level analysis
├── Global sources: cross-function and cross-file analysis
└── Sanitizers: predicates that stop data flow

Data flow configuration:
class MyFlowConfiguration extends TaintTracking::Configuration {
  MyFlowConfiguration() { this = "MyFlowConfiguration" }

  override predicate isSource(DataFlow::Node source) {
    source instanceof RemoteFlowSource
  }

  override predicate isSink(DataFlow::Node sink) {
    sink instanceof SqlExecutionFunction
  }

  override predicate isSanitizer(DataFlow::Node sanitizer) {
    sanitizer instanceof SqlSanitizerFunction
  }

  override predicate isAdditionalFlowStep(DataFlow::Node n1, DataFlow::Node n2) {
    // Custom data flow steps (e.g., through specific wrappers)
    n1.(CustomWrapper).getOutput() = n2
  }
}

Importing standard query packs:
├── security-and-quality: broad coverage
├── security-extended: additional security queries
├── security-experimental: experimental queries (higher FP)
└── custom path: path to local query directory

Configuration file (.github/codeql/codeql-config.yml):
name: "CodeQL Security Configuration"
queries:
  - uses: security-and-quality
  - uses: security-extended
  - uses: ./custom-queries
paths:
  - src
paths-ignore:
  - tests
  - node_modules
  - dist
  - build
query-filters:
  - exclude:
      id: js/same-html-origin-check
  - exclude:
      id: py/function-with-side-effects
```

### CI Integration

```
GitHub Actions for CodeQL:
name: codeql-analysis
on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:
  analyze:
    name: Analyze
    runs-on: ubuntu-latest
    permissions:
      security-events: write
      actions: read
      contents: read
    strategy:
      fail-fast: false
      matrix:
        language: [python, javascript, java, go]

    steps:
      - uses: actions/checkout@v4

      - uses: github/codeql-action/init@v3
        with:
          languages: ${{ matrix.language }}
          queries: security-and-quality
          config-file: .github/codeql/codeql-config.yml

      - uses: github/codeql-action/autobuild@v3

      - uses: github/codeql-action/analyze@v3

CircleCI for CodeQL:
version: 2.1
jobs:
  codeql:
    docker:
      - image: mcr.microsoft.com/codeql:latest
    steps:
      - checkout
      - run:
          name: Create CodeQL database
          command: |
            codeql database create codeqldb \
              --language=javascript \
              --source-root=.
      - run:
          name: Analyze CodeQL database
          command: |
            codeql database analyze codeqldb \
              --format=sarif-latest \
              --output=results.sarif
      - store_artifacts:
          path: results.sarif
```

## SonarQube Deep Dive

### Quality Gate Configuration

```
Quality gate thresholds (recommended):

New code (PR):
├── Coverage on new code: >= 80%
├── Duplicated lines on new code: <= 3%
├── Security Hotspots Reviewed: 100%
├── Maintainability Rating on new code: A or B
├── Reliability Rating on new code: A
└── Security Rating on new code: A

Overall codebase:
├── Coverage: >= 60% (if existing baseline)
├── Duplicated lines: <= 5%
├── Maintainability Rating: A or B
├── Reliability Rating: A or B
├── Security Rating: A
├── Security Hotspots Reviewed: >= 80%
└── Blocking issues: 0

SonarQube configuration file (sonar-project.properties):
sonar.projectKey=my-project
sonar.projectName=My Project
sonar.sources=src
sonar.tests=tests
sonar.exclusions=**/node_modules/**,**/dist/**,**/build/**
sonar.test.inclusions=**/*test*,**/*spec*
sonar.coverage.exclusions=**/*.config.js,**/*.mock.*
sonar.javascript.lcov.reportPaths=coverage/lcov.info
sonar.python.coverage.reportPaths=coverage/coverage.xml
sonar.qualitygate.wait=true
sonar.qualitygate.timeout=300

CI integration:
# GitHub Action
- name: SonarQube Scan
  uses: sonarsource/sonarqube-scan-action@v2
  with:
    args: >
      -Dsonar.qualitygate.wait=true
      -Dsonar.qualitygate.timeout=300
  env:
    SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}
    SONAR_HOST_URL: ${{ secrets.SONAR_HOST_URL }}
```

## False Positive Management

### Triage Process

```
Automated triage:
├── Deduplicate: merge same finding across SAST tools
├── Group: cluster similar findings by CWE/category
├── Priority: compute risk score (severity × confidence × exploitability)
└── Route: assign to team based on code ownership

Manual triage workflow:
1. Security team reviews flagged finding
2. Determine if it's a true vulnerability
3. Classify as:
   ├── TRUE-POSITIVE: real vulnerability, create fix ticket
   ├── FALSE-POSITIVE: not a vulnerability, suppress with reason
   ├── WONT-FIX: real issue but accepted risk (approval required)
   └── REVIEW-LATER: needs further investigation, snooze 30 days

Suppression format (.semgrep/false-positives.yml):
version: 1
suppressions:
  - rule: python-sql-injection
    path: src/utils/legacy_query_builder.py
    reason: "Legacy code, planned for refactoring in Q2 2025"
    expires: "2025-06-30"
    approved_by: "security-team-lead"

  - rule: js-hardcoded-password
    path: tests/integration/test_auth.py
    reason: "Test credentials in test fixtures only"
    expires: null  # No expiry for permanent suppression
    approved_by: "security-team-lead"

  - pattern: password = "..."
    path: src/examples/*
    reason: "Example code in documentation"
    expires: null

Best practices:
├── Every suppression must have a documented reason
├── Suppressions should expire (default 90 days)
├── Security team must approve all suppressions
├── Audit suppressed findings quarterly
├── Track suppression count over time (should decrease)
└── WONT-FIX requires management sign-off
```

### Quality Gate Configuration

```
Gate thresholds based on risk profile:

Standard risk (most applications):
├── ERROR findings: 0 (block)
├── WARN findings: must not increase from baseline
├── HIGH severity: 0 (block)
├── MEDIUM severity: <10% increase from baseline
├── Security hotspots: 100% reviewed
└── Coverage on new code: >= 70%

High risk (financial, healthcare, critical infra):
├── ERROR findings: 0 (block)
├── WARN findings: 0 (block)
├── HIGH severity: 0 (block)
├── MEDIUM severity: 0 (block)
├── LOW severity: <5% increase from baseline
├── Security hotspots: 100% reviewed
└── Coverage on new code: >= 85%

Low risk (internal tools, prototypes):
├── ERROR findings: 0 (block)
├── HIGH severity: 0 (block)
├── MEDIUM severity: must not increase from baseline
├── Security hotspots: 100% reviewed (no automatic block)
└── Coverage on new code: >= 50%

Gate implementation (GitHub Action):
- name: Check SAST Gate
  run: |
    # Parse Semgrep results
    errors=$(jq '.results | map(select(.extra.severity == "ERROR")) | length' semgrep-results.json)
    if [ "$errors" -gt "0" ]; then
      echo "ERROR: $errors ERROR findings in SAST scan"
      exit 1
    fi
    echo "SAST gate passed: 0 ERROR findings"

- name: SonarQube Quality Gate
  uses: sonarsource/sonarqube-quality-gate-action@v1
  timeout-minutes: 5
  with:
    scanMetadataReportFile: .scannerwork/report-task.txt
```

## Reporting and Dashboards

### SAST Metrics

```
Key metrics to track:

Volume metrics:
├── Total findings: per scan, by severity
├── New findings: per PR, per day, per week
├── Closed findings: fixed, suppressed, wont-fix
├── Finding density: findings per 1000 lines of code
└── Rule coverage: % of enabled rules that fire

Quality metrics:
├── False positive rate: fp / (tp + fp) × 100%
├── True positive rate: tp / (tp + fp) × 100%
├── Mean time to remediate (MTTR): by severity
├── Finding age distribution: 0-7d, 7-30d, 30-90d, 90d+
├── Remediation SLA compliance: % fixed within SLA
└── Suppression ratio: % of findings suppressed

Trend metrics:
├── Week-over-week finding count change
├── Month-over-month MTTR change
├── Quarter-over-quarter error rate change
└── Year-over-year overall security rating

Reporting formats:
├── Weekly: team-level summary (Slack or email)
├── Monthly: organization-level trend report
├── Quarterly: compliance report (OWASP Top 10 mapping)
└── Per-release: release gate pass/fail status
```

## Multi-Tool Correlation

### Combining SAST Results

```
Unified finding format:
{
  "id": "sast-20250315-001",
  "source": "semgrep",           # semgrep | codeql | sonarqube
  "rule": "python-sql-injection",
  "cwe": "CWE-89",
  "owasp": "A03:2021",
  "severity": "error",
  "confidence": "high",          # high | medium | low
  "file": "src/api/users.py",
  "line": 142,
  "message": "User input flows to raw SQL query",
  "sink": "cursor.execute()",
  "source_var": "request.data['user_id']",
  "flow": [
    {"file": "src/api/users.py", "line": 140, "code": "user_id = request.data['user_id']"},
    {"file": "src/api/users.py", "line": 141, "code": "query = f'SELECT * FROM users WHERE id = {user_id}'"},
    {"file": "src/api/users.py", "line": 142, "code": "cursor.execute(query)"}
  ],
  "status": "open",             # open | fixed | fp | wont-fix
  "fix_sla": "2025-03-17T15:00:00Z",
  "assigned_to": "team-api"
}

Deduplication strategy:
├── Same rule + same file + same line + same message = same finding
├── Same CWE + same file + same line = related finding
├── Tools may report same issue with different precision
├── Pick the most precise tool's version as canonical
└── Link all related findings in the unified record

Priority scoring:
score = severity_weight × confidence_weight × exploitability
severity_weight: ERROR=4, WARN=2, INFO=1
confidence_weight: HIGH=3, MEDIUM=2, LOW=1
exploitability: 1 (SAST) × 1.5 (if confirmed by DAST)

Triage queue order:
├── Score >= 12: Immediate (24h SLA)
├── Score 8-11: Sprint (72h SLA)
├── Score 4-7: Backlog (2 sprints)
└── Score < 4: Icebox
```

## Conclusion

Effective SAST implementation requires:

1. Choose the right tool for your context: Semgrep for custom rules and speed, CodeQL for deep analysis, SonarQube for quality gates
2. Write custom rules for your framework and business logic
3. Test rules with positive and negative test cases
4. Integrate into CI: diff-aware for PRs, full scan nightly
5. Set quality gates: block on ERROR, trend WARN
6. Manage false positives with version-controlled, expiring suppressions
7. Correlate with DAST findings for higher confidence
8. Track metrics: finding volume, FP rate, MTTR, SLA compliance
9. Generate regular reports and review trends
10. Iterate: improve rules, reduce FPs, expand coverage

## References

- Semgrep Documentation: `semgrep.dev/docs`
- Semgrep Rule Registry: `semgrep.dev/explore`
- CodeQL Documentation: `codeql.github.com/docs`
- CodeQL Query Writing Guide: `codeql.github.com/docs/writing-codeql-queries`
- SonarQube Documentation: `docs.sonarsource.com/sonarqube`
- OWASP Source Code Analysis Tools: `owasp.org/www-community/Source_Code_Analysis_Tools`
- GitHub Code Scanning: `docs.github.com/code-security/code-scanning`
- GitLab SAST: `docs.gitlab.com/ee/user/application_security/sast`
