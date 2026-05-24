---
name: planning-bdd-atdd
description: >
  Use this skill when the user asks about BDD, ATDD, behavior-driven development, acceptance test-driven development, Gherkin, Cucumber, SpecFlow, specification by example, executable specifications, living documentation, three amigos, example mapping, or acceptance criteria refinement. Covers: Gherkin syntax and deep features (Scenario Outline, Data Tables, Doc Strings), Specification by Example methodology, BDD tools (Cucumber, SpecFlow, Behave, JBehave), ATDD workflow with three amigos and example mapping. Do NOT use for: unit testing (unit-testing), integration testing (integration-testing), or manual test planning.
version: "1.0.0"
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

## Workflow

### Step 1: Three Amigos Session
Bring together business analyst (what problem to solve), developer (how to build it), and tester (what could go wrong). Walk through the feature or story. Define shared vocabulary — agree on the terms used in scenarios. Identify key examples that capture the behavior. Surface assumptions and implicit rules early. The output is a shared understanding and a set of concrete examples, not a specification document.

### Step 2: Example Mapping
Structure examples using the example mapping format. Rules define business logic and constraints. Examples are concrete input/output pairs that illustrate the rule. Questions are things the group doesn't know yet. New stories are things discovered that are out of scope. Arrange on a physical or digital board: rules in yellow, examples in green, questions in purple, new stories in red. This visual structure reveals gaps and duplicates immediately.

### Step 3: Write Gherkin Scenarios
Convert examples into Gherkin scenarios. Use Scenario for single examples and Scenario Outline + Examples table for data-driven scenarios. Follow the Given-When-Then structure: Given sets up preconditions, When performs the action, Then verifies outcomes. Use And/But for multiple conditions. Write in business language, not implementation details. Each scenario tests one behavior. Add tags for organization and selective execution.

### Step 4: Implement Step Definitions
Map Gherkin steps to automated code. Use parameterization for dynamic values. Apply hooks for cross-cutting concerns (database setup, authentication, cleanup). Use page objects or domain-specific helpers to keep step definitions readable. Run scenarios early and often. Red-green-refactor for ATDD: write failing scenario, implement feature code, make it pass, refactor.

### Step 5: Maintain Living Documentation
Integrate feature files into CI pipeline. Generate HTML reports from test execution. Share reports with stakeholders as living documentation. Review feature files regularly — outdated scenarios that pass are worse than failing scenarios. Treat feature files as executable requirements, not test scripts. When business rules change, update the scenario first, then implement.

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

## References
- `references/gherkin-deep-dive.md` — Gherkin syntax: Feature, Scenario, Given/When/Then, Scenario Outline, Examples, Data Tables, Doc Strings
- `references/spec-example.md` — Specification by Example: key examples, refine, automate, validate, living documentation
- `references/bdd-tools.md` — BDD tools: Cucumber, SpecFlow, Behave, JBehave; step definitions, hooks, tags
- `references/atdd-workflow.md` — ATDD workflow: three amigos, example mapping, acceptance criteria, test-first

## Handoff
`create-story` for converting discovered stories into backlog items. `create-tech-spec` for implementation details from step definitions. `create-prd` for aligning feature files with product requirements.
