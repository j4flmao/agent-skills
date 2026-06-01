# Debugging Strategy Fundamentals

## Overview
Debugging is the systematic process of identifying, isolating, and resolving software defects. A structured methodology is essential for efficient debugging.

## Core Concepts

### Concept 1: Reproduce First
Always reproduce the bug before attempting to fix. Understand: environment (OS, runtime, dependencies), frequency (always, intermittent, specific conditions), and regression status (was it working before?). Document exact reproduction steps. Without reproduction, you can't verify the fix.

### Concept 2: The Scientific Method
Observe → Hypothesize → Predict → Experiment → Analyze → Conclude. Form specific hypotheses ("This crashes because user.profile is null when user has no profile"). Design experiments to disprove your hypothesis. One experiment at a time.

### Concept 3: Isolation Strategy
Binary search: narrow the problem space by eliminating half the possibilities. Git bisect for commits, comment out blocks of code, toggle feature flags, vary inputs systematically. Eliminate variables until only the root cause remains.

### Concept 4: Tool Utilization
Debuggers (breakpoints, watch, step through), logging (structured, levels, correlation IDs), profilers (CPU, memory, I/O), crash reporting (Sentry, Bugsnag), and distributed tracing (OpenTelemetry). Use the right tool for the symptom type.

### Concept 5: Fix Verification
After fixing: run the exact reproduction steps to confirm, add a regression test, verify existing tests still pass, and document root cause in the commit message. The fix is not done until verified.

## Best Practices

- Reproduce first, always
- One change at a time (multiple changes = unknowns)
- Use git bisect for regressions
- Write regression test first (TDD for debugging)
- Check data assumptions (null, empty, malformed)
- Read error messages completely
- Simplify the environment
- Use a debugger (not print statements)
- Document root cause in the fix

## Anti-Patterns

- Skipping reproduction (guessing at fixes)
- Changing many things at once
- Confirmation bias (seeking evidence for assumption)
- Not isolating (debugging full codebase)
- Overlooking recent changes (git log)
- Fixing symptom, not cause
- No regression test (bug returns)
- Debugging without tools (console.log only)
