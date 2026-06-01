# PRD Fundamentals

## What is a PRD?
A Product Requirements Document (PRD) translates a product brief into structured requirements that engineering, design, and QA can execute against. It defines WHAT needs to be built with enough precision for estimation, design, and verification.

## Core Components

### Epics
Large feature areas that group related user stories. Each epic covers a distinct capability (e.g., "User Authentication," "Payment Processing"). Epics should be completable in 1-2 sprints and independent enough to implement in any order.

### User Stories
Small, verifiable features described from the user's perspective. Each story follows the format: "As a {role}, I want to {action} so that {value}." Stories must be completable in 1-3 days.

### Acceptance Criteria (Gherkin)
Given/When/Then statements that define when a story is complete. Each story needs at least 2 criteria: one happy path and one edge case.

### Non-Functional Requirements
System-level requirements covering performance, security, scalability, availability, compatibility, and accessibility.

### Definition of Done
Quality gates that every story must pass before it is considered complete. Includes testing, code review, documentation, and deployment checks.

## The PRD-Brief Relationship
The PRD depends entirely on the brief. If the brief is solid, the PRD writes itself. If the brief is vague or missing, go back and fix the brief first.

## Writing Good User Stories

**Format**: "As a {specific user role}, I want to {specific action} so that {specific value}."

**Rules**:
- Describe WHAT, not HOW
- Each story is independently verifiable
- Stories take 1-3 days to complete
- No technical implementation details
- Consistent role names across all stories

## Writing Good Acceptance Criteria

**Guidelines**:
- Start with the happy path (what normally happens)
- Add at least one edge case (what happens when things go wrong)
- Be precise and testable — "system displays error" is vague, "system displays 'Invalid email format' below the email field" is testable
- Include empty states, error states, and boundary conditions

## Essential Practices

**Read the brief first**: The PRD implements the brief. If the brief is missing or incomplete, fix that before starting the PRD.

**Scope to MVP**: Include only what is needed for the MVP. Defer non-critical features to V2 with explicit labels.

**Involve engineers early**: Review epics and stories with the engineering team before finalizing. They will catch feasibility issues the PM missed.

**Version control**: Keep the PRD in git alongside the code. Use versioned filenames and a changelog.

**Review cycles**: 2-3 rounds of feedback from engineering, design, and product before finalization.

## Common Mistakes

**Implementation details in requirements**: "System uses Redis cache" is implementation. The requirement is "pages load in under 2 seconds."

**Vague acceptance criteria**: "Users can search" is not testable. Specify what happens, with what input, and what results are expected.

**Scope creep**: Adding features during the PRD phase that were not in the brief. If it is not in the brief, it does not go in the PRD.

**Inconsistent roles**: Using different names for the same user type across stories. Define all roles in a glossary.

**No negative test cases**: Acceptance criteria that only cover success scenarios. Always include at least one error case.
