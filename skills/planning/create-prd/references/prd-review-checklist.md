# PRD Review Checklist

## Structural Checklist

### Epics
- [ ] 5-8 epics covering all feature areas from the brief
- [ ] Each epic has a clear, descriptive name
- [ ] Each epic has a 2-3 sentence description of scope
- [ ] Epics are independent (can be implemented in any order)
- [ ] No epic is so large it warrants its own PRD (>15 stories)
- [ ] Every MVP feature from the brief maps to at least one epic

### User Stories
- [ ] 3-5 stories per epic
- [ ] Each story follows "As a... I want to... so that..." format
- [ ] No story describes implementation details (no tech in stories)
- [ ] Stories are independently shippable (vertical slices)
- [ ] Stories are completable in 1-3 days
- [ ] No story is a task ("set up database") rather than a feature

### Acceptance Criteria
- [ ] Every story has at least 2 acceptance criteria
- [ ] At least 1 happy path and 1 edge case per story
- [ ] Criteria use Given/When/Then format consistently
- [ ] Each criterion is objectively verifiable (pass/fail)
- [ ] No criteria reference internal implementation
- [ ] Edge cases cover: empty state, error state, boundary values
- [ ] Error cases cover: auth failure, validation failure, not found

### Complexity Estimates
- [ ] Every story has a complexity rating (XS/S/M/L/XL)
- [ ] Medium (M) stories can still be completed in 1-2 days
- [ ] Large (L) stories have a note about potential split points
- [ ] XS stories are rare (<5% of total stories)

### Non-Functional Requirements
- [ ] Performance: response time targets specified numerically
- [ ] Security: auth method, encryption, audit requirements defined
- [ ] Scalability: concurrent user target specified
- [ ] Availability: uptime percentage specified
- [ ] At least 4 categories covered (from the template)
- [ ] Targets are realistic for the team and stage
- [ ] Verification method specified for each requirement

### Definition of Done
- [ ] Testing requirements specified (unit, integration, E2E)
- [ ] Code review requirement included
- [ ] Documentation update requirement included
- [ ] Deployment and verification steps included
- [ ] Accessibility check included (for UI features)
- [ ] Migration rollback plan included (for DB changes)

## Quality Checklist

### Clarity
- [ ] Someone outside the team can understand each story
- [ ] No ambiguous terms ("fast", "responsive", "easy to use")
- [ ] Acceptance criteria leave no room for interpretation
- [ ] Edge cases are specific (e.g., "empty list" not "weird data")

### Completeness
- [ ] All user roles mentioned in the brief have stories
- [ ] All MVP features from the brief have corresponding stories
- [ ] Admin/management features are covered (if needed)
- [ ] Error states and empty states are covered for every feature
- [ ] Auth and permissions are addressed for every role

### Consistency
- [ ] Story titles use consistent format (verb-first: "Create...",
  "View...", "Edit...", "Delete...")
- [ ] User roles are consistent across all stories
- [ ] Terminology matches the brief (same feature names)
- [ ] Acceptance criteria format is consistent (Given/When/Then)

### Feasibility
- [ ] Stories can be implemented with the team's tech stack
- [ ] Dependencies between stories are documented
- [ ] No story requires unavailable third-party services
- [ ] Non-functional targets are achievable with current infrastructure

## Review Scoring

| Category | Weight | Score (1-5) | Notes |
|----------|--------|-------------|-------|
| Clarity | 25% | | |
| Completeness | 25% | | |
| Consistency | 15% | | |
| Feasibility | 20% | | |
| Testability | 15% | | |
| **Total** | **100%** | | |

Score each category 1-5, multiply by weight, sum to get a total
score out of 5. Pass threshold: 4.0. Below 4.0 requires revisions.

## Common Issues and Fixes

| Issue | Example | Fix |
|-------|---------|-----|
| Story is a task | "Set up PostgreSQL database" | Rewrite as user-facing: "System stores user data so that accounts persist across sessions" |
| No edge case | Only happy path given | Add: "Given network fails When submitting Then error is shown and data is saved locally" |
| Vague criterion | "Works correctly" | Replace with specific: "Returns HTTP 200 with expected JSON body" |
| Too many stories per epic | 10+ stories | Split epic into two or merge related stories |
| Implementation detail | "Call API endpoint /api/v1/users" | Replace with: "System validates user credentials and returns appropriate response" |
| Missing non-functional | No security requirements | Add auth, encryption, and access control requirements |
| Inconsistent naming | "User mgmt" in one, "Account settings" in another | Align terminology across all epics |
