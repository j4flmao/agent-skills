---
name: quality-acceptance-testing
description: >
  Use when the user asks about user acceptance testing (UAT), alpha/beta testing, business scenario testing, acceptance criteria, Gherkin, specification by example, or sign-off processes. Do NOT use for: unit testing (quality-unit-testing), integration testing (quality-integration-testing), or regression testing (quality-regression-testing).
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [quality, acceptance-testing, phase-6]
---

# Acceptance Testing

## Purpose
Validate that the system meets business requirements, user needs, and acceptance criteria through structured UAT, alpha/beta programs, business scenario testing, and automated acceptance tests.

## Agent Protocol

### Trigger
User mentions acceptance testing, UAT, alpha/beta testing, user sign-off, business scenarios, Gherkin scenarios, or specification by example.

### Input Context
- User stories or feature specifications
- Acceptance criteria (Gherkin or otherwise)
- Business process flows
- Target user profiles for beta programs
- Environment availability (staging, production-like)

### Output Artifact
- UAT test scenarios and results
- Alpha/beta feedback reports
- Business scenario coverage matrix
- Signed-off acceptance test report

### Response Format
Structured report with:
1. Test scenarios mapped to user stories/requirements
2. Execution results and status
3. Blocking vs non-blocking issues
4. Sign-off recommendation
5. Risks and open items

### Completion Criteria
- All acceptance criteria exercised AND
- Blocking issues resolved or documented as known deviations AND
- Stakeholder sign-off received OR explicit deferral documented

## Workflow

1. **Analyze requirements**: Extract acceptance criteria from user stories, epics, business flows
2. **Design scenarios**: Create Gherkin scenarios, business flow tests, UAT scripts
3. **Prepare environment**: Configure UAT environment, set up test data, onboard users
4. **Execute**: Run UAT sessions, manage beta programs, execute business scenarios
5. **Evaluate**: Assess results against acceptance criteria, track defects
6. **Sign-off**: Present results to stakeholders, obtain formal acceptance

## Gherkin Scenario Examples

### Positive Scenario
```gherkin
Feature: User Registration
  As a visitor
  I want to register for an account
  So that I can access the platform

  Scenario: Successful registration with valid data
    Given I am on the registration page
    When I enter a valid email "user@example.com"
    And I enter a password meeting complexity requirements
    And I accept the terms of service
    And I submit the registration form
    Then I should see a confirmation message
    And I should receive a verification email at "user@example.com"
    And I should be redirected to the login page
```

### Negative Scenario
```gherkin
Scenario: Registration fails with duplicate email
  Given a user with email "existing@example.com" already exists
  When I enter email "existing@example.com"
  And I enter a valid password
  And I submit the registration form
  Then I should see an error "Email already registered"
  And I should remain on the registration page
```

### Business Rule Scenario
```gherkin
Scenario Outline: Discount application by order value
  Given I have a customer account
  When I place an order with value <order_value>
  Then the discount applied should be <discount>

  Examples:
    | order_value | discount |
    | 49.99       | 0        |
    | 50.00       | 10       |
    | 100.00      | 15       |
    | 500.00      | 20       |
```

## Automated Acceptance Tests (Python + pytest-bdd)

```python
# tests/acceptance/test_checkout.py
from pytest_bdd import scenarios, given, when, then, parsers

scenarios("../features/checkout.feature")

@given("I am a logged-in customer with items in my cart")
def logged_in_customer(cart_factory, auth_session):
    return auth_session.login(cart_factory.with_items(3))

@when(parsers.parse('I proceed to checkout with "{payment_method}"'))
def proceed_to_checkout(logged_in_customer, payment_method):
    logged_in_customer.checkout(payment_method=payment_method)

@then("I should see an order confirmation")
def verify_confirmation(logged_in_customer):
    assert logged_in_customer.current_page == "order_confirmation"
    assert logged_in_customer.order_id is not None

@then("my cart should be empty")
def verify_cart_empty(logged_in_customer):
    assert logged_in_in_customer.cart.item_count == 0
```

## UAT Process Template

### UAT Session Plan
```yaml
session:
  title: "Checkout Flow UAT — Sprint 12"
  date: "2026-06-15"
  duration: "2 hours"
  participants:
    - role: "Business Analyst"
      name: "Jane S."
    - role: "End User (Customer Service)"
      name: "Mark T."
    - role: "QA Facilitator"
      name: "Priya K."
  test_data:
    - "Test account: uat_customer_1@example.com / UATpass2024!"
    - "Coupon codes: SAVE10, FREESHIP, WELCOME20"
    - "Product catalog subset: 5 SKUs with varying prices"
  scenarios:
    - id: "UAT-CHK-01"
      description: "Complete purchase with credit card"
      priority: "P0 — Critical"
      expected: "Order confirmed, email sent, inventory updated"
    - id: "UAT-CHK-02"
      description: "Apply coupon code at checkout"
      priority: "P1 — High"
      expected: "Discount reflected in total before payment"
    - id: "UAT-CHK-03"
      description: "Abandon checkout and resume from cart"
      priority: "P1 — High"
      expected: "Cart items preserved, partial data saved"
    - id: "UAT-CHK-04"
      description: "Checkout with invalid coupon"
      priority: "P2 — Medium"
      expected: "Clear error message, no discount applied"
  acceptance_criteria:
    - "All P0 scenarios pass with no defects"
    - "At least 80% of total scenarios pass"
    - "No critical or high severity defects open"
    - "Performance: checkout completes within 5 seconds"

```

### UAT Session Results
```yaml
results:
  session_id: "UAT-S12-CHK"
  total_scenarios: 12
  passed: 10
  failed: 1
  blocked: 1
  defects_found:
    - id: "BUG-452"
      severity: "High"
      scenario: "UAT-CHK-03"
      description: "Cart items lost after session timeout during checkout"
    - id: "BUG-453"
      severity: "Medium"
      scenario: "UAT-CHK-02"
      description: "Coupon FREESHIP applies to already-discounted items"
  blocking_issues: ["BUG-452"]
  sign_off: "Conditional — pending BUG-452 fix"
  notes: "Overall flow works well. Cart timeout handling needs improvement. UI responsive on mobile."
```

## Alpha/Beta Testing Program

### Alpha Test Plan
```yaml
alpha_test:
  scope: "Internal stakeholders, pilot customers (invite-only)"
  duration: "2 weeks"
  participants: 25
  goals:
    - "Identify critical usability issues before wider release"
    - "Validate core workflows with real user data"
    - "Collect performance metrics under moderate load"
  feedback_channels:
    - "In-app feedback widget"
    - "Weekly sync with alpha testers"
    - "Automated error tracking (Sentry)"
  exit_criteria:
    - "No P0 or P1 bugs open"
    - "Core workflow completion rate > 90%"
    - "Average satisfaction score > 4/5"
```

### Beta Test Plan
```yaml
beta_test:
  scope: "Opt-in users from waitlist"
  duration: "4 weeks"
  participants: 500
  goals:
    - "Validate scalability under production load"
    - "Discover edge cases from diverse user behavior"
    - "Measure NPS and user satisfaction"
    - "Identify documentation gaps"
  cohorts:
    - name: "early_adopters"
      size: 100
      duration: "week 1-2"
    - name: "general_beta"
      size: 400
      duration: "week 3-4"
  feedback_channels:
    - "In-app NPS survey (end of session)"
    - "Beta feedback form (structured)"
    - "Usage analytics (Mixpanel/Amplitude)"
    - "Support ticket analysis"
  metrics:
    - task_success_rate: "> 85%"
    - avg_session_duration: "baseline"
    - error_rate: "< 2%"
    - nps_score: "> 30"
  rollback_criteria:
    - "Error rate exceeds 5% for 1 hour"
    - "Critical data integrity issue in any workflow"
    - "P0 security vulnerability discovered"
```

## Acceptance Testing Anti-Patterns

### Anti-Pattern: Testing Without Defined Criteria
Starting acceptance testing without clear, measurable acceptance criteria leads to subjective pass/fail decisions. "System should be fast" is not a criterion — "checkout completes under 5 seconds under normal load" is. Define criteria during sprint planning, not during testing.

### Anti-Pattern: UAT with Developers as Users
Having developers or QA role-play as end users misses real-world usage patterns. Developers know the system too well and subconsciously avoid problematic paths. Recruit actual end users from customer-facing teams or customer panels.

### Anti-Pattern: No Negative Testing
Testing only happy paths (successful login, successful purchase, etc.) misses the majority of real-world issues. Every acceptance criterion must have at least one corresponding negative test. "User cannot register with an invalid email" is as important as "User can register with a valid email."

### Anti-Pattern: Treating All Defects Equally
Blocking acceptance sign-off on minor UI issues while passing critical workflow bugs creates false confidence. Classify defects by severity: P0 (blocks sign-off), P1 (must fix), P2 (should fix), P3 (nice to have). Only P0 and P1 should block release.

### Anti-Pattern: No Traceability to Requirements
Acceptance test results not linked back to specific user stories or requirements make it impossible to assess coverage. Each test scenario must reference the requirement ID. Maintain a traceability matrix.

### Anti-Pattern: One-Time UAT Event
Running UAT as a single event at the end of the sprint instead of continuous validation throughout development. Issues found late are more expensive to fix. Involve stakeholders in sprint reviews and demo incremental progress.

## Acceptance Testing Maturity Model

| Level | Characteristics | Practices |
|---|---|---|
| 1: Initial | No formal acceptance testing | Ad-hoc demos, verbal sign-off, no traceability |
| 2: Defined | Basic UAT with scripts | Manual UAT sessions, Gherkin scenarios for critical paths, spreadsheet tracking |
| 3: Managed | Automated acceptance tests | pytest-bdd/SpecFlow/Cucumber, CI-gated acceptance, traceability matrix |
| 4: Measured | Continuous acceptance validation | Automated acceptance in CI/CD pipeline, metric-driven sign-off, acceptance coverage > 80% |
| 5: Optimized | Shift-left acceptance | Acceptance criteria as executable specifications, BDD-driven development, real-time stakeholder dashboards |

## Performance Considerations

- UAT session length: 1-2 hours max per session. Beyond 2 hours, tester fatigue reduces defect discovery rate.
- Beta test sample size: minimum 100 users for statistically significant results. For NPS measurement, target 380+ responses for ±5% margin of error.
- Automated acceptance test execution: target under 10 minutes. If longer, split into parallel execution streams.
- Feedback analysis ratio: budget 1 hour of analysis per 10 beta feedback submissions.
- Test data setup: budget 30 minutes per UAT session for environment and data preparation.

## Acceptance Testing with Cucumber/SpecFlow

### Java/SpecFlow Example
```gherkin
Feature: Checkout Discounts
  As a customer
  I want discounts applied correctly at checkout
  So that I pay the correct amount

  Scenario Outline: Discount by order value
    Given I have items worth <subtotal> in my cart
    And I am logged in as a <tier> customer
    When I proceed to checkout
    Then the discount displayed should be <discount>
    And the total should be <total>

    Examples:
      | subtotal | tier      | discount | total |
      | 30.00    | standard  | 0        | 30.00 |
      | 75.00    | standard  | 7.50     | 67.50 |
      | 75.00    | premium   | 15.00    | 60.00 |
      | 150.00   | premium   | 30.00    | 120.00 |
```

```csharp
[Binding]
public class CheckoutDiscountSteps
{
    private readonly CheckoutContext _context;

    public CheckoutDiscountSteps(CheckoutContext context)
    {
        _context = context;
    }

    [Given(@"I have items worth (.*) in my cart")]
    public void GivenItemsInCart(decimal subtotal)
    {
        _context.Cart = new Cart { Total = subtotal };
    }

    [Given(@"I am logged in as a (.*) customer")]
    public void GivenCustomerTier(string tier)
    {
        _context.CustomerTier = tier;
    }

    [When(@"I proceed to checkout")]
    public void WhenProceedToCheckout()
    {
        _context.Checkout();
    }

    [Then(@"the discount displayed should be (.*)")]
    public void ThenDiscountShouldBe(decimal expected)
    {
        Assert.Equal(expected, _context.AppliedDiscount);
    }
}
```

## CI Integration for Acceptance Tests

```yaml
name: Acceptance Tests
on:
  pull_request:
    branches: [main]
  schedule:
    - cron: "0 5 * * 1-5"  # Weekday morning

jobs:
  acceptance:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_PASSWORD: testpass
        ports:
          - 5432:5432
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - name: Seed test data
        run: node scripts/seed-acceptance-data.js
      - name: Run acceptance tests
        run: npx cucumber-js --format json:reports/acceptance.json
      - name: Upload results
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: acceptance-report
          path: reports/acceptance.json
```

## Acceptance Testing Anti-Patterns (Additional)

### Anti-Pattern: No Traceability
Acceptance test results not linked back to specific user stories or requirements make it impossible to assess coverage or determine which requirements are met. Each scenario must reference the requirement ID. Maintain a traceability matrix.

### Anti-Pattern: Testing Without Business Stakeholders
Running UAT without actual business stakeholders or end users produces validation without real-world value. Developers know the system too well and subconsciously avoid problematic paths. Recruit actual end users.

### Anti-Pattern: One-Time UAT Event
Running UAT as a single event at the end of the sprint rather than continuous validation throughout development. Issues found late are expensive to fix. Involve stakeholders in sprint reviews. Demo incremental progress.

### Anti-Pattern: Ignoring Non-Functional Requirements
Acceptance criteria focused only on functional behavior while ignoring performance, accessibility, security, and usability. Each story should have non-functional acceptance criteria where applicable. "Page loads under 3 seconds" is a valid acceptance criterion.

## Acceptance Testing Metrics

```yaml
metrics:
  traceability:
    requirements_covered: 45
    requirements_total: 48
    coverage_pct: 93.8%
  execution:
    scenarios_passed: 120
    scenarios_failed: 3
    scenarios_blocked: 2
    pass_rate: 96.0%
  defects:
    by_severity:
      p0_blocking: 0
      p1_high: 1
      p2_medium: 2
      p3_low: 2
    avg_time_to_fix: "2.3 days"
  uat:
    sessions_completed: 6
    total_participants: 12
    avg_satisfaction: 4.2 / 5
    blocking_issues_unresolved: 0
```

## Rules
1. Acceptance criteria must be defined BEFORE testing begins — no testing against ambiguous requirements
2. Every user story must have at least one positive and one negative Gherkin scenario
3. UAT users must represent real user roles — not developers or QA
4. Business scenarios must cover happy path, alternate flows, and exception paths
5. All acceptance test results must be traceable back to specific requirements
6. Blocking defects stop sign-off — document workarounds if accepting with known issues
7. Beta test participant data must be anonymized in all reports
8. Each acceptance scenario maps to exactly one business rule or requirement
9. Regression testing of accepted scenarios runs before each production release
10. Stakeholder sign-off is recorded with explicit acceptance or rejection rationale
11. Non-functional acceptance criteria (performance, accessibility, security) must be defined alongside functional criteria
12. Acceptance test failures must be triaged within 24 hours for blocking defects
13. Beta test exit criteria must be defined before beta launch — not retroactively
14. Automated acceptance tests must target under 10 minutes execution time
15. Each UAT session must have a trained facilitator who is not the developer

## References
  - references/acceptance-criteria.md — Acceptance Criteria Deep Dive
  - references/acceptance-testing-advanced.md — Acceptance Testing Advanced Topics
  - references/acceptance-testing-fundamentals.md — Acceptance Testing Fundamentals
  - references/alpha-beta.md — Alpha and Beta Testing
  - references/beta-program-management.md — Beta Program Management
  - references/business-scenarios.md — Business Scenario Testing
  - references/gherkin-best-practices.md — Gherkin Best Practices
  - references/uat-process.md — User Acceptance Testing (UAT) Process
## Handoff
After acceptance testing completion, hand off to:
- `quality-regression-testing` — for regression suite updates from accepted changes
- `quality-e2e-testing` — for end-to-end automation of accepted scenarios
- `quality-smoke-testing` — for BVT smoke test inclusion of critical paths
