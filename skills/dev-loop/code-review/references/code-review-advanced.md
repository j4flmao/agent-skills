# Code Review Advanced

## Overview
Advanced code review covers security code review, deep architecture review, metrics-driven review processes, cross-team review patterns, AI-assisted review, and review culture building.

## Advanced Concepts

### Concept 1: Security-Focused Review
Review for: injection (look for string concatenation in SQL/queries), authentication (session management, token storage), authorization (role checks, object-level access), SSRF (URL validation), and data exposure (PII in logs/responses). Use a security review checklist separate from the standard checklist.

### Concept 2: Architecture Review
Beyond diff: review for coupling (is this adding dependencies?), cohesion (does this belong together?), extensibility (is the API future-proof?), consistency (does this follow established patterns?), and testability (can this be unit tested?). Require design documents for architecture-impacting changes.

### Concept 3: Review Metrics
Track: review response time (target < 4h), PR size (trending up is a warning), finding density (issues per 100 lines), re-review rate (found issues after approval), and PR cycle time (open to merge). Metrics identify process bottlenecks.

### Concept 4: Team Review Culture
Psychological safety: questions framed as learning opportunities. Review rotation: pairs swap review duties weekly. Knowledge sharing: explain patterns, not just fix. Review as mentorship. No blame. Post-mortem for post-merge incidents without blame.

### Concept 5: AI-Assisted Review
AI tools for: code style (consistent with project), repetitive patterns (missing null checks), test coverage gaps undocumented code. AI as first-pass reviewer (flag early). Human review validation of AI findings. Train AI on project conventions.

## Advanced Techniques

### Security Checklist in Comments
```markdown
## Security Checklist
- [ ] Input sanitized
- [ ] Auth boundary respected
- [ ] No secrets leaked in logs
- [ ] Rate limited if public endpoint
- [ ] Parameterized query (not string concat)
```

### Architecture Review Template
```
- Coupling: New dependencies?
- Cohesion: Belongs in this module?
- Security: Attack surface?
- Performance: N+1 queries?
- Extensibility: Will this need changing?
- Testability: How is this tested?
```

## Anti-Patterns

- Rubber-stamp review (approving without understanding)
- Hostile tone (blocks learning culture)
- Reviewing only security, missing logic errors
- No metric tracking (can't improve process)
- AI review replacing human judgment (false positives merged)
- Architecture review on a 5-line change (disproportionate)
- Reviewing Friday afternoon (cognitive fatigue)
- Blocking on personal preference (not standards)
