# Team Types

## Overview
Team Topology defines four fundamental team types. Stream-aligned is the default; the other three exist to serve stream-aligned teams. Every team should be one type — hybrid teams dilute focus and accountability.

## Stream-Aligned Team

### Definition
A team aligned to a single, valuable stream of work — a product, service, feature set, or user journey. The team can deliver value independently without requiring handoffs to other teams for most work.

### Characteristics
Owns end-to-end delivery for their stream. Has all necessary skills (design, engineering, QA, ops). Works continuously, not project-based. Measures success by business outcomes, not output. Minimizes external dependencies through platform and enabling team support.

### When to Use
Default team type for most product development. Use when the domain can be cleanly bounded and the team has enough work to sustain full-time. Prefer this over functional or project-based teams.

### Warning Signs
Needs 3+ other teams to ship anything. Spends >20% of time on coordination. Cannot measure impact of their work on business outcomes. Cross-team dependencies block releases.

## Enabling Team

### Definition
A team that helps stream-aligned teams acquire missing capabilities. They coach, mentor, research, experiment, and build tools that reduce cognitive load on stream-aligned teams.

### Characteristics
Does not own production systems or ongoing features. Works in short engagements with stream-aligned teams. Focuses on capability transfer, not doing the work permanently. Measures success by stream-aligned team autonomy growth. Disbands or shifts focus when capability is established.

### When to Use
Stream-aligned teams lack a specific skill (security, testing, performance). New technology adoption needs guided support. Organizational capability building initiative underway. During cross-team improvement programs.

### Warning Signs
Becomes permanent or perpetual. Does work instead of enabling others. Grows larger than the teams they support. Creates dependency instead of removing it. Measures output (training delivered) instead of outcome (capability gained).

## Complicated-Subsystem Team

### Definition
A team that owns a technically complex component requiring deep specialization that stream-aligned teams cannot maintain. Provides a simplified interface to the rest of the organization.

### Characteristics
Deep expertise in a narrow domain. Provides service via well-defined API or interface. Collaborates with stream-aligned teams during integration. Manages subsystem evolution and technical debt. Small team (3-5 people) — deep specialization is rare.

### When to Use
Component requires specialized knowledge (real-time engine, ML model, certificate authority). Component is shared across multiple stream-aligned teams. Component has unique performance or compliance requirements. Stream-aligned teams cannot practically maintain the subsystem.

### Warning Signs
More than 20% of teams are complicated-subsystem. Subsystem scope creeps beyond initial boundaries. Interface requires frequent breaking changes. Team becomes a bottleneck because too many streams depend on them. Knowledge silo risk with single point of failure.

## Platform Team

### Definition
A team that builds and operates a self-service internal platform that reduces cognitive load for stream-aligned teams. Treats internal teams as customers, not users — provides excellent developer experience.

### Characteristics
Product mindset — treats platform as a product. Self-service APIs, not tickets or manual handoffs. Measures adoption, satisfaction, and time-to-value for internal teams. Evolves based on stream-aligned team needs. Invests in documentation, onboarding, and support.

### When to Use
Stream-aligned teams repeatedly build the same capabilities. Infrastructure, CI/CD, or shared services need standardized approach. Organization exceeds 3-4 stream-aligned teams (scaling threshold). Cognitive load on stream-aligned teams is too high due to infrastructure complexity.

### Platform Maturity Stages
Stage 1: Ad hoc — teams build their own solutions, inconsistent. Stage 2: Standardized — some shared services, not yet self-service. Stage 3: Self-service — internal teams can independently use platform. Stage 4: Productized — platform team measures adoption and satisfaction.

### Warning Signs
Tickets instead of self-service. Platform team blocks stream-aligned teams. Long lead times for platform changes. Low adoption rate (<60% of stream-aligned teams). Platform decisions override stream-aligned team needs.

## Conway's Law

### Definition
Organizations design systems that mirror their communication structure. If teams are organized by function (frontend, backend, database), the system will have a frontend component, backend component, and database that require coordinated releases.

### Application
To achieve a desired system architecture, design the org structure to produce that architecture. Monolith orgs produce monolith systems. Microservice orgs require loosely coupled, autonomous teams. The communication paths between teams will become the system interfaces.

### Reverse Conway Maneuver
Restructure teams first to match the desired architecture, then let the system design follow. Faster and more reliable than trying to enforce architecture on existing org structure. Example: want microservices? Create small, cross-functional teams aligned to bounded contexts.

## Cognitive Load

### Types
Intrinsic: complexity inherent to the domain or problem being solved. Analyzed via domain complexity assessment. Extraneous: overhead from processes, coordination, context switching, tools. Target: minimize this. Germane: capacity for learning, improvement, and innovation. Target: maximize this.

### Assessment
For each team, estimate percentage of cognitive load for each type. Healthy profile: intrinsic 50%, extraneous 20%, germane 30%. Danger profile: intrinsic 40%, extraneous 50%, germane 10%. Warning profile: intrinsic 70%, extraneous 20%, germane 10%.

### Reduction Strategies
Intrinsic: split value stream, reduce domain scope. Extraneous: platform team, better tools, automate processes, reduce handoffs. Germane: dedicated learning time, reduce meeting load, allocate innovation budget. Total capacity: if team consistently over capacity, no amount of optimization will fix it.
