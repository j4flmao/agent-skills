# Acceptance Testing Fundamentals

## Overview
Acceptance Testing validates that a system meets business requirements, user needs, and acceptance criteria. It bridges the gap between technical implementation and business value, ensuring stakeholders get what they asked for. This covers UAT, alpha/beta testing, Gherkin/BDD, business scenario testing, and sign-off processes.

## Core Concepts

### Concept 1: Acceptance Criteria
Acceptance criteria define the conditions a feature must satisfy to be accepted. Follow the INVEST principle: Independent, Negotiable, Valuable, Estimable, Small, Testable. Write criteria as Given-When-Then scenarios before development begins.

### Concept 2: Gherkin/BDD
Behavior-Driven Development uses Gherkin language for executable specifications. Structure: `Feature` describes the capability, `Scenario` describes a specific example, `Given` sets up context, `When` performs actions, `Then` asserts outcomes. Use `Scenario Outline` with `Examples` tables for data-driven scenarios.

### Concept 3: UAT Process
User Acceptance Testing involves real users validating the system against real-world scenarios. Includes: session planning (2-hour max duration), test data preparation, facilitator-led execution, structured feedback collection, defect triage, and sign-off decision.

### Concept 4: Alpha vs Beta Testing
Alpha testing: internal testing by employees and invited stakeholders in a controlled environment. Beta testing: external testing by real users in production or near-production environments. Alpha finds critical bugs early; beta reveals real-world usage patterns and edge cases.

### Concept 5: Traceability
Every acceptance test scenario must trace back to a specific requirement or user story. Maintain a traceability matrix linking requirements → scenarios → test results. This proves coverage and enables impact analysis of requirement changes.

## Acceptance Criteria Patterns

### Positive Criteria
```gherkin
Scenario: Successful checkout with valid payment
  Given I have items in my cart totaling $50.00
  And I am logged in with a valid account
  When I proceed to checkout
  And I enter valid credit card details
  Then I should see an order confirmation
  And I should receive a confirmation email
```

### Negative Criteria
```gherkin
Scenario: Checkout fails with expired card
  Given I have items in my cart totaling $50.00
  When I proceed to checkout
  And I enter an expired credit card
  Then I should see "Card expired" error
  And I should remain on the payment page
```

### Business Rule Criteria
```gherkin
Scenario Outline: Discount applied by order value
  Given I am a standard-tier customer
  When I place an order worth <value>
  Then the discount applied should be <discount>

  Examples:
    | value | discount |
    | 30.00 | 0.00     |
    | 75.00 | 7.50     |
    | 150.00| 22.50    |
    | 300.00| 60.00    |
```

## BDD Framework Selection

| Feature | pytest-bdd | behave (Python) | Cucumber (JS) | SpecFlow (.NET) |
|---------|-----------|----------------|---------------|-----------------|
| Language | Python | Python | JS/TS | C# |
| Gherkin parser | Native | Native | Native | Native |
| Scenario outlines | Yes | Yes | Yes | Yes |
| Background steps | Yes | Yes | Yes | Yes |
| Tag filtering | Yes | Yes | Yes | Yes |
| Parallel execution | pytest-xdist | Limited | @jest/parallel | SpecFlow+ |
| Report formats | JUnit, JSON, HTML | JUnit, JSON | JSON, HTML | TRX, HTML |
| CI integration | Native pytest | Native | Jest/Cucumber | VSTest |
| Best for | Python projects | Quick BDD | JS/TS full-stack | .NET ecosystem |

## Implementation Guide

### Step 1: Define Acceptance Criteria
Extract acceptance criteria from user stories during sprint planning. Write Gherkin scenarios for each criterion. Review with PO, BA, and developers before development starts. Store scenarios in feature files under version control.

### Step 2: Automate Critical Paths
Automate acceptance tests for critical business flows using BDD frameworks. Run automated acceptance tests in CI on every PR. Target < 10 minutes for the full automated acceptance suite. Use parallel execution for larger suites.

### Step 3: Plan UAT Sessions
Schedule UAT sessions with real end users (not developers or QA). Limit sessions to 2 hours. Prepare test data and environment. Assign a facilitator. Define session scenarios aligned to sprint goals.

### Step 4: Execute and Collect Feedback
Run UAT sessions with structured scenario walkthroughs. Collect feedback via: pass/fail per scenario, defect reports, usability observations, and satisfaction scores. Record session results in a traceability matrix.

### Step 5: Triage and Sign-Off
Classify defects by severity: P0 (blocks sign-off), P1 (must fix), P2 (should fix), P3 (nice to have). Present results to stakeholders. Obtain formal sign-off or document conditional acceptance with known deviations.

## Best Practices
- Write acceptance criteria BEFORE development starts — not during testing
- One scenario per business rule — avoid testing multiple rules in one scenario
- Use Scenario Outlines for data-driven acceptance tests
- Include negative scenarios for every positive scenario
- Keep Gherkin scenarios implementation-agnostic — don't reference UI elements
- Use Background sections for shared context across scenarios
- Tag scenarios by priority, sprint, and feature for filtering
- Run automated acceptance tests in CI but keep human UAT for exploratory validation
- Maintain a traceability matrix linking requirements → scenarios → test results
- Review and update acceptance criteria when requirements change

## Common Pitfalls

### Pitfall 1: Testing Without Defined Criteria
Starting acceptance testing without measurable criteria leads to subjective pass/fail decisions. Define criteria during sprint planning with specific, testable conditions.

### Pitfall 2: Developers as UAT Users
Developers know the system too well and subconsciously avoid problematic paths. UAT must use real end users from customer-facing teams or customer panels.

### Pitfall 3: No Negative Testing
Testing only happy paths misses most real-world issues. Every acceptance criterion needs at least one negative test. "What happens when it fails?" is as important as "Does it work?"

### Pitfall 4: One-Time UAT Event
Running UAT only at sprint end instead of continuous validation. Issues found late are expensive. Demo incrementally throughout the sprint. Involve stakeholders in reviews.

### Pitfall 5: Ignoring Non-Functional Criteria
Acceptance focused only on function while ignoring performance, accessibility, security, and usability. "Page loads under 3 seconds" is a valid acceptance criterion.

## Key Points
- Acceptance criteria must be defined, measurable, and testable before development starts
- Gherkin/BDD bridges communication gap between business and technical stakeholders
- UAT requires real end users, structured sessions, and facilitator guidance
- Traceability from requirements to test results is essential for audit and coverage
- Automate regression acceptance tests; keep human UAT for exploratory validation
- Classify defects by severity and only block sign-off for P0/P1 issues
- Include non-functional acceptance criteria alongside functional ones
