# Team Topology Fundamentals

## Overview
Team topology describes how teams are structured, how they interact, and how organizational design affects software delivery. This reference covers fundamental concepts, team types, interaction modes, and organizational patterns.

## Core Concepts

### Concept 1: Conway's Law

"Organizations design systems that mirror their communication structure." — Melvin Conway, 1968

**Implications**:
- Team boundaries become system boundaries
- Communication paths between teams become integration points
- To change the system architecture, change the team structure first
- Monolith organizations tend to produce monolithic systems

**Inverse Conway Maneuver**: restructure teams to match desired architecture. If you want microservices, create small autonomous teams aligned to service boundaries.

### Concept 2: Team Topology Types (Matthew Skelton & Manuel Pais)

Four fundamental team types:

**Stream-aligned Team**: aligned to a single flow of work (feature, product, service).
- Purpose: deliver value directly to customers
- Size: typically 5-9 people
- Skills: cross-functional (dev, QA, ops, product)
- Example: "Payments Team" owns the payment flow end-to-end

**Enabling Team**: helps stream-aligned teams overcome obstacles.
- Purpose: build capability in other teams through coaching, tools, and research
- Size: typically 3-5 people
- Skills: deep expertise in specific domains
- Example: "Frontend Platform Team" helps teams with UI framework adoption

**Complicated Subsystem Team**: owns a subsystem requiring specialized expertise.
- Purpose: build and maintain complex parts of the system
- Size: typically 3-5 people
- Skills: deep domain expertise in the subsystem
- Example: "Video Encoding Team" owns the video processing pipeline

**Platform Team**: provides internal services and tools that stream-aligned teams use.
- Purpose: reduce cognitive load by providing self-service capabilities
- Size: varies based on platform scope
- Skills: infrastructure, tooling, API design
- Example: "Cloud Platform Team" provides deployment pipelines, monitoring, and infrastructure APIs

### Concept 3: Team Size and Cognitive Load

**Recommended team size**: 5-9 people (Amazon's two-pizza rule).

**Why size matters**:
- Smaller teams (< 5): limited bus factor, skill coverage gaps
- Larger teams (> 9): communication overhead grows exponentially (n(n-1)/2 lines of communication)
- 5-9 balances coverage with communication efficiency

**Cognitive load**: the amount of mental effort required to understand and work with a system.

Teams should have bounded cognitive load. If a team's domain exceeds their cognitive capacity, split the team or provide a platform to reduce complexity.

### Concept 4: Interaction Modes

Three ways teams interact (Skewton & Pais):

**Collaboration**: two teams work together closely for a period.
- When: exploring new territory, solving shared problems, cross-team discovery
- Duration: limited time (weeks, not months)
- Risk: if permanent, blurs ownership and accountability
- Example: Stream-aligned team + Enabling team building a new feature together

**X-as-a-Service**: one team provides something, another consumes it.
- When: clear provider/consumer relationship
- Expectation: API or interface defined by provider
- Risk: consumers lose agency; provider may not meet all needs
- Example: Platform team provides CI/CD pipeline; stream-aligned teams consume it

**Facilitating**: one team helps another improve.
- When: capability building, coaching, knowledge transfer
- Duration: limited, goal-oriented
- Risk: teams become dependent on facilitator
- Example: Enabling team coaches stream-aligned team on testing practices

### Concept 5: Stream Alignment

A stream is a continuous flow of work aligned to a business domain, capability, or customer journey.

**Stream types**:
- Product stream: feature development for a specific product
- Service stream: operation and improvement of a live service
- Channel stream: delivery via a specific channel (mobile, web, API)
- Mission stream: solving a specific business problem

Stream-aligned teams have end-to-end ownership: they build, test, deploy, and operate their part of the system.

### Concept 6: Platform Team Principles

**Platform as a product**: treat internal platform like a product, not a project. User research, onboarding, documentation, SLAs, and deprecation notices.

**Thinnest viable platform**: start with minimal capabilities. Add only what teams ask for. Avoid building platforms no one uses.

**Self-service**: teams should use the platform without contacting the platform team for every action. APIs, CLIs, dashboards, and documentation enable self-service.

**Reduced cognitive load**: the platform should make teams' lives easier, not harder. If platform adds complexity, it's failing.

### Concept 7: Team API

Each team should have a clear interface:

**Team API template**:
```
Team name: {name}
Purpose: {why we exist}
Boundaries: {what's in scope, what's out of scope}
Communication: {channels, expected response time}
Dependencies: {what we need from other teams}
Shiproom: {what we deliver and how}
Exposed interfaces: {APIs, tools, documentation we provide}
Consumed services: {what we consume from other teams or platform}
```

Team API makes expectations explicit and reduces coordination overhead.

### Concept 8: Organization Design Principles

**Minimize handoffs**: end-to-end ownership reduces waiting time and context loss.

**Align to bounded context**: team boundaries should match DDD bounded contexts. Reduces cognitive load and supports Conway's Law.

**Stable teams**: teams need time to form, norm, and perform. Reorganizing quarterly resets team maturity.

**Sensing and adaptation**: organizational design is not static. Adjust based on delivery performance, team health, and market changes.

## Best Practices

| Practice | Description | Priority |
|----------|-------------|----------|
| Stream-Aligned First | Default to stream-aligned unless proven otherwise | High |
| Bounded Cognitive Load | Split teams when domain exceeds capacity | High |
| Platform as Product | Treat internal platforms like user-facing products | High |
| Minimize Handoffs | End-to-end ownership reduces delays | High |
| Stable Teams | Avoid frequent reorganizations | High |
| Team APIs | Document team interfaces explicitly | Medium |
| Review Quarterly | Assess topology effectiveness regularly | Medium |

## Common Pitfalls

### Pitfall 1: Component Teams
Teams organized by technical layer (frontend team, backend team, database team). Every feature needs 3+ teams. High handoff overhead, slow delivery.
Fix: reorganize into stream-aligned teams that cover a full feature end-to-end.

### Pitfall 2: Matrix Management Chaos
Team members report to different managers for different work areas. Conflicting priorities, unclear accountability.
Fix: clear team ownership. One accountable person per team member. Reduce matrix complexity.

### Pitfall 3: Platform Team as Gatekeeper
Platform team requires tickets, approvals, and meetings for every change. Stream-aligned teams can't move fast.
Fix: self-service platform. APIs and automation replace manual gatekeeping. Platform team focuses on enabling, not controlling.

### Pitfall 4: Reorganization Fever
Reorganizing quarterly in search of perfect structure. Teams never reach performing state.
Fix: stable teams with clear boundaries. Adjust only when there's clear evidence of structural problem. Reorganize annually at most.

### Pitfall 5: No Enabling Teams
Stream-aligned teams expected to learn new technologies on their own with no support. Skill gaps persist, quality suffers.
Fix: dedicated enabling teams for key capability areas. Timeboxed engagements focused on knowledge transfer.

### Pitfall 6: Ignoring Conway's Law
Designing system architecture without considering team structure. Microservices architecture with a monolith team structure.
Fix: align team boundaries to desired service boundaries. Reorganize before re-architecting.

## Tooling Ecosystem

### Organization Design Tools
- Team Topology Visualizer: map teams and interactions
- Miro / Mural: collaborative org design workshops
- Org charts + dependency mapping tools

### Assessment Frameworks
- Team Cognitive Load Assessment questionnaires
- Conway's Law audit checklists
- Team interaction mode analysis templates
- DORA metrics for topology effectiveness tracking

## Key Points
- Conway's Law: team structure shapes system architecture
- Four team types: Stream-aligned, Enabling, Complicated Subsystem, Platform
- Default to stream-aligned teams unless a clear reason not to
- Team size: 5-9 people (two-pizza rule)
- Cognitive load determines when to split a team
- Three interaction modes: Collaborate, X-as-a-Service, Facilitate
- Platform as a product, not a project
- Stable teams outperform frequently reorganized teams
- Team APIs make expectations explicit
- Minimize handoffs — end-to-end ownership accelerates delivery
