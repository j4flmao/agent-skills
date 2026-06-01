# Story Fundamentals

## What is a User Story?
A user story is a small, self-contained description of a feature from the end user's perspective. It is the unit of work in agile development — small enough to complete in 1-3 days, precise enough to be verifiable, and contextual enough to fit the system architecture.

## The Three Components

### User Story Statement
Format: "As a {specific user role}, I want to {specific action} so that {specific value}."

This captures WHO wants the feature, WHAT they want to do, and WHY it matters. Every part must be specific. "As a user" is not specific enough. "As a registered user who has completed onboarding" is specific.

### Acceptance Criteria
Given/When/Then statements that define when the story is complete. Every story needs at least 3:
- 1 happy path (what normally happens)
- 1 edge case (what happens at boundaries)
- 1 error case (what happens when things go wrong)

### Technical Notes
Context that helps the developer implement efficiently: files to touch, patterns to follow, ADRs to reference, migrations needed. Without this, the developer spends time discovering what you already know.

## Story Sizing

| Size | Effort | Example |
|------|--------|---------|
| XS | < 2 hours | Config change, simple bug fix |
| S | 2-4 hours | Single endpoint, one component |
| M | 1-2 days | Full feature with DB changes |
| L | 3-5 days | Complex multi-step feature |
| XL | 1-2 weeks | Needs breakdown into multiple stories |

Stories should be S or M. L and XL stories should be split.

## Writing Good Acceptance Criteria

**Guidelines**:
- Start each scenario with Given (precondition), When (action), Then (expected result)
- Be precise and testable — "system displays error" is vague, "system displays 'Invalid email format' below the email field" is testable
- Include at least one negative case (what happens when the user does something wrong)
- Include empty states, error states, and boundary conditions
- Write from the user's perspective, not the system's

## Essential Practices

**One vertical slice**: A story touches all layers (DB, API, UI) for a single feature. Do not create "backend story" and "frontend story" for the same feature.

**Trace to an epic**: Every story must belong to an epic and trace to an MVP feature in the brief.

**Reference ADRs**: If the story depends on an architecture decision, include the ADR number.

**Write 1 sprint ahead**: Stories written further out will likely change. Write just in time.

**Split when uncertain**: If a story is estimated at L or XL, split it before starting. Uncertainty compounds with size.

## Common Mistakes

**Too large**: Stories taking more than 3 days should be split. "And" in the description is a sign.

**Too vague**: "Users can search" is not testable. "Given the user types 'blue shoes' When they press Enter Then results containing 'blue' or 'shoes' are displayed" is testable.

**No error cases**: Only defining happy path. Error handling is where most bugs live.

**Technical prescriptions**: Telling developers HOW instead of WHAT. "Build a Redis cache" is HOW. "Pages load in under 2 seconds" is WHAT.

**No dependencies**: Starting work without knowing what it depends on leads to blocked developers.

**Orphan stories**: Stories without connection to an epic or brief. Every story must serve a purpose.
