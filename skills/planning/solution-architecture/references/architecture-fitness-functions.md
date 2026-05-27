# Architecture Fitness Functions

## Overview

Architecture fitness functions are automated checks that continuously verify a system's architectural characteristics. Inspired by evolutionary computing, they act as "tests" for non-functional requirements — ensuring deployed architecture matches intended architecture.

## Core Concept

### Definition

```
A fitness function is an automated mechanism that:
- Measures how well a system adheres to an architectural characteristic
- Runs continuously (CI pipeline, runtime monitoring, periodic audit)
- Produces a pass/fail or graduated score
- Alerts when the architecture drifts from its intended design
```

### Fitness Function Spectrum

```
                    Manual                          Automated
                    Review                          Verification
                    ──────                          ──────────
Level of            Code Review     Lint     ArchUnit    CI Tests    Runtime
Automation             │             │           │          │        Monitoring
                       ▼             ▼           ▼          ▼           ▼
                 Walkthrough    StyleCop    Package dep    Latency    Error budget
                                   ESLint    Layer rules   tests     burn rate
```

## Fitness Function Categories

### 1. Structural Fitness Functions

Validate code-level architecture structure.

#### Layer Dependency Rules

```java
// Example using ArchUnit (Java)
@Test
void domain_layer_should_not_depend_on_infrastructure() {
    JavaClasses classes = new ClassFileImporter().importPackages("com.myapp");
    
    layeredArchitecture()
        .layer("Domain").definedBy("..domain..")
        .layer("Application").definedBy("..application..")
        .layer("Infrastructure").definedBy("..infrastructure..")
        .layer("Presentation").definedBy("..presentation..")
    
        .whereLayer("Domain").mayOnlyBeAccessedByLayers("Application", "Infrastructure")
        .whereLayer("Infrastructure").mayNotBeAccessedByLayers("Presentation")
        .whereLayer("Presentation").mayOnlyBeAccessedByLayers("Infrastructure")
    
        .check(classes);
}
```

#### Package Cycle Detection

```java
@Test
void no_cycles_between_packages() {
    JavaClasses classes = new ClassFileImporter().importPackages("com.myapp");
    
    slices()
        .matching("com.myapp.(*)..")
        .should().beFreeOfCycles()
        .check(classes);
}
```

#### Module Boundaries

```yaml
fitness_function:
  name: "Module Boundary Enforcement"
  type: "structural"
  check: "Module A imports only Module B's public API, not internal packages"
  enforcement:
    - "ArchUnit test on every build"
    - "Fails CI if violation detected"
  exception_process:
    - "Architecture review required for boundary exception"
    - "Exception documented in architecture-debt.md with expiration"
```

### 2. Dependency Fitness Functions

Validate dependency direction and version policies.

#### Dependency Direction

```python
# Example using dependency-cruiser (Node.js)
module.exports = {
  forbidden: [
    {
      name: 'domain-not-dependent-on-infrastructure',
      from: { path: 'src/domain' },
      to: { path: 'src/infrastructure' }
    },
    {
      name: 'no-circular-dependencies',
      from: {},
      to: { circular: true }
    },
    {
      name: 'no-orphan-modules',
      from: {},
      to: { orphan: true }
    }
  ]
};
```

#### Third-Party Library Policies

```yaml
fitness_function:
  name: "Dependency License Compliance"
  type: "dependency"
  check: "All production dependencies have approved licenses"
  enforcement:
    - "license-checker in CI"
    - "Block build on GPL or unlicensed dependencies"
  
  rules:
    allowed: ["MIT", "Apache-2.0", "BSD-2-Clause", "BSD-3-Clause", "ISC"]
    conditional: ["LGPL-2.1", "LGPL-3.0"]  # Requires legal review
    blocked: ["GPL-2.0", "GPL-3.0", "AGPL-3.0", " Proprietary"]
```

```yaml
fitness_function:
  name: "Dependency Freshness"
  type: "dependency"
  check: "No dependency with known CVEs or >6 months outdated"
  enforcement:
    - "npm audit / dependabot in CI"
    - "Warning at 3 months, block at 6 months for critical deps"
```

### 3. Performance Fitness Functions

Validate latency, throughput, and resource usage.

#### Latency Contracts

```yaml
fitness_function:
  name: "API Latency SLOs"
  type: "performance"
  scope: "production"
  
  metrics:
    - endpoint: "POST /api/orders"
      p50: "< 200ms"
      p95: "< 500ms"
      p99: "< 1s"
    
    - endpoint: "GET /api/users/{id}"
      p50: "< 100ms"
      p95: "< 300ms"
      p99: "< 500ms"
  
  enforcement:
    - "Grafana alert if SLO breached for 5 consecutive minutes"
    - "PagerDuty notification if error budget consumed >10% in 24h"
```

#### Load Test Gates

```yaml
fitness_function:
  name: "Performance Regression Gate"
  type: "performance"
  scope: "pre-deployment"
  
  test:
    tool: "k6"
    scenario: "Peak hour simulation (10K RPM)"
    duration: "15 minutes"
  
  gates:
    - "p95 latency regression < 10% from baseline"
    - "Error rate < 0.1%"
    - "CPU utilization < 70% under peak"
    - "Memory utilization < 80% under peak"
  
  action:
    pass: "Proceed to deployment"
    fail: "Block deployment, notify performance team"
```

### 4. Security Fitness Functions

Validate security posture continuously.

#### Dependency Vulnerability Scanning

```yaml
fitness_function:
  name: "CVE Gate"
  type: "security"
  scope: "CI pipeline"
  
  check:
    - "npm audit (Node.js) or OWASP Dependency Check (Java)"
    - "Trivy for container images"
    - "Snyk / GitHub Dependabot for runtime deps"
  
  thresholds:
    critical: "Block build"
    high: "Block build"
    medium: "Warning, require review within 7 days"
    low: "Log"
```

#### Secrets Detection

```yaml
fitness_function:
  name: "No Secrets in Code"
  type: "security"
  scope: "pre-commit + CI"
  
  enforce:
    - "git-secrets or truffleHog on every commit"
    - "Scan for: API keys, passwords, tokens, certificates, private keys"
    - "Patterns: AWS keys, GitHub tokens, JWT, DB connection strings"
  
  action:
    found: "Block commit, rotate compromised secrets"
    clean: "Pass"
```

### 5. Operational Fitness Functions

Validate deployability, observability, and reliability.

#### Deployment Health

```yaml
fitness_function:
  name: "Canary Health Gate"
  type: "operational"
  scope: "deployment"
  
  canary_duration: "15 minutes"
  
  checks:
    - "Error rate < 0.5% (baseline comparison)"
    - "p95 latency within 10% of baseline"
    - "HTTP 5xx rate < 0.1%"
    - "CPU/Memory not exceeding baseline by 20%"
    - "Health check endpoint returns 200"
    - "Business metrics: order completion rate normal"
  
  decisions:
    all_pass: "Promote canary to full rollout"
    any_fail: "Rollback canary, alert SRE"
```

#### Observability Requirements

```yaml
fitness_function:
  name: "Observability Compliance"
  type: "operational"
  scope: "CI pipeline"
  
  checks:
    - "All API endpoints have latency histogram metrics"
    - "All services expose /health, /readyz, /livez endpoints"
    - "All external calls have distributed tracing spans"
    - "All errors have structured log entries with correlation IDs"
    - "All services export metrics to Prometheus (or equivalent)"
  
  enforcement:
    fail: "Missing observability instrumentation → PR cannot merge"
    warn: "Incomplete but acceptable → log for tech debt tracking"
```

### 6. Evolutionary Fitness Functions

Validate that architecture can evolve as requirements change.

#### Component Independence

```yaml
fitness_function:
  name: "Independent Deployability"
  type: "evolutionary"
  
  metrics:
    - "Number of services deployed per release"
    - "Coupling between services (synced deploys = coupling)"
    - "Time to deploy a single service change"
  
  thresholds:
    target: ">50% services deployable independently"
    alert: "Convoy deploys > 3 services in a single change"
    block: "Architecture review required if convoy deploys exceed 5"
```

#### Architecture Drift Detection

```yaml
fitness_function:
  name: "Architecture Drift"
  type: "evolutionary"
  scope: "weekly audit"
  
  checks:
    - "Actual service boundaries match documented boundaries"
    - "Actual data stores match architecture decisions"
    - "Communication patterns follow documented design"
    - "Dependencies match allowed direction rules"
  
  enforcement:
    alert: "Drift > 20% → architecture review triggered"
    block: "Drift > 50% → architectural remediation sprint required"
```

## Implementation Patterns

### CI Pipeline Integration

```yaml
# .github/workflows/architecture-fitness.yml
name: Architecture Fitness
on: [push, pull_request]

jobs:
  structural:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run ArchUnit tests
        run: ./gradlew archTest
      
      - name: Check dependency rules
        run: npx dependency-cruise src
    
  security:
    runs-on: ubuntu-latest
    steps:
      - name: Dependency vulnerability scan
        run: npx audit-ci --critical --high
      
      - name: Secrets scan
        run: npx trufflehog --files .
    
  performance:
    runs-on: ubuntu-latest
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    steps:
      - name: Deploy to staging
        run: ./deploy-staging.sh
      - name: Run k6 performance test
        run: k6 run performance/fitness-test.js
      - name: Check performance gates
        run: ./check-performance-gates.sh
```

### Runtime Monitoring Integration

```yaml
fitness_function:
  name: "SLO Compliance (Runtime)"
  
  definition:
    - metric: "http_request_duration_seconds"
      query: "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))"
      threshold: "< 0.5"
    
    - metric: "error_budget_burn_rate"
      query: "sum(rate(http_requests_total{status=~'5..'}[1h])) / sum(rate(http_requests_total[1h]))"
      threshold: "< 0.001"
  
  alert:
    - type: "warning"
      condition: "threshold exceeded for 5 minutes"
      action: "Slack notification to #architecture"
    
    - type: "critical"
      condition: "threshold exceeded for 30 minutes"
      action: "PagerDuty to on-call architect"
```

## Fitness Function Catalog Template

```yaml
fitness_function:
  id: "FF-001"
  name: "Domain Isolation"
  category: "structural"
  
  description: >
    Domain layer must not depend on infrastructure or framework code.
    This ensures business logic remains testable and framework-independent.
  
  automation:
    tool: "ArchUnit"
    trigger: "Every CI build"
    code: |
      layeredArchitecture()
        .layer("Domain").definedBy("..domain..")
        .layer("Infrastructure").definedBy("..infrastructure..")
        .whereLayer("Domain").mayOnlyBeAccessedByLayers("Infrastructure")
        .check(classes);
  
  threshold: "Zero violations"
  
  violation_response:
    - "PR blocked from merging"
    - "Automated comment on PR with violation details"
    - "Architecture team notified via Slack"
  
  exception_process:
    - "Submit architecture-debt.md entry with expiration date"
    - "Exception reviewed by lead architect within 5 business days"
    - "Auto-escalate if exception expires without resolution"
  
  owner: "Platform Architecture Team"
  last_reviewed: "2026-05-01"
```

## Organizational Adoption Guide

### Phase 1: Foundation (Month 1-2)

```
1. Identify top 5 architectural characteristics
   - Based on QAW or ATAM session
   - Focus on highest impact, easiest to automate

2. Implement structural fitness functions
   - Layer dependency rules (ArchUnit / dependency-cruiser)
   - Package cycle detection
   - Module boundary enforcement

3. Add to CI pipeline
   - Existing PR gates
   - Fails on violation
   - Clear error messages
```

### Phase 2: Expansion (Month 3-4)

```
4. Add dependency fitness functions
   - License compliance
   - Vulnerability scanning
   - Version freshness

5. Implement performance gates
   - Load test baseline
   - Latency regression check
   - Resource usage monitoring

6. Add security checks
   - Secrets scanning
   - SAST integration
   - Container scanning
```

### Phase 3: Maturity (Month 5-6)

```
7. Runtime fitness functions
   - SLO compliance monitoring
   - Error budget burn rate
   - Architecture drift detection

8. Evolutionary fitness functions
   - Component independence metrics
   - Coupling tracking
   - Deployment frequency correlation

9. Governance integration
   - Architecture review triggers from fitness failures
   - Monthly fitness report to architecture board
   - Quarterly fitness function review (relevance, thresholds)
```

## Key Points

- Fitness functions transform architecture from "documents that grow stale" to "continuously verified constraints" — they close the gap between intended and actual architecture
- Start with structural checks (layer rules, package cycles) — they're the easiest to implement and provide immediate value
- Combine pre-deployment (CI gates) and runtime (monitoring, alerts) fitness functions for comprehensive coverage
- Every fitness function needs clear thresholds — too strict blocks innovation, too permissive allows architecture drift
- Always provide an exception process with expiration — architecture must evolve, but exceptions must be tracked
- Fitness functions should NOT replace architecture reviews — they augment human judgment with automated verification
- Measure fitness function effectiveness: how many architecture violations were caught vs. how many reached production
- Review fitness function relevance quarterly — outdated checks create noise and erode trust in the system
- Apply the Pareto principle: 20% of fitness functions will catch 80% of architecture violations
- Document fitness functions using the catalog template — makes them discoverable, auditable, and maintainable
