---
name: backend-universal-testing
description: >
  Comprehensive testing strategies and implementation guidelines
  for universal backend architectures, including TDD, BDD,
  integration testing, and end-to-end testing methodologies.
version: "2.0.0"
author: "j4flmao"
license: "MIT"
type: skill
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags:
  - testing
  - backend
  - tdd
  - quality-assurance
  - architecture
---

# Universal Backend Testing Skill

## Purpose

The Universal Backend Testing Skill is designed to enforce rigorous, comprehensive, and scalable testing methodologies across all backend services. It ensures that any agent or developer interacting with the backend architecture adheres to strict test-driven paradigms. The purpose is not merely to write tests, but to architect systems that are inherently testable, robust, and immune to regressions. By mandating code coverage, mutation testing, and precise architectural boundaries, this skill elevates the quality and stability of enterprise-grade software over long operational lifecycles.

## Core Principles

1. **Test-Driven Design Before Implementation**: Tests are not an afterthought; they are the architectural blueprint. Code must be written to satisfy failing tests, ensuring that functionality is strictly bounded by expected behavior.
2. **The Testing Pyramid is Absolute**: Ensure a heavy base of fast, isolated unit tests, supplemented by comprehensive integration tests for component boundaries, and capped with end-to-end tests for critical user journeys.
3. **Deterministic Execution Environment**: Tests must produce identical results regardless of environmental factors. State must be strictly managed, mocked, or containerized to prevent flaky test outcomes.
4. **Coverage is a Baseline, Not a Goal**: While 100% coverage metrics are monitored, the true focus is on mutation testing and ensuring that tests fail when business logic is incorrectly altered.
5. **Continuous Verification Pipeline**: Testing is fully automated within CI/CD pipelines. A failure in testing is a failure of the build; code cannot progress to deployment without passing all layers of verification.

## Agent Protocol

**Triggers:**
- A new feature is proposed or implemented.
- A bug report is triaged.
- A refactoring operation is initiated.
- PR reviews are conducted by agents.

**Input Context Required:**
- Target codebase or module scope.
- Existing test suites and configuration files.
- Feature requirements or bug reproduction steps.

**Output Artifact:**
- A fully realized suite of tests (Unit, Integration, E2E).
- Coverage reports and mutation scores.
- Code modifications needed to make existing logic testable.

**Response Formats:**
```json
{
  "action": "test_generation",
  "scope": "authentication_module",
  "outcomes": {
    "unit_tests_added": 12,
    "integration_tests_added": 3,
    "coverage_delta": "+5%",
    "mutation_score": "89%"
  },
  "recommendations": [
    "Refactor login_handler to inject dependencies."
  ]
}
```

## Decision Matrix

```text
Is there existing test infrastructure?
|
+-- Yes --> Evaluate Coverage Levels
|           |
|           +-- < 80% --> Generate Targeted Unit Tests
|           |
|           +-- > 80% --> Focus on Edge Cases & Mutation Tests
|
+-- No ---> Scaffold Test Framework
            |
            +-- Determine Language & Stack
            |
            +-- Set up PyTest/Jest/JUnit
            |
            +-- Implement initial CI pipeline configuration
```

## Detailed Architectural Overview

```text
+-------------------------------------------------------------+
|                     Test Execution Engine                     |
+-------------------------------------------------------------+
|                                                             |
|  +-----------------+  +-----------------+  +-------------+  |
|  |                 |  |                 |  |             |  |
|  | Unit Test Suite |  | Integration Env |  | E2E Harness |  |
|  | (Mocked I/O)    |  | (Docker DBs)    |  | (Live API)  |  |
|  |                 |  |                 |  |             |  |
|  +--------+--------+  +--------+--------+  +------+------+  |
|           |                    |                  |         |
+-----------|--------------------|------------------|---------+
            |                    |                  |
            v                    v                  v
+-------------------------------------------------------------+
|                      Test Reporting Hub                       |
|   - Coverage Aggregation                                      |
|   - Flakiness Detection                                       |
|   - CI/CD Status Emitter                                      |
+-------------------------------------------------------------+
```

## Workflow Steps

### Phase 1: Context and Discovery
1. Analyze the current state of the backend module.
2. Identify dependencies, external services, and databases.
3. Review existing test configurations (e.g., `pytest.ini`, `jest.config.js`).
4. Establish the boundary for the new testing efforts.

### Phase 2: Unit Testing (The Foundation)
1. Write failing unit tests based on specifications.
2. Use mocking frameworks to isolate logic from I/O.
3. Implement the minimal code required to pass tests.
4. Refactor while maintaining passing green status.

### Phase 3: Integration Testing (The Seams)
1. Configure ephemeral data stores (e.g., Testcontainers).
2. Write tests that exercise API endpoints and database queries.
3. Validate data integrity across service boundaries.
4. Ensure tear-down logic properly cleans state.

### Phase 4: System and E2E Testing (The Journey)
1. Identify critical business workflows.
2. Write black-box tests that mimic user interactions.
3. Integrate with deployment pipelines for staging environments.
4. Monitor performance thresholds during test execution.

### Phase 5: Hardening and Mutation
1. Run mutation testing tools to verify test robustness.
2. Analyze and remove redundant or fragile tests.
3. Optimize test suite performance (parallelization).
4. Enforce static analysis and cyclomatic complexity limits.

### Phase 6: Reporting and Handoff
1. Generate final coverage and mutation reports.
2. Document how to run the newly created tests locally.
3. Ensure CI pipeline YAMLs are updated.
4. Trigger subsequent CI/CD orchestration.

## Extended Troubleshooting Guide

| Symptom | Primary Cause | Mitigation Action |
| --- | --- | --- |
| Intermittent failures (Flaky tests) | Shared state or timing issues | Isolate state per test, use fixed random seeds, eliminate sleep delays. |
| Slow test suite execution | I/O in unit tests | Mock file systems and network calls; use parallel test runners. |
| High coverage but frequent bugs | Poor assertions | Implement mutation testing; review tests for proper assertion logic. |
| Integration tests hang | Unclosed database connections | Ensure proper cleanup in tearDown / afterEach blocks. |
| Pipeline times out | Over-reliance on E2E tests | Shift tests left down the pyramid; reserve E2E for critical paths. |
| Unmockable dependencies | Tightly coupled architecture | Refactor to use Dependency Injection and interface abstractions. |

## Complete Execution Scenario

```text
[Start: New Feature Request]
       |
       v
[Write Unit Tests (Red)] ----> [Fails as expected]
       |
       v
[Implement Feature Code] ----> [Passes Unit Tests (Green)]
       |
       v
[Refactor Codebase]      ----> [Tests still pass]
       |
       v
[Write Integration Tests]----> [Validates DB/Network Layer]
       |
       v
[Run Mutation Tests]     ----> [Identifies weak assertions]
       |
       v
[Push to CI/CD]          ----> [Pipeline verifies coverage >= 90%]
       |
       v
[End: Feature Merged Successfully]
```

## Rules and Guidelines

1. **No External I/O in Unit Tests**: Unit tests must execute in milliseconds and never touch a network or real disk.
2. **Mock the Boundary, Not the Core**: Mock external services and databases, but do not mock internal logic that is under test.
3. **One Assertion Concept per Test**: Keep tests focused on a single logical behavior to ensure clear failure diagnostics.
4. **Always Clean Up State**: Integration and E2E tests must leave the environment exactly as they found it.
5. **Treat Test Code like Production Code**: Tests must be refactored, reviewed, and maintained with the exact same rigor as application code.

## Reference Guides

- [Architecture Patterns](references/architecture-patterns.md)
- [State Management](references/state-management.md)
- [Performance Optimization](references/performance-optimization.md)
- [Security Best Practices](references/security-best-practices.md)
- [Testing Strategies](references/testing-strategies.md)
- [Deployment Pipelines](references/deployment-pipelines.md)
- [Error Handling](references/error-handling.md)
- [Code Organization](references/code-organization.md)

## Handoff

This skill seamlessly integrates with deployment pipelines and static analysis tools. Once a feature satisfies the rigorous standards defined herein, hand off to:
- **Deployment Pipelines Skill**: To package and ship the verified artifacts.
- **Security Audit Skill**: To perform dynamic security scanning on the validated endpoints.

<!-- COMPRESSION: backend-testing-skill|v2.0.0|tdd-bdd-integration-e2e|metrics-mutation|end -->
