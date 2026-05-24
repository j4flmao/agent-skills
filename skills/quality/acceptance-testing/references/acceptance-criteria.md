# Acceptance Criteria Deep Dive

## Overview

Acceptance criteria define the conditions a feature must satisfy to be accepted by stakeholders. They bridge the gap between requirements and verification, providing unambiguous pass/fail conditions for each user story.

## Gherkin Acceptance Criteria

Gherkin uses a structured natural language format understood by both business stakeholders and automation tools (Cucumber, SpecFlow, Behave).

### Syntax

```gherkin
Feature: Coupon Code Application
  As a customer
  I want to apply coupon codes at checkout
  So that I can receive discounts on my purchase

  Background:
    Given a customer has items in their cart totaling $100

  Scenario: Apply valid percentage coupon
    Given a valid "10PERCENT" coupon code exists
    When the customer applies the coupon code
    Then the cart total should show $90.00
    And the discount line should show "-$10.00"

  Scenario: Apply expired coupon
    Given an expired "EXPIRED20" coupon code exists
    When the customer applies the coupon code
    Then an error message "This coupon has expired" should appear
    And the cart total should remain $100.00

  Scenario: Apply coupon below minimum purchase
    Given a "MIN50" coupon requires minimum purchase of $50
    When the customer applies the coupon code
    Then the discount is applied successfully
```

### Gherkin Best Practices

| Practice | Good | Poor |
|----------|------|------|
| Single focus | One scenario = one behavior | Multiple assertions in one scenario |
| Declarative | "When they log in" | "When they type 'user@example.com' in the email field and type 'Password1' in the password field and click submit" |
| Concrete data | "$50 minimum purchase" | "valid minimum purchase amount" |
| Consistent And/But | "And the cart total shows $90" | "Then the cart total should show $90 And the discount line shows $10" |
| Background sparingly | Common precondition across ALL scenarios | Used for 1-2 scenarios in a feature |

### Scenario Outline with Examples

Use Scenario Outlines to test multiple data combinations without duplication:

```gherkin
Scenario Outline: Coupon discount calculation
  Given a cart subtotal of <subtotal>
  And a <type> coupon code "<code>" with value "<value>"
  When the coupon is applied
  Then the discount should be <expected_discount>
  And the total should be <expected_total>

  Examples:
    | subtotal | type      | code       | value | expected_discount | expected_total |
    | $100.00  | percent   | TENOFF     | 10%   | $10.00            | $90.00         |
    | $100.00  | fixed     | FIFTEENOFF | $15   | $15.00            | $85.00         |
    | $50.00   | freeship  | FREESHIP   | $0    | $0.00             | $50.00         |
    | $0.00    | percent   | TENOFF     | 10%   | $0.00             | $0.00          |
    | $250.00  | percent   | TWENTYOFF  | 20%   | $50.00            | $200.00        |
```

## Specification by Example

Specification by Example (SBE) uses concrete examples to define requirements before development begins.

### SBE Process

```
1. Identify key business rules and behaviors
2. Define concrete examples for each rule
3. Automate examples as acceptance tests
4. Use examples as living documentation
5. Refine examples as understanding evolves
```

### Example: Shipping Cost Calculation

**Business Rule:** "Shipping is free for orders over $50, otherwise $5.99. Express shipping costs $12.99 regardless."

**Concrete Examples:**

```gherkin
Scenario: Standard shipping under $50
  Given a cart with items totaling $35.00
  When standard shipping is selected
  Then the shipping cost is $5.99
  And the total is $40.99

Scenario: Standard shipping over $50
  Given a cart with items totaling $75.00
  When standard shipping is selected
  Then the shipping cost is $0.00
  And the total is $75.00

Scenario: Express shipping any amount
  Given a cart with items totaling $35.00
  When express shipping is selected
  Then the shipping cost is $12.99
```

## Acceptance Criteria Templates

### Template 1: Rule-Oriented

```
Given [precondition]
When [action/trigger]
Then [expected outcome]
And [additional outcomes]
```

Best for: Functional behaviors, calculations, validations.

### Template 2: Scenario-Oriented

```
Scenario: [title]
  Given [initial context]
  When [event occurs]
  Then [outcome should be]
```

Best for: User stories, workflows, business processes.

### Template 3: Decision Table

| Condition | Rule 1 | Rule 2 | Rule 3 | Rule 4 |
|-----------|--------|--------|--------|--------|
| Logged in | Yes | Yes | No | No |
| Items in cart | Yes | No | Yes | No |
| → Show checkout button | Yes | No | No | No |
| → Show empty cart message | No | Yes | No | Yes |

Best for: Complex business rules with multiple condition combinations.

## Acceptance Test Automation

### Automating Gherkin Scenarios

**Step Definitions (Cucumber/JavaScript):**

```javascript
const { Given, When, Then } = require('@cucumber/cucumber');
const { expect } = require('chai');

Given('a customer has items in their cart totaling ${int}', async function (total) {
  await this.cartPage.addItemsToCart(total);
  this.cartTotal = await this.cartPage.getCartTotal();
  expect(this.cartTotal).to.equal(total);
});

When('the customer applies the coupon code {string}', async function (code) {
  await this.checkoutPage.enterCouponCode(code);
  await this.checkoutPage.applyCoupon();
});

Then('the cart total should show ${string}', async function (expectedTotal) {
  const actualTotal = await this.checkoutPage.getCartTotal();
  expect(actualTotal).to.equal(expectedTotal);
});

Then('an error message {string} should appear', async function (expectedMessage) {
  const errorMessage = await this.checkoutPage.getCouponError();
  expect(errorMessage).to.include(expectedMessage);
});
```

### Automation Strategy

| Layer | Tool | What to Test |
|-------|------|-------------|
| Unit | Jest/Vitest | Business logic, calculations, validations |
| API | Supertest/Postman | Service endpoints, workflows |
| UI | Playwright/Cypress | Critical user journeys |
| E2E | Cucumber + Playwright | Full business scenarios |

## Traceability Matrix

Link every acceptance criterion to a requirement and test:

```csv
Story ID,Scenario,Business Rule,Test Status,Automated
US-421,Apply valid coupon,Coupon acceptance,Running,Yes
US-421,Apply expired coupon,Expiry validation,Running,Yes
US-421,Apply minimum purchase,Minimum threshold,Failing,Yes
US-421,Apply max usage limit,Usage limit,Not Started,No
```

### Traceability Best Practices
- Tag scenarios with story IDs: `@US-421`
- Use version control to link test changes to story commits
- Generate traceability reports before each release
- Flag gaps between requirements and acceptance tests

## Common Acceptance Criteria Pitfalls

| Pitfall | Example | Fix |
|---------|---------|-----|
| Too vague | "The system should be fast" | "Page loads in < 2 seconds on 4G" |
| Too technical | "API returns 200 with JSON payload" | "User sees their order confirmation" |
| Missing negative cases | Only sunny-day scenarios | Add error, edge case, and invalid input scenarios |
| Not testable | "The UI should be intuitive" | "New users complete checkout in < 3 minutes without help" |
| Too many conditions | "If X and Y and Z then A and B and C" | Split into multiple focused scenarios |
| No data examples | "Valid coupon" with no values | Use scenario outlines with concrete examples |
