# Tech Spec Fundamentals

## What is a Tech Spec?
A technical specification (tech spec) is a detailed document that tells developers exactly what to build and how it should work. It covers system context, API contracts, data models, error handling, performance targets, and testing.

## Core Sections

### System Context
A diagram showing how the feature fits into the existing system — services involved, data stores, communication protocols, and data flow direction.

### API Contract
For each endpoint: method, path, auth requirements, request body schema, response schema, and all error codes with conditions.

### Data Model
Every table or collection with each field's type, constraints, default value, and description. Include indexes, foreign keys, migration SQL, and rollback SQL.

### Performance Targets
Numeric targets for latency, throughput, availability, and recovery. "Fast" is not a target — "p95 < 200ms" is.

### Testing Plan
What to test at each layer — unit (business logic), integration (database, API), E2E (user journeys), and performance (load, stress).

## Essential Practices

**Start with context**: Explain the problem before describing the solution. A developer should understand WHY the feature exists from reading the context section.

**Be precise**: Every field type, every constraint, every error code must be explicitly documented. Ambiguity causes rework.

**Always include rollback**: Schema changes without rollback plans are dangerous. Every migration must have a corresponding rollback.

**Specify performance numerically**: "Fast" and "responsive" mean different things to different people. Use numbers: "p95 < 200ms" is unambiguous.

**Include error handling**: Every endpoint needs explicit error documentation. "Standard errors" is not sufficient.

## Common Mistakes

**Spec as code**: So detailed it duplicates implementation. The spec should define design decisions, not line-by-line instructions.

**No error handling**: Every endpoint needs documented error conditions and codes.

**No rollback**: Schema migration without rollback plan is irresponsible.

**Ambiguous targets**: "Fast" is not a performance target.

**No context**: Describing the solution without explaining the problem.

**Missing non-functional requirements**: No security, logging, or monitoring sections.

**Frontend treated as afterthought**: Frontend specs need component trees, state management, and all UI states (loading, empty, error, success).
