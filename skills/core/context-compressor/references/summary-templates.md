# Summary Templates

## Standard Summary

```
## Decisions
- {decision} — {rationale} (alt: {rejected alternative})
- {decision} — {rationale} (alt: {rejected alternative})

## Files Changed
- {path}:{lines} — {description}
- {path}:{lines} — {description}

## Current State
{domain}: {completed}. {next milestone} pending.

## Next Steps
1. {action verb} {target} — {reason}
2. {action verb} {target} — {reason}

## Open Questions
- {question} → blocks {what it blocks}
- No open questions.
```

## Debugging Session Summary

```
## Root Cause
{bug}: {root cause at system level}

## Fix Applied
- {file}:{lines} — {change description}
- {file}:{lines} — {change description}

## Tests Added
- {test file}:{lines} — {what the test covers}

## Current State
Bug {fixed / in progress}. {verification status}.

## Next Steps
1. {monitor / verify in staging / write regression test}
2. {related fix or follow-up}

## Open Questions
- {remaining unknowns about scope or related issues}
```

## Code Review Summary

```
## Review Decisions
- {file}: {approve / changes requested / comment} — {key issue}
- {file}: {approve / changes requested / comment} — {key issue}

## Issues by Severity
- Critical: {count} — {summary}
- Major: {count} — {summary}
- Minor: {count} — {summary}

## Unresolved Discussions
- {file}:{line} — {still open question} → blocks approval

## Current State
{waiting on author / waiting on reviewer / ready to merge}

## Next Steps
1. Author addresses {n} items by {date}
2. Re-review by {reviewer}
```

## Architecture Design Summary

```
## Decision
{pattern selected}: {one-sentence description}

## Alternatives Considered
- {alternative 1} — rejected: {reason}
- {alternative 2} — rejected: {reason}

## Tradeoffs Accepted
- {tradeoff 1}: {pro} vs {con}
- {tradeoff 2}: {pro} vs {con}

## System Boundaries
- {module}: {responsibility}
- {module}: {responsibility}

## Current State
Design phase {complete / in progress}. {next milestone}.

## Next Steps
1. Write ADR for {decision}
2. Create tech spec for {component}
3. Implement {component}
```

## Multi-Session Handoff Summary

For handing off between team members or across session boundaries:

```
## Session Identity
- Session: {session id or date}
- Agent/Skill: {skill name}
- Duration: {start} → {end} ({n} exchanges)

## Decisions (Preserved Across Sessions)
- [Session 1] {decision}
- [Session 2] {decision} (reversed session 1: {rationale})
- [Session 3] {decision}

## Files Changed
- Combined from all sessions, grouped by file

## Current State
Full project state as of {date}.

## Next Steps (Ordered)
1. {prerequisite first}
2. {dependent on 1}

## Open Questions
- Carried over: {question from previous session}
- New: {question from current session}

## Artifact Inventory
- {artifact path} — {status (draft / review / merged)}
- {artifact path} — {status}
```

## Incident Post-Mortem Summary

```
## Incident
- Severity: {SEV1/2/3}
- Duration: {start} → {end} ({n} minutes)
- Impact: {what broke, how many users affected}

## Timeline
- {time}: {event}
- {time}: {event}
- {time}: {event}

## Root Cause
{one-line description of the root cause}

## Fix Applied
{one-line description of the fix}

## Action Items
- P0: {item} — owner, deadline
- P1: {item} — owner, deadline
- P1: {item} — owner, deadline

## Open Questions
- {question for deeper investigation}
```

## Format Rules

| Section | Standard | Debug | Code Review | Architecture | Multi-Session | Incident |
|---------|----------|-------|-------------|--------------|---------------|----------|
| Max lines | 50 | 40 | 30 | 40 | 60 | 50 |
| Sections | 5 | 5 | 5 | 5 | 6 | 6 |
| Use abbreviations | Yes | Yes | Yes | Yes | Yes | Yes |
| Footer required | Yes | Yes | Yes | Yes | Yes | Yes |

## Template Selection Guide

- **Standard**: Default for most conversations
- **Debugging**: When the conversation was primarily about diagnosing a bug
- **Code Review**: When the conversation was a PR review session
- **Architecture**: When the conversation was about system design
- **Multi-Session**: When the summary spans multiple work sessions
- **Incident**: When the conversation documents an incident response

Select the template that matches the primary activity in the conversation. If the conversation mixed activities (e.g., debugging led to architecture changes), use the standard template with domain-prefixed sections from the hierarchical strategy.
