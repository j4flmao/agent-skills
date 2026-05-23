# Debugging Techniques

## Rubber Duck Debugging

Verbalize the problem step by step to a rubber duck or willing listener. For each line of failing code, state the expected behavior and the actual behavior. The moment you articulate a discrepancy, you locate the bug.

Works for: logic errors where the code does not match the programmer's intent, race conditions revealed by incorrect assumptions about execution order, API contract violations (wrong argument type, null when non-null expected), incorrect state transitions in state machines, and configuration drift between environments.

Protocol:
1. Obtain a rubber duck or willing colleague.
2. Start from the entry point of the failing code path.
3. Read each line or function call aloud, stating what you expect it to do.
4. When you encounter an expectation mismatch, flag that location.
5. Drill into the flagged location with breakpoints or additional logging.
6. If no mismatch surfaces, you have not been detailed enough — re-read every branch condition, every loop invariant, every null check.

Example: "I call `getUser(id)`. I expect it to return a User object. It returns null. Inside getUser, line 42 calls `db.find(id)`. I expect db.find to return a User. It also returns null. So the bug is either inside `db.find` or the data was never inserted. Let me check the insert path."

Rule of thumb: ~30-40% of bugs resolve during the rubber duck explanation itself. If you reach the end without finding the bug, you skipped a detail.

## Git Bisect

Binary search through git history to identify the exact commit introducing a regression.

```
git bisect start
git bisect bad                     # current HEAD is broken
git bisect good v1.2.0             # known-good tag or SHA
# Git checks out the midpoint
npm test                           # manually test
git bisect good                    # or git bisect bad
# repeat ~log2(n) times
git bisect reset
```

Automation: `git bisect run <script>` where exit 0 means good and non-zero means bad. Ideal for regression suites: `git bisect run npm test` or `git bisect run pytest tests/`.

Best practices: always start from a commit you know is good (tagged release or CI-passing commit). If the bug spans merge commits, use `git bisect --first-parent` to skip merge complexity. For intermittent failures, bisect three times and take the modal result.

Limitations: requires a clean reproduction every time — flaky tests produce wrong bisect results. Does not work well when the bug is caused by an interaction between two independent commits (solution: bisect for each component).

## Binary Search (Code Space)

Narrow the suspect region by placing print statements or assertions at its midpoint.

```python
# Midpoint of a 200-line function
logger.debug("midpoint: state=%s, index=%d", state, i)
if i == 100:
    print("HALFWAY: orders=%s", orders[:5])
```

If the bug manifests after the midpoint, search the second half. Otherwise search the first. Each iteration halves the search space — a 1024-line function needs at most 10 probes. Combine with log analysis for production systems where re-deploying takes minutes.

Most effective for: null pointer dereferences where the null was introduced far from the crash site, wrong-branch-taken where condition logic is deeply nested, incorrect state mutations in long functions, and off-by-one errors in complex index arithmetic.

## Log Analysis

Analyze structured logs to trace the failure from symptom to root cause. Every log entry must include: timestamp (ISO 8601 with timezone), severity, correlation_id (pass through every service boundary), service_name, operation name, duration_ms, and structured context as key-value pairs.

Protocol:
1. Locate the exact failure timestamp in your monitoring system.
2. Search for ERROR and FATAL entries within a 5-minute window around the failure.
3. Extract the correlation_id from the first error encountered.
4. Trace that correlation_id backward through the log stream to find the first anomaly — unexpected input, failed dependency call, timeout, or state violation.
5. Trace forward from the anomaly to understand the cascade into the visible failure.
6. If logs are insufficient, identify what data you need, add logging at the anomaly site, deploy, reproduce, and repeat.

Tools: `grep correlation_id logs/*.log | jq 'select(.severity=="ERROR")'` for ad-hoc analysis, `lnav` for interactive terminal navigation with automatic log format detection, ELK stack or Grafana Loki for aggregated search across distributed systems, OpenTelemetry collector for trace-aware log correlation with span context.

## Stack Trace Analysis

Systematic approach to reading exception traces:

1. Read the innermost exception message first — the "caused by" chain bottom. This is the primitive failure: null reference, division by zero, index out of bounds, assertion failure.
2. Filter for frames in your own code using the package or namespace prefix. Library and framework frames are noise 80% of the time.
3. At each of your frames, use the line number to identify the exact expression that failed. Read the source at that line to understand what was being computed.
4. Walk UP the stack (toward program entry) to find where the problematic value was computed or passed as an argument.
5. For wrapped exceptions, distinguish between a wrapper that adds context (like "failed to process order") and a wrapper that changes exception type (like wrapping SQLException in DataAccessException). The innermost cause is always the root.
6. For async/await code in C#, JavaScript, or Python, the stack trace may only show the rethrow point, not the original call site. Look for "async" or "awaited" markers in frame names. The frame before the first await is usually the most informative.

## Reproduction Techniques

Before applying any technique, ensure the bug is reproducible. Manual reproduction: run the exact steps from the bug report, verify the same failure occurs. For intermittent bugs: run in a loop until failure, collect logs from every run, look for patterns in which runs fail. Use `for i in $(seq 100); do run_test && break; done` with increased verbosity each iteration. Record network traffic with tcpdump/Wireshark and replay with tcpreplay. Record browser interactions with Playwright or Puppeteer trace viewer. Record native execution with `rr record` for deterministic replay. A deterministic replay means you can debug the exact same execution infinitely — the Heisenbug becomes a regular bug.

## Delta Debugging

Automated minimization of the failing input or program configuration to find the minimal trigger set. Given a failing set of changes, repeatedly partition it and test each subset. If a subset fails, recurse. The result is a minimal failing case — often dramatically simpler and more understandable than the original.

Tools: `creduce` for C/C++ compiler and static analysis bugs, `halfempty` for general-purpose minimization with parallel test execution, `picire` for Python-based delta debugging, `bisect` module in Python's standard library for simple numeric binary search.

Use when: filing bug reports against dependencies (minimal reproduction is required), debugging configuration conflicts where many settings interact, HTML/CSS rendering bugs where the minimal markup exposes the layout engine issue, and compiler/runtime bugs where the minimal source file triggers the miscompilation.

Example: a 5000-line SQL migration file causes a deadlock. Delta debugging narrows it to a single ALTER TABLE statement that acquires a conflicting lock with the application query. Without delta debugging, each statement would need manual isolation.

## Conditional Breakpoints

Breakpoints that only trigger when a specific condition is true. Essential for debugging loops, repeated operations, and state-dependent failures.

GDB: `break file.c:42 if x > 5 && strcmp(name, "admin") == 0`. Chrome DevTools: right-click line number in Sources tab → "Edit Breakpoint" → enter condition expression. VS Code: right-click breakpoint → "Edit Breakpoint" → condition. PyCharm: right-click breakpoint → "Condition" field. Use conditions to avoid manual iteration through thousands of loop cycles. For complex conditions, add a logpoint instead that logs the value without stopping.

Condition types: break on value (variable equals specific value), break on count (trigger every Nth hit), break on expression (complex boolean), break on change (data breakpoint watching memory address). Data breakpoints in GDB: `watch var_name` breaks when the variable's value changes.

Common use cases: break inside a loop only on the iteration where the bug manifests (use iteration counter condition), break on a function call only when called from a specific caller (use backtrace filter), break when a value transitions from valid to invalid (use data breakpoint with condition).
