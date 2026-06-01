# Brief Fundamentals

## What is a Product Brief?
A Product Brief is a one-page document that captures the core of what you are building, who you are building it for, and why it matters. It is the first artifact in the planning chain — everything else (PRD, stories, roadmap, architecture) depends on it.

## Purpose
The brief aligns the team around a shared understanding of scope before any design or engineering work begins. It surfaces assumptions, defines boundaries, and sets success criteria. A well-written brief prevents weeks of misalignment downstream.

## Core Components

### Problem Statement
Who has the problem, why is it painful, and why do existing solutions fail. This must be specific to a concrete scenario, not a generic description of a market category.

### Target Users
A specific persona with a role, technical level, and context of use. "Small business owners managing inventory across 3+ locations" is a target user. "Everyone" is not.

### Core Value Proposition
A single sentence that captures what the product does, for whom, and how it is different. Use the format: "A {type} that helps {target user} {achieve outcome} by {mechanism}."

### Key Features (MVP)
3-5 features that deliver the core value. Each feature describes WHAT the user can do, not HOW the system implements it. No technologies, no architecture.

### Out of Scope
What explicitly will NOT be in the MVP. This is as important as what is in scope. Every feature not listed will be assumed included.

### Success Metrics
Measurable criteria that define whether the product is successful. Each metric must have a target number and a measurement method. Avoid vanity metrics like total users.

### Technical Constraints
Platform requirements, budget, compliance needs, performance baselines, and systems to integrate with.

### Timeline
At least a month-level estimate for MVP launch.

## The 5 Questions
Every brief answers 5 essential questions:
1. Who is the target user?
2. What specific problem does this solve?
3. What makes it different from existing solutions?
4. How many users in the first 6 months?
5. When does the MVP need to be ready?

## Rules

### Ask One Question at a Time
Never list all 5 questions in a single message. Each question consumes cognitive bandwidth. Ask, wait for the answer, then ask the next.

### Keep It One Page
The brief must fit a single page when rendered. If it spills to page 2, it is too detailed for this phase. Defer specifics to the PRD.

### No Technical Details
The brief describes WHAT and WHY, not HOW. No technologies, frameworks, or architecture decisions belong in the brief. Those come later.

### No Competitive Analysis
The brief captures the user's vision, not a market analysis. Competitive positioning will be developed during the PRD and market analysis phases.

### Iterate Up to 3 Rounds
Allow up to 3 rounds of changes. After round 3, the brief is approved and refinements move to the PRD phase.

## Essential Practices

**Push for specificity**: "Everyone" is not a target user. "Fixes everything" is not a problem statement. Push until you get concrete answers.

**Preserve user language**: Use the user's words for features and problems. Your job is to structure, not rewrite.

**Flag conflicts**: If the user says "B2B app for consumers," that is a contradiction. Flag it before proceeding.

**Start with scope, not solution**: The brief constrains everything that follows. Get it right — too tight is better than too loose.

**Add buffer to timelines**: User estimates assume everything goes perfectly. Add 30% buffer.

## Common Mistakes

**Skipping out of scope**: Without explicit exclusions, scope creep is guaranteed. Every feature not listed is assumed in scope.

**Accepting "I don't know"**: Defaulting to generic assumptions creates misalignment. Provide 2-3 concrete options for the user to choose from.

**Including implementation**: "User authentication via OAuth2" is implementation. "Sign in with email or Google" is a feature description.

**Vanity metrics**: Total users and downloads measure volume, not value. Activation rate, retention, and conversion measure success.
