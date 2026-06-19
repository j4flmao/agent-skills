# Acceptance Criteria Deep Dive

## What Makes Good Acceptance Criteria

### INVEST Model
- **Independent**: Each criterion stands alone; can be tested in any order
- **Negotiable**: Details can be discussed and refined
- **Valuable**: Delivers clear business value
- **Estimable**: Team can estimate effort
- **Small**: Fits in one sprint
- **Testable**: Can be objectively verified

### Writing Good Criteria
```gherkin
# BAD — untestable, vague
"The checkout should be fast"

# BAD — too technical, not business-focused
"The checkout API endpoint POST /checkout should return 200 OK"

# GOOD — testable, business-focused, specific
Scenario: Checkout completes within 5 seconds
  Given I have 5 items in my cart totaling $120.00
  When I complete checkout with a valid credit card
  Then the order confirmation should appear within 5 seconds
  And the total charged should be exactly $120.00
```

## Acceptance Criteria Template
```
Feature: [Feature Name]
  As a [user role]
  I want to [capability]
  So that [business value]

  Scenario: [Happy path - success scenario]
    Given [precondition]
    When [action]
    Then [expected outcome]

  Scenario: [Negative path - failure scenario]
    Given [precondition]
    When [action that causes failure]
    Then [error state]
    And [system remains in valid state]

  Scenario Outline: [Data-driven business rule]
    Given [precondition with <variable>]
    When [action]
    Then [outcome with <expected value>]
    Examples:
      | variable | expected_value |
      | value1   | result1        |
```

## Types of Acceptance Criteria
- Functional: "User can reset password via email link"
- Non-functional: "Password reset email arrives within 30 seconds"
- Performance: "Search returns results within 2 seconds for 10K products"
- Security: "Failed login attempts lock account after 5 tries"
- Accessibility: "All forms have proper ARIA labels"
- Usability: "New users complete onboarding in under 3 minutes"
