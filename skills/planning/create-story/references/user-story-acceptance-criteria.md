# User Story Acceptance Criteria

## Overview

Acceptance criteria define the conditions that a user story must satisfy for the product owner to accept it as complete. They are the contract between product and engineering: precise, verifiable, and unambiguous. Well-written acceptance criteria prevent misunderstanding, enable automated testing, and ensure that the team delivers what the business actually needs. This reference covers acceptance criteria formats, quality standards, techniques for writing effective criteria, and patterns for different types of requirements.

## What Makes Good Acceptance Criteria

### The INVEST Criteria for Acceptance Criteria

Each individual acceptance criterion should be:

| Property | Meaning | Example |
|----------|---------|---------|
| I - Independent | Can be verified in isolation | "User can log in" is independent of "User can reset password" |
| N - Negotiable | Details can be discussed during implementation | "Response within 2 seconds" is negotiable; "Use Redis" is not |
| V - Valuable | Describes value, not implementation | "Order confirmation appears" not "CSS class 'confirmation' is visible" |
| E - Estimable | Clear enough to estimate effort | "Upload files up to 10MB" is estimable; "Upload reasonable files" is not |
| S - Small | Can be verified in one test scenario | "User searches by name" is small; "User searches with all 15 filters" is too big |
| T - Testable | Can be verified objectively | "Response time < 200ms" is testable; "Fast response time" is not |

### Acceptance Criteria Quality Checklist

- [ ] Each criterion is objectively verifiable (pass/fail, no subjectivity)
- [ ] No implementation details (how, not what)
- [ ] No ambiguous terms (easy, fast, intuitive, reasonable, efficient, appropriate)
- [ ] At least one positive (happy path) scenario
- [ ] At least one negative (error/edge case) scenario
- [ ] Specific inputs, states, and expected outputs
- [ ] Independent of other criteria in the same story
- [ ] Written before development begins

## Acceptance Criteria Formats

### Format 1: Gherkin (Given-When-Then)

The most popular format for acceptance criteria, especially when automating tests:

```gherkin
Feature: User Login
  As a registered user
  I want to log in to my account
  So that I can access my dashboard

  Scenario: Successful login with valid credentials
    Given I am on the login page
    When I enter a valid email "user@example.com"
    And I enter the correct password "ValidP@ss1"
    And I click the "Sign In" button
    Then I am redirected to my dashboard
    And I see a welcome message "Welcome back, John"

  Scenario: Login with invalid password
    Given I am on the login page
    When I enter a valid email "user@example.com"
    And I enter an incorrect password
    And I click the "Sign In" button
    Then I see an error message "Invalid email or password"
    And I remain on the login page

  Scenario: Login with unregistered email
    Given I am on the login page
    When I enter an unregistered email "unknown@example.com"
    And I enter any password
    And I click the "Sign In" button
    Then I see an error message "Invalid email or password"
    And I remain on the login page

  Scenario: Login with empty fields
    Given I am on the login page
    When I click the "Sign In" button without entering credentials
    Then I see validation messages "Email is required" and "Password is required"
    And I remain on the login page
```

**Gherkin Components:**

| Component | Purpose | Example |
|-----------|---------|---------|
| Feature | Groups related scenarios | Feature: User Login |
| Scenario | One testable behavior | Scenario: Successful login |
| Given | Precondition / initial state | Given I am on the login page |
| When | Action / event | When I enter a valid email |
| Then | Expected outcome | Then I am redirected to dashboard |
| And/But | Additional steps or exceptions | And I see a welcome message |

### Format 2: Rule-Oriented Criteria

For stories with complex business rules:

```markdown
## Acceptance Criteria: Shipping Cost Calculation

### Rule 1: Standard Shipping (3-5 business days)
- Orders under $50: $5.99 shipping
- Orders $50-$100: $3.99 shipping
- Orders over $100: Free shipping

### Rule 2: Express Shipping (1-2 business days)
- Flat rate $12.99 regardless of order total
- Not available for P.O. Box addresses

### Rule 3: International Shipping
- Base rate $15.00 for all international orders
- Additional $5.00 per kg over 5kg
- Customs duties NOT included in shipping cost
- Delivery estimate: 7-14 business days

### Rule 4: Shipping Exceptions
- Alaska/Hawaii: additional $5.00 surcharge
- APO/FPO addresses: USPS only, standard rates
- PO Box: UPS/FedEx not available, USPS only
```

### Format 3: Checklist Criteria

For simpler stories where scenarios are straightforward:

```markdown
## Acceptance Criteria: User Profile Edit

- [ ] User can update their display name (max 50 characters)
- [ ] User can update their profile photo (JPG, PNG, max 5MB)
- [ ] User can update their bio (max 500 characters)
- [ ] "Save Changes" button is disabled until a field is modified
- [ ] Unsaved changes warning appears if user navigates away
- [ ] Success toast "Profile updated" appears after save
- [ ] Validation error shown for invalid inputs
- [ ] Changes persist after page refresh
- [ ] Other users can see updated profile immediately
```

### Format 4: Specification by Example

Each criterion is a concrete example with specific inputs and expected outputs:

```markdown
## Acceptance Criteria: Discount Calculation

| Order Total | Discount Code | Discount % | Final Total |
|-------------|---------------|------------|-------------|
| $100.00     | WELCOME10     | 10%        | $90.00      |
| $50.00      | SAVE20        | 20%        | $40.00      |
| $25.00      | FREESHIP      | $0 (free shipping) | $25.00 |
| $100.00     | INVALIDXYZ    | 0% (invalid code)  | $100.00 |
| $0.00       | WELCOME10     | 0% (no order)      | $0.00    |
| $200.00     | MAXSAVE       | 15% (max $25 discount) | $175.00 |
```

## Writing Acceptance Criteria by Category

### Functional Criteria

Test what the system does:

```gherkin
Scenario: User creates a new project
  Given I am logged in as a registered user
  And I am on the projects page
  When I click "New Project"
  And I enter project name "Q1 Campaign"
  And I select template "Marketing Campaign"
  And I click "Create"
  Then I am redirected to the new project page
  And I see project name "Q1 Campaign"
  And the project is created from the "Marketing Campaign" template
```

### Error Handling Criteria

Test what happens when things go wrong:

```gherkin
Scenario: File upload exceeds size limit
  Given I am creating a new task with attachment
  When I upload a file of 12MB
  Then I see an error message "File size must be under 10MB"
  And the file is not attached to the task

Scenario: Network timeout during save
  Given I am editing a project
  When I click "Save" and the server does not respond for 30 seconds
  Then I see an error message "Connection lost. Your changes are saved locally."
  And my changes are preserved when the connection is restored
```

### Edge Case Criteria

Test boundary conditions and unusual states:

```gherkin
Scenario: Empty search results
  Given there are no products matching "xyznotexist"
  When I search for "xyznotexist"
  Then I see "No results found" message
  And I see suggestions "Try different keywords" or "Browse categories"

Scenario: Maximum items in cart
  Given I have 50 items in my cart (the maximum)
  When I try to add another item
  Then I see a message "Cart is full (maximum 50 items)"
  And the item is not added to the cart
```

### Performance Criteria

Test non-functional requirements:

```markdown
## Acceptance Criteria: Performance

- [ ] Search results appear within 2 seconds for queries matching < 10,000 results
- [ ] Search results appear within 5 seconds for queries matching > 10,000 results
- [ ] Page loads with Largest Contentful Paint (LCP) < 2.5 seconds on desktop
- [ ] API responds within 200ms (p95) under normal load
- [ ] API responds within 500ms (p95) under peak load (100 concurrent users)
```

### Accessibility Criteria

```markdown
## Acceptance Criteria: Accessibility

- [ ] All form inputs have associated label elements
- [ ] Error messages are announced by screen readers (aria-live region)
- [ ] Tab order follows visual layout
- [ ] All interactive elements are keyboard accessible
- [ ] Color contrast ratio meets WCAG AA standard (4.5:1 for normal text)
- [ ] Images have meaningful alt text
- [ ] Focus indicators are visible (not just browser default)
```

### Security Criteria

```gherkin
Scenario: User cannot access another user's data via URL manipulation
  Given I am logged in as user A (id: 100)
  When I navigate to /api/users/101/profile
  Then I receive a 403 Forbidden response
  And I do not see user B's profile data

Scenario: SQL injection attempt is rejected
  Given I am on the search page
  When I enter "'; DROP TABLE users; --" in the search field
  Then I receive a 400 Bad Request response
  And the system continues to operate normally
```

## Common Acceptance Criteria Anti-Patterns

| Anti-Pattern | Example | Problem | Fix |
|-------------|---------|---------|-----|
| Vague language | "The page loads fast" | Not testable — what is "fast"? | "The page loads with LCP < 2.5s" |
| Implementation details | "Uses Redis cache" | Tells how, not what | "Search results appear within 2 seconds" |
| Multiple conditions | "User can search and filter and sort results" | Tests multiple behaviors | Split into separate criteria or scenarios |
| Negative testing only | "System does not crash" | Not specific about expected behavior | "Error message appears with guidance" |
| Testing framework language | "expect(result.status).toBe(200)" | Implementation-specific | "API returns 200 status code" |
| Non-observable state | "Session token is stored" | Cannot be verified by user | "User remains logged in after page refresh" |
| Assumption overload | "Assuming valid input..." | Every scenario should be self-contained | Provide specific example values |
| The word "should" | "The system should show..." | Ambiguous commitment | "The system shows..." (definitive) |

## Writing Techniques

### Technique 1: Example Mapping

Example mapping is a collaborative technique for discovering acceptance criteria:

```markdown
## Example Mapping Session

### Materials
- Yellow cards: User stories (1 per story)
- Blue cards: Acceptance criteria / examples (multiple per story)
- Red cards: Questions / unknowns (things to resolve)
- Green cards: Business rules (underlying logic)

### Process (30-60 minutes per story)
1. Place the story card (yellow) on the table
2. Product owner explains the story (2-3 minutes)
3. Team asks questions, writes red cards for unknowns
4. Product owner gives concrete examples (blue cards)
5. Team identifies underlying business rules (green cards)
6. No technical discussion — focus on business behavior

### Output
- 3-8 example cards (blue) = candidate acceptance criteria
- 0-5 question cards (red) = things to research
- 1-3 business rule cards (green) = constraints the implementation must follow
```

### Technique 2: Behavior-Driven Development (BDD)

BDD shifts the focus from testing to specification:

```gherkin
# Discovery Phase
Product owner, developer, and tester discuss examples together.
No automation yet — focus on shared understanding.

# Formulation Phase
Examples are written in Gherkin format.
Product owner owns the scenarios (domain language).
Developer ensures scenarios are technically feasible.
Tester ensures scenarios cover edge cases.

# Automation Phase
Gherkin scenarios are automated using Cucumber/SpecFlow/etc.
Scenarios become executable specifications.
Automated tests document and verify the system behavior.
```

### Technique 3: Specification by Example (SbE)

SbE uses concrete examples to define requirements:

```markdown
## Step 1: Identify Key Examples
Before writing any code, identify 5-10 concrete examples
that represent the full range of behavior.

## Step 2: Automate Examples
Turn examples into automated tests using a BDD framework.

## Step 3: Make Examples Pass
Implement the feature until all examples pass.

## Step 4: Refine
Review examples with stakeholders.
Add examples for any missed scenarios.

### Example Set for "Password Reset"

| Scenario | Email | Token | Action | Expected Result |
|----------|-------|-------|--------|-----------------|
| Happy path | valid@user.com | correct | reset to "NewP@ss1" | Password updated |
| Expired token | valid@user.com | expired 2h ago | reset to "NewP@ss1" | "Link expired" error |
| Wrong email | wrong@user.com | any | reset | Generic message (don't reveal if email exists) |
| Weak password | valid@user.com | correct | reset to "123" | "Password too weak" error |
| Token reuse | valid@user.com | already used | reset to "AnotherP@ss1" | "Link already used" error |
```

## Acceptance Criteria by Story Type

### Bug Fix Criteria

```gherkin
Scenario: Error is resolved (bug fix verification)
  Given the following precondition that triggered the bug:
    - User was on the project page with 500+ tasks
    - User clicked "Select All" then "Bulk Delete"
  When the user checks the project page
  Then all selected tasks are deleted
  And the project page loads without errors
  And the task counter shows the correct remaining count

Scenario: Bug does not recur
  Given the user has 500+ tasks on the project page
  When the user clicks "Select All"
  Then all 500+ tasks are selected (not just first page)
```

### Technical Debt / Refactoring Criteria

```markdown
## Acceptance Criteria: Refactor Authentication Module

- [ ] All existing tests pass after refactoring (regression)
- [ ] Test coverage of auth module remains > 90%
- [ ] No change to public API (interface compatibility)
- [ ] Response times are not degraded (> baseline)
- [ ] No new dependencies introduced
- [ ] Deprecated code paths are removed (not just commented)
- [ ] Documentation updated to reflect new structure
```

### Spike Criteria

```markdown
## Acceptance Criteria: Spike on ML Recommendation Engine

### Deliverables
- [ ] Research report comparing 3 recommendation approaches
- [ ] Each approach evaluated on: accuracy, latency, training time, infrastructure cost
- [ ] Prototype of top candidate with sample dataset
- [ ] Performance benchmarks (training time, inference latency) at 10K/100K/1M user scale
- [ ] Recommendation for production approach with rationale

### Decision Criteria
- Approach A is preferred if accuracy > 85% with latency < 100ms
- Approach B is preferred if accuracy > 80% with latency < 50ms
- Neither (go with simpler rule-based) if both fail accuracy targets
```

## Acceptance Criteria Review Process

### Review Checklist

```markdown
## Acceptance Criteria Review

### Before Development
- [ ] Product owner confirms criteria capture the requirement
- [ ] Developer confirms criteria are technically feasible
- [ ] QA confirms criteria are testable
- [ ] Criteria include happy path, at least one edge case, and at least one error case
- [ ] No ambiguous or untestable language
- [ ] Performance criteria included if applicable
- [ ] Accessibility criteria included for UI stories
- [ ] Security criteria included for auth/data handling stories

### During Development
- [ ] Developer checks off criteria as they implement
- [ ] Questions raised if criteria are ambiguous or incomplete

### Before Acceptance
- [ ] All criteria have been demonstrated to pass
- [ ] Product owner reviews and accepts
- [ ] QA verifies criteria in a production-like environment
```

## Acceptance Criteria Automation

### Mapping Criteria to Test Cases

```typescript
// Each Gherkin scenario maps to an automated test
describe('User Login', () => {
  // maps to: Scenario: Successful login with valid credentials
  it('should redirect to dashboard on successful login', async () => {
    await loginPage.goto();
    await loginPage.login('user@example.com', 'ValidP@ss1');
    await expect(page).toHaveURL(/.*dashboard/);
    await expect(page.locator('[data-testid="welcome"]')).toContainText('Welcome back');
  });

  // maps to: Scenario: Login with invalid password
  it('should show error on invalid password', async () => {
    await loginPage.goto();
    await loginPage.login('user@example.com', 'wrong');
    await expect(page.locator('[data-testid="error"]')).toContainText('Invalid email or password');
  });
});
```

### Acceptance Criteria Coverage Matrix

```markdown
## Acceptance Criteria Coverage

| Story | Criteria | Automated | Manual | Not Met |
|-------|----------|-----------|--------|---------|
| STORY-101 | 8 | 6 (75%) | 2 | 0 |
| STORY-102 | 5 | 5 (100%) | 0 | 0 |
| STORY-103 | 12 | 8 (67%) | 4 | 1 (performance) |
| STORY-104 | 4 | 4 (100%) | 0 | 0 |
| **Total** | **29** | **23 (79%)** | **6** | **1** |
```

## References
- references/user-story-splitting.md — User Story Splitting
- references/acceptance-criteria.md — Acceptance Criteria Guide
- references/story-refinement.md — Story Refinement
- references/story-examples.md — Story Examples
- references/story-template.md — Story Template
- references/create-story-advanced.md — Create Story Advanced Topics
