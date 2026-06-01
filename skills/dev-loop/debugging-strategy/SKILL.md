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
