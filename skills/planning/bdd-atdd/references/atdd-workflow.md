# ATDD Workflow

## Overview
Acceptance Test-Driven Development (ATDD) is a collaborative practice where the team defines acceptance tests together before implementing the feature. It ensures shared understanding and produces automated tests that validate the feature meets business requirements.

## The Three Amigos

### Roles

| Amigo | Role | Focus | Key Question |
|-------|------|-------|-------------|
| **Business Analyst / Product Owner** | Defines the problem | What problem are we solving? What value does this create? | "Does this meet the business need?" |
| **Developer** | Builds the solution | How should this be implemented? What are the technical constraints? | "Is this technically feasible and well-defined?" |
| **Tester / QA** | Validates the quality | What could go wrong? How do we verify it works? | "How do we prove this works correctly?" |

### Three Amigos Session Flow

```
1. PO/BA presents the feature or story (5 min)
2. Each amigo shares their perspective on what matters (10 min)
3. Walk through the acceptance criteria (10 min)
4. Identify concrete examples together (15 min)
5. Surface questions and assumptions (5 min)
6. Agree on what done looks like (5 min)
```

### Session Output
- Refined acceptance criteria
- Set of concrete examples (happy path, edge cases, error cases)
- Shared vocabulary for the feature
- Questions to resolve outside the session
- Agreement on Definition of Done for this feature

## Example Mapping

### What is Example Mapping?
A lightweight, visual technique for structuring the three amigos session. Uses colored index cards (digital or physical) to map out rules, examples, questions, and new stories.

### Card Types
| Card | Color | Content |
|------|-------|---------|
| **Rule** | Yellow | Business rule or constraint |
| **Example** | Green | Concrete input/output pair illustrating a rule |
| **Question** | Purple | Something the team doesn't know and needs to resolve |
| **New Story** | Red | An uncovered scenario that's out of scope |

### Example Mapping Session Structure

```
Feature: Shipping Cost Calculation

Rules (Yellow):
├── Free shipping on orders $50+
├── Heavy item surcharge ($10) for items >20lbs
├── No shipping charges for digital items
└── International shipping costs 2x

Examples (Green):
├── [Rule: Free shipping] Order $75 → free shipping ✅
├── [Rule: Free shipping] Order $50.01 → free shipping ✅
├── [Rule: Free shipping] Order $49.99 → $5.99 ✅
├── [Rule: Heavy surcharge] 25lb item, $60 → $10 surcharge + free shipping ✅
├── [Rule: Digital items] $100 digital → $0 shipping ✅
└── [Rule: International] $75 international → free shipping × 2 = free? ❓

Questions (Purple):
├── Do digital items count toward the $50 threshold for physical items?
├── What's the maximum weight for free shipping?
└── Are there exceptions to international shipping?

Out of Scope (Red):
└── [New Story] Shipping insurance options
```

### Example Mapping Rules
1. Start with the rules — they define the boundaries of the feature
2. Add examples under each rule — concrete cases that demonstrate the rule
3. Questions go on a separate stack — they need resolution, not discussion
4. New stories go to the backlog — don't expand scope in this session
5. Keep it fast — 30-45 minutes per story
6. If you can't find an example for a rule, the rule is probably unclear
7. If you can't find a rule for an example, the example might be irrelevant

## Acceptance Criteria Refinement

### From Stories to Criteria
```
Story: As a customer, I want free shipping on orders over $50

Acceptance Criteria:
1. Orders with subtotal >= $50.00 qualify for free standard shipping
2. Orders with subtotal < $50.00 are charged $5.99 standard shipping
3. Heavy items (>20lbs) incur a $10 surcharge regardless of order total
4. Digital-only orders have no shipping charge at any total
5. International orders pay 2x the domestic shipping rate
6. Free shipping does not apply to express shipping upgrades
7. Coupons that reduce the subtotal below $50 remove free shipping eligibility
```

### Acceptance Criteria Best Practices
- Each criterion must be testable (pass/fail)
- Criteria should be independent (one criterion doesn't depend on another passing)
- Write criteria as behavioral outcomes, not implementation steps
- Negative criteria are as important as positive ones
- Each criterion should map to one or more automated scenarios

### Acceptance Criteria Checklist
```
□ Each criterion is a complete sentence
□ Each criterion is testable (pass/fail)
□ No technical implementation details
□ Covers happy path (primary flow)
□ Covers alternate paths (variations)
□ Covers error paths (failure modes)
□ Covers boundary values
□ Criteria are mutually exclusive where possible
□ Business stakeholders can understand them
□ Team agrees on Definition of Done
```

## Test-First Implementation

### ATDD Cycle
```
1. Write acceptance test (scenario) → FAIL (not implemented yet)
2. Write just enough production code → PASS
3. Refactor code while keeping tests green
4. Write next acceptance test → FAIL
5. Repeat until all scenarios pass
```

### ATDD with TDD
```
For each acceptance test (scenario):
  For each step in the scenario:
    Write a unit test → FAIL
    Write implementation code → PASS
    Refactor
  Run the acceptance test → PASS
  Move to next scenario
```

### Example ATDD Cycle

```gherkin
# Step 1: Write the acceptance test (fails initially)
Scenario: Free shipping at $50 threshold
  Given my cart total is $50.00
  When I calculate shipping
  Then shipping should be $0.00
```

```java
// Step 2a: Write step definitions (compilation may fail)
@Given("my cart total is ${double}")
public void setCartTotal(double total) {
    cart = new Cart();
    cart.setTotal(total);
}

@When("I calculate shipping")
public void calculateShipping() {
    shipping = new ShippingCalculator();
    result = shipping.calculate(cart);
}

@Then("shipping should be ${double}")
public void verifyShipping(double expected) {
    assertEquals(expected, result.getAmount(), 0.01);
}
```

```java
// Step 2b: Write minimal implementation
public class ShippingCalculator {
    public ShippingResult calculate(Cart cart) {
        if (cart.getTotal() >= 50.00) {
            return new ShippingResult(0.00); // Make the test pass
        }
        return new ShippingResult(5.99);
    }
}
```

## Continuous Feedback

### Feedback Loop
```
Three Amigos (shared understanding)
    ↓
Example Mapping (concrete examples)
    ↓
Acceptance Criteria (measurable outcomes)
    ↓
Gherkin Scenarios (executable specs)
    ↓
ATDD Cycle (test-first implementation)
    ↓
CI Pipeline (automated validation)
    ↓
Living Documentation (always-up-to-date specs)
    ↓
Review with Stakeholders (validate against business need)
    ↓
Next iteration or next feature
```

### ATDD Anti-Patterns

| Anti-Pattern | Symptom | Fix |
|---|---|---|
| Missing three amigos | Tests written by one person, missed edge cases | Schedule three amigos for every story |
| Examples after code | Tests validate rather than specify | Write scenarios before implementation |
| Too many examples | Exhaustive data tables, slow test suite | Focus on distinct rules, not permutations |
| Technical Gherkin | Step definitions with UI details | Write in business language, abstract technical details |
| No business involvement | Stakeholders don't read the specs | Show living documentation in sprint review |
| Skipping questions | Purple cards pile up without resolution | Dedicate time to resolve purple cards before development |
| No refactoring | Step definitions grow into an unmaintainable mess | Regularly refactor step definitions and helpers |

## References
- ATDD by Example: A Practical Guide to Acceptance Test-Driven Development — Markus Gärtner (2012)
- Specification by Example — Gojko Adzic (2011)
- Example Mapping — Matt Wynne (Cucumber)
- https://cucumber.io/docs/bdd/
- https://specificationbyexample.com/
