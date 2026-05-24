# Gherkin Deep Dive

## Basic Structure

```
Feature: Feature Title (business-readable)
  A longer description of the feature in business language.

  Scenario: Scenario Title
    Given some precondition
    When some action is performed
    Then some expected outcome occurs
```

## Feature File Conventions

### Naming
- **Feature**: Business capability, not technical component (e.g., "Order Management" not "POST /api/orders")
- **Scenario**: Specific behavior, not a test case number (e.g., "Successful order with valid data" not "TC-42")

### File Organization
```
features/
├── checkout/
│   ├── payment.feature
│   ├── shipping.feature
│   └── coupons.feature
└── account/
    ├── login.feature
    ├── registration.feature
    └── profile.feature
```

### Feature File Header
```gherkin
@checkout @smoke
Feature: Checkout Payment
  As a customer
  I want to pay for my order
  So that I can complete my purchase
```

The "As a / I want / So that" format is optional but strongly recommended for context.

## Keywords

### Given (Preconditions)
Sets up the context against which the scenario runs.

```gherkin
Given I am logged in as a registered customer
Given my cart contains 3 items
Given the following products exist:
  | name     | price | stock |
  | Widget A | 10.00 | 5     |
  | Widget B | 20.00 | 0     |
Given I am on the checkout page
```

**Avoid**: UI-specific Given statements like "Given the page has loaded" — use domain-level preconditions.

### When (Action)
The action or event being tested.

```gherkin
When I enter my shipping address
When I select "Credit Card" as payment method
When I submit the order
```

**One action per When** — avoid combining multiple actions in one step.

### Then (Outcome)
Expected observable outcomes.

```gherkin
Then I should see an order confirmation
Then my order total should be $50.00
Then I should receive a confirmation email
```

**Business outcomes, not UI specifics**: "Then I should see an order confirmation" not "Then the text 'Order Confirmed' should appear in the h1 element with class 'confirmation'".

### And / But
Used to add multiple conditions or actions.

```gherkin
Given I am logged in
And my cart contains items
And my balance is sufficient
When I complete checkout
Then I should receive order confirmation
But I should NOT receive a shipping notification
```

## Background

Shared setup steps for all scenarios in a feature file.

```gherkin
Feature: Account Management

  Background:
    Given I am logged in as a registered user
    And I am on the account settings page

  Scenario: Update email address
    When I change my email to "new@example.com"
    Then my email should be updated

  Scenario: Update password
    When I change my password
    Then my password should be updated
```

**Use sparingly**: Overuse makes scenarios hard to read. Only include setup that genuinely applies to ALL scenarios.

## Scenario Outline

Runs the same scenario with multiple data sets.

```gherkin
Scenario Outline: Calculate order total
  Given my cart contains <quantity> of "<product>" at $<price> each
  And the tax rate is <tax_rate>%
  When I view the order total
  Then the total should be $<expected_total>

  Examples:
    | product  | quantity | price | tax_rate | expected_total |
    | Widget A | 2        | 10.00 | 5        | 21.00          |
    | Widget B | 1        | 50.00 | 20       | 60.00          |
    | Widget A | 0        | 10.00 | 5        | 0.00           |
```

### Best Practices for Scenario Outlines
- Headers must match the `<placeholder>` values in the scenario text
- Include boundary cases, not just happy paths
- The Examples table is the data, not the test — keep it readable
- Limit to 5-8 examples per outline (too many becomes unreadable)
- Each example should test a distinct case — avoid redundant data

## Data Tables

Pass structured data to a step.

```gherkin
Scenario: Register with valid data
  Given I am on the registration page
  When I fill in my details:
    | Field        | Value                |
    | First Name   | John                 |
    | Last Name    | Doe                  |
    | Email        | john.doe@example.com |
    | Password     | securePass123        |
    | Country      | US                   |
  Then I should be registered successfully

Scenario: Batch order processing
  Given I have the following orders to process:
    | order_id | customer | amount | priority |
    | ORD-001  | Alice    | 150.00 | high     |
    | ORD-002  | Bob      | 75.00  | normal   |
    | ORD-003  | Carol    | 200.00 | high     |
  When I process all orders
  Then ORD-001 and ORD-003 should be expedited
```

### Data Table vs Scenario Outline
- **Data Table**: Passes structured data to a single scenario step
- **Scenario Outline**: Runs the entire scenario multiple times

## Doc Strings

Multi-line strings for step data.

```gherkin
Scenario: Create API key
  Given I am an authenticated admin
  When I create an API key with the following permissions:
    """
    {
      "name": "read-only-key",
      "permissions": ["read:orders", "read:products"],
      "expires_in_days": 30
    }
    """
  Then the API key should be created successfully
  And I should receive the key details

Scenario: Update privacy policy
  Given I am a site administrator
  When I update the privacy policy to:
    """
    We collect the following data:
    - Email address (for account management)
    - Payment information (processed by third party)
    - Usage analytics (anonymized)
    """
  Then the policy should be saved
```

## Tags

Organize and filter scenarios.

```gherkin
@regression @smoke
Feature: Checkout

  @critical-path @P0
  Scenario: Successful purchase with credit card
    ...

  @alternative @P1
  Scenario: Purchase with gift card
    ...

  @negative @P2
  Scenario: Purchase with expired credit card
    ...
```

### Tag Conventions
```
@smoke           — Critical path scenarios for build verification
@regression      — Full regression suite
@P0, @P1, @P2   — Priority levels
@slow            — Slow tests excluded from local runs
@wip             — Work in progress, not yet passing
@bug-1234        — Linked to a known bug
@integration     — Requires external services
```

### Running Tagged Scenarios
```bash
# Run only smoke tests
cucumber --tags @smoke

# Run regression but exclude slow tests
cucumber --tags "@regression and not @slow"

# Run P0 or P1 tests
cucumber --tags "@P0 or @P1"
```

## Comments

Single-line comments start with `#`.

```gherkin
Feature: Coupon Application
  # TODO: Add scenarios for percentage-based discounts
  # These require the coupon service to be available

  @wip
  Scenario: Apply coupon code
    Given I have items in my cart
    When I apply the coupon code "SAVE10"
    Then I should see 10% discount applied
```

## Gherkin Anti-Patterns

| Anti-Pattern | Bad Example | Good Example |
|--------------|-------------|-------------|
| UI details | Given I type "admin" in field #username | Given I am logged in as "admin" |
| Multiple actions | When I log in and create an order | When I log in Then create a separate scenario |
| Implementation language | When I click the submit button | When I submit the order |
| Too much background | 15 Background steps | Extract into separate features |
| Scenario overloading | 10 Then assertions | Break into multiple scenarios |
| Vague scenarios | Given valid data Then should work | Given specific data Then check specific outcome |
| Brittle tables | All scenarios use Examples with same data | Use unique examples per scenario|

## References
- Cucumber Gherkin Reference — https://cucumber.io/docs/gherkin/
- Gherkin Specification — https://github.com/cucumber/gherkin
- BDD Books: Specification by Example — Gojko Adzic
