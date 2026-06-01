# Prototyping Fundamentals

## Overview
Prototyping is the process of creating interactive models of a design to test ideas, validate assumptions, and communicate concepts before investing in full development. This reference covers fundamental concepts, fidelity levels, and best practices.

## Core Concepts

### Concept 1: Fidelity Levels
Fidelity ranges from low (paper sketches, wireframes) to mid (clickable wireframes with basic interactions) to high (pixel-perfect interactive mockups with real content). Match fidelity to the question being answered: lo-fi for concept validation, hi-fi for feel and stakeholder sign-off.

### Concept 2: Test-Driven Prototyping
Define test scenarios and success metrics BEFORE building the prototype. A prototype without a test plan is a mockup. Test with 5-8 real target users, not stakeholders. Document findings and iterate.

### Concept 3: Interactive States
Prototypes must include core states: default, hover (desktop), active/pressed, loading, empty, error, and disabled. Omitting states gives a false sense of completeness. Use real content in hi-fi prototypes to reveal layout and truncation issues.

### Concept 4: Scope Management
Prototype only what's needed to answer the specific question. An incomplete prototype that teaches something is better than a complete one that doesn't. Maximum 3 core flows per prototype.

### Concept 5: Handoff
Prototype handoff should include: design specs with measurements, exported assets, interactive behavior documentation, responsive breakpoints, accessibility notes, and content guidelines. Clearly mark as prototype, not production.

## Architecture Patterns

### Pattern 1: Progressive Fidelity
Start with lo-fi sketches, test concept → move to mid-fi wireframes, test flow → move to hi-fi designs, test feel. Each phase answers a different question and uses learnings from the previous phase.

### Pattern 2: Click-Through Prototype
Link wireframe screens together with clickable hotspots. Define the user flow map with screen states and interactions. Best for navigation and task flow testing.

### Pattern 3: Code Prototype
Build a functional prototype in code (React, Flutter, SwiftUI) for testing technical feasibility, performance, and real data handling. Highest fidelity but highest cost — use only when needed.

## Best Practices

- Prototype to learn, not to present
- Match fidelity to the question
- Use real content in hi-fi prototypes
- Prototype only what's needed
- Test with real users, not just stakeholders
- Define success metrics before building
- Include error, empty, and loading states
- Version your prototypes
- Document assumptions and decisions

## Anti-Patterns

- Too much fidelity too early (wasting time on pixels before validating concept)
- Prototyping every edge case (scope creep)
- Perfect-data syndrome (testing only with ideal content)
- Stakeholder-only testing (not representative users)
- Confusing prototype with product (treating mockup as production-ready)
- Ignoring technical feasibility (prototyping something that can't be built)
