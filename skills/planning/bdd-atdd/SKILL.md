---
name: planning-bdd-atdd
description: >
  Use this skill when the user asks about BDD, ATDD, behavior-driven development, acceptance test-driven development, Gherkin, Cucumber, SpecFlow, specification by example, executable specifications, living documentation, three amigos, example mapping, or acceptance criteria refinement. Covers: Gherkin syntax and deep features (Scenario Outline, Data Tables, Doc Strings), Specification by Example methodology, BDD tools (Cucumber, SpecFlow, Behave, JBehave), ATDD workflow with three amigos and example mapping. Do NOT use for: unit testing (unit-testing), integration testing (integration-testing), or manual test planning.
version: "2.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [planning, bdd, atdd, testing, phase-10]
---

# BDD and ATDD

## Purpose
Drive development through shared examples and executable specifications using Behavior-Driven Development and Acceptance Test-Driven Development. Ensures shared understanding across business and technical stakeholders, produces living documentation that stays in sync with the code, and enables automated validation of business rules.

## Agent Protocol

### Trigger
"BDD", "ATDD", "behavior-driven development", "acceptance test-driven development", "Gherkin", "Cucumber", "SpecFlow", "specification by example", "executable specification", "living documentation", "three amigos", "example mapping", "acceptance criteria", "scenario", "feature file", "step definition".

### Input Context
- Feature or user story to be implemented
- Business rules and acceptance criteria (existing or to be defined)
- Technical stack: programming language, test framework, BDD tool
- Key examples of expected behavior (inputs, outputs, edge cases)
- Stakeholders available for three amigos session
- Existing test infrastructure (CI pipeline, reporting)

### Output Artifact
Gherkin feature files with scenarios, step definition stubs, and example maps that serve as executable specifications and living documentation.

### Response Format
```
## Feature: {name}
{feature description in business language}

### Scenario: {scenario name}
Given {precondition}
When {action}
Then {expected outcome}

### Scenario Outline: {name}
Given {precondition with <placeholder>}
When {action with <placeholder>}
Then {expected outcome with <placeholder>}

Examples:
| placeholder1 | placeholder2 |
| value1       | value2       |

## Example Map
{structured examples table: Rule | Example | Expected Result}
```

No preamble. No postamble. No explanations.

### Completion Criteria
- [ ] Feature files written in Gherkin with business-readable language
- [ ] Scenarios cover happy path, error cases, and edge cases
- [ ] Scenario Outlines used for data-driven scenarios
- [ ] Step definitions mapped to automation implementation
- [ ] Three amigos session completed with shared understanding
- [ ] Example map documented linking rules to concrete examples
- [ ] Tags applied for organization and selective execution
- [ ] CI pipeline configured to run feature files as automated tests

### Max Response Length
7000 tokens

## Decision Trees

### When to Use BDD vs ATDD vs Both
```
Are you defining acceptance criteria for a user story?
  |-- YES --> Is there ambiguity in business rules?
  |     |-- YES --> Use Three Amigos + Example Mapping first
  |     |     Output: shared understanding, concrete examples
  |     |-- NO --> Is the feature complex with many edge cases?
  |           |-- YES --> Use ATDD with example mapping
  |           |-- NO --> Use standard acceptance criteria
  |-- NO --> Are you automating validation of business rules?
        |-- YES --> Use BDD with Gherkin + step definitions
        |-- NO --> Consider unit or integration tests instead

Are you writing automated tests for an existing feature?
  |-- YES --> Are you adding new behavior?
  |     |-- YES --> BDD (write scenarios first)
  |     |-- NO --> Integration or unit tests
  |-- NO --> Start with Three Amigos
```

### Gherkin Structure Decision Tree
```
How many data variations does the scenario need?
  |-- 1 set of values --> Use Scenario (Given-When-Then)
  |-- 2-10 sets --> Use Scenario Outline + Examples table
  |-- 10+ sets --> Use Scenario Outline + Data Table from external source
  |-- Dynamic/runtime data --> Use Scenario with Data Table

Does the scenario need setup steps shared across scenarios?
  |-- YES --> Use Background section
  |-- NO --> Keep Given steps in each scenario
```

### BDD Maturity Model
| Level | Name | Characteristics | Practices |
|-------|------|----------------|-----------|
| 1 | Initial | No BDD, manual testing, requirements in prose | Ad-hoc acceptance criteria |
| 2 | Structured | Gherkin feature files, basic step definitions | Three amigos occasionally |
| 3 | Integrated | Scenarios drive development, CI execution | TDD + BDD, living documentation |
| 4 | Optimized | Specification by Example, automated reporting | Example maps, behavior analytics |

## Workflow

### Step 1: Three Amigos Session
Bring together business analyst (what problem to solve), developer (how to build it), and tester (what could go wrong). Walk through the feature or story. Define shared vocabulary — agree on the terms used in scenarios. Identify key examples that capture the behavior. Surface assumptions and implicit rules early. The output is a shared understanding and a set of concrete examples, not a specification document.

Session structure: 30-60 minutes, whiteboard or digital collaboration tool. Begin with the feature description. Each amigo describes their understanding. Identify differences in interpretation — those are the highest-value areas for examples. Document rules explicitly. Capture questions for follow-up. End with 3-10 concrete examples.

### Step 2: Example Mapping
Structure examples using the example mapping format. Rules define business logic and constraints. Examples are concrete input/output pairs that illustrate the rule. Questions are things the group doesn't know yet. New stories are things discovered that are out of scope. Arrange on a physical or digital board: rules in yellow, examples in green, questions in purple, new stories in red. This visual structure reveals gaps and duplicates immediately.

### Step 3: Write Gherkin Scenarios
Convert examples into Gherkin scenarios. Use Scenario for single examples and Scenario Outline + Examples table for data-driven scenarios. Follow the Given-When-Then structure: Given sets up preconditions, When performs the action, Then verifies outcomes. Use And/But for multiple conditions. Write in business language, not implementation details. Each scenario tests one behavior. Add tags for organization and selective execution.

### Step 4: Implement Step Definitions
Map Gherkin steps to automated code. Use parameterization for dynamic values. Apply hooks for cross-cutting concerns (database setup, authentication, cleanup). Use page objects or domain-specific helpers to keep step definitions readable. Run scenarios early and often. Red-green-refactor for ATDD: write failing scenario, implement feature code, make it pass, refactor.

### Step 5: Maintain Living Documentation
Integrate feature files into CI pipeline. Generate HTML reports from test execution. Share reports with stakeholders as living documentation. Review feature files regularly — outdated scenarios that pass are worse than failing scenarios. Treat feature files as executable requirements, not test scripts. When business rules change, update the scenario first, then implement.

## Gherkin Syntax Reference

### Core Keywords
| Keyword | Purpose | Example |
|---------|---------|---------|
| Feature | High-level description of feature | `Feature: User Login` |
| Scenario | Single concrete example | `Scenario: Valid credentials` |
| Given | Precondition / context | `Given the user is on the login page` |
| When | Action / trigger | `When the user enters valid credentials` |
| Then | Expected outcome | `Then the user is redirected to dashboard` |
| And | Conjunction for steps | `And the user sees a welcome message` |
| But | Negative conjunction | `But the user does not see an error` |
| Background | Shared setup for all scenarios | Steps run before each scenario |
| Scenario Outline | Template for data-driven | `Scenario Outline: Login with <role>` |
| Examples | Data table for Scenario Outline | `| role | username | password |` |
| Data Table | Structured data input | `| name | age | city |` |
| Doc String | Multi-line text block | `""" ... """` |

### Tags for Organization
```
@smoke @regression @checkout
Feature: Payment Processing

@critical @P0
Scenario: Successful credit card payment
```

### Rule Groups (Gherkin 6+)
```
Feature: Shipping

  Rule: Free shipping for orders over $50
    Example: Order of $75 qualifies
      Given ...

  Rule: Express shipping costs $15
    Example: Standard address within 48 states
      Given ...
```

## Example Maps

### Template
```
| Rule | Example | Input | Expected Result |
|------|---------|-------|-----------------|
| {business rule} | {concrete scenario} | {specific values} | {expected outcome} |
```

### Rules vs Examples
| Artifact | Purpose | Abstraction | Created By |
|----------|---------|-------------|------------|
| Rule | Business constraint | Abstract | Three amigos |
| Example | Concrete instance | Specific | Three amigos |
| Scenario | Executable spec | Specific (Gherkin) | BA + Dev |
| Step Def | Automation code | Implementation | Developer |

## Common Anti-Patterns

### 1. Implementation Details in Gherkin
Writing UI element selectors, API endpoints, or database queries in scenarios. Scenarios become brittle — any UI change breaks tests that validate business rules, not UI behavior. Fix: write in business language. "When the user logs in" not "When the user enters 'admin' into the #username field and 'pass123' into the #password field and clicks the #submit-button".

### 2. God Scenarios
Scenarios that test multiple behaviors with multiple Then assertions. When the scenario fails, you don't know which behavior broke. Fix: one behavior per scenario. If a scenario has multiple Then statements testing different outcomes, split into multiple scenarios.

### 3. Scenario Outline Overuse
Using Scenario Outline for every scenario instead of evaluating whether each data variation tests distinct behavior. Leads to unreadable scenarios with 50-row Examples tables. Fix: identify equivalence classes. Test one example per class. Add boundary tests separately.

### 4. Vague Givens
Using "Given the user is logged in" without specifying as what role or with what permissions. The step becomes a black box that hides setup complexity. Fix: "Given the user is logged in as an admin" or "Given the user is logged in with expired subscription".

### 5. Orphaned Feature Files
Feature files that exist but are not executed in CI. They pass because they're never run. False sense of coverage. Fix: every feature file must be in the CI pipeline with a test result. Add a lint rule that fails if any feature file is not referenced.

### 6. Skipping Three Amigos
Developers write Gherkin scenarios without BA or tester input. Scenarios reflect developer understanding, not shared understanding. The entire value of BDD is lost. Fix: never write scenarios without a three amigos session first.

### 7. Slow Steps
Step definitions that make API calls, database queries, or UI interactions for every step. Scenarios take minutes to run, defeating the fast feedback loop. Fix: use test doubles, in-memory databases, and API stubs for most steps. Only end-to-end tests use real dependencies.

### 8. Scenario Coupling
Scenarios that depend on the state created by previous scenarios. Order-dependent tests that fail when run in isolation. Fix: each scenario must create its own state. Use Background for shared setup, never depend on other scenarios.

## Three Amigos: Roles and Responsibilities

| Role | Focus | Questions They Ask | Contribution |
|------|-------|-------------------|--------------|
| Business Analyst | What problem are we solving? | "What business rule applies here?" | Domain rules, terminology |
| Developer | How will we build it? | "What's the edge case?" | Feasibility, technical constraints |
| Tester | What could go wrong? | "What happens if the system fails here?" | Error paths, boundary conditions |

Each role has veto power on ambiguity. If any amigo can't explain what a scenario means, it's not ready.

### Facilitation Tips
- Timebox: 30 minutes max per feature
- Artifact: physical or digital board with rules/examples/questions/stories
- Rule: no laptops during the session (except the facilitator)
- Output: 3-10 concrete examples that become Gherkin scenarios
- Avoid: implementation discussion, architecture debates, design details

## Specification by Example (SBE) Process

### Key Principles
1. **Key examples first**: derive specifications from concrete examples, not abstract requirements
2. **Process as code**: examples become automated tests that validate the system
3. **Living documentation**: tests serve as up-to-date system documentation
4. **Common vocabulary**: all stakeholders use the same terms

### SBE Steps
1. Scope: identify the feature and its business rules
2. Examples: discover concrete input-output pairs
3. Automate: convert examples into executable Gherkin scenarios
4. Validate: run scenarios against the system
5. Evolve: update examples as business rules change

## Tool-Specific Guidance

### Cucumber (Ruby/JVM/JS)
- Step definition matching: regex or Cucumber Expressions
- Hooks: Before, After, Around, AfterStep
- World: shared context object
- Reports: JSON, HTML, JUnit XML

### SpecFlow (.NET)
- Step definition matching: regex, method attributes
- Hooks: BeforeScenario, AfterScenario, BeforeFeature
- Context injection: dependency injection for shared state
- Reports: TRX, HTML, LivingDoc

### Behave (Python)
- Step definition matching: decorators with regex
- Hooks: before_scenario, after_scenario, before_all
- Context: `context` object for shared state
- Reports: JSON, JUnit XML, HTML

### JBehave (Java)
- Step definition matching: annotated methods
- Hooks: @Before, @After, @BeforeStory
- Stories: .story files with Gherkin-like syntax
- Reports: HTML, XML, TXT

## BDD Adoption Patterns

### Team Maturity Stages
| Level | Characteristics | Prerequisites | Success Metrics |
|-------|----------------|---------------|-----------------|
| 1. Beginner | Writing basic Gherkin, no automation | Training on Gherkin syntax | Feature files written for 50%+ stories |
| 2. Structured | Three amigos regular, automated step defs | Three amigos facilitation training | 80%+ stories with three amigos |
| 3. Integrated | Scenarios drive development, CI execution | CI pipeline integration skills | 100% feature file coverage in CI |
| 4. Optimized | Living documentation, metrics-driven | Monitoring and reporting setup | Stakeholders read living docs monthly |

### Common Adoption Challenges

**Challenge: Business stakeholder engagement**
Business stakeholders skip three amigos sessions. Scenario: BA says "developers can write the scenarios." Result: scenarios reflect technical understanding, not shared understanding.
**Solution:** Timebox sessions to 30 minutes. Prepare examples in advance. Show stakeholders how scenarios protect their requirements. Make it a ritual, not a meeting.

**Challenge: Test maintenance burden**
As product evolves, features and step definitions need updates. Teams abandon BDD when maintenance exceeds creation effort.
**Solution:** Refactor step definitions regularly. Use shared step libraries. Tag scenarios by frequency tier (@smoke runs on every commit, @regression runs nightly). Budget 20% of sprint for test maintenance.

**Challenge: Slow execution time**
BDD scenarios that hit real APIs, databases, or UIs become slow. Teams stop running them frequently. They break and stay broken.
**Solution:** Use test doubles for most scenarios. Reserve end-to-end for critical paths marked @e2e. Run fast scenarios on every commit, slow scenarios nightly. Parallelize execution.

## Living Documentation in Practice

### Feature Files as Documentation
Feature files are not test scripts — they are executable requirements. They serve as the single source of truth for system behavior. All stakeholders (business, dev, QA) should be able to read and understand them. Documentation quality criteria:

| Criterion | Good | Bad |
|-----------|------|-----|
| Business readability | Non-technical stakeholder can understand | Requires knowledge of implementation |
| Terminology | Uses domain language from three amigos | Uses technical or UI-specific terms |
| Scenario isolation | Each scenario tests one behavior | Scenarios depend on each other |
| Maintenance | Updating scenario triggers implementation change | Scenario can pass without reflecting current behavior |

### Living Documentation Publishing
Generate living documentation from feature file execution. Include in CI pipeline: run feature files as automated tests, generate HTML report with pass/fail for each scenario, publish report to shared location accessible to all stakeholders, attach report to release notes.

Report should include: feature list with descriptions, scenario count by status (pass/fail/skipped), execution time per scenario, tags and their coverage, trend chart showing pass rate over time. Review living documentation monthly with business stakeholders — if they can't understand it, rewrite the features.

### BDD in CI/CD Pipeline

```
Commit → Build → Unit Tests → BDD Tests → Integration Tests → Deploy
                              ↓
                Feature file execution
                Generate living documentation
                Publish report to stakeholders
                Fail build on P0 scenario failure
```

Best practices: run smoke BDD tests on every commit (tagged @smoke), run full BDD suite nightly, notify stakeholders on failure, maintain average execution time <30 seconds per feature, parallelize scenario execution for speed, use tags for selective execution by environment.

## BDD Tool Comparison

| Tool | Language | Step Matching | CI Integration | Reporting | License |
|------|----------|--------------|----------------|-----------|---------|
| Cucumber | Ruby/JVM/JS | Cucumber Expr/Regex | Native | HTML, JSON, JUnit | Open source |
| SpecFlow | .NET | Attributes/Regex | Native | LivingDoc, TRX | Open source |
| Behave | Python | Decorators/Regex | Native | JSON, JUnit | Open source |
| JBehave | Java | Annotations | Native | HTML, XML | Open source |
| Kiwi | Swift | Closures | XCTest | XCTest | Open source |

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Scenario pass rate | >95% in CI | CI pipeline report |
| Feature file coverage | 100% of stories | PR review gate |
| Three amigos session completion | 100% of features | Team checklist |
| Living doc freshness | <2 weeks stale | Review cadence |
| Step definition reuse | >50% shared steps | Code analysis |
| Scenario execution time | <30s per feature | CI pipeline timing |

## Rules
- Gherkin scenarios must be understandable by business stakeholders, not just developers
- Scenarios must not reference UI elements unless the feature is specifically about UI behavior
- Feature files are the single source of truth for requirements — not Jira, not a spec doc
- Each scenario should test exactly one behavior — multiple assertions in one scenario is an anti-pattern
- Step definitions must be reusable across scenarios — avoid duplicating step logic
- Hooks must be minimal and fast — slow hooks destroy the feedback loop
- Scenario Outline + Examples is for data variation, not for listing all test cases
- Feature files belong in the code repository alongside the implementation
- Three amigos must include all three roles — skipping one party produces blind spots
- Background sections must be concise — excessive Background hides important setup
- Tags must follow a convention: @{tier} @{domain} @{priority}
- Doc Strings should have a language hint: `"""json` for JSON, `"""xml` for XML
- Data Tables should have a header row with descriptive column names
- Scenario nesting (Rule → Example) replaces Background for Gherkin 6+

## References
  - references/gherkin-deep-dive.md — Gherkin Deep Dive
  - references/spec-example.md — Specification by Example
  - references/bdd-tools.md — BDD Tools
  - references/atdd-workflow.md — ATDD Workflow
  - references/bdd-atdd-advanced.md — Bdd Atdd Advanced Topics
  - references/bdd-atdd-fundamentals.md — Bdd Atdd Fundamentals
  - references/gherkin-patterns-catalog.md — Gherkin Patterns Catalog
  - references/step-definition-guide.md — Step Definition Implementation Guide
  - references/bdd-ci-pipeline.md — BDD CI Pipeline Setup
## Handoff
`create-story` for converting discovered stories into backlog items. `create-tech-spec` for implementation details from step definitions. `create-prd` for aligning feature files with product requirements.
