# Story Advanced Topics

## Advanced Acceptance Criteria Patterns

### State-Dependent Scenarios
```
Given invoice status is "pending"
When user clicks "pay"
Then invoice status changes to "processing"
And payment processing job is queued
```

### Multi-Condition Scenarios
```
Given user is authenticated
And account has insufficient balance
When user initiates transfer of $500
Then transfer is rejected
And user sees "Insufficient balance" error
And balance is not debited
```

### Concurrency Scenarios
```
Given two users access the last available item simultaneously
When both users attempt to purchase
Then exactly one purchase succeeds
And the other user sees "Item no longer available"
```

### Data-Driven Scenarios
```
Given a product with price $10.00
When user applies coupon "SAVE10" (10% off)
Then total is $9.00

Given a product with price $10.00
When user applies coupon "SAVE5" ($5 off)
Then total is $5.00
```

## Story Splitting Techniques

### By CRUD Operation
One story for Create, one for Read, one for Update, one for Delete. Each is independently completable. Useful when different operations have different priority or complexity.

### By User Role
One story for Admin, one for Regular User, one for Anonymous User. Each role has different permissions and flows. Useful for permission-sensitive features.

### By Form Section
For complex forms, split by logical section. Story 1: Profile information. Story 2: Payment details. Story 3: Review and submit. Useful for multi-step wizards.

### By Device
One story for Desktop, one for Mobile, one for Tablet. Useful when responsive behavior is complex.

### By Scenario
Basic story (happy path only), then follow-up stories for edge cases and error handling. Useful when the happy path is urgent.

### By Data Type
One story per data type in polymorphic features. Story 1: Text posts. Story 2: Image posts. Story 3: Video posts.

## Story States (Kanban)

| State | Definition | Owner |
|-------|------------|-------|
| Backlog | Refined, estimated, prioritized | Product Manager |
| Ready | Dependencies met, next to start | Product Manager |
| In Progress | Developer actively working | Developer |
| In Review | Code review, QA testing | Developer + QA |
| Done | Merged, deployed, verified | QA |
| Blocked | Waiting on dependency | Developer (escalating) |

## Technical Notes Depth

### Minimal Technical Notes
For simple stories where implementation is well-understood:
- File references only
- ADR references
- DB migration flag

### Detailed Technical Notes
For complex stories with multiple components:
- File references with line numbers or patterns
- API contract references
- Data model changes with field-by-field specs
- Migration plan with rollback
- Performance considerations
- Security considerations
- Error handling strategy

### Spike Story Technical Notes
For research stories:
- Research questions
- Decision criteria
- Constraints
- Output format (ADR recommendation, comparison table, prototype)
- Timebox duration

## Estimating with Reference Stories
Use completed stories as anchors for estimation:
1. Find a completed story similar in scope
2. Adjust for known differences (complexity, uncertainty, new technology)
3. Apply the same size

This is more accurate than estimating from scratch because it uses the team's actual history rather than hypotheticals.

## Handling Technical Debt Stories
Technical debt stories follow the same format but the user role is "Developer" or "System":
"As a developer, I want consistent error handling middleware so that API errors are predictable and code review is faster."

Acceptance criteria for tech debt stories focus on developer experience and system qualities: consistency, performance, maintainability, testability.

## Linking to PRD and Brief
Every story file should include traceability links:
- Epic: {Epic name from PRD}
- PRD Feature: {Feature from brief}
- Related ADRs: ADR-{NNN}, ADR-{NNN}

This ensures anyone reading the story can understand its context without searching.

## Story Refinement (Backlog Grooming)

### Refinement Cadence
- Weekly: 2-hour session for 2-week sprint cycle
- Review: Stories for the next 1-2 sprints
- Accept: Stories passing Definition of Ready
- Split: Stories too large
- Add: Missing acceptance criteria
- Re-estimate: Stories where understanding changed

### Definition of Ready
A story is ready for implementation when:
- Acceptance criteria are clear and testable
- Dependencies are resolved or documented
- Technical notes reference specific files and patterns
- Complexity is estimated
- UX designs are complete (if UI story)
- API contracts are defined (if backend story)
- Team has capacity to start
