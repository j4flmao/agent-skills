---
name: debugging-strategy
description: >
  Use this skill when the user says 'debug', 'bug', 'not working', 'error',
  'exception', 'unexpected behavior', 'help me fix', 'something is wrong', 'failing
  test', or when troubleshooting a problem. Follows an evidence-based, systematic
  debugging workflow: reproduce → hypothesize → gather evidence → test one
  hypothesis → verify → document root cause. Works with any language/stack.
  Do NOT use this for: code review (use code-review), performance optimization
  (use performance-profiler), or adding new features.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [dev-loop, debugging, phase-4]
---

# Debugging Strategy

## Purpose
Systematic, evidence-based debugging — no random changes, no shotgun fixes.

## Scientific Method for Debugging

Debugging is the scientific method applied to software. Every investigation must follow observe → hypothesize → test → conclude. No exceptions.

### Bug Taxonomy
Understanding the bug class helps select the right technique. Logic bugs: code does something unintended, runs without crashing. Memory bugs: leaks, use-after-free, buffer overflow, null dereference. Concurrency bugs: race conditions, deadlocks, livelocks, starvation. Performance bugs: slow code paths, resource contention, suboptimal algorithms. Configuration bugs: system works correctly but inputs, flags, or environment are wrong. Heisenbugs: behavior changes under observation (debugger, logging, different timing). Distributed bugs: network partitions, partial failures, clock skew, inconsistent state across services. Each class responds best to specific tools: Valgrind for memory, thread sanitizers for concurrency, profilers for performance, structured logging for distributed bugs. Classifying the bug before choosing tools prevents wasted effort — do not profile a logic bug, do not bisect a memory corruption bug.

### Bug Severity Assessment
Not every bug deserves the same level of investment. Critical: data loss, security vulnerability, complete service outage, P0 customer impact. Fix immediately, full debugging protocol. Major: degraded functionality, partial outage, high-severity regression. Fix within sprint, follow full protocol. Minor: cosmetic issue, edge case in unused code path, low-frequency error. Log and schedule for next triage, minimal debugging effort. Classify severity before starting — urgent bugs may skip the full scientific method in favor of rapid containment, then revisit for root cause analysis.

### Observe
Collect exact failure symptoms. What input reproduces the bug? What state is the system in at the moment of failure? Capture logs, stack traces, metrics, screenshots, core dumps. Reproduce the bug at least twice consecutively — a bug you cannot reproduce is a bug you cannot fix. If reproduction is intermittent, identify the frequency pattern (every N requests, only under load, only on specific hardware or OS version). Record the environment: OS, runtime version, dependency versions, configuration values, deployment topology. Environment drift is a common cause of heisenbugs.

### Hypothesize
Formulate a specific, testable hypothesis. Not "something is wrong with the database" but "the connection pool is exhausted because maxActive=10 and all connections are held by slow unindexed queries against the orders table." A good hypothesis is falsifiable — you can write a test or collect data that proves it wrong. Rank hypotheses by two criteria: probability (based on code reading, past incidents, and known trouble spots) and cost to test (a quick log line addition ranks higher than a full environment rebuild). Document the hypothesis before testing — writing it down prevents confirmation bias where you interpret ambiguous results as supporting your preferred explanation.

### Test
Design the smallest possible experiment that confirms or refutes your hypothesis. Add a single structured log line, write a focused unit test, insert a temporary assertion at the suspect location, add a metrics counter, or git-bisect the commit range. Test exactly one hypothesis per experiment — testing two simultaneously makes it impossible to attribute cause and effect. Prefer the experiment that eliminates the most uncertainty per unit time. A cheap test that eliminates a low-probability hypothesis is often better than an expensive test that confirms a high-probability one, because elimination narrows the remaining search space.

### Conclude
Examine the evidence. Does it support or refute the hypothesis? If the hypothesis is confirmed, proceed to root cause analysis — understand not just that this is the cause but why the code reached this state. Then design and apply the fix. If the hypothesis is refuted, update your mental model of the system: what did you assume that was wrong? Generate a new hypothesis that accounts for the new evidence. Document refuted hypotheses — they contain signal about what is NOT wrong, which accelerates future debugging sessions on the same system.

## Agent Protocol

### Trigger
Exact user phrases: "debug", "bug", "not working", "error", "exception", "unexpected behavior", "help me fix", "something is wrong", "failing test".

### Input Context
Before activating, verify:
- The bug report or failing test is provided.
- Steps to reproduce are available or can be determined.
- Environment details (OS, versions, configuration) are known.

### Output Artifact
No file output. This skill produces a debugging report.

### Response Format
Answer exactly:
```
## Debugging Report
### Reproduction
- Input: {exact input}
- Expected: {expected behavior}
- Actual: {actual behavior}
### Root Cause Analysis
- Hypotheses tested: {ranked list with results}
- Root cause: {what was actually wrong}
### Fix
- Change: {what was changed and where}
- Verification: {test results confirming fix}
### Prevention
- Test added: {link to test}
- Process improvement: {code review check, lint rule, etc.}
```

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

## Debugging Techniques

### Rubber Duck Debugging
Explain the bug line-by-line to an inanimate object or willing colleague. The act of verbalizing forces you to surface hidden assumptions about what each line of code does. The fix often becomes obvious mid-explanation. Use this as the first technique for any bug — it costs nothing and works surprisingly often (30-40% of bugs resolve during the explanation). If you find yourself saying "wait, that shouldn't matter" or "actually, I do not know what that function returns," you have located the relevant code. Continue until the exact line is isolated.

### Git Bisect
Binary search through commit history to find the exact commit introducing a regression. `git bisect start; git bisect bad; git bisect good <known-good-sha>`. Git checks out the midpoint. Mark each: `git bisect good` or `git bisect bad`. After ~log2(n) steps the culprit commit is identified. Automate with `git bisect run <script>` for regression suites. Requires clean reproduction — intermittent failures produce wrong bisect results. For flaky tests, bisect three times and take the mode.

### Binary Search (Code Space)
Divide the suspect code region in half with print statements or assertions at the midpoint. Determine whether the bug manifests before or after the insertion point. Narrow the search range by half each iteration. A 1024-line function needs at most 10 probes. Combine with log analysis for production where re-deploying is expensive. Best for: null pointer dereferences, off-by-one errors, wrong-branch-taken bugs, and state corruption where the crash site is far from the cause.

### Log Analysis
Collect structured logs with correlation IDs spanning service boundaries. Every entry: timestamp ISO 8601, severity (DEBUG/INFO/WARN/ERROR/FATAL), correlation_id, service_name, operation, duration_ms, structured context as key-value pairs. Protocol: (1) locate failure timestamp, (2) grep for ERROR/FATAL in that window, (3) extract correlation_id, (4) trace it backward to the first anomaly, (5) trace forward to understand the cascade. Tools: `grep | jq`, `lnav`, ELK/Loki, OpenTelemetry collector.

### Stack Trace Analysis
Read innermost exception first — it contains the primitive failure (null ref, div by zero, OOB index). Identify frames from your own code by package/namespace prefix. At each of your frames, infer variable values from the line number. Walk up the stack to find where the problematic value was computed. For chained exceptions, each "caused by" is a wrapping layer — the innermost is root cause. For async code, look for the original call site before the first await — continuation frames may be truncated by the runtime.

## Tool-Specific Debugging

See `debugging-techniques.md` for detailed technique walkthroughs with code examples.
See `tool-specific.md` for debugger setup, commands, and language-specific workflows.

Each debugger has strengths: GDB for native code, Chrome DevTools for frontend, VS Code for general-purpose, dotMemory for .NET memory analysis, Valgrind for C/C++ memory safety. Choose the tool that gives the most relevant information for your specific bug class. For JavaScript/TypeScript: use Chrome DevTools or VS Code debugger with source maps. For Python: use pdb or PyCharm debugger, traceback module for post-mortem. For Go: use Delve debugger with VS Code or Goland, runtime/pprof for CPU/memory debugging. For Rust: use GDB/LLDB with Rust extensions, rust-lldb for source-level debugging, rr for reverse execution. For C/C++: GDB with pwndbg or gef extensions for improved UX, AddressSanitizer and UndefinedBehaviorSanitizer for compile-time instrumentation, Valgrind for runtime memory checking, perf for CPU profiling, Clang Static Analyzer for compile-time analysis. For Java: use JDWP remote debugging, JMC for flight recorder, async-profiler for CPU profiling.

## Debugging Mindset

Stay objective. Bugs are not personal — the code does exactly what it was told, even if that is not what you intended. Avoid confirmation bias: do not look for evidence that supports your favorite hypothesis, actively look for evidence that refutes it. Avoid sunk cost: if a hypothesis has been tested three times with no result, drop it and generate a new one. Avoid shotgun debugging: making random changes hoping something sticks is the least efficient approach. Avoid blame culture: if someone else wrote the code, that does not make it more or less likely to contain the bug. Every bug is a process failure — ask what in the development workflow allowed this bug to reach production, not who wrote it.

## Debugging Checklist

Before diving into any bug, run this checklist: (1) Can I reproduce it consistently? If no, prioritize reproduction over analysis. (2) When did it last work? If a previously passing test now fails, bisect. (3) What changed? Check recent commits, config changes, deployment versions, and dependency updates. (4) Is it isolated to one environment? Dev vs staging vs production — environment drift causes many bugs. (5) Can I write a failing test? A test that reproduces the bug is both a diagnostic tool and a regression guard. (6) Are there related failures? Check monitoring dashboards for correlated error spikes. (7) Do I have enough context? Collect logs, thread dumps, heap dumps, and network captures before starting.

## Reproducing Bugs

A reproducible bug is 90% fixed. If the bug is intermittent, take these steps before attempting fixes: (1) Increase logging around the failure site — log every variable state, every branch taken, every return value. (2) Run the operation 100 times and look for patterns in which runs fail (always the Nth request, always after a specific event, always on a specific thread). (3) Check for environment sensitivity — does it repro on different OS, different hardware specs, different network latency, different timezone? (4) Use chaos engineering tools (Gremlin, Chaos Monkey) to systematically vary conditions until you find the trigger. (5) Record the failing scenario with replay tools (rr for native code, Playwright trace viewer for browser, pcap for network). A recorded reproduction can be replayed indefinitely without the Heisenbug effect.

## Remote Debugging

Attach a debugger to a remote process. Prerequisites: debug port open (5005 JVM, 9229 Node, 4020 .NET), network reachability (SSH tunnel or VPN), debug symbols deployed. Never attach debugger to production — breakpoints freeze the process. Prefer post-mortem: capture core dump (`gcore`, `dotnet-dump`, `jmap`) and analyze offline. For Kubernetes: `kubectl debug` creates ephemeral containers with diagnostic tools. For containers: mount debug symbol volumes, use multi-stage images with debug builds.

## Production Debugging

Production demands non-invasive techniques. Toolbox: structured logging with correlation IDs, metrics dashboards (Grafana showing error rates, latency percentiles, saturation), distributed tracing (OpenTelemetry, Jaeger for trace context propagation), health-check endpoints exposing internal state (`/health`, `/ready`, `/debug/vars`), core dump generation on crash with automatic upload. Minimize observer effect — adding verbose logging changes timing and hides race conditions. Prefer always-on instrumentation at low sampling rate over toggle-able verbose modes.

## Concurrency Debugging

Race conditions, deadlocks, and livelocks require specialized approaches. For race conditions: enable thread sanitizers (TSan for C/C++, Go race detector, Valgrind Helgrind for Linux). The sanitizer reports exactly which two threads accessed which memory without synchronization. For deadlocks: enable lock ordering analysis (lockdep for Linux kernel, Clang Thread Safety Analysis, WPF Dispatcher analysis). Dump all thread stacks and look for circular wait conditions. For livelocks: check for retry loops without backoff, optimistic concurrency without abort strategy, polling loops without sleep. Use thread dumps (jstack, pstack, `kill -3`) at intervals to see which threads are making progress and which are stuck.

## Performance Debugging

Performance regressions need profiling, not breakpoints. Start with CPU profiling for hot paths, then memory profiling for GC pressure and allocation rate, then I/O profiling for blocking calls, then lock profiling for contention. Flame graphs visualize time per function — wider horizontal segments mean more total time. Find the widest segment in your own application code and investigate why it dominates. See `performance-profiler` for full workflow, benchmark methodology, and bottleneck prioritization.

## Heisenbugs

Bugs that disappear when you try to observe them. Common causes: timing changes from added logging or breakpoints (solving: use event tracing instead of print statements), undefined behavior optimization by compiler (solving: build with `-O0 -fno-strict-aliasing`), race conditions where observation changes thread interleaving (solving: record and replay with rr or similar), memory corruption from buffer overflow that happens to not crash until a specific allocation pattern (solving: run under AddressSanitizer or Valgrind), JIT compilation differences (solving: disable JIT, use interpreter mode). Strategy: minimize observer effect — use always-on lightweight instrumentation instead of toggle-able debug modes. Use core dump post-mortem analysis instead of live debugging. Record and replay tools (rr, UndoDB, Mozilla WebReplay) eliminate Heisenbugs entirely by separating recording from analysis.

## Memory Leak Detection

Common patterns: static/global collections growing unbounded, event listeners never deregistered, closure references capturing large object graphs, caches without eviction policies, thread-local storage accumulating per-request data, string interning tables in long-running processes. Detection protocol: take heap snapshot A, perform operation N times, take heap snapshot B, diff snapshots to find growing object types, trace retention path from each growing object to its GC root. For managed languages, force full GC before each snapshot for clean diffs. For native code, use Valgrind Memcheck, LeakSanitizer, or AddressSanitizer with leak detection enabled.

## References
  - references/debugging-strategy-advanced.md — Debugging Strategy Advanced Topics
  - references/debugging-strategy-fundamentals.md — Debugging Strategy Fundamentals
  - references/debugging-workflow.md — Debugging Workflow Reference
  - references/production-debugging.md — Production Debugging
  - references/remote-debugging.md — Remote Debugging Guide
  - references/toolchain.md — Debug Toolchain Reference
## Handoff
After completing this skill:
- Next skill: **refactor-guide** — if the fix requires structural cleanup
- Pass context: root cause, fix applied, regression test added
No filler. Strip articles where unambiguous. Why use many token when few do trick.
