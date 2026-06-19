---
name: dev-loop-debugging-strategy
description: >
  Use when the user asks about debugging strategies, debugging methodologies, log analysis, debugging tools, root cause analysis, or systematic debugging approaches. Do NOT use for: performance profiling (dev-loop-performance-profiler), or code review (dev-loop-code-review).
version: "2.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [dev-loop, debugging, root-cause-analysis]
---

# Debugging Strategy

## Purpose
Apply systematic debugging methodologies — root cause analysis, scientific method for debugging, log analysis, and tool-assisted tracing — to identify, isolate, and resolve software defects efficiently.

## Agent Protocol

### Trigger
Exact user phrases: "debugging", "debug strategy", "how to debug", "root cause", "bug reproduction", "debugging methodology", "log analysis", "troubleshooting", "debug this", "why is this broken".

### Input Context
- Environment (local dev, CI, staging, production)
- Bug characteristics (reproducible, intermittent, regression, performance, crash)
- Available tools (debugger, profiler, logs, APM, metrics)
- Language and framework (affects available debugging tools)
- Recent changes (deployments, dependency updates, config changes)
- Error symptoms (error message, stack trace, incorrect output, crash dump)

### Output Artifact
Debugging plan with hypothesis, isolation strategy, reproduction steps, and root cause analysis.

### Completion Criteria
- [ ] Bug reproduction steps documented and confirmed
- [ ] Initial hypothesis formed with expected vs actual behavior
- [ ] Debugging tooling selected and configured
- [ ] Isolation strategy applied (binary search, eliminate variables)
- [ ] Root cause identified and documented
- [ ] Fix implemented and verified
- [ ] Regression test added to prevent recurrence
- [ ] Postmortem notes documented (if warranted)

### Max Response Length
200 lines.

## Framework/Methodology

### Debugging Decision Tree
```
What type of bug?
├── Application crash (exception, segfault, panic)
│   → Stack trace analysis → crash dump → core dump → last known good
├── Incorrect behavior (wrong output, wrong state)
│   → Scientific method: hypothesis → experiment → observe → conclude
│   → Binary search on commits: git bisect
├── Intermittent failure (race condition, timing)
│   → Stress testing → logging → thread/async analysis → happens-before
├── Performance regression (slow response, high CPU/memory)
│   → Profiler → flame graph → heap dump → load testing
├── Integration failure (API, database, network)
│   → Request/response logging → mock → dependency isolation
└── Environmental issue (wrong config, missing dependency)
    → Config diff → environment comparison → fresh install
```

### The Scientific Method for Debugging
```
1. Observe:   What is the symptom? When does it happen? What changed?
2. Hypothesize: What could cause this? Rank by probability.
3. Predict:   If hypothesis is correct, what else would we expect?
4. Experiment: Design a test to validate or invalidate the hypothesis.
5. Analyze:   Did the result match the prediction?
6. Conclude:  If validated → fix. If invalidated → refine hypothesis (goto 2).
```

### Debugging Levels (Eskil Steenberg's Model)
```
Level 0: No methodology — random changes hoping something works
Level 1: Observation — reading error messages, stack traces
Level 2: Isolation — binary search, eliminate variables
Level 3: Tooling — debuggers, profilers, log analysis
Level 4: Scientific method — hypothesis-driven, systematic
Level 5: Prevention — tests, type systems, assertions prevent bugs
```

## Workflow

### Step 1: Reproduce (Always the First Step)

Create a minimal, deterministic reproduction:

```yaml
reproduction_steps:
  environment: "Node.js 20, macOS 14.5, PostgreSQL 16"
  prerequisites:
    - "npm install"
    - "docker compose up -d db"
  steps:
    - "Run: npm run dev"
    - "Navigate to /settings"
    - "Click 'Save' with empty name field"
    - "Expected: Validation error shown"
    - "Actual: Page crashes with TypeError"
  frequency: "100% reproducible"
  regression: true
  last_known_good: "v1.2.0"
```

If not reproducible:
- Check environment differences (local vs CI vs production)
- Check data differences (production data may trigger edge case)
- Check timing (race condition, async timing)
- Add extensive logging
- Use session replay tools (FullStory, LogRocket, Sentry)

### Step 2: Gather Data

```bash
# Stack trace analysis
# Look for: YOUR code in the trace (not third-party), null reference, type error

# Binary search commits (git bisect)
git bisect start
git bisect bad          # Current commit is broken
git bisect good v1.0.0  # Last known good
# Git checks out the midpoint; test it:
npm test
git bisect good         # or git bisect bad
# Repeat until commit identified

# Log analysis
kubectl logs -l app=myapp --tail=100 --since=10m > logs.txt
# Look for: error, exception, fatal, timeout, 500, stack trace, correlation ID

# Thread dump analysis (Java)
jstack <pid> > threaddump.txt
# Look for: BLOCKED threads, DEADLOCK, stuck threads

# Core dump analysis (C/C++/Rust)
gdb /path/to/binary core.dump
bt full   # Full backtrace
info locals
```

### Step 3: Isolate

Binary search strategy:
```
Codebase: [file1, file2, ..., fileN]
1. Comment out half the code (files A-M)
2. Does the bug still reproduce?
   YES → bug is in files A-M → split A-M
   NO  → bug is in files N-Z → split N-Z
3. Repeat until single line identified
```

Configuration isolation:
```bash
# Compare configs
diff production.yml local.yml

# Start with minimal config
cp minimal.yml config.yml
# Add config values one at a time until bug appears
```

Dependency isolation:
```bash
# Check dependency versions
npm list
# Upgrade/downgrade suspect dependency
npm install package@version
```

### Step 4: Use Debugging Tools

```typescript
// TypeScript/JavaScript: Chrome DevTools or VS Code debugger
// 1. Set breakpoint before the crash
// 2. Step through to find null/undefined value
// 3. Check call stack for unexpected caller

// Node.js --inspect
node --inspect-brk app.js
// Open chrome://inspect in Chrome

// Conditional logging (don't leave in production)
console.log('[DEBUG] user:', user?.id, 'data:', JSON.stringify(data, null, 2));
```

```python
# Python: pdb / ipdb
import pdb; pdb.set_trace()  # Python 3.6-
breakpoint()  # Python 3.7+

# Logging
import logging
logging.basicConfig(level=logging.DEBUG)
logger.debug(f"Processing item {item_id}, state: {state}")
```

```rust
// Rust: dbg! macro
let result = dbg!(some_expression());
// Prints: file.rs:42: some_expression() = <value>
```

```csharp
// C#: Debugger.Launch + logging
System.Diagnostics.Debugger.Launch();
Console.WriteLine($"Processing: {item.Id}, State: {item.State}");
```

### Step 5: Fix and Verify

```yaml
fix:
  root_cause: "Null reference in UserService.GetName() when user has no profile"
  fix: "Add null check before accessing profile.Name"
  verification:
    - "Unit test added for null profile case"
    - "Existing tests still pass"
    - "Manually reproduce scenario → no crash"
  prevention:
    - "Add nullable reference types (C#) / strictNullChecks (TypeScript)"
    - "Add contract test for GetName()"
    - "Consider using Option/Maybe type instead of null"
```

## Common Pitfalls

| Pitfall | Description | Prevention |
|---------|-------------|------------|
| Skipping reproduction | Fixing without understanding the bug fully | Always reproduce first, in minimal environment |
| Changing too many things | Multiple edits at once, regression unknown | One change at a time, test after each |
| Confirmation bias | Looking for evidence that supports hypothesis | Actively try to DISPROVE your hypothesis |
| Not isolating | Debugging in production, full codebase | Isolate to smallest reproducing case |
| Overlooking recent changes | Assuming bug has always existed | Check git log for recent merges |
| Ignoring the error message | Dismissing stack traces as "not my code" | Read the full trace, check ALL frames |
| Fixing symptom not cause | Patching the result not the root | Trace back to source, fix the origin |
| No regression test | Same bug returns later | Always add test that fails before fix |
| Not documenting | Same debugging process repeated | Document root cause + fix in ticket |
| Debugging without tools | print/console.log only | Learn IDE debugger, specialized tools |

## Best Practices

| Practice | Rationale |
|----------|-----------|
| Reproduce first, always | Without reproduction, you can't verify the fix |
| One change at a time | Multiple changes = multiple unknowns |
| Use git bisect for regressions | Fastest way to find the breaking commit |
| Write the regression test first | Test-driven debugging confirms the fix |
| Check assumptions about data | Null, empty, malformed data causes most bugs |
| Read the error message completely | Often tells you exactly what's wrong |
| Simplify the environment | Docker, fresh checkout, minimal config |
| Add logging at each decision point | Trace the execution path in production |
| Use a debugger (not print statements) | Watch variables, step through execution |
| Document root cause in the fix | git blame shows why the fix exists |

## Advanced Techniques

### Debugging Race Conditions
```typescript
// Add thread-safe logging with timestamps
const debug = (msg: string) =>
  console.log(`[${Date.now()}] [${process.pid}] ${msg}`);

// Use happens-before tracking
let eventOrder: string[] = [];
async function track(step: string) {
  eventOrder.push(`${Date.now()}: ${step}`);
}
```

### Debugging Memory Leaks
```bash
# Node.js heap dump
node --heapsnapshot-signal SIGUSR2 app.js
kill -USR2 <pid>  # Generates heap snapshot

# Chrome: Memory tab → Take heap snapshot
# Look for: detached DOM nodes, growing arrays, event listeners
```

### Debugging Production (without SSH)
```yaml
techniques:
  - Feature flags to enable debug logging remotely
  - Structured logging (JSON) to centralized log system
  - Distributed tracing (OpenTelemetry)
  - Crash reporting (Sentry, Bugsnag, AppSignal)
  - Session replay (FullStory, LogRocket, Hotjar)
  - Health check endpoints (/health, /debug/vars)
  - Metrics-based debugging (Grafana dashboard per service)
```

## References
  - references/debugging-strategy-advanced.md — Debugging Strategy Advanced Topics
  - references/debugging-strategy-fundamentals.md — Debugging Strategy Fundamentals
  - references/debugging-tools.md — Debugging Tools Reference
  - references/root-cause-analysis.md — Root Cause Analysis Reference
## Handoff
Hand off to `dev-loop-performance-profiler` if the bug is performance-related. Hand off to `dev-loop-code-review` for security-related bugs.

## Implementation Patterns

### Bug Report Parser

```python
from typing import Dict, Optional, List
import re
from datetime import datetime

class BugReport:
    def __init__(self, title: str, description: str):
        self.title = title
        self.description = description
        self.severity = self._classify_severity()
        self.category = self._classify_category()
        self.reproducibility = self._assess_reproducibility()

    def _classify_severity(self) -> str:
        critical_kw = ["crash", "segfault", "data loss", "security", "0-day",
                       "production down", "p0", "p1", "critical"]
        high_kw = ["incorrect", "wrong", "broken", "not working", "fails",
                   "error", "exception", "regression"]
        text = f"{self.title} {self.description}".lower()
        for kw in critical_kw:
            if kw in text:
                return "critical"
        for kw in high_kw:
            if kw in text:
                return "high"
        return "medium"

    def _classify_category(self) -> str:
        text = f"{self.title} {self.description}".lower()
        if any(w in text for w in ["race", "async", "concurrent", "thread", "timing"]):
            return "race_condition"
        if any(w in text for w in ["null", "undefined", "non-null", "optional"]):
            return "null_reference"
        if any(w in text for w in ["memory", "leak", "oom", "heap"]):
            return "memory"
        if any(w in text for w in ["perf", "slow", "timeout", "hang"]):
            return "performance"
        if any(w in text for w in ["api", "http", "response", "status", "400", "500"]):
            return "api_integration"
        if any(w in text for w in ["database", "query", "sql", "migration"]):
            return "database"
        return "logic"

    def _assess_reproducibility(self) -> str:
        text = f"{self.title} {self.description}".lower()
        if any(w in text for w in ["always", "every time", "100%", "consistently"]):
            return "always"
        if any(w in text for w in ["sometimes", "intermittent", "occasionally", "random"]):
            return "intermittent"
        if any(w in text for w in ["once", "single time", "one time", "rarely"]):
            return "rare"
        return "unknown"
```

### Root Cause Analysis Documenter

```python
from typing import List, Dict, Optional
from datetime import datetime
import json

class RCADocument:
    def __init__(self, bug_id: str, title: str):
        self.bug_id = bug_id
        self.title = title
        self.created_at = datetime.utcnow()
        self.timeline: List[Dict] = []
        self.hypotheses: List[Dict] = []
        self.root_cause: Optional[Dict] = None
        self.fix: Optional[Dict] = None

    def add_hypothesis(self, description: str, probability: float, evidence: List[str]):
        self.hypotheses.append({
            "description": description,
            "probability": probability,
            "evidence": evidence,
            "status": "proposed",
            "test_result": None,
        })

    def record_test(self, hypothesis_index: int, confirmed: bool, notes: str):
        if hypothesis_index < len(self.hypotheses):
            self.hypotheses[hypothesis_index]["status"] = "confirmed" if confirmed else "rejected"
            self.hypotheses[hypothesis_index]["test_result"] = notes

    def set_root_cause(self, description: str, file: str, line: int, category: str):
        self.root_cause = {
            "description": description,
            "file": file,
            "line": line,
            "category": category,
            "discovered_at": datetime.utcnow().isoformat(),
        }

    def set_fix(self, description: str, files_changed: List[str], prevention: List[str]):
        self.fix = {
            "description": description,
            "files_changed": files_changed,
            "prevention": prevention,
            "applied_at": datetime.utcnow().isoformat(),
        }

    def get_5_whys(self) -> List[str]:
        if not self.root_cause:
            return ["Root cause not identified"]
        whys = []
        cause = self.root_cause["description"]
        why_count = 0
        while cause and why_count < 5:
            whys.append(f"Why? {cause}")
            cause = self._get_deeper_cause(cause)
            why_count += 1
        return whys

    def _get_deeper_cause(self, cause: str) -> Optional[str]:
        deeper = {
            "null check missing": "developer didn't consider edge case",
            "no input validation": "trusted external input without sanitization",
            "wrong return type": "interface contract not documented",
            "race condition": "shared state without synchronization",
        }
        cause_lower = cause.lower()
        for key, val in deeper.items():
            if key in cause_lower:
                return val
        return None

    def summary(self) -> str:
        return json.dumps({
            "bug_id": self.bug_id,
            "title": self.title,
            "severity": "high" if self.root_cause else "unknown",
            "root_cause": self.root_cause["description"] if self.root_cause else "pending",
            "hypotheses_tested": sum(1 for h in self.hypotheses if h["status"] != "proposed"),
            "prevention": self.fix["prevention"] if self.fix else [],
        }, indent=2)
```

### Git Bisect Automation

```bash
# Automated git bisect script
cat > /tmp/bisect.sh << 'SCRIPT'
#!/bin/bash
# Usage: git bisect run /tmp/bisect.sh

# Build the project
npm run build > /dev/null 2>&1

# Run the specific test that catches the bug
npx jest --testPathPattern="tests/specific-bug-test" 2>&1 | grep -q "FAIL"

# Exit 0 if good (test passes), 1 if bad (test fails)
# Git bisect expects 0 for good, 1 for bad (or 125 for skip)
SCRIPT
chmod +x /tmp/bisect.sh

# Start bisect
git bisect start HEAD v1.0.0
git bisect run /tmp/bisect.sh
```

## Architecture Decision Trees

### Debugging Tool Selection

```
What language/platform?
├── JavaScript / TypeScript
│   ├── Node.js backend → --inspect + Chrome DevTools / VS Code
│   ├── Browser → Chrome DevTools / React DevTools / Redux DevTools
│   └── Mobile (React Native) → Flipper / React Native Debugger
│
├── Python
│   ├── Local → pdb / ipdb / breakpoint()
│   └── Production → traceback + structured logging + Sentry
│
├── Java / JVM
│   ├── Local → IntelliJ debugger / JDB / VisualVM
│   └── Production → JMX / JFR / heap dump / thread dump
│
├── .NET / C#
│   ├── Local → VS / Rider debugger / dotnet-trace
│   └── Production → dotnet-counters / dotnet-dump
│
├── Rust
│   ├── Local → lldb / gdb / rust-gdb
│   └── Panic → RUST_BACKTRACE=1 / RUST_LIB_BACKTRACE=1
│
└── Go
    ├── Local → delve debugger
    └── Production → pprof / trace
```

### Hypothesis Prioritization

```
Given multiple possible causes, which to test first?
├── Most recent change (git log, deployment)
├── Most likely based on error message
├── Easiest to test (quick experiment)
├── Most common cause for this type of bug
└── Components involved in critical path
```

## Production Considerations

- **Structured error logging**: Log all errors with correlation IDs, stack traces, and context. Use a consistent JSON format consumable by log aggregation tools.
- **Automatic error triage**: Set up automated error grouping by stack trace fingerprint. Route to appropriate team based on affected service.
- **Canary debugging**: Enable verbose debug logging for specific users or sessions via feature flags. Avoids deploying debug builds to all users.
- **Production breakpoints**: Use tools like Lightrun or Rookout for on-demand production debugging without redeployment or restart.

## Anti-Patterns

| Anti-Pattern | Why It Fails | Correct Approach |
|---|---|---|
| Debugging in production with console.log | Requires code change + redeploy just to add logging | Use structured logging at appropriate levels |
| Changing multiple things at once | Can't isolate which change fixed the bug | One change at a time, test after each |
| Fixing the symptom not the root cause | Bug reappears in different form | Trace to source, fix the root cause |
| Not writing a regression test | Same bug reintroduced later | Write test that fails before fix, passes after |
| Assuming without checking | "That can't be the cause" is often wrong | Verify every assumption with evidence |
| No reproduction steps | Can't verify fix or test regression | Always document full reproduction steps |
| Using outdated/stale reproductions | Bug already fixed or changed | Reproduce on latest code before debugging |

## Performance Optimization

- **Binary search on code**: Use git bisect for regression bugs. Automates the most efficient search strategy — O(log N) commits checked instead of O(N).
- **Focused test for reproduction**: Write a minimal test case that reproduces the bug. Avoids running full test suite during fix verification.
- **Conditional breakpoints**: Use data-dependent breakpoints to stop only when relevant conditions are met. Avoids manual stepping through thousands of iterations.
