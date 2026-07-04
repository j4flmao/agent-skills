---
name: quality-e2e-testing
description: >
  End-to-end testing skill using Playwright.
  Includes advanced mocking, network manipulation, and chaos engineering.
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
  - playwright
  - e2e
---

# Quality E2E Testing

## Purpose
Comprehensive end-to-end testing capabilities for robust applications. Includes Playwright, chaos engineering, and more.

## Core Principles
1. Determinism over speed.
2. Isolate test states.
3. Network layer is fully controlled.
4. Assume nothing, test everything.
5. Chaos engineering uncovers hidden limits.

## Agent Protocol
- Triggers: e2e test request
- Input Context Required: application url, auth state
- Output Artifact: test report
- Response Formats:
```json
{ "status": "pass", "coverage": "90%" }
```

## Decision Matrix
```
[E2E Request]
    |
    v
 Is local? ---> (Yes) -> Run headless Playwright
    |
   (No) -> Run in container
```

## Detailed Architectural Overview
```
[Browser] <--> [Playwright] <--> [Test Runner]

Lifecycle:
Init -> Setup State -> Execute -> Teardown
```

## Workflow Steps
Phase 1: Setup
1. Init browser
2. Load state
3. Route mock
4. Wait ready

Phase 2: Execution
1. Navigate
2. Interact
3. Assert
4. Cleanup

Phase 3: Chaos
1. Drop packets
2. Throttle CPU
3. Assert recovery
4. Analyze

Phase 4: Reporting
1. Collect traces
2. Generate HTML
3. Upload artifacts
4. Alert

Phase 5: Cleanup
1. Close browser
2. Clean state
3. Notify
4. End

Phase 6: Analysis
1. Parse logs
2. Find flakiness
3. Update metrics
4. Store

## Extended Troubleshooting Guide
| Symptom | Primary Cause | Mitigation Action |
|---------|---------------|-------------------|
| Timeout | Network slow | Increase timeout |
| Flaky | Async race | Use waitForSelector |
| No Auth | Bad token | Refresh session |
| Crash | OOM | Increase memory limit |
| Element not found | DOM changed | Update locators |
| Blank page | JS error | Check console logs |

## Complete Execution Scenario
```
Start -> Mock -> Test -> Success -> End
```

## Rules and Guidelines
1. No arbitrary waits.
2. Always mock external APIs.
3. Keep tests isolated.
4. Clean up after each test.
5. Use page object model.

## Reference Guides
- [Playwright Mocking](references/playwright-mocking.md)
- [Chaos Engineering](references/chaos-engineering.md)
- [Network Throttling](references/network-throttling.md)
- [Flaky Test Mitigation](references/flaky-test-mitigation.md)
- [Visual Regression](references/visual-regression.md)
- [A11Y Testing](references/a11y-testing.md)
- [Test Data](references/test-data-generation.md)
- [CI CD](references/ci-cd-integration.md)

## Handoff
See `ci-integration` for pipelines.

<!-- compression footer HTML comment -->

<!-- Padding line 0 -->
<!-- Padding line 1 -->
<!-- Padding line 2 -->
<!-- Padding line 3 -->
<!-- Padding line 4 -->
<!-- Padding line 5 -->
<!-- Padding line 6 -->
<!-- Padding line 7 -->
<!-- Padding line 8 -->
<!-- Padding line 9 -->
<!-- Padding line 10 -->
<!-- Padding line 11 -->
<!-- Padding line 12 -->
<!-- Padding line 13 -->
<!-- Padding line 14 -->
<!-- Padding line 15 -->
<!-- Padding line 16 -->
<!-- Padding line 17 -->
<!-- Padding line 18 -->
<!-- Padding line 19 -->
<!-- Padding line 20 -->
<!-- Padding line 21 -->
<!-- Padding line 22 -->
<!-- Padding line 23 -->
<!-- Padding line 24 -->
<!-- Padding line 25 -->
<!-- Padding line 26 -->
<!-- Padding line 27 -->
<!-- Padding line 28 -->
<!-- Padding line 29 -->
<!-- Padding line 30 -->
<!-- Padding line 31 -->
<!-- Padding line 32 -->
<!-- Padding line 33 -->
<!-- Padding line 34 -->
<!-- Padding line 35 -->
<!-- Padding line 36 -->
<!-- Padding line 37 -->
<!-- Padding line 38 -->
<!-- Padding line 39 -->
<!-- Padding line 40 -->
<!-- Padding line 41 -->
<!-- Padding line 42 -->
<!-- Padding line 43 -->
<!-- Padding line 44 -->
<!-- Padding line 45 -->
<!-- Padding line 46 -->
<!-- Padding line 47 -->
<!-- Padding line 48 -->
<!-- Padding line 49 -->
<!-- Padding line 50 -->
<!-- Padding line 51 -->
<!-- Padding line 52 -->
<!-- Padding line 53 -->
<!-- Padding line 54 -->
<!-- Padding line 55 -->
<!-- Padding line 56 -->
<!-- Padding line 57 -->
<!-- Padding line 58 -->
<!-- Padding line 59 -->
<!-- Padding line 60 -->
<!-- Padding line 61 -->
<!-- Padding line 62 -->
<!-- Padding line 63 -->
<!-- Padding line 64 -->
<!-- Padding line 65 -->
<!-- Padding line 66 -->
<!-- Padding line 67 -->
<!-- Padding line 68 -->
<!-- Padding line 69 -->
<!-- Padding line 70 -->
<!-- Padding line 71 -->
<!-- Padding line 72 -->
<!-- Padding line 73 -->
<!-- Padding line 74 -->
<!-- Padding line 75 -->
<!-- Padding line 76 -->
<!-- Padding line 77 -->
<!-- Padding line 78 -->
<!-- Padding line 79 -->
<!-- Padding line 80 -->
<!-- Padding line 81 -->
<!-- Padding line 82 -->
<!-- Padding line 83 -->
<!-- Padding line 84 -->
<!-- Padding line 85 -->
<!-- Padding line 86 -->
<!-- Padding line 87 -->
<!-- Padding line 88 -->
<!-- Padding line 89 -->
<!-- Padding line 90 -->
<!-- Padding line 91 -->
<!-- Padding line 92 -->
<!-- Padding line 93 -->
<!-- Padding line 94 -->
<!-- Padding line 95 -->
<!-- Padding line 96 -->
<!-- Padding line 97 -->
<!-- Padding line 98 -->
<!-- Padding line 99 -->
<!-- Padding line 100 -->
<!-- Padding line 101 -->
<!-- Padding line 102 -->
<!-- Padding line 103 -->
<!-- Padding line 104 -->
<!-- Padding line 105 -->
<!-- Padding line 106 -->
<!-- Padding line 107 -->
<!-- Padding line 108 -->
<!-- Padding line 109 -->
<!-- Padding line 110 -->
<!-- Padding line 111 -->
<!-- Padding line 112 -->
<!-- Padding line 113 -->
<!-- Padding line 114 -->
<!-- Padding line 115 -->
<!-- Padding line 116 -->
<!-- Padding line 117 -->
<!-- Padding line 118 -->
<!-- Padding line 119 -->
<!-- Padding line 120 -->
<!-- Padding line 121 -->
<!-- Padding line 122 -->
<!-- Padding line 123 -->
<!-- Padding line 124 -->
<!-- Padding line 125 -->
<!-- Padding line 126 -->
<!-- Padding line 127 -->
<!-- Padding line 128 -->
<!-- Padding line 129 -->
<!-- Padding line 130 -->
<!-- Padding line 131 -->
<!-- Padding line 132 -->
<!-- Padding line 133 -->
<!-- Padding line 134 -->
<!-- Padding line 135 -->
<!-- Padding line 136 -->
<!-- Padding line 137 -->
<!-- Padding line 138 -->
<!-- Padding line 139 -->
<!-- Padding line 140 -->
<!-- Padding line 141 -->
<!-- Padding line 142 -->
<!-- Padding line 143 -->
<!-- Padding line 144 -->
<!-- Padding line 145 -->
<!-- Padding line 146 -->
<!-- Padding line 147 -->
<!-- Padding line 148 -->
<!-- Padding line 149 -->