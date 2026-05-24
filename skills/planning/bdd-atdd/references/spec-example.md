# Specification by Example

## Overview
Specification by Example (SbE) is a practice where teams specify requirements using concrete examples rather than abstract descriptions. These examples become executable tests and living documentation.

## The SbE Process

### 1. Identify Key Examples
Work with stakeholders to identify concrete examples of system behavior. Focus on:
- **Happy path**: The normal, expected flow
- **Edge cases**: Boundary values, empty states, single items, maximum values
- **Error cases**: What happens when things go wrong
- **Business rules**: Specific conditional behaviors

**Example**: Shipping Cost Calculation
```
Rule: Free shipping on orders over $50

Happy path: Order total $75 → free shipping
Edge case: Order total exactly $50 → free shipping
Edge case: Order total $49.99 → standard shipping ($5.99)
Edge case: Empty cart ($0) → no shipping needed
Error case: Invalid coupon code → show error, don't apply discount
Business rule: Heavy items (>20lbs) add $10 surcharge regardless of total
```

### 2. Refine Examples
Walk through examples with the team. Clarify assumptions, resolve ambiguities, and uncover missing scenarios. Converge on a shared understanding.

**Refinement questions**:
- "What happens if the customer is in a different country?"
- "Does the coupon stack with existing discounts?"
- "What about digital-only orders with no shipping?"
- "What time zone does the free shipping deadline use?"

### 3. Automate Examples
Convert refined examples into executable specifications using a BDD tool. Each example becomes a scenario or a scenario outline.

### 4. Validate with Automation
Run the specs against the implementation. All specs must pass before the feature is considered done. Failed specs reveal either a bug or a misunderstanding that needs discussion.

### 5. Maintain Living Documentation
The automated specs serve as always-up-to-date documentation. When requirements change, update the spec first (it should fail), then update the code.

## Example Map

A structured way to organize examples during the discovery phase.

### Example Map Structure

```
Feature: Shipping Cost Calculation

Rule: Free shipping on orders $50+
  Example: Cart total $75 → free shipping
  Example: Cart total $50.01 → free shipping
  Example: Cart total $50.00 → free shipping

Rule: Standard shipping for orders under $50
  Example: Cart total $49.99 → $5.99 shipping
  Example: Cart total $25.00 → $5.99 shipping
  Example: Cart total $0.01 → $5.99 shipping

Rule: Heavy item surcharge ($10 additional)
  Example: Item weight 25lbs, total $75 → free shipping + $10 surcharge
  Example: Item weight 25lbs, total $25 → $5.99 + $10 surcharge

Rule: No shipping for digital items
  Example: All digital items, any total → $0.00 shipping
  Example: Mixed cart, total $75 → free shipping (physical only)
```

### Example Map Template
```
| Rule                    | Example                      | Expected Outcome           |
|------------------------|------------------------------|----------------------------|
| {business rule}        | {specific input values}      | {specific expected result} |
| {business rule}        | {specific input values}      | {specific expected result} |
```

### Questions Captured During Mapping
```
Questions:
- What about international shipping addresses?
- Do gift cards combine with free shipping?
- Is there a maximum weight for free shipping?
```

## Living Documentation

### What It Is
Living documentation is your specification by example suite that is:
- **Executable**: Tests that validate the system
- **Readable**: Written so business stakeholders can understand it
- **Traceable**: Each scenario links to a business rule
- **Always current**: Updated as the system evolves

### Living Documentation Benefits
- Single source of truth for requirements
- No stale documentation (it's tested)
- Onboarding: new team members read the spec to understand the system
- Audit: demonstrate that requirements are tested
- Communication: shared language between business and technical teams

### Living Documentation Output

```
Feature: Shipping Cost
  Business value: Customers should understand shipping costs before checkout

  Scenario: Free shipping threshold
    Given my cart total is $50.00
    When I calculate shipping
    Then shipping should be $0.00

  Scenario: Below free shipping threshold
    Given my cart total is $49.99
    When I calculate shipping
    Then shipping should be $5.99

  Scenario: Heavy item surcharge
    Given my cart contains "Heavy Item" with weight 25lbs and total $60.00
    When I calculate shipping
    Then the heavy surcharge of $10.00 should be added

Testing results: all 23 scenarios passing (last run: 2026-04-15)
```

## Executable Specifications

### Key Properties
- **Unambiguous**: Given the same input, the expected output is clearly defined
- **Precise**: No room for interpretation — either it passes or it doesn't
- **Testable**: Can be verified automatically
- **Business-readable**: A product owner can understand what's being tested
- **Atomic**: Each scenario tests one behavior

### Example: Executable Specification in Gherkin
```gherkin
# This is an executable specification AND living documentation
Feature: Discount Application
  All discounts are applied before tax calculation.
  Discounts do not stack unless explicitly specified.

  Scenario: Single percentage discount
    Given my cart subtotal is $100.00
    And I have a "10_PERCENT_OFF" coupon
    When discounts are applied
    Then the discount amount should be $10.00
    And the taxable total should be $90.00

  Scenario: Multiple discounts (non-stacking)
    Given my cart subtotal is $100.00
    And I have a "10_PERCENT_OFF" coupon
    And I have a "5_DOLLARS_OFF" coupon
    When discounts are applied
    Then only the best discount ($10.00) should be applied
    And the taxable total should be $90.00
```

## Common Challenges

| Challenge | Solution |
|-----------|----------|
| Examples too abstract | Use real values, not placeholders |
| Too many examples | Focus on distinct rules, not permutations |
| Examples written after implementation | Write examples first (it's specification, not regression) |
| Stakeholders don't participate | Show them the living documentation output |
| Specs grow stale | CI must run and fail on spec failures |
| Duplicate examples | Review during three amigos, use example maps |
| Slow test suite | Separate fast (unit/API) from slow (UI/E2E) specs |

## References
- Specification by Example: How Successful Teams Deliver the Right Software — Gojko Adzic (2011)
- Bridging the Communication Gap: Specification by Example and Agile Acceptance Testing — Gojko Adzic
- Cucumber Book: Behaviour-Driven Development for Testers and Developers — Matt Wynne & Aslak Hellesøy
- https://specificationbyexample.com/
