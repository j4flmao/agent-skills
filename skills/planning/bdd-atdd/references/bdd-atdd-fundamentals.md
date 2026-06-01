# BDD & ATDD Fundamentals

## Overview
BDD (Behavior-Driven Development) and ATDD (Acceptance Test-Driven Development) shift testing left by defining expected behavior before implementation begins. This reference covers the foundational concepts, vocabulary, and practices needed to adopt BDD/ATDD in any team.

## Core Concepts

### What is BDD?
BDD is a software development methodology where application behavior is specified in natural language that all stakeholders understand. Scenarios are written before code and serve as both requirements and automated tests. BDD answers: "What should the system do?"

### What is ATDD?
ATDD is a development practice where the team collaboratively writes acceptance tests before implementation begins. It focuses on ensuring the team shares a common understanding of what "done" means. ATDD answers: "How do we know when it's done?"

### Shared Vocabulary
| Term | Definition | Example |
|------|------------|---------|
| Feature | A unit of functionality delivering business value | "User Login" |
| Scenario | A single concrete example of behavior | "Successful login with valid credentials" |
| Step | One action in a scenario | "Given the user is on the login page" |
| Rule | A business constraint or policy | "Passwords must be at least 8 characters" |
| Example | Concrete input-output pair | "username=admin, password=pass123 → dashboard" |
| Background | Shared setup steps for all scenarios | "Given the database contains seed data" |

### The BDD Cycle (Outside-In)
1. Write a failing scenario (outside: business behavior)
2. Write just enough production code to make it pass
3. Refactor code while keeping scenarios green
4. Repeat

This is distinct from TDD (inside-out): TDD writes unit tests first, BDD writes acceptance tests first. They complement each other — BDD drives architecture from the outside, TDD drives design from the inside.

### Three Amigos
The Three Amigos are a meeting where three perspectives converge:
- **Business**: defines what problem to solve and business rules
- **Development**: determines technical approach and feasibility
- **Testing**: identifies edge cases, error paths, and quality concerns

The session produces a shared understanding and concrete examples, never a requirements document. The key output is a set of examples the whole team agrees on before anyone writes code.

## Gherkin Fundamentals

### Given-When-Then Structure
```
Given {precondition}           — establish context
  AND {additional context}
When {action or trigger}       — perform the action
  AND {additional action}
Then {expected outcome}         — verify the result
  AND {additional outcome}
```

### Writing Effective Steps
| Quality | Bad Example | Good Example |
|---------|-------------|--------------|
| Specific | Given user is logged in | Given the user "alice" is logged in as a premium member |
| Behavioral | When button is clicked | When the user submits the order |
| Observable | Then data is saved | Then the user sees a confirmation message with order number |
| Atomic | Given user is logged in and on dashboard | Given user is logged in AND Given user is on the dashboard |

### Background Section
Use Background for setup steps common to all scenarios in a feature:

```gherkin
Feature: Order Management

Background:
  Given the store has the following products:
    | name    | price | stock |
    | Widget  | 9.99  | 100   |
  And the user "alice" is logged in
```

### Scenario Outlines
Use for data-driven scenarios where the same flow applies to multiple inputs:

```gherkin
Scenario Outline: Purchase with different payment methods
  Given the user has <item> in cart
  When the user pays with <method>
  Then the order status is <status>

  Examples:
    | item   | method   | status    |
    | Widget | Credit   | confirmed |
    | Widget | Invoice  | pending   |
    | Widget | Invalid  | rejected  |
```

### Rule Groups (Gherkin 6+)
Organize scenarios under rules for complex features:

```gherkin
Feature: Shipping

  Rule: Free shipping for orders over $50
    Example: $75 order
      Given the cart total is $75
      When the user proceeds to checkout
      Then shipping cost is $0

  Rule: Standard shipping for orders under $50
    Example: $25 order
      Given the cart total is $25
      When the user proceeds to checkout
      Then shipping cost is $5.99
```

## Common Anti-Patterns

### 1. Writing Test Scripts as Scenarios
Scenarios that describe the UI interaction sequence rather than the business behavior. Fix: focus on what the user accomplishes, not what they click.

### 2. Scenarios Without Three Amigos
Developers writing Gherkin in isolation. The result reflects only the developer's understanding. Fix: always involve all three roles before writing scenarios.

### 3. Step Definitions That Do Too Much
Each step definition should do one thing. A Given step that sets up database, calls API, and verifies state does three things. Fix: compose step definitions from smaller helper methods.

### 4. Feature Files as Test Cases
Using feature files to document every test permutation. Feature files should document business rules and key examples, not exhaustive test matrices. Fix: one scenario per business rule, not per test case.

## Step Definition Implementation Patterns

### Parameterization
```ruby
# Gherkin: Given the user "alice" exists
Given(/^the user "([^"]+)" exists$/) do |username|
  create_user(username: username)
end
```

### Data Tables
```gherkin
Given the store has products:
  | name    | price | stock |
  | Widget  | 9.99  | 10    |
  | Gadget  | 14.99 | 5     |
```

```ruby
Given(/^the store has products:$/) do |table|
  table.hashes.each { |row| create_product(row) }
end
```

### Doc Strings
```gherkin
Then the response contains:
  """
  { "status": "ok", "order_id": "ORD-001" }
  """
```

### Hook Usage
| Hook | Scope | Use Case |
|------|-------|----------|
| BeforeSuite | Global | Database setup, test data seeding |
| BeforeFeature | Feature | Feature-specific configuration |
| BeforeScenario | Scenario | Test data creation, login |
| AfterScenario | Scenario | Cleanup, screenshot on failure |
| AfterSuite | Global | Teardown, report generation |

## CI Integration

### Pipeline Stages
1. **Parse**: validate Gherkin syntax
2. **Compile**: compile step definitions
3. **Execute**: run scenarios with tags
4. **Report**: generate living documentation
5. **Publish**: share results with stakeholders

### Tag-Based Execution
```
# Run only smoke tests
cucumber --tags @smoke

# Run everything except slow tests
cucumber --tags ~@slow

# Run critical checkout tests
cucumber --tags @checkout --tags @critical
```

## Success Metrics

| Metric | Target | How to Measure |
|--------|--------|----------------|
| Scenario pass rate in CI | >95% | Pipeline report |
| Three amigos coverage | 100% of features | Team tracking |
| Time from example to scenario | <1 day | Cycle time |
| Scenario execution time | <1 min per feature | Pipeline timing |
| Living doc refresh rate | <2 weeks | Last run timestamp |
| Business stakeholder readability | >80% comprehension | Periodic review |

## Key Points
- BDD is about shared understanding, not test automation
- Write scenarios before code, not after
- Business language, not technical implementation
- One behavior per scenario
- Three Amigos is mandatory, not optional
- Feature files live in the code repository
- Living documentation requires CI integration
- Scenarios are executable requirements
- Refactor step definitions for reuse
- Review scenarios when business rules change
