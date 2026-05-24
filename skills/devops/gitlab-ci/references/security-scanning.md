# GitLab CI Security Scanning

## Overview

GitLab provides integrated security scanning capabilities through Auto DevOps templates and dedicated jobs. These include SAST, DAST, secret detection, dependency scanning, container scanning, and license compliance.

## Security Scanning Architecture

```
                     ┌─────────────────┐
                     │    Pipeline     │
                     └────────┬────────┘
                              │
              ┌───────────────┼───────────────┐
              │               │               │
         ┌────▼────┐   ┌─────▼─────┐   ┌─────▼────┐
         │  SAST   │   │Secret     │   │Dependency│
         │(Semgrep)│   │Detection   │   │Scanning  │
         │         │   │(gitleaks)  │   │(Gemnasium)│
         └─────────┘   └───────────┘   └──────────┘
              │               │               │
         ┌────▼────┐   ┌─────▼─────┐   ┌─────▼────┐
         │Container│   │   DAST    │   │License   │
         │Scanning │   │ (Browser) │   │Compliance │
         │(Trivy)  │   │           │   │           │
         └─────────┘   └───────────┘   └──────────┘
```

## SAST (Static Application Security Testing)

### Basic SAST Setup
```yaml
include:
  - template: Jobs/SAST.gitlab-ci.yml

sast:
  stage: security
  variables:
    SAST_EXCLUDED_PATHS: node_modules, tests, vendor, .git
    SAST_BANDIT_EXCLUDED_PATHS: tests, .venv
    SEARCH_DEPTH: 10
  allow_failure: true  # Don't block pipeline on findings
```

### SAST with Custom Rules
```yaml
include:
  - template: Jobs/SAST.gitlab-ci.yml

sast:
  variables:
    SAST_DISABLE: "false"
    SAST_EXPERIMENTAL: "true"
    SAST_ANALYZER_IMAGE_TAG: "latest"
    # Custom Semgrep rules
    SAST_SEMGREP_CUSTOM_RULES: |
      rules:
        - id: no-hardcoded-tokens
          pattern: |
            $TOKEN = "..."
          message: "Potential hardcoded token"
          severity: ERROR
        - id: avoid-eval
          pattern: eval(...)
          message: "Avoid using eval()"
          severity: ERROR

# Or reference custom rules file
sast-custom:
  stage: security
  image: registry.gitlab.com/security-products/semgrep:latest
  script:
    - semgrep --config=rules/custom-rules.yml --output=sast-report.json --json .
  artifacts:
    reports:
      sast: sast-report.json
```

### SAST Configuration Per Language
```yaml
# Node.js/TypeScript
sast:
  variables:
    SAST_EXCLUDED_PATHS: node_modules, coverage, dist
    SAST_JAVA_OPTS: "-Xmx2g"

# Python
sast:
  variables:
    SAST_BANDIT_CONFIDENCE_LEVEL: HIGH
    SAST_FLAWFINDER_LEVEL: 3

# Go
sast:
  variables:
    SAST_GOSEC_LEVEL: high

# Java
sast:
  variables:
    SAST_SEMGREP_MODE: analysis
    MAVEN_CLI_OPTS: "-DskipTests"
```

### Custom SAST Analyzer
```yaml
sast-custom-rules:
  stage: security
  variables:
    SECURE_LOG_LEVEL: info
  artifacts:
    reports:
      sast: gl-sast-report.json
    paths:
      - gl-sast-report.json
```

## Secret Detection

### Basic Setup
```yaml
include:
  - template: Jobs/Secret-Detection.gitlab-ci.yml

secret_detection:
  stage: security
  variables:
    SECRET_DETECTION_HISTORIC_SCAN: "false"
    SECRET_DETECTION_EXCLUDED_PATHS: node_modules, vendor, .git
```

### Full History Scan
```yaml
secret-detection-full:
  stage: security
  variables:
    SECRET_DETECTION_HISTORIC_SCAN: "true"
    GIT_DEPTH: 0  # Fetch full history
  script:
    - git fetch --unshallow
    - /analyzer run
  artifacts:
    reports:
      secret_detection: gl-secret-detection-report.json
```

### Custom Regex Patterns
```yaml
# .gitlab/secret_detection_rules.yml
rules:
  - id: custom-api-key
    name: Custom API Key
    description: Detect custom company API keys
    pattern: (?i)(?:company)_(?:api|secret)_key['\"\s]*[:=][\s]*['\"]([a-zA-Z0-9]{32,})['\"]
    score: 90
    key: custom_api_key

# .gitlab-ci.yml
secret_detection:
  variables:
    SECRET_DETECTION_RULES_PATH: .gitlab/secret_detection_rules.yml
```

## Dependency Scanning

### Basic Setup
```yaml
include:
  - template: Jobs/Dependency-Scanning.gitlab-ci.yml

dependency_scanning:
  stage: security
  variables:
    DS_DEFAULT_ANALYZERS: "gemnasium"
    DS_EXCLUDED_PATHS: "spec, test, tests, tmp"
    DS_JAVA_OPTS: "-Xmx2g"
  allow_failure: true
```

### Dependency Scanning for Monorepos
```yaml
dependency_scanning:
  stage: security
  variables:
    DS_INCLUDE_DEV_DEPENDENCIES: "true"
    DS_REMEDIATE: "false"
  script:
    - |
      # Scan multiple directories
      for dir in packages/*; do
        if [ -f "$dir/package.json" ]; then
          echo "Scanning $dir..."
          DS_DEFAULT_ANALYZERS="gemnasium-python"
          cd $dir
          /analyzer run
          cd $CI_PROJECT_DIR
        fi
      done
  artifacts:
    reports:
      dependency_scanning: gl-dependency-scanning-report.json
```

### Gradle/Maven Dependency Scanning
```yaml
dependency_scanning_java:
  stage: security
  image: registry.gitlab.com/security-products/gemnasium-maven:latest
  variables:
    DS_JAVA_OPTS: "-Xmx2g"
    MAVEN_CLI_OPTS: "--batch-mode"
  script:
    - cd backend/
    - /analyzer run
  artifacts:
    reports:
      dependency_scanning: gl-dependency-scanning-report.json
```

## Container Scanning

### Basic Setup
```yaml
include:
  - template: Jobs/Container-Scanning.gitlab-ci.yml

container_scanning:
  stage: security
  variables:
    CI_APPLICATION_REPOSITORY: $CI_REGISTRY_IMAGE
    CI_APPLICATION_TAG: $CI_COMMIT_SHORT_SHA
    CS_DEFAULT_BRANCH_IMAGE: $CI_REGISTRY_IMAGE:latest
  dependencies:
    - build-image  # Must run after image is built
```

### Custom Container Scanner (Trivy)
```yaml
container-scanning-trivy:
  stage: security
  image:
    name: docker.io/aquasec/trivy:0.50
    entrypoint: [""]
  variables:
    TRIVY_USERNAME: $CI_REGISTRY_USER
    TRIVY_PASSWORD: $CI_REGISTRY_PASSWORD
  script:
    - trivy image
        --severity CRITICAL,HIGH
        --ignore-unfixed
        --format sarif
        --output gl-container-scanning-report.sarif
        $CI_REGISTRY_IMAGE:$CI_COMMIT_SHORT_SHA
  artifacts:
    reports:
      container_scanning: gl-container-scanning-report.sarif
  dependencies:
    - build-image
```

## DAST (Dynamic Application Security Testing)

### Basic DAST
```yaml
include:
  - template: Jobs/DAST.gitlab-ci.yml

dast:
  stage: security
  variables:
    DAST_WEBSITE: https://staging.example.com
    DAST_BROWSER_SCAN: "true"
    DAST_SPIDER_MINS: 5
    DAST_PATHS_FILE: paths.txt
```

### DAST with Authentication
```yaml
dast-authenticated:
  stage: security
  variables:
    DAST_WEBSITE: https://staging.example.com
    DAST_AUTH_URL: https://staging.example.com/login
    DAST_AUTH_USERNAME: test-user
    DAST_AUTH_PASSWORD: $DAST_TEST_PASSWORD
    DAST_AUTH_USERNAME_FIELD: session_key
    DAST_AUTH_PASSWORD_FIELD: session_password
    DAST_AUTH_SUBMIT_FIELD: commit
    DAST_AUTH_VERIFICATION_LOGIN_FORM: true
    DAST_AUTH_VERIFICATION_URL: https://staging.example.com/dashboard
```

### DAST API Scanning
```yaml
dast-api:
  stage: security
  variables:
    DAST_API_SPECIFICATION: https://staging.example.com/api/docs/v3/openapi.json
    DAST_API_HOST_URL: https://staging.example.com
    DAST_API_SKIP_SSL: "false"
    DAST_API_HAR: api-requests.har
```

## License Compliance

### Basic Setup
```yaml
include:
  - template: Jobs/License-Scanning.gitlab-ci.yml

license_scanning:
  stage: security
  variables:
    LICENSE_MANAGEMENT_DISABLED: "false"
    LICENSE_ALLOWLIST: |
      MIT
      Apache-2.0
      BSD-2-Clause
      BSD-3-Clause
      ISC
      CC0-1.0
  allow_failure: true
```

### Custom License Policies
```yaml
# .gitlab/license-policies.yml
license_scanning:
  - name: GNU GPL v3
    actions:
      - deny
  - name: Commons Clause
    actions:
      - deny
  - name: MongoDB SSPL
    actions:
      - deny
  - name: MIT
    actions:
      - approve
```

## Merge Request Integration

```yaml
# Show security findings in MR widget
sast:
  artifacts:
    reports:
      sast: gl-sast-report.json

secret_detection:
  artifacts:
    reports:
      secret_detection: gl-secret-detection-report.json

dependency_scanning:
  artifacts:
    reports:
      dependency_scanning: gl-dependency-scanning-report.json

container_scanning:
  artifacts:
    reports:
      container_scanning: gl-container-scanning-report.json

dast:
  artifacts:
    reports:
      dast: gl-dast-report.json
```

## Pipeline Policies

### Block on Critical Findings
```yaml
security-block:
  stage: security
  image: alpine:3.19
  script:
    - |
      # Parse SAST report and block on critical
      if grep -q '"severity":"Critical"' gl-sast-report.json; then
        echo "Critical SAST finding detected!"
        exit 1
      fi
  needs: ["sast"]
  artifacts:
    paths: [gl-sast-report.json]
  allow_failure: false
```

## Best Practices

1. **Enable all scanning types** for comprehensive coverage — SAST, DAST, dependency, container, secret detection.
2. **Set `allow_failure: true`** initially to avoid blocking pipelines while tuning rules.
3. **Exclude generated directories** (`node_modules`, `vendor`, `.build`) to speed up scanning.
4. **Use merge request widgets** by configuring report artifacts properly.
5. **Define custom rules** for organization-specific patterns (API keys, internal secrets).
6. **Pin analyzer versions** instead of using `latest` tags in production pipelines.
7. **Scan dependencies weekly** even without code changes to catch new CVEs.
8. **Integrate with GitLab Security Dashboard** for centralized vulnerability management.
9. **Set severity thresholds** that match your SLAs (e.g., fix critical within 24h).
10. **Use DAST only on staging** — never scan production without extreme caution.
