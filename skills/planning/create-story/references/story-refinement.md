# Story Refinement

## Backlog Refinement

### Purpose
- Ensure stories are ready for sprint planning
- Add missing details and acceptance criteria
- Split large stories into manageable pieces
- Estimate effort and validate dependencies

### Cadence
- Weekly for active sprints
- Bi-weekly for future sprints
- Monthly for epic-level refinement

## Story Splitting Patterns

### Splitting by Workflow Step
```
Large: "User completes checkout"
Split:
  Story 1: User adds items to cart
  Story 2: User enters shipping address
  Story 3: User selects payment method
  Story 4: User confirms order
```

### Splitting by Business Rule
```
Large: "Admin manages user permissions"
Split:
  Story 1: Admin views user roles
  Story 2: Admin assigns role to user
  Story 3: Admin removes role from user
  Story 4: System logs permission changes
```

### Other Splitting Strategies
| Strategy | When to Use |
|----------|-------------|
| By platform | Feature works differently on mobile vs desktop |
| By data type | Different handling for different entity types |
| By operation | Create, read, update, delete separately |
| By complexity | Simple case first, edge cases later |
| By spike needed | Investigate first, implement after |

## Acceptance Criteria Patterns

### Given-When-Then
```gherkin
Scenario: User resets password
  Given the user is on the login page
  When they click "Forgot password"
  And enter their email address "user@example.com"
  Then they receive a password reset email
  And the system logs the reset request
```

### Rule-Oriented
```
- Passwords must be at least 8 characters
- Passwords must contain uppercase, lowercase, digit
- Password reset links expire after 15 minutes
- Maximum 3 reset requests per hour per user
```

## Definition of Ready

### Checklist
- [ ] Story has clear title and description
- [ ] Acceptance criteria defined (Given-When-Then or rule-based)
- [ ] Dependencies identified and unblocked
- [ ] Technical approach validated
- [ ] Design assets available (if needed)
- [ ] Estimated (story points or hours)
- [ ] Edge cases documented
- [ ] Questions resolved or documented

## Definition of Done

### Checklist
- [ ] Code written and reviewed
- [ ] All acceptance criteria met
- [ ] Automated tests pass (unit, integration)
- [ ] Manual testing completed
- [ ] Documentation updated
- [ ] No known regressions
- [ ] Deployed to staging
- [ ] Product owner accepted
