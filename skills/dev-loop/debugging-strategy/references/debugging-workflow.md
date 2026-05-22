# Debugging Workflow Reference

## Root Cause Analysis Process

1. **Reproduce** — Get a reliable, minimal reproduction
2. **Measure** — Collect all available evidence (logs, metrics, traces, state)
3. **Hypothesize** — List 3-5 possible causes ranked by likelihood
4. **Test one hypothesis** — Change one variable at a time
5. **Verify** — Confirm the fix resolves the reproduction
6. **Document** — Record root cause, fix, and prevention

## Binary Search Debugging

For regression bugs in a known commit range:

```bash
# Find the commit that introduced the bug
git bisect start
git bisect bad HEAD
git bisect good v1.0.0
# Git checks out middle commit — test and mark
git bisect good  # or git bisect bad
# Repeat until commit found
git bisect reset
```

For data processing pipelines, binary search on input size:
1. Remove half the data — bug still occurs?
2. Yes → remove half of remaining
3. No → add back half of what was removed
4. Repeat until minimal reproduction found

## Rubber Duck Debugging

Read the code aloud line by line to an inanimate object. Forces:
- Slowing down and reading every line
- Articulating assumptions
- Noticing mismatches between intent and implementation

## Scientific Method in Debugging

```
1. Observe → "The API returns 500 on POST /orders"
2. Question → "Is the validation middleware rejecting valid input?"
3. Hypothesis → "The schema validation requires 'email' but the client sends 'user_email'"
4. Prediction → "If we rename the field to 'email', the request succeeds"
5. Test → Rename field and retry
6. Analyze → Request succeeds. Hypothesis confirmed.
```

## Evidence Collection Checklist

- [ ] Full error message and stack trace
- [ ] Request/response payloads
- [ ] Logs around the time of failure (structured, with timestamps)
- [ ] System metrics (CPU, memory, disk, network) at failure time
- [ ] Database state before and after
- [ ] Recent deployments or config changes
- [ ] Relevant test results

## Common Root Cause Categories

| Category | Examples | Detection |
|----------|----------|-----------|
| Race condition | Shared state, async ordering | Thread sanitizer, logs |
| Null/undefined | Missing null check | Stack trace, type checker |
| Off-by-one | Loop boundary, pagination | Boundary testing |
| State leak | Global variable, cache | Memory profiler |
| Config drift | Different config per env | Config diff |
| Timing | Timeout too short, clock skew | Log timestamps |
| Dependency | Wrong version, breaking change | Dependency diff |

## Verification Rules

- Fix must pass the original reproduction case
- Add a regression test that would catch re-occurrence
- Run the full test suite to check for side effects
- Document the verification in the bug report
