# Gherkin Best Practices

## Overview

Gherkin is a domain-specific language for defining executable specifications using Given/When/Then syntax. It bridges communication between business stakeholders, developers, and testers by describing system behavior in plain language.

## Gherkin Syntax

### Basic Structure

Every Gherkin feature file has:

```gherkin
Feature: User Authentication
  As a registered user
  I want to log into the application
  So that I can access my account

  Scenario: Successful login with valid credentials
    Given I am a registered user with email "user@example.com" and password "Pass123!"
    When I navigate to the login page
    And I enter my email "user@example.com"
    And I enter my password "Pass123!"
    And I click the "Sign In" button
    Then I should be redirected to my dashboard
    And I should see "Welcome back" message
```

### Keywords

| Keyword | Purpose | Usage |
|---------|---------|-------|
| `Feature` | High-level description of the feature under test | One per file |
| `Scenario` | A specific business rule or flow | Multiple per feature |
| `Given` | Preconditions and context | Sets up the test state |
| `When` | The action or event | Triggers the behavior |
| `Then` | Expected outcomes | Asserts the result |
| `And` | Additional step of the same type | Chains conditions/actions/outcomes |
| `But` | Negative condition | "But I should not see the admin panel" |
| `Background` | Common steps run before every scenario | Shared setup |
| `Scenario Outline` | Data-driven scenario template | Reuses same steps with different data |
| `Examples` | Data table for scenario outlines | Provides test data |
| `@tag` | Metadata for filtering/organizing | Groups scenarios |
| `#` | Comments | Documentation within feature files |

## Scenario Organization

### Feature File Structure

```gherkin
Feature: Shopping Cart
  As a customer
  I want to manage items in my shopping cart
  So that I can purchase products

  Background:
    Given I am logged in as a registered customer
    And I have products in my cart

  @smoke @critical
  Scenario: Add product to cart
    Given I am on the product detail page for "Wireless Headphones"
    When I click "Add to Cart"
    Then the product should be added to my cart
    And the cart count should show 1 item

  @regression
  Scenario: Remove product from cart
    Given I have 2 products in my cart
    When I remove "Wireless Headphones" from my cart
    Then my cart should contain 1 item
    And the removed product should show in "Saved for Later"

  Scenario: Update product quantity
    Given I have "Wireless Headphones" in my cart with quantity 1
    When I update the quantity to 3
    Then the subtotal should update to $89.97
    And the cart total should reflect the change

  @edge-case
  Scenario: Add out-of-stock product
    Given I am on the product detail page for "Sold Out Item"
    When I click "Add to Cart"
    Then I should see "This product is currently out of stock"
    And the item should not be added to my cart
```

## Data Tables

### Simple Tables

```gherkin
Scenario: Register multiple users
  Given the system has the following user registrations:
    | name   | email                 | role  |
    | Alice  | alice@example.com     | admin |
    | Bob    | bob@example.com       | user  |
    | Carol  | carol@example.com     | user  |
  When I process the registration batch
  Then all 3 users should be created successfully
  And Alice should have admin privileges
```

### Tables with Actions

```gherkin
Scenario: Bulk product price update
  Given the following products exist:
    | SKU        | name          | price |
    | PROD-001   | Widget A      | 10.00 |
    | PROD-002   | Widget B      | 15.00 |
    | PROD-003   | Widget C      | 20.00 |
  When I apply the following price changes:
    | SKU        | new_price |
    | PROD-001   | 12.00     |
    | PROD-003   | 18.00     |
  Then the prices should be updated:
    | SKU        | price |
    | PROD-001   | 12.00 |
    | PROD-002   | 15.00 |
    | PROD-003   | 18.00 |
```

### Multi-line Tables in Step Definitions

```gherkin
Scenario: Create invoice with line items
  Given I am creating a new invoice for customer "Acme Corp"
  When I add the following line items:
    | description      | quantity | unit_price |
    | Consulting fees  | 10       | 150.00     |
    | Software license | 1        | 500.00     |
    | Support retainer | 1        | 2000.00    |
  Then the invoice total should be $4000.00
  And the invoice should have 3 line items
```

## Scenario Outlines

### Template with Examples

```gherkin
Scenario Outline: Checkout with different payment methods
  Given I have products in my cart totaling <amount>
  When I proceed to checkout
  And I select "<payment_method>" as payment method
  And I confirm the payment
  Then I should see a confirmation message
  And the order status should be "<status>"

  Examples:
    | amount | payment_method | status    |
    | 25.00  | Credit Card    | confirmed |
    | 100.00 | PayPal         | confirmed |
    | 0.00   | Gift Card      | confirmed |
    | 500.00 | Bank Transfer  | pending   |
```

### Multiple Examples Tables

```gherkin
Scenario Outline: Search with filters
  Given I am on the search page
  When I search for "<query>"
  And I apply the "<category>" filter
  Then I should see "<expected_count>" results

  @quick-search
  Examples: Basic searches
    | query     | category | expected_count |
    | laptop    | All      | 20             |
    | headphones| All      | 15             |

  @filter-tests
  Examples: Filtered searches
    | query  | category     | expected_count |
    | laptop | Electronics  | 15             |
    | laptop | Accessories  | 5              |
```

## Background Sections

### Shared Setup

```gherkin
Feature: User Profile Management

  Background:
    Given I am logged in as a registered user
    And I am on my profile page
    And my profile has the following details:
      | field    | value            |
      | name     | John Doe         |
      | email    | john@example.com |
      | phone    | +1-555-0123      |

  Scenario: Update profile name
    When I change my name to "Jane Doe"
    And I save my profile
    Then I should see "Profile updated successfully"
    And my displayed name should be "Jane Doe"

  Scenario: Update profile email
    When I change my email to "jane@example.com"
    And I save my profile
    Then a confirmation email should be sent to "jane@example.com"
    And I should see "Check your email to confirm the change"
```

### Multiple Backgrounds

Gherkin supports only one `Background` per feature. To share steps across features, use step definition reuse.

## Tags for Organization

### Common Tag Taxonomy

```gherkin
@smoke         # Critical path tests for build verification
@regression    # Full regression suite
@slow          # Tests that take longer than 30 seconds
@edge-case     # Boundary and edge condition tests
@security      # Security-related scenarios
@performance   # Performance-related scenarios
@accessibility # Accessibility verification
@mobile        # Mobile-specific behavior
@desktop       # Desktop-specific behavior
@wip           # Work in progress, not yet passing
@known-issue   # Tests that fail due to known defects
```

### Tag Combinations

```gherkin
@smoke @critical
Scenario: User can complete purchase
  ...

@regression @slow
Scenario: Process batch of 10,000 orders
  ...

@edge-case @security
Scenario: User cannot access admin with viewer role
  ...
```

### Selective Execution

```bash
# Run only smoke tests
cucumber --tags @smoke

# Run regression but skip slow tests
cucumber --tags "@regression and not @slow"

# Run smoke OR critical tests
cucumber --tags "@smoke or @critical"

# Run checkout-related tests
cucumber --tags "@checkout"
```

## Descriptive Step Naming

### Good Step Names

```gherkin
# GOOD — describes business intent
Given I am logged in as a premium customer
When I add an item to my wishlist
Then I should receive a price drop notification

# GOOD — includes specific values
Given the product "Wireless Headphones" costs $49.99
When I apply coupon code "SAVE20"
Then the total should be $39.99

# GOOD — uses domain language
Given the invoice is in "overdue" status
When the system runs the dunning process
Then a reminder email should be sent to the customer
```

### Bad Step Names

```gherkin
# BAD — contains implementation details
Given I set localStorage.getItem("token") to "abc123"
When I call POST /api/login with body {"email": "test@test.com"}
Then response.status should be 200

# BAD — vague
Given I do a thing
When I do another thing
Then something happens

# BAD — multiple conditions in one step
Given I am logged in and I am on the product page and the product is in stock
```

## Avoiding Implementation Details in Steps

### Wrong (Tied to UI/Locators)

```gherkin
# BAD — Fragile, tied to CSS selectors
When I click the button with class "btn-submit-32a"
Then the div with id "confirmation-modal" should be visible
```

### Right (Business-Focused)

```gherkin
# GOOD — Focused on user intent
When I submit my order
Then I should see an order confirmation
```

### Wrong (API Implementation)

```gherkin
# BAD — Tests HTTP directly
Given the API returns 200 with body {"status": "ok"}
```

### Right (Behavior)

```gherkin
# GOOD — Tests behavior
Given the payment is processed successfully
```

## Parameterized Steps

### Step with Parameters

```gherkin
Given the user "Alice" with role "admin" exists
When "Alice" attempts to delete the "Finance Reports" folder
Then the deletion should succeed
```

```typescript
// Step definition
Given('the user {string} with role {string} exists', (name: string, role: string) => {
  cy.task('createUser', { name, role })
})

When('{string} attempts to delete the {string} folder', (user: string, folder: string) => {
  cy.loginAs(user)
  cy.deleteFolder(folder)
})
```

### Doc Strings for Large Text

```gherkin
Scenario: Create product with long description
  Given I am on the product creation page
  When I enter the following product description:
    """
    The Wireless Headphones Pro feature advanced noise cancellation
    technology with 40-hour battery life. They support Bluetooth 5.3
    and come with a premium carrying case. Compatible with all major
    devices including iOS, Android, and Windows.
    """
  And I set the price to "$199.99"
  Then the product should be created successfully
```

## Hooks (Before/After)

### Cucumber.js Hooks

```typescript
import { Before, After, BeforeAll, AfterAll } from '@cucumber/cucumber'

// Runs once before all scenarios
BeforeAll(async () => {
  await startTestServer()
  await seedDatabase()
})

// Runs before each scenario tagged with @smoke
Before({ tags: '@smoke' }, async () => {
  await setupSmokeTestData()
})

// Runs before each scenario
Before(async () => {
  await clearDatabase()
  await setupDefaultData()
})

// Runs after each scenario
After(async (scenario) => {
  if (scenario.result?.status === 'FAILED') {
    await takeScreenshot()
  }
})

// Runs once after all scenarios
AfterAll(async () => {
  await stopTestServer()
})
```

### Cucumber-JVM Hooks

```java
import io.cucumber.java.Before;
import io.cucumber.java.After;

public class Hooks {
    @Before
    public void setUp() {
        TestDatabase.clear();
        TestDataFactory.seedDefaults();
    }

    @After
    public void tearDown(Scenario scenario) {
        if (scenario.isFailed()) {
            scenario.attach(screenshot.take(), "image/png", "screenshot");
        }
    }
}
```

## Step Definition Organization

### By Feature or Domain

```typescript
// step-definitions/auth-steps.ts
Given('I am logged in as a {string}', (role: string) => {
  cy.login({ role })
})

Given('I am not logged in', () => {
  cy.logout()
})

// step-definitions/cart-steps.ts
Given('I have {int} products in my cart', (count: number) => {
  cy.addProductsToCart(count)
})

When('I add {string} to my cart', (productName: string) => {
  cy.addProductToCart(productName)
})
```

### Shared Step Utilities

```typescript
// step-definitions/shared-steps.ts
Given('the following users exist:', async (dataTable: DataTable) => {
  const users = dataTable.hashes()
  for (const user of users) {
    await createUser(user)
  }
})
```

## Reusing Steps Across Features

### Composing Steps

```gherkin
Feature: Order Management

  Scenario: Cancel pending order
    Given I am logged in as a customer
    And I have a pending order
    When I cancel the order
    Then the order status should be "cancelled"
    And I should receive a cancellation email

Feature: Refund Processing

  Scenario: Full refund for cancelled order
    Given I am logged in as a customer
    And I have a cancelled order
    When I request a full refund
    Then the refund should be processed within 5 business days
```

### Extracting Common Steps

Use step composition — call other step definitions from within step implementations:

```typescript
When('I place an order for a premium product', async () => {
  await this.screen.loginAs('premium-user@example.com')
  await this.screen.addProductToCart('Premium Widget')
  await this.screen.proceedToCheckout()
  await this.screen.confirmOrder()
})
```

## Documenting Edge Cases

### Boundary Conditions

```gherkin
@edge-case
Scenario Outline: Product search with special characters
  When I search for "<search_term>"
  Then I should see "<result_count>" results

  Examples:
    | search_term | result_count |
    |             | 0            |
    | a           | 50           |
    | !@#$%       | 0            |
    | <script>    | 0            |
    | 100%-effective | 1        |
```

### Negative Testing

```gherkin
@edge-case @security
Scenario: SQL injection attempt on login
  Given I navigate to the login page
  When I enter email "' OR 1=1 --"
  And I enter password "' OR '1'='1"
  And I click "Sign In"
  Then I should see "Invalid credentials"
  And I should not be logged in

@edge-case
Scenario: Maximum field length exceeded
  Given I am on the registration page
  When I enter a name with 256 characters
  And I try to submit the form
  Then I should see "Name must be 255 characters or fewer"
```

### Concurrency and Race Conditions

```gherkin
@edge-case @slow
Scenario: Simultaneous checkout of last item
  Given there is 1 item left in stock for "Limited Widget"
  When two users attempt to purchase "Limited Widget" simultaneously
  Then one user should see "Out of stock"
  And the other user should see "Order confirmed"
```

### Error Handling

```gherkin
@edge-case
Scenario: Network timeout during payment
  Given the payment gateway is experiencing delays
  When I submit my payment
  Then I should see "Payment processing, please wait"
  And the payment should complete within 30 seconds
  And I should receive a confirmation

@edge-case
Scenario: Payment declined
  Given my credit card has insufficient funds
  When I attempt to pay $500.00
  Then I should see "Payment declined"
  And my cart should still contain my items
```

## Gherkin Linting Rules

### Common Rules

| Rule | Description | Enforcement |
|------|-------------|-------------|
| One `Then` per outcome | Each Then asserts exactly one thing | Lint rule |
| No `But` without `Then` | But must follow a Then | Lint rule |
| No punctuation in step text | Steps end without periods | Lint rule |
| Max step length | Steps should not exceed 100 characters | Lint rule |
| Max scenarios per feature | Feature should not exceed 20 scenarios | Convention |
| No duplicate steps | Same step text should not appear in multiple features | Lint rule |
| No implementation details | Steps should not contain CSS selectors, URLs, or code | Review |

### gherkin-lint Configuration

```json
{
  "no-duplicate-scenario-names": "on",
  "no-empty-background": "on",
  "no-trailing-spaces": "on",
  "one-space-between-scenarios": "on",
  "max-scenarios-per-file": ["on", 20],
  "no-superfluous-tags": "on",
  "no-restricted-tags": ["off", []],
  "no-partially-commented-tag-lines": "on",
  "name-length": ["on", { "Feature": 50, "Scenario": 50 }]
}
```

## Best Practices Summary

1. **Write for humans first**: Steps should be readable by non-technical stakeholders
2. **One logical step per line**: Don't combine multiple actions
3. **Use domain language**: Speak the language of the business, not the code
4. **Avoid implementation details**: No CSS selectors, URLs, or database queries
5. **Keep scenarios independent**: Each scenario should run without relying on others
6. **Use Background sparingly**: Too much background makes scenarios hard to read
7. **Tag strategically**: Use tags for organization and selective execution
8. **Use Scenario Outlines for data variations**: Don't repeat scenarios for different data
9. **Limit examples tables**: Keep to 5-10 rows per examples table
10. **Review regularly**: Gherkin files need maintenance like any other code

## Key Points

- Gherkin uses Given/When/Then syntax for executable specifications
- Feature files describe business behavior, not implementation
- Scenario Outlines with Examples tables enable data-driven testing
- Background sections provide shared setup across scenarios in a feature
- Tags enable selective execution and organizational grouping
- Steps should use business language and avoid implementation details
- Data tables support structured input and multi-row scenarios
- Hooks (Before/After) manage test lifecycle at various scopes
- Step definitions should be organized by domain or feature
- Edge cases should be documented explicitly with @edge-case tags
