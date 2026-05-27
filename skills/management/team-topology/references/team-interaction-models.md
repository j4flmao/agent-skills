# Team Interaction Models

## Overview

Team Topology defines three fundamental interaction modes — collaboration, X-as-a-Service, and facilitating — that govern how teams work together. Choosing the wrong mode creates friction, delays, and cognitive overload. Choosing the right mode enables flow, autonomy, and sustainable delivery. Interaction modes are not permanent; they evolve as relationships, interfaces, and capabilities mature.

Every team-to-team relationship should have an explicit interaction mode. Implicit modes default to collaboration (expensive) or avoidance (dangerous). Explicit modes enable teams to allocate their coordination budget intentionally.

## Collaboration Mode

### Definition

Two or more teams work together closely on a shared problem, goal, or initiative. High-bandwidth communication, joint planning, shared ownership of outcomes. The teams operate as a single unit for the duration of the engagement.

### When to Use

Novel or ambiguous problems requiring diverse expertise. Early discovery and exploration phases where requirements are unknown. Cross-team initiatives that no single team can own alone. Defining new interfaces or APIs between subsystems for the first time. Incident response and crisis management where rapid coordination is critical. Organizational change initiatives requiring broad alignment. Establishing new platform capabilities that multiple teams will depend on. Research and innovation projects where the outcome is uncertain.

### Characteristics

High-bandwidth, synchronous communication preferred. Joint backlog and sprint planning. Shared success metrics and accountability. Frequent touchpoints — daily standups, shared retros. Blurred team boundaries during the engagement. Co-located or near-colocated for best results. Time-boxed by definition — not an ongoing arrangement. Shared decision-making and collective ownership of outcomes. Cross-team pairing and mobbing sessions.

### Benefits

Faster problem-solving through diverse perspectives. Stronger shared understanding and alignment. Builds trust and relationships between teams. Accelerates interface design and integration. Enables innovation at the intersection of domains. Reduces handoff documentation overhead. Creates social capital that improves future interactions. Allows teams to tackle problems larger than any single team could handle.

### Risks

High coordination cost — meetings, alignment, context sharing. Team autonomy is compromised during collaboration. Can mask unclear ownership or poor boundaries. May become permanent if not time-boxed. Creates dependency if the other team becomes essential for delivery. Can lead to diffusion of responsibility — "both teams own it" means neither does. Creates context-switching overhead as team members balance collaboration with their own team's work. Can lead to groupthink if dissenting voices are suppressed.

### How to Structure

Define a clear shared outcome before starting. Set an explicit timebox with scheduled review points. Assign a single point of accountability for the collaboration. Establish a dedicated communication channel and meeting cadence. Agree on decision-making protocol for disagreements. Document the collaboration charter including scope, duration, and exit criteria. Plan for knowledge transfer and interface handoff at the end. Allocate capacity — each team should dedicate a specific percentage of their sprint to the collaboration. Define what happens to each team's regular backlog during the collaboration.

### Collaboration Charter Template

```
Outcome: [specific, measurable result]
Timebox: [start date] to [end date]
Participating teams: [team names and members]
Single accountable owner: [person]
Communication cadence: [daily standup, weekly sync]
Decision protocol: [consensus, DRI, escalation path]
Capacity allocation: [hours/week per team]
Exit criteria: [conditions for ending collaboration]
Handoff plan: [who takes ownership afterward]
Regular review points: [dates for check-in on progress]
```

### Decision-Making Protocols

Consensus-based: all teams must agree. Good for high-impact, irreversible decisions. Slow but builds commitment. DRI (Directly Responsible Individual): one person makes the decision after consulting all teams. Fast but requires trust. Advice process: anyone can decide after seeking advice from all affected teams. Balances speed and inclusion. Escalation-based: teams try to agree, escalate if they can't within a timebox. Prevents deadlock.

### When to End

Interface is stable and documented. Repeated work has become routine — one team could own it alone. The shared outcome has been achieved. Coordination overhead exceeds the value of joint work. Teams have developed the capability to work independently. The timebox has expired and the outcome is delivered. Diminishing returns — the collaboration is no longer producing novel results.

### Warning Signs

No end date is set or discussed. Collaboration continues past the initial scope. Teams spend >20% of capacity in collaboration. Collaboration is used to avoid making hard interface decisions. One team feels they could do the work faster alone. Shared ownership creates blame avoidance. Decision-making is slow because all teams must agree. Collaboration meetings become routine without clear outcomes. Teams use collaboration as social time rather than focused work.

### Anti-Patterns

**Permanent collaboration**: teams who "always work together" — this hides a missing platform or unclear boundaries. **Collaboration by default**: every cross-team activity defaults to collaboration rather than considering X-as-a-Service. **Collaboration theater**: regular meetings without clear outcomes or decisions. **Collaboration as avoidance**: teams collaborate to avoid defining stable interfaces. **Bystander collaboration**: one team does the work while the other attends meetings. **Collaboration sprawl**: a team collaborates with too many other teams simultaneously, fragmenting their focus. **Collaboration as micromanagement**: one team uses collaboration to control another team's decisions.

### Exit Checklist

- [ ] Interface or outcome is documented and handed off
- [ ] Ongoing ownership is assigned to a single team
- [ ] X-as-a-Service contract is drafted if applicable
- [ ] Knowledge transfer is complete — all parties can operate independently
- [ ] Collaboration retrospective has been conducted
- [ ] Lessons learned are documented
- [ ] Communication channel transitions from active to reference
- [ ] Capacity is released back to each team's regular work

## X-as-a-Service Mode

### Definition

One team provides a capability to other teams through a well-defined, self-service interface. The consuming team treats the providing team like an external vendor. Once the interface is defined and stable, minimal coordination is required between teams.

### When to Use

Stable, well-understood capabilities with clear boundaries. Capabilities used by multiple consuming teams. Low need for customization per consuming team. Well-documented APIs, tools, or interfaces exist. The providing team can invest in platform quality and DX. Consuming teams value autonomy and speed over custom solutions. The capability is near-commodity — not a source of competitive differentiation for consumers.

### Characteristics

Service contract defines interface, SLA, and support model. Self-service onboarding — no tickets required for standard use cases. Versioning and deprecation policy is documented and published. Feedback loop exists for feature requests and improvements. Providing team measures adoption, satisfaction, and time-to-value. Consuming teams can integrate independently without blocking on the provider. The provider treats consumers as customers, not as users. The provider invests in developer experience, documentation, and support.

### Types of X-as-a-Service

Infrastructure services: CI/CD pipelines, deployment environments, monitoring stack, secrets management, container orchestration, infrastructure provisioning. Data services: analytics platform, reporting, ML model inference, data warehouse, streaming platform, data lake. Tools and libraries: design system, component library, testing framework, CLI tools, IDE extensions, code generators. Business services: billing, authentication, notifications, search, content management, personalization, payments. Developer experience: developer portal, API gateway, service catalog, documentation platform, onboarding automation.

### Service Contract Definition

A service contract should specify:
- **API contract**: endpoints, schemas, error codes, rate limits, authentication, pagination, filtering
- **SLA commitments**: uptime percentage by tier, latency percentiles, throughput capacity, support response times by severity
- **Versioning policy**: versioning scheme (semver preferred), deprecation notice period (minimum 3-6 months), migration guides for each major version, parallel run capability during migration
- **Onboarding process**: self-service registration via portal, quickstart guide and tutorials, sandbox or test environment, example code in multiple languages
- **Support model**: hours of coverage (business hours, extended, 24/7), severity level definitions, response SLAs per severity, escalation paths, support channel (Slack, email, portal)
- **Feature request process**: how consumers submit requests, prioritization criteria (impact, frequency, strategic alignment), communication of decisions, roadmap visibility
- **Breaking change policy**: notice period (minimum 3 months), migration support (documentation, pairing, migration tools), parallel run capability, communication channels for affected consumers
- **Consumption limits**: rate limits per consumer, request quotas, throttling policies, overage handling

### Service Contract Template

```
Service name: [name of the service]
Provider team: [team name]
Service overview: [brief description of what the service provides]
API documentation: [link to API docs]
Onboarding guide: [link to getting started]
Status dashboard: [link to service health dashboard]

SLA:
  Uptime: [percentage]
  Latency p99: [milliseconds]
  Support response: [timeframe per severity]
  Escalation: [contact path]

Versioning:
  Current version: [version number]
  Versioning scheme: [semver or other]
  Deprecation notice: [minimum notice period]

Support:
  Hours: [business hours / extended / 24/7]
  Channel: [Slack channel / email / portal]
  Severity levels: [definitions and response targets]

Feedback: [how to submit feature requests]
```

### Consumer-Driven Contracts

Consumer-driven contracts (CDCs) invert the traditional API design process. Consumers write tests that define their expectations of the provider's service. The provider runs these tests in their CI pipeline to ensure they don't break consumers. Tools like Pact enable CDC workflows across teams.

Benefits: providers know exactly what consumers need, no over-engineering unused features. Breaking changes are immediately detected. Consuming teams have a voice in interface design. Provider can refactor with confidence that consumers still work.

Implementation steps:
1. Consumer team writes contract tests defining their API expectations
2. Contract tests are published to a shared contract broker
3. Provider team's CI pipeline pulls latest contracts and runs them
4. Provider is notified immediately if a change breaks a contract
5. Breaking changes require coordination with consumers before deployment
6. Contracts evolve through collaboration between provider and consumers

CDC maturity model:
Level 1 — Manual: contracts are documented but not tested automatically
Level 2 — Tested: contracts are tested in CI but not versioned
Level 3 — Managed: contracts are versioned and stored in a broker
Level 4 — Automated: contract verification is fully automated with provider and consumer CI pipelines
Level 5 — Governing: contracts drive API evolution with automated compatibility enforcement

### API Versioning Strategies

Semantic versioning: MAJOR for breaking changes, MINOR for backward-compatible additions, PATCH for fixes. Major versions maintain parallel availability during deprecation period. Deprecation notices communicated 3-6 months in advance for internal services. Migration guides provided for each major version.

URI versioning: `/api/v1/resources`, `/api/v2/resources`. Simple and discoverable but clutters URI space. Header versioning: `Accept: application/vnd.service.v2+json`. Cleaner URIs but harder to discover and test. Both have trade-offs; pick one and document the rationale.

Versioning best practices: support at least two major versions simultaneously. Provide a migration window of at least 3 months. Monitor consumer migration progress. Deprecate old versions only after all consumers have migrated. Use feature flags for incremental rollout of new version features.

### SLA Framework

Define SLA tiers that match the criticality of the capability:

| Tier | Uptime | Latency p99 | Support Response | Escalation |
|------|--------|-------------|-------------------|------------|
| Critical | 99.99% | <100ms | <15min | Direct pager |
| Standard | 99.9% | <500ms | <1hr | Slack channel |
| Best effort | 99% | <2s | <1 business day | Ticket system |

Publish actual performance against SLAs — dashboards consumers can view. Include error budgets and burn rate alerts for tier-1 services. Review SLA performance quarterly with top consumers.

### Setup Process

1. Identify capability that multiple teams need independently
2. Validate demand — at least 2-3 consuming teams should need the capability
3. Define service contract and SLA with initial pilot consumers
4. Build self-service onboarding — no manual steps, no tickets
5. Document everything: API reference, guides, examples, FAQs, troubleshooting
6. Establish feedback mechanism and feature prioritization process
7. Launch with pilot consumers (2-3 teams), iterate based on feedback
8. Measure and publish adoption, satisfaction, and SLA adherence
9. Formalize deprecation and versioning process
10. Scale: onboard additional consuming teams, invest in platform maturity

### Warning Signs

Consuming teams wait on the provider for changes or support. Interface changes break consumers without notice. Provider does not measure or care about consumer satisfaction. One-way communication — provider broadcasts, never listens. Tickets are required instead of self-service. Consuming teams build workarounds because the platform is unreliable. Adoption is low (<60%) among eligible teams. Provider blames consumers for not using the platform correctly. Consuming teams feel like second-class citizens compared to external customers. The platform has a long backlog of consumer requests that are never addressed.

### Anti-Patterns

**Platform as bottleneck**: provider team can't keep up with demand, consuming teams are blocked, and delivery slows across the organization. **Tickets as service**: every request requires a ticket and manual processing — this is not X-as-a-Service, it's a service desk. **One-size-fits-all**: platform refuses to accommodate legitimate differences in consumer needs, forcing teams to build workarounds. **Abandonment**: provider builds the platform and stops investing — no maintenance, no improvements, no support. **Shadow platforms**: consuming teams build their own solutions because the official platform is inadequate or unreliable. **Second-class consumers**: internal teams treated worse than external customers in terms of support, documentation, and responsiveness. **Platform gatekeeping**: provider uses approval processes and reviews to control what consumers can do, rather than enabling them. **Leaky abstractions**: platform exposes too much complexity, requiring consumers to understand underlying infrastructure.

### Platform Maturity Assessment

| Stage | Self-Service | Documentation | Support | Adoption |
|-------|-------------|---------------|---------|----------|
| Ad hoc | No — tickets required | None | Informal | <30% |
| Standardized | Partial — some automation | Basic guides | Ticketed | 30-60% |
| Self-service | Yes — fully automated | Comprehensive | Self-serve + channel | 60-80% |
| Productized | Yes + measurement | Documentation as product | Tiered SLAs | >80% |

## Facilitating Mode

### Definition

One team helps another team improve their capabilities. The facilitating team does not do the work — they enable the other team to do it themselves. The engagement is time-limited with an explicit capability transfer goal.

### When to Use

Leveling up skills across the organization. Introducing a new technology, practice, or tool. Conducting an improvement program — security hardening, performance optimization, testing maturity. Helping a team resolve a specific, bounded problem. Building capability that will reduce future dependency on the facilitating team. Onboarding a team to a new domain or platform. Preparing a team for increased autonomy (reducing their need for support). Responding to an organizational capability gap identified through health checks.

### Characteristics

Facilitating team members pair with the target team on real work. Focus is on transfer of skill, not delivery of output. The facilitating team works themselves out of a job. Engagement is explicitly time-boxed. Success is measured by the target team's increased autonomy. Coaching and mentoring rather than doing and delivering. Structured learning path with clear milestones. The facilitating team does not own or operate production systems for the target team.

### Coaching Relationships

Pairing: facilitator pairs with a team member for 1-2 weeks on real tasks. Builds skill through hands-on practice. Works best for technical practices (TDD, CI/CD, refactoring).

Mob programming: facilitator leads a mob session (entire team together) to transfer practices. Efficient for building shared understanding quickly. Works best for process or practice adoption.

Structured workshops: facilitator runs workshops on specific topics with exercises and practice. Good for conceptual learning (security principles, architecture patterns, domain modeling).

Artifact creation: facilitator helps team create runbooks, playbooks, architecture decision records, and operational documentation. Builds lasting reference material the team can use independently.

Code review coaching: facilitator reviews PRs with the team — explaining rationale, not just changing code. Transfers code quality judgment, not just fixes.

Retrospective facilitation: facilitator helps team run effective retros, extract insights, and commit to actions. Builds continuous improvement capability.

Technical spike pairing: facilitator works with team on a technical spike to explore a new approach. Transfers investigation and experimentation skills.

### Types of Facilitating

Technical capability: CI/CD adoption, testing practices (TDD, integration testing, E2E testing), observability (logging, metrics, tracing), security practices (SAST, DAST, dependency scanning), performance optimization (profiling, caching, query optimization).

Process capability: agile ceremonies (standups, planning, retros), estimation and planning, stakeholder management, dependency management, incident response (on-call, post-mortems).

Domain capability: understanding a new business domain, regulatory requirements and compliance, system architecture and design, data modeling and database design, integration patterns and API design.

Platform onboarding: helping a team adopt the internal platform effectively, migrate from legacy infrastructure, use platform services (CI/CD, monitoring, secrets management), integrate with platform APIs.

Engineering culture: code review culture, pair programming adoption, documentation standards, knowledge sharing practices, blameless incident analysis.

### Temporary vs Ongoing Engagement

Temporary (default): defined timebox, specific capability, clear exit criteria. Typical duration: 2 weeks to 3 months. Success means the facilitating team can disengage fully. The target team can operate independently in the capability area.

Ongoing (exception): periodic check-ins rather than continuous engagement. Monthly or quarterly reviews of capability retention and growth. Used for very complex domains or rapidly evolving practices where skills need refreshing. Still has an end state — just longer horizon (6-12 months). Regular reassessment of whether ongoing engagement is still needed.

### Transition from Engagement to Independence

Phase 1 (Intense): facilitator works with the team 3-4 days per week. Direct pairing and coaching on real work. Focus on building foundational skills. Duration: 2-4 weeks.

Phase 2 (Guided): facilitator checks in 1-2 days per week. Team works independently between check-ins. Facilitator reviews progress and provides guidance. Duration: 2-4 weeks.

Phase 3 (Light touch): facilitator checks in 1 day every 2 weeks. Team is largely independent. Facilitator handles only questions and edge cases. Duration: 2-4 weeks.

Phase 4 (Disengaged): no regular engagement. Team operates independently. Facilitator available for occasional questions. Capability assessment confirms readiness.

### Setup Process

1. Identify capability gap through team self-assessment, health check, or organizational sensing
2. Define specific, measurable capability goals (what will the team be able to do independently?)
3. Match facilitating team expertise to the gap — right skills, right credibility
4. Establish engagement charter: duration, schedule, approach, milestones, exit criteria
5. Begin with intense engagement (Phase 1), plan for gradual reduction
6. Measure capability improvement at each milestone
7. Conduct capability assessment at the end of each phase
8. Decide on exit or extension based on assessment
9. Document lessons learned and shared practices for other teams
10. Follow up after 1-2 months to verify capability retention

### Engagement Charter Template

```
Capability goal: [specific, measurable — what the team will be able to do independently]
Current state: [current capability level — how they handle this capability today]
Duration: [start date] to [end date]
Engagement model: [pairing, workshops, mobbing, review — primary and secondary]
Cadence: [hours per week of facilitation, phases of intensity]
Milestones: [checkpoints with specific capability targets]
Exit criteria: [measurable conditions for disengagement]
Follow-up: [post-engagement check-in schedule — 1 month, 3 months]
Dependencies: [what else is needed for success — tools, access, training]
```

### Measuring Success

Pre/post capability assessment: score team capability before and after on a 1-5 scale (1 = cannot do without help, 5 = can teach others). Autonomy score: how often does the team need help after the engagement. Measure at 1 month, 3 months, and 6 months post-engagement. Time-to-competency: how long before a new team member reaches productivity in the capability area. Quality metrics: defect rate, deployment frequency, lead time before and after the engagement. These should improve as capability increases. Team satisfaction: does the team feel more capable and confident? Survey before, during, and after. Retention: does the team maintain the capability 6 months after engagement? Or do they regress?

### When to End

Capability assessment shows the team can operate independently at the target level. The specific problem or gap is resolved. Engagement timebox expires — extension requires reassessment. Target team requests disengagement — they feel ready and confident. The facilitating relationship has become a dependency (the team waits for the facilitator). Diminishing returns — the remaining gap is not worth the facilitation cost. The capability is now embedded in the team's regular practices and culture.

### Warning Signs

Facilitating becomes permanent or ongoing without clear purpose. Target team becomes dependent — they wait for the facilitator's input before acting. No measurable improvement in capability over time. Facilitator does the work instead of teaching — it's faster but doesn't transfer capability. Engagement continues past the timebox without formal reassessment. Facilitator is resented rather than welcomed — the team feels patronized. Capability transferred is shallow — team can follow steps but can't adapt to new situations. The facilitating team spends more time on one team than originally planned.

### Anti-Patterns

**Permanent consultant**: the "enabling" team never disengages — they become a permanent dependency that the organization depends on. **Doing instead of enabling**: the facilitating team does the work because it's faster in the short term — but the target team learns nothing and remains dependent. **One-size-facilitation**: same approach for every team regardless of their maturity, context, learning style, or domain. **Facilitation theater**: workshops and coaching sessions happen but nothing changes — no behavior change, no new practices, same outcomes. **Enabling team bloat**: the enabling team grows larger than the teams they support, becoming a cost center rather than a capability multiplier. **Capability extraction**: the facilitating team learns from the target team rather than the other way around. **Guilt-driven facilitation**: the facilitating team stays because they feel responsible for the target team's outcomes rather than their autonomy.

## Choosing the Right Interaction Mode

### Decision Framework

| Factor | Collaboration | X-as-a-Service | Facilitating |
|--------|---------------|----------------|--------------|
| Problem clarity | Unknown, ambiguous | Well-understood | Known capability gap |
| Interface stability | Not yet defined | Stable, documented | N/A (people-focused) |
| Reuse potential | Low, unique | High, multiple consumers | Medium, patterns transfer |
| Team maturity | Any | Mature consumers | Target team needs growth |
| Urgency | High, discovery | Medium, ongoing | Medium, improvement |
| Duration | Short, timeboxed | Long-running | Temporary, bounded |
| Outcome | Shared result | Self-service capability | Capability transfer |
| Coordination cost | High | Low (after initial) | Medium (decreasing) |

### Decision Flowchart

1. Is there a clear, stable capability that multiple teams need? → X-as-a-Service
2. Is there a specific capability gap in one or more teams? → Facilitating
3. Is the problem novel, ambiguous, or requiring diverse expertise? → Collaboration
4. Is the default mode uncertain? → Start with collaboration, transition as clarity emerges

### Context Factors

Team maturity: novice teams need more collaboration and facilitation, mature teams can consume services via X-as-a-Service. Domain complexity: high complexity favors collaboration for exploration and discovery, X-as-a-Service for established and well-understood capabilities. Organizational scale: small organizations (1-3 teams) can collaborate more effectively, large organizations (10+ teams) need formal X-as-a-Service to prevent coordination overhead. Change frequency: rapidly changing interfaces favor collaboration for co-evolution, stable interfaces favor X-as-a-Service for reliability. Skill distribution: concentrated expertise may require facilitating to distribute capabilities across teams. Cultural factors: some cultures prefer explicit contracts and documentation (favoring X-as-a-Service), others prefer relationship-based interaction (favoring collaboration). Risk profile: high-risk domains favor X-as-a-Service for predictability and SLAs, low-risk exploration favors collaboration for speed and innovation. Urgency: time-critical situations favor collaboration for rapid alignment, less urgent situations favor X-as-a-Service for autonomy.

### Maturity Model for Team Relationships

Level 1 — Ad hoc: interaction modes are not defined. Teams figure out communication as needed. Inefficient and unpredictable. Collaboration is the default (and often permanent). High coordination overhead. Cognitive load from cross-team interaction is unmeasured.

Level 2 — Defined: interaction modes are explicitly chosen and documented. Teams know how they should interact with each other. Some modes are formalized with charters or service contracts. Regular review of interaction effectiveness (quarterly). Basic dependency tracking in place.

Level 3 — Managed: interaction modes are measured and optimized. Coordination cost is tracked as a metric. Cognitive load from cross-team interaction is monitored and managed. Modes evolve based on data, not habit or history. Platform teams measure adoption and satisfaction. Enabling teams track capability transfer success.

Level 4 — Optimized: interaction modes are continuously adapted based on real-time feedback. Teams proactively change modes as relationships mature and needs evolve. Platform is the default for shared capabilities (X-as-a-Service). Collaboration is rare, time-boxed, and demonstrably high-value. Facilitating is targeted, measured, and has clear exit criteria. The organization can articulate why each mode was chosen.

### Mode Transition Patterns

Collaboration to X-as-a-Service: the interface is now stable and documented after joint exploration. The collaborating teams agree on which team takes permanent service ownership. One team transitions to provider, others become consumers. The service contract is formalized with SLA and versioning. The collaboration timebox ends. This is the most common and desirable transition pattern.

Collaboration to Facilitating: during collaboration, one team developed deeper expertise in a capability. They shift from doing the work together to helping the other team build their own capability. The goal shifts from shared delivery to capability transfer. The engagement structure changes from joint planning to coaching sessions.

X-as-a-Service to Collaboration: the interface needs significant redesign because consumer needs have diverged. A temporary collaboration kickstarts the redesign with representatives from provider and key consumers. Once the new interface is stable and documented, it reverts to X-as-a-Service. This is rare and should be time-boxed tightly.

Facilitating to X-as-a-Service: the facilitated team can now operate independently in the capability area. If they need to consume capabilities from the facilitator (e.g., platform access), the relationship transitions to X-as-a-Service. The interaction shifts from people-focused (coaching) to interface-focused (self-service API).

X-as-a-Service to Facilitating: a platform service is underutilized because teams lack the capability to use it effectively. The platform team switches to facilitating mode — coaching teams on adoption. Once teams are capable users, the relationship returns to X-as-a-Service.

### Mode Progression Pattern

Over time, team relationships should progress toward X-as-a-Service as the default:

```
Fresh relationship → Collaboration (discover, align, define interface)
                    → Facilitating (if capability gap exists)
                    → X-as-a-Service (stable interface, autonomous teams)
```

Collaboration should decrease over time as interfaces stabilize. X-as-a-Service should increase as platforms mature. Facilitating should always be temporary — it exists to eliminate its own necessity.

### Quarterly Interaction Mode Review

Every quarter, each team should review their interaction modes with other teams:
- Is the current mode still appropriate? Has the relationship matured?
- Is the mode documented and understood by both sides?
- Are there coordination problems that suggest a mode change?
- Are there new teams that need interaction modes defined?
- Are there old modes that should be retired?
- What is the coordination cost? Is it trending up or down?

Document the review outcomes and update team API documentation. Escalate mismatches to management if teams cannot agree on mode changes.

### Interaction Mode Anti-Patterns by Mode

**Collaboration anti-patterns**: indefinite collaboration with no end date, collaboration used to avoid interface decisions, one team doing all the work, collaboration meetings without outcomes.

**X-as-a-Service anti-patterns**: tickets instead of self-service, no SLA or unmeasured SLA, breaking consumers without notice, ignoring consumer feedback, platform that can't evolve.

**Facilitating anti-patterns**: never-ending engagement, doing instead of enabling, no measurable improvement, dependency creation instead of autonomy, one-size approach to all teams.

## Communication Patterns

### Synchronous vs Asynchronous

Synchronous: real-time communication — meetings, calls, instant messaging. Best for: complex discussions requiring back-and-forth, relationship building and trust, urgent issues and incident response, brainstorming and creative problem-solving, difficult conversations and negotiations. Cost: interrupts flow and deep work, requires scheduling and coordination, limited to common business hours across time zones, often leads to decisions without documentation.

Asynchronous: delayed communication — documents, recordings, tickets, PR descriptions, recorded demos, RFC documents. Best for: status updates and regular reporting, decisions with rationale and context, documentation and reference material, non-urgent requests and questions, distributed teams across time zones. Cost: slower resolution time, requires writing discipline and skill, potential for misunderstanding without immediate clarification, feels impersonal for relationship building.

Guidelines: default to async for status updates, decisions, and documentation. Use sync for complex problem-solving, relationship building, and urgent issues. Record sync meetings for async consumption by those who couldn't attend. Write decisions down even after sync discussions — if it wasn't written down, it wasn't decided. Timezone-aware teams should bias heavily toward async for everything except essential coordination.

### Formal vs Informal Communication

Formal: documented, structured, recorded — service contracts, RFCs, architectural decision records, SLA reports, API documentation, incident reports. Best for: commitments and agreements, decisions that have lasting impact, interfaces and contracts, escalation and compliance, records for future reference. Required for: X-as-a-Service contracts, breaking changes, SLA commitments, regulatory compliance.

Informal: undocumented, conversational — Slack messages, hallway conversations, ad-hoc calls, whiteboard sessions, watercooler chats. Best for: quick questions and clarifications, relationship building and trust, early exploration and brainstorming, building shared context, creative problem-solving. Required for: collaboration mode (over-formalizing kills its speed), facilitating relationships (coaching needs trust), team health and culture.

Guidelines: formalize what matters for reliability and accountability (service contracts, decisions, SLA commitments). Keep informal for speed and relationship building (quick questions, exploration, coaching). Convert informal decisions to formal records when they become commitments or have lasting impact. Don't over-formalize collaboration mode — it kills the speed it's meant to provide. Find the right balance: too formal creates bureaucracy, too informal creates ambiguity.

### Documentation Handoffs

When collaboration or facilitating engagements end, documentation must transfer for the receiving team to operate independently.

Handoff documentation includes:

Interface specifications: API contracts, schemas, error codes, rate limits, authentication details. These are the core of X-as-a-Service handoffs.

Operational runbooks: deployment procedures, monitoring dashboards, alert configurations, incident response steps, backup and recovery procedures, capacity management. Critical for the receiving team to operate the capability independently.

Architectural decisions: ADRs documenting key decisions, their rationale, alternatives considered, and trade-offs. Prevents the receiving team from repeating the same discovery work.

Known issues and workarounds: current bugs, limitations, known failure modes, and how to handle them. Prevents the receiving team from being surprised by known problems.

Contact information: who to contact for questions, subject matter experts in specific areas, escalation paths for issues.

Migration guides: step-by-step instructions for migrating from old interfaces to new, including timeline, breaking changes, and rollback procedures.

Handoff quality checklist:
- Is it findable? Where is it stored? Is there a single source of truth?
- Is it consumable? Can the receiving team understand it without prior context?
- Is it accurate? Does it reflect the current state of the system?
- Is it complete? Are there obvious gaps in coverage?
- Is it maintainable? Can the receiving team update it easily?

### Communication Structure by Mode

Collaboration: daily sync standup (15 min), shared Slack channel (real-time coordination), joint backlog (shared scope of work), shared documentation space (working documents, decisions), regular retro (collaboration-specific). Communication is high-volume, high-bandwidth, informal. Trust and shared context replace formal documentation. Decisions are made in conversation and documented after.

X-as-a-Service: service documentation (API reference, guides, FAQs), status dashboard (real-time service health), support channel (requests, questions, issues), feature request process (structured submissions, prioritization), deprecation notices (formal, scheduled, published), SLA reports (monthly/quarterly performance). Communication is low-volume, structured, formal. Formal documentation replaces personal relationships. Most interaction is through the platform, not between people.

Facilitating: coaching session schedule (regular, structured sessions), learning materials (guides, examples, exercises), practice exercises (for skill building), progress tracking (against milestones), capability assessments (before, during, after). Communication is learning-oriented, not reference-oriented. High-volume during engagement, tapering to zero. Documentation is for learning, not for ongoing reference.

### Communication Anti-Patterns

**Meeting overload**: too many sync meetings, no async alternatives. Teams spend more time talking about work than doing work. **Documentation instead of conversation**: every question requires reading a document. Kills collaboration speed. **No documentation**: decisions exist only in people's heads or chat history. Creates knowledge loss risk. **Wrong channel**: urgent issues in email, non-urgent questions in pager channel. Creates noise and missed messages. **Reply-all culture**: too many people on every communication. Creates noise and context overload. **BCC culture**: hidden communication undermines trust and transparency.

## Conway's Law and Inverse Conway Maneuver

### Conway's Law Definition

Organizations design systems that mirror their communication structure. More precisely: any organization designing a system will produce a design whose structure is a copy of the organization's communication structure at the time the system was designed.

If teams are organized by function (frontend, backend, database, QA, ops), the resulting system will have corresponding components that require coordinated releases across all functional teams. If teams are organized by business capability (checkout, search, recommendations, onboarding), the system will have services that map to those business capabilities with clean interfaces between them.

### Organizational Design Implications

Communication paths between teams become system interfaces. If two teams need to communicate frequently, their systems will have tight integration and coupling. If teams are siloed and rarely communicate, their systems will have integration problems and mismatched interfaces. If teams share ownership of a component, that component will reflect the shared ownership structure — often with unclear responsibility and poor maintainability.

The organizational structure is the single strongest predictor of system architecture. Changing architecture without changing org structure is fighting against Conway's Law.

### Analyzing Your Organization

Map the current org structure: reporting lines, team boundaries, communication channels, interaction modes.

Map the current system architecture: service boundaries, data ownership, integration points, shared databases, shared code ownership.

Overlay the two maps and look for misalignment. Misalignment = communication paths that don't match integration points.

Examples of misalignment:
- A service is owned by two teams (shared ownership → unclear responsibility)
- Two teams that don't communicate maintain services that depend on each other (integration failures)
- A team owns multiple services that are tightly coupled (monolith disguised as microservices)
- The system architecture shows bounded contexts that don't match team boundaries (context mapping mismatch)

Misalignment predicts: integration failures that require heroics to resolve, coordination bottlenecks for every release, unexpected coupling that surfaces during changes, slow delivery because every change requires cross-team coordination.

### Inverse Conway Maneuver

Restructure teams first to match the desired architecture, then let the system design follow. It's faster and more reliable than trying to enforce architecture on an existing org structure, because it aligns the social structure with the technical structure.

Example: you want a microservices architecture with independently deployable services. Create small, cross-functional teams aligned to bounded contexts. Each team owns one or a few related services end-to-end. The services will naturally emerge with appropriate boundaries, independent data stores, and clean interfaces. Trying to create microservices while keeping functional teams (frontend, backend, database, ops) will fail — the teams will produce tightly coupled components that require coordinated releases.

### How to Apply Inverse Conway

1. Define the target architecture first using domain-driven design: identify bounded contexts, define context maps, design aggregate boundaries, and establish domain event schemas for cross-context communication.

2. Map bounded contexts to potential team boundaries: each bounded context becomes a candidate team boundary. Bounded contexts that need frequent communication should be owned by the same team or have explicit collaboration. Bounded contexts with stable interfaces can be owned by different teams with X-as-a-Service interaction.

3. Assess current org structure against the target: which teams currently own what? Where would ownership need to change? What new teams need to form (platform, enabling, complicated-subsystem)?

4. Plan the restructuring incrementally: choose one bounded context to restructure first. Form the new team with clear ownership. Define their interaction modes with other teams. Let the architecture evolve to match.

5. Execute the restructure: announce the change with rationale, form the new team, transfer ownership of services and code, establish new interaction modes, provide enabling support during transition.

6. Let the architecture follow: expect system decomposition to align with team boundaries over time. Don't force architecture changes — let Conway's Law do its work. The new team structure will naturally produce the desired architecture.

7. Measure alignment improvement: track cross-team dependency count (should decrease), coordination overhead (should decrease), delivery speed (should increase), architectural coupling (should decrease).

8. Iterate: choose the next bounded context to restructure. Continue until org structure and target architecture are aligned.

### Real-World Application

Case study: an organization wanted to move from a monolith to microservices. They had functional teams (frontend, backend, database, QA) but couldn't decompose the monolith because every feature touched all layers. The inverse Conway maneuver: they formed cross-functional teams aligned to business capabilities (checkout, search, accounts, payments). Each team included frontend, backend, and QA skills. Within 6 months, the monolith had natural decomposition lines, and services emerged aligned to each team's domain.

### Risks and Mitigation

Risk: Big-bang restructuring breaks delivery for months. Mitigation: restructure one bounded context at a time. Never restructure more than 20% of teams in one quarter.

Risk: New structure creates new communication silos that the target architecture doesn't account for. Mitigation: design interaction modes explicitly for every cross-boundary relationship. Don't assume teams will figure it out.

Risk: People resist restructuring because of uncertainty and loss of social connections. Mitigation: communicate the rationale clearly. Involve teams in the design of the new structure. Provide transition support. Acknowledge the disruption.

Risk: Architecture doesn't follow because of legacy constraints, shared databases, or technical debt. Mitigation: use strangler fig pattern to incrementally migrate. Create temporary enabling teams to help with migration. Accept a longer timeline for legacy systems.

Risk: Multiple bounded contexts are still tightly coupled and cannot be cleanly owned by different teams. Mitigation: use anti-corruption layers at team boundaries. Invest in platform services to decouple contexts. Consider a temporary collaboration mode while decoupling.

### Communication Structure Analysis

To apply Conway's Law, analyze the current communication structure:

Team-to-team communication frequency: which teams talk most often? Track meetings, Slack messages, shared channels, and PR collaborations. High frequency suggests tight coupling or essential coordination.

Decision-making flow: who makes decisions that affect other teams? Centralized decision-making suggests a bottleneck. Distributed decision-making suggests good boundaries.

Information sharing patterns: how does knowledge flow across the organization? Through formal channels (documentation, meetings) or informal (hallway conversations, chat)? Informal channels create knowledge silos and Conway's Law problems.

Escalation patterns: which issues get escalated to management? Frequent escalation suggests unclear boundaries or poor interaction modes. Escalations are a signal that the org structure needs adjustment.

## Cognitive Load Management

### The Three Types

Intrinsic load: complexity inherent to the domain or problem being solved. This is the essential complexity of the work — it cannot be eliminated, only managed. Examples: understanding a complex business domain (insurance underwriting, financial trading), learning a new technology stack (Kubernetes, machine learning), working with poorly designed legacy systems that require deep knowledge.

Extraneous load: overhead from processes, coordination, context-switching, and tools that is not directly related to the work itself. This is the target for minimization. Examples: waiting for CI/CD pipelines, attending status update meetings, navigating between 15 different tools, context-switching between multiple projects, filling out forms for compliance, coordinating with 5 teams for a single change.

Germane load: cognitive capacity used for learning, improvement, innovation, and building new capabilities. This is the target for maximization. Examples: learning a new technique or tool, improving test coverage and refactoring, designing a better architecture, automating manual processes, mentoring other team members, conducting research spikes.

### Team Capacity Planning

```
Total cognitive capacity = team members × individual capacity
Individual capacity varies by: experience level, domain familiarity, 
  external factors (life circumstances, health, stress)
Target team load < 80% of total capacity
Buffer: 20% for unexpected work, learning, improvement
```

Cognitive load should be assessed regularly for each team — monthly as a pulse check, quarterly as part of health checks. Track trend over time. Investigate when load exceeds 80% for two consecutive checks. Compare across teams to identify systemic vs. local load issues.

### Assessment Framework

For each team, estimate the percentage of cognitive capacity consumed by each type:

**Healthy profile**: intrinsic 50%, extraneous 20%, germane 30%
The team has room to learn and improve. They focus on their domain, not on coordination overhead. They can invest in automation, refactoring, and skill building. This profile supports sustainable delivery and team growth.

**Danger profile**: intrinsic 40%, extraneous 50%, germane 10%
The team spends half their energy on overhead — coordination, process, tools, meetings. Little capacity left for learning or improvement. Burnout risk is high. Quality will degrade over time. Delivery speed will plateau or decline. This team needs immediate reduction in extraneous load.

**Warning profile**: intrinsic 70%, extraneous 20%, germane 10%
The domain itself is overwhelming. The team's scope is too broad or too complex. Consider splitting the value stream or adding domain expertise. Limited capacity for anything beyond keeping up with daily work. Innovation and improvement stall.

**Burnout profile**: intrinsic 60%, extraneous 35%, germane 5%
High load across the board, no capacity for recovery or learning. Team is in survival mode. Attrition risk is very high. Immediate action needed to reduce both intrinsic and extraneous load.

**Learning profile**: intrinsic 30%, extraneous 20%, germane 50%
The team has significant capacity for learning and improvement. This is a good profile for a team adopting new technologies or methods. Use it well — it is rare and valuable.

### Assessment Methods

Survey: team members rate their cognitive load on a 1-5 scale for each type. Weekly pulse survey (5 minutes), quarterly deep assessment (15 minutes).

Observation: look for signs of overload — context-switching (measured through tooling), meeting count and duration, overtime and after-hours work, unfinished work accumulation, defects and rework trends.

Discussion: include cognitive load in retrospectives. Ask: "What consumed most of your mental energy this sprint?" "What would free up cognitive capacity?" "What learning opportunities are you missing?"

### Reduction Strategies by Load Type

**Intrinsic load reduction**:
- Split the value stream: divide the team's domain into smaller bounded contexts that can be owned by separate teams
- Reduce scope: clarify what the team does NOT own. Document team boundaries explicitly
- Add domain expertise: bring in team members with experience in the domain
- Provide better abstractions: build tools, libraries, or services that simplify the domain
- Use complicated-subsystem teams: isolate the most complex parts in specialized teams
- Invest in domain training: structured learning programs for the team's domain

**Extraneous load reduction**:
- Adopt a platform team: move infrastructure, CI/CD, and operational concerns to a self-service platform
- Automate manual processes: deployments, testing, releases, environment provisioning
- Reduce meeting count and duration: question every recurring meeting. Default to async
- Improve tooling and documentation: reduce time spent figuring things out
- Reduce handoffs and cross-team dependencies: stream-aligned teams, self-service platforms
- Establish clear interaction modes: reduce coordination overhead by making expectations explicit
- Reduce context-switching: limit WIP, reduce project count per team, establish focus time

**Germane load increase**:
- Allocate dedicated learning time: 10-20% of capacity for learning and improvement
- Reduce meeting load: free up blocks of focused time for deep work
- Create innovation budget: dedicated capacity for improvement work, not just feature delivery
- Provide learning resources: conferences, courses, books, mentoring
- Use facilitating teams: bring in experts to accelerate capability building
- Encourage experimentation: time for spikes, prototypes, and exploration
- Recognize improvement work: celebrate learning and innovation, not just delivery

### Cognitive Load in Team Topology

Platform teams exist to reduce extraneous cognitive load for stream-aligned teams. Every platform investment should be evaluated by how much extraneous load it eliminates.

Enabling teams exist to reduce intrinsic cognitive load by building capability in stream-aligned teams. Every enabling engagement should be evaluated by how much it reduces the target team's intrinsic load.

Complicated-subsystem teams exist to contain intrinsic cognitive load in a specialized team. If the subsystem becomes simpler over time, the complicated-subsystem team should disband and the capability should move to stream-aligned teams.

Collaboration mode inherently increases extraneous load (coordination overhead). Use it sparingly and time-box it. The extraneous load of collaboration should be justified by the value of the outcome.

X-as-a-Service mode reduces extraneous load through self-service interfaces. Consuming teams don't need to coordinate with the provider — they just use the service.

## Team APIs

### Definition

A team API is a documented set of boundaries, interfaces, and expectations that other teams use to interact with a team. It makes the team's responsibilities, dependencies, and commitments explicit and predictable.

### Team API Components

Identity: team name, members, location, time zone, communication channels, on-call contact.

Purpose: why this team exists, what value stream they own, what business outcomes they drive.

Responsibilities: what the team owns and maintains (services, code, systems, data), what they deliver (features, capabilities, platforms).

Dependencies: what they need from other teams, for each dependency: what is needed, which team provides it, what interaction mode is used (collaboration, X-as-a-Service, facilitating), what is the SLA or expected response time, what is the escalation path.

Services: what they provide to other teams — for each service: API documentation, SLA commitments, versioning policy, support model, onboarding process.

Interface: how to request something from the team (ticket, PR, Slack, meeting, self-service portal). What to expect in terms of response time and resolution.

SLA: expected response times for different request types (critical bug, feature request, question, support request, code review).

Escalation: who to contact for issues, how to escalate if not getting response, what severity levels exist and how to report them.

Boundaries: explicitly what the team does NOT do. This is as important as what they do. Clear boundaries prevent scope creep and expectation mismatch.

### Team API Template

```
# Team: [Team Name]

## Identity
- Members: [names and roles]
- Location: [office/timezone]
- Channels: [Slack channel, email, video call link]
- On-call: [rotation schedule, contact]

## Purpose
[Single sentence defining why the team exists]

## Responsibilities
We own:
- [Service 1] — [brief description]
- [Service 2] — [brief description]
- [Component 3] — [brief description]

We do NOT own:
- [Thing 1] — owned by [Team X]
- [Thing 2] — owned by [Team Y]

## Services We Provide
### Service: [Name]
- API: [link to documentation]
- SLA: [uptime, latency, support response]
- Version: [current version]
- Onboarding: [link to guide]

### Service: [Name]
[Same structure]

## Dependencies
We depend on:
- [Service X] from [Team A] — X-as-a-Service
- [Capability Y] from [Team B] — Collaboration (active until [date])
- [Practice Z] from [Team C] — Facilitating (engagement ends [date])

## How to Reach Us
- Standard requests: [ticket system / self-service portal]
- Questions: [Slack channel / office hours]
- Critical issues: [pager / on-call contact]
- Feature requests: [process link]

## SLA
| Request Type | Response Time | Resolution Time |
|--------------|---------------|-----------------|
| Critical bug | <1 hour | <4 hours |
| Support question | <4 hours | <1 business day |
| Feature request | <1 week | N/A (roadmap) |
| PR review | <1 business day | <1 business day |

## Escalation
- Level 1: Team lead [name] — [contact]
- Level 2: Engineering manager [name] — [contact]
- Level 3: Director [name] — [contact]
```

### Benefits of Explicit Team APIs

Makes dependencies visible and manageable — no surprises about what a team needs or provides. Reduces coordination overhead — other teams know how to interact without asking or guessing. Enables capacity planning — the team can predict and communicate their availability for different request types. Creates accountability — commitments are documented and can be measured against actual performance. Supports autonomy — teams can make decisions within their boundaries without seeking approval from other teams. Improves onboarding — new members and new teams can understand the landscape quickly. Enables automated monitoring — SLA performance can be tracked and reported.

### Defining Team Boundaries

Boundaries should align with bounded contexts from domain-driven design. Each team should own a cohesive set of capabilities that make sense together. Boundaries should minimize the need for cross-team coordination — the team should be able to deliver value independently for most of their work.

A good boundary test: can the team deliver value to their users (internal or external) without waiting on another team for 80%+ of their work? If not, the boundary may be too narrow, or the platform support may be insufficient.

Boundary types: business capability (checkout, search, recommendations, notifications), technical domain (infrastructure, data platform, ML platform, security), user journey (onboarding, discovery, purchase, support), geographical region (US, EU, APAC — for region-specific features).

Boundary smells: a team owns multiple unrelated capabilities (cohesion problem), a capability is split across multiple teams (ownership ambiguity), a team's work consistently requires changes in another team's code (coupling problem), a boundary is defined by technology rather than domain (MySQL team vs. data platform team).

### Dependency Management

Each team should maintain a dependency map showing all their dependencies on other teams. For each dependency: what is needed, which team provides it, what is the interaction mode (collaboration, X-as-a-Service, facilitating), what is the SLA or expected response time, what is the status (identified, in progress, resolved, blocked).

Dependencies are not inherently bad. Software development inherently requires dependencies between teams. Unmanaged dependencies — where teams don't know what they need from whom and when — are the problem.

### Service Level Expectations

Define expected response times for different types of requests:

| Request Type | Response Time | Example |
|-------------|---------------|---------|
| Critical bug | <1 hour | Production outage in dependency |
| Severity 1 incident | <15 minutes | Complete service outage |
| Feature request | <2 weeks acknowledged and prioritized | "We need a new endpoint" |
| API question | <1 business day | "How do I use this endpoint?" |
| Support request | <4 hours | Trouble with platform service |
| Code review | <1 business day | PR in shared repository |
| Onboarding request | <1 week | New team needs access to platform |

Publish these expectations in each team's API documentation. Track performance against them. Review and adjust quarterly.

## Cross-Team Coordination Structures

### Communities of Practice (CoPs)

Groups of people across teams who share a common interest or skill area. CoPs meet regularly to share knowledge, discuss practices, and solve common problems. They are voluntary, self-organizing, and focused on learning, not delivery or governance.

Effective CoPs: have a clear purpose and scope (e.g., "improve frontend testing practices across the organization"), meet regularly but not too frequently (bi-weekly or monthly), produce tangible artifacts (guidelines, tools, patterns, templates), rotate facilitation to avoid burnout on a few individuals, have an active coordinator or champion but not a "leader" who makes decisions, and are open to anyone who wants to join.

Ineffective CoPs: become another meeting obligation with no clear value, try to enforce standards rather than share practices, are driven by management mandate rather than genuine interest, have unclear scope and wander between topics, produce no outputs or artifacts, lose momentum after initial enthusiasm.

CoP examples: frontend engineering CoP, testing practices CoP, security champions CoP, DevOps practices CoP, product discovery CoP, accessibility CoP, performance engineering CoP, data engineering CoP.

### Guilds

Popularized by Spotify, guilds are cross-organizational communities of interest. They function similarly to CoPs but at larger scale — covering the entire organization, not just a tribe or department.

Guilds work best when they are organic (formed around genuine interest, not mandate), have a clear coordinator or champion who organizes activities, produce tangible outputs (not just discussion — code, tools, guidelines, patterns), operate across organizational silos (guild members from different departments).

Guilds fail when they become bureaucratic (formal membership, approval processes, reporting), try to govern rather than enable (mandating standards rather than sharing best practices), have no clear outcomes or deliverable, become too large to be effective (50+ members with no structure).

### Chapters

Skill-based groups within a tribe or business unit. Unlike guilds (which are optional, cross-org, and informal), chapters are structural, within a reporting hierarchy, and have a chapter lead who is often the line manager for chapter members.

Chapters help maintain skill depth within cross-functional teams (squad members report to a chapter lead for career development), provide career development and mentoring within a discipline, ensure consistent practices within a skill area (coding standards, testing approaches), balance the autonomy of squads with professional standards and consistency.

Challenges: chapters can create a second reporting line that conflicts with squad priorities (competing loyalties), chapter leads can become a bottleneck for career growth if they have too many members, too much chapter focus undermines squad autonomy and stream-alignment, chapter meetings add to meeting load.

### Cross-Team Ceremonies

Scrum of scrums: representatives from each team meet to coordinate dependencies, share blockers, and align on cross-team work. Frequency: 2-3 times per week. Duration: 15 minutes. Focus: blockers, dependencies, alignment. Not a status update — it is a coordination session. Each representative can speak for their team's needs and commitments. Key rule: if there's nothing to coordinate, cancel the meeting.

Cross-team retro: representatives from multiple teams review shared processes, dependencies, and interactions. Focus is on how teams work together, not what each team delivered. Frequency: quarterly. Duration: 1-2 hours. Output: action items for improving cross-team collaboration. Facilitate carefully to avoid blame — focus on systems and processes.

Dependency sync: structured meeting focused specifically on resolving open dependencies between teams. Teams bring their current dependency list and negotiate resolution. Frequency: weekly or bi-weekly. Duration: 30 minutes. Output: updated dependency board, newly resolved items, items that need escalation. Use this to complement async dependency tracking.

Architecture forum: cross-team meeting to discuss system architecture, interfaces, and standards. Not a decision-making body — decisions belong to the teams that own the services. Focus: alignment, knowledge sharing, and review of proposals. Frequency: bi-weekly or monthly. Duration: 1 hour. Output: shared understanding, RFC review, architectural decisions documented. Attendees: technical leads from each team.

### Coordination Anti-Patterns

**Too many meetings**: teams spend more time coordinating than doing. Sign: 15+ hours/week in coordination meetings. Fix: default to async, cancel meetings with no agenda, question recurring meetings.

**Wrong representatives**: non-decision-makers attend coordination meetings, requiring follow-ups and second meetings for actual decisions. Fix: send someone who can make commitments for their team.

**Coordination theater**: regular meetings with no decisions, no outcomes, no follow-through. Participants attend but nothing changes. Fix: have a tight agenda, assign action items, review past action items.

**Escalation overload**: every cross-team issue escalates to management because teams can't resolve things directly. Fix: clarify decision rights, create escalation SLAs, coach teams on direct resolution.

**Bystander coordination**: teams attend coordination meetings but don't actively manage their dependencies. They wait to be told what to do. Fix: expectation that each team maintains their own dependency map and actively works resolution.

## Dependency Management

### Dependency Types

Hard dependency: Team A cannot deliver without Team B completing their work first. Example: Team A needs a new API endpoint from Team B before they can build their feature.

Soft dependency: Team A could deliver without Team B's work, but the result would be better with integration. Example: adding search functionality that would benefit from Team B's relevance ranking service.

Knowledge dependency: Team A needs to learn something from Team B before they can proceed. Example: Team A needs to understand Team B's event schema before they can publish to the event bus.

Resource dependency: Team A and Team B share a finite resource (test environment, staging database, CI runner, QA specialist, designer). Example: both teams need the staging environment for their testing.

### Dependency Mapping

Create a dependency map showing: all teams and their owned capabilities, arrows showing dependencies between teams (direction of dependency), labels showing dependency type (hard, soft, knowledge, resource), annotations showing interaction mode (collaboration, X-as-a-Service, facilitating), color coding for status (green = resolved, yellow = in progress, red = blocked, gray = identified but not started).

Tools for dependency mapping: Miro or LucidChart for visual whiteboard mapping, shared spreadsheet for lightweight tracking, dedicated dependency management tools (Jira Portfolio, Targetprocess, Jira Align), specialized tools like Team Topologies Miro templates.

Review the dependency map at: quarterly planning events, cross-team ceremonies, each team's sprint planning (check new dependencies).

### Dependency Board

A visible board showing all cross-team dependencies with columns for each status stage:

Identified → In Progress → Resolved → Verified → Closed

               \-> Blocked -> Escalated

Each dependency card shows: unique ID for tracking, description of what is needed, dependent team (who needs this), providing team (who needs to deliver this), interaction mode (how the teams should coordinate), SLA or expected completion date, current status, owner (person driving resolution), team API links for both teams.

### Dependency Resolution Workflow

1. Identify: team identifies a dependency during planning or discovery
2. Document: add to dependency board with all details (what, who, when, mode)
3. Contact: reach out to the providing team using the defined interaction mode
4. Negotiate: agree on timeline, expectations, deliverables, and SLA
5. Execute: providing team delivers the dependency; dependent team monitors progress
6. Verify: dependent team confirms the dependency is resolved and works as expected
7. Close: dependency marked as resolved, documented, and lessons captured
8. Review: quarterly review of all resolved dependencies for pattern analysis

### Reducing Dependencies

Platform team adoption: move shared capabilities to a self-service platform that any team can use independently. Most effective strategy for hard dependencies.

Clear team boundaries: each team owns their domain end-to-end. Well-defined bounded contexts minimize the need for cross-team coordination.

Explicit interaction modes: defined interaction modes reduce the coordination overhead of dependencies. X-as-a-Service is the most efficient mode for dependency resolution.

Consumer-driven contracts: consumers define their needs through contract tests, providers build to those contracts. Reduces back-and-forth communication.

Enabling teams: build capability in teams so they can handle more independently without depending on others.

Event-driven architecture: teams communicate through asynchronous events rather than synchronous calls. Decouples teams and reduces timing dependencies.

Feature flags: teams can deploy independently behind feature flags. Deploy without waiting for the full feature to be complete.

### Dependency Metrics

Dependency count per team: total number of dependencies (incoming + outgoing). High-count teams need platform support, boundary refinement, or additional capacity.

Blocked time: percentage of time teams spend waiting on dependencies. Target <10% of total capacity. Track at the team level.

Dependency resolution time: average time from identification to resolution. Track trend over quarters. Improving trend indicates maturing interaction modes.

Dependency volatility: how often dependencies change (scope, timeline, interface). High volatility indicates poor estimation or unstable interfaces.

Dependency discoverability: can teams find what they need without asking? Measured by: how often do teams need to ask about dependencies vs. finding them documented?

### Systemic Dependency Analysis

Look for patterns across the dependency board: are particular teams dependency magnets (many incoming dependencies)? These teams need platform support or boundary refinement. Are particular teams bottlenecked by many outgoing dependencies? These teams need additional autonomy or enabling support. Are certain dependency types consistently slow to resolve (knowledge dependencies, resource dependencies)? Types that are consistently slow need process improvement. Are there seasonal patterns in dependency formation (quarterly planning, end-of-year pushes, product launch cycles)?

## Integration Patterns

### Continuous Integration

Teams merge code to main branch multiple times per day. Every merge triggers an automated build and test suite. Integration problems are detected immediately, not at release time.

For cross-team dependencies: share integration tests so changes don't break other teams' workflows. Use consumer-driven contracts to catch breaking changes early. Maintain a shared CI dashboard showing integration health across all teams. Set up notifications for cross-team build breaks with clear ownership for fixing.

### Trunk-Based Development

All team members commit to a single branch (main/trunk) at least daily. Short-lived feature branches (less than a day) if used at all. No long-lived branches — they create integration hell and delayed conflict detection.

Cross-team trunk-based development: teams may share a repository or use a coordination mechanism across repositories. Breaking changes are detected in CI within minutes (not days or weeks). Teams are expected to fix their own breaks immediately — "you break it, you fix it" applies at team level too. Rollbacks are fast because there is only one branch. Consider a shared CI dashboard that shows the integration status across all teams using the same trunk.

### Feature Flags

Deploy code independently from releasing features to users. Features are gated behind flags that control visibility and access.

Flags enable: continuous deployment (deploy code even if the feature isn't done), gradual rollout (enable for 10% of users first, monitor, increase), A/B testing (different user segments see different versions), instant kill switch (disable a feature without rollback), team-independent deploys (deploy backend before frontend is ready).

Cross-team feature flags: flags can be defined at service boundaries. Team A can deploy a new API endpoint behind a feature flag. Team B can test their integration before the flag is enabled for all users. Coordinated flag flips across teams ensure aligned release. Flag management platform becomes a platform team concern.

### Canary Releases

New versions are rolled out to a small subset of users first. Monitor for errors, latency, and user impact. Gradually increase traffic if everything looks good. Roll back automatically if issues are detected.

Cross-team canary releases: coordinate canary windows across dependent services. Ensure that canary traffic is consistent across the dependency chain (a canary user goes through canary versions of all services). Use correlation IDs to track canary requests across service boundaries. Have a coordinated rollback plan if the canary fails.

## Team Autonomy vs Alignment

### The Autonomy-Alignment Balance

Autonomy: teams can make decisions and deliver value independently without seeking approval from other teams or management. Alignment: teams are working toward shared organizational goals with a coherent strategy.

These are not opposites — high-performing organizations achieve both. Low autonomy + low alignment: teams are told what to do and don't understand why. Micromanagement without purpose. Low autonomy + high alignment: teams understand the goals but can't act on them. Strategic clarity without execution capability. High autonomy + low alignment: teams do whatever they want without coordination. Innovation without strategic coherence. High autonomy + high alignment: teams understand organizational goals and can make their own decisions about how to contribute. This is the target state.

### Alignment Authority

Alignment comes from: clear organizational strategy and vision (where are we going and why), well-defined team purposes and boundaries (what does each team own and why), explicit interaction modes and service contracts (how should teams work together), shared metrics and OKRs (what does success look like), architectural principles and standards (how should we build things).

Alignment mechanisms: strategy deployment (hoshin kanri) cascading goals from executive to team level, OKRs aligned from company to team to individual, architectural governance forums for cross-team alignment, platform team standards and golden paths, communities of practice for shared practices and norms.

### Autonomous Decision-Making

Teams should be able to make decisions within their boundaries without seeking approval from other teams or management. Boundaries are defined by: team purpose statement, owned capabilities and services, team API documentation, architectural principles.

Decision types: within boundaries — full autonomy (team decides and acts without consultation). Across boundaries — needs coordination with affected teams (align before acting, document decision). Changing boundaries — needs organizational approval (boundary changes affect everyone, cannot be done unilaterally).

### Strategic Coherence

Teams need to understand: how their work contributes to company strategy, what other teams are doing and why (to avoid duplication and find synergy), what strategic priorities are and how they change over time, what constraints apply (compliance requirements, architectural decisions, platform standards).

Strategic coherence mechanisms: quarterly strategic reviews with all teams (goals, progress, priorities), strategy documents accessible to everyone with clear rationales, OKR transparency — every team can see every other team's OKRs, all-hands meetings and town halls for strategic communication, cross-team strategy discussions at architecture forums and guilds.

### Warning Signs

Teams optimized for their own goals at expense of overall system health. Teams build workarounds because they don't trust or like shared platforms. Teams hoard information or capabilities to increase their importance. Teams make decisions that negatively impact other teams without checking (autonomy without alignment). Strategic priorities are unknown or ignored at the team level (alignment without communication). Teams optimize for their own metrics at the expense of company-level outcomes (local optimization).

### Autonomy-Supporting Practices

Manager as enabler rather than director: managers provide context, resources, and support — not instructions and approval. Budget autonomy: teams have their own budget for tools, training, and experiments. Technical autonomy: teams choose their technology stack and architecture (within architectural principles). Process autonomy: teams choose their development methodology (Scrum, Kanban, or hybrid). Deployment autonomy: teams deploy independently without waiting for release trains or approval gates.

### Alignment-Supporting Practices

Strategic context sharing: every team understands company goals and their role in achieving them. OKR transparency: all teams can see and comment on each other's OKRs. Architecture forums: shared understanding of system architecture and direction. Guilds and CoPs: shared practices and norms across teams. Interaction mode reviews: ensuring teams are aligned on how they work together.

## Sensing and Feedback Loops

### Team Health Checks

Quarterly assessment where team members anonymously rate their team on key dimensions. Use traffic light system: green (healthy = we're doing well), amber (needs attention = could be better), red (problematic = needs immediate action).

Standard dimensions: delivery — is the team shipping valuable software frequently and sustainably? Quality — is the codebase healthy and are defects low? Process — are the team's ways of working effective and enjoyable? Mission — does the team understand their purpose and how it connects to company goals? Support — does the team get the support they need from other teams and leadership? Learning — is the team growing their skills and improving their practices? Community — do team members feel connected and supported? Speed — can the team move quickly without being blocked? Easy to release — is the release process smooth and low-risk? Suitability of process — does the agile process fit the team's context? Health — are team members' well-being and work-life balance sustainable?

Results are anonymous and aggregated. The team discusses results focusing on amber and red items. The team identifies 1-2 improvement actions per quarter. Health checks are for the team, not for management reporting.

### Maturity Assessments

Capability maturity assessment across key dimensions: technical practices (CI/CD maturity, testing coverage, monitoring, security practices), team practices (agile ceremonies, retrospectives, planning, estimation), cross-team interaction (dependency management, communication, interaction mode effectiveness), platform adoption and self-service usage (are teams using the platform?), cognitive load profile (intrinsic/extraneous/germane split).

Scoring: 1-5 scale per dimension. Aggregate to overall maturity score. Track trend over quarters. Use to identify where enabling teams are needed, where platform investments should be focused, and which teams need additional support.

### Retrospectives

Team retros: team reviews their own process and identifies improvements. Structure: gather data (what happened this sprint?), generate insights (why did it happen?), decide actions (what will we do about it?), follow up (did we do what we said?).

Cross-team retros: multiple teams review shared processes, dependencies, and interactions. Structure: gather data on cross-team interactions (what worked? what didn't?), generate insights on systemic patterns (why do these issues recur?), decide on systemic improvements (what can multiple teams change together?), follow up on cross-team action items. Frequency: quarterly.

### Feedback Loops in Interaction Modes

Collaboration: daily feedback during standups (what's working? what's not?), mid-point retro at the halfway point, retro at the end of the collaboration timebox (what did we learn?).

X-as-a-Service: consumer satisfaction surveys (quarterly), feature request tracking (how many? how long? what's the backlog?), SLA monitoring (are we meeting our commitments?), adoption tracking (are teams using the service?), feedback channel (Slack, portal, or regular meetings).

Facilitating: capability assessment at each milestone (are we making progress?), feedback on coaching quality (is the approach working?), exit interview (what did the team learn? what could be improved?), follow-up at 1 month and 3 months post-engagement (is the capability retained?).

### Measuring What Matters

DORA metrics: deployment frequency (how often does the team deploy?), lead time for changes (time from commit to production), change failure rate (percentage of deployments causing failures), time to restore service (how long to recover from failures). These measure delivery performance and are leading indicators of organizational effectiveness.

Flow metrics: cycle time (time from start to finish on a work item), work in progress (how many items are actively being worked on), throughput (how many items are completed per week), flow efficiency (ratio of active work time to total elapsed time). These measure how smoothly work moves through the system.

Team metrics: satisfaction (engagement survey score), cognitive load (intrinsic/extraneous/germane assessment — tracked over time), autonomy (can the team deliver without being blocked?), alignment (does the team understand how their work contributes to company goals?), churn (are team members leaving? are they burned out?).

## Conflict Resolution Between Teams

### Escalation Paths

Team level: team members discuss directly and resolve. Clear interaction modes and team APIs should prevent most conflicts from arising. This is the default and preferred level.

Team lead level: escalation when direct discussion between team members fails. Team leads discuss the issue with context from their teams. Most issues should be resolved at this level.

Management level: escalation when team leads can't agree or the issue requires resource allocation decisions. Managers facilitate resolution with authority to make binding decisions.

Executive level: escalation for strategic conflicts, resource allocation across larger units, or when management-level escalation fails. Rare — should be the exception, not the norm.

Document escalation paths for each interaction mode. Publish them in team API documentation so everyone knows the process. Ensure that escalation doesn't skip the direct communication step — it should be last resort, not first response.

### Mediation Approaches

Facilitated discussion: neutral facilitator helps teams communicate effectively, identify underlying interests, and find common ground. Best for: communication breakdowns, emotional conflicts.

Interest-based negotiation: focus on underlying interests (what each team needs to succeed) rather than positions (what each team says they want). Best for: resource allocation, priority conflicts.

Compromise: both teams give something up to reach an agreement that both can accept. Best for: symmetrical conflicts where both sides have roughly equal power and stakes.

Principle-based: refer back to shared principles, priorities, and organizational goals to guide the resolution. Best for: value-based conflicts where teams disagree on approach.

The best mediation outcome is not just a one-time resolution but a process or framework for resolving similar conflicts in the future.

### Decision Rights

Explicit decision rights prevent conflicts by defining who decides what. For each type of cross-team decision, document: who decides (which team or role has final authority), who must be consulted (input is required but not binding), who must be informed (notification after decision).

Examples: API contract changes — provider team proposes, consumer teams must be consulted, all teams are informed after decision. Shared infrastructure changes — platform team decides with input from all platform consumers, affected teams are informed before implementation. New team formation — organizational leadership decides with input from affected teams' leads.

### De-escalation Techniques

Reframe from positions to interests: instead of "We need the API to change" (position), ask "What problem is the current API causing?" (interest). This opens up more solutions.

Separate people from problems: focus on the situation and the system, not on blame. "What in our interaction caused this issue?" rather than "Your team caused this issue."

Generate options before deciding: brainstorm multiple solutions before evaluating any of them. This prevents premature commitment to a single approach.

Use objective criteria: what data, metrics, or principles can resolve this? "According to our architectural principles, dependency direction should follow business domain lines" is more productive than "We should do it my way."

BATNA awareness: what happens if we don't agree? Understanding the "best alternative to a negotiated agreement" helps both sides be realistic about the cost of not resolving.

## Distributed/Remote Team Interaction

### Async-First Communication

Default to asynchronous communication: write things down, share documents, record meetings, and use collaborative editing. Use synchronous communication intentionally for: complex problem-solving that needs real-time back-and-forth, relationship building and social connection, difficult conversations (performance, conflict, sensitive topics), decision-making that benefits from real-time discussion, and brainstorming sessions.

Async-first principles: document decisions with rationale (if it wasn't written down, it wasn't decided), share updates in writing before (or instead of) meetings, use recorded video for complex explanations that are hard to write, collaborate on documents asynchronously (comments, suggestions, reviews), respect response time expectations (not immediate — use SLAs for different communication channels).

### Timezone-Aware Collaboration

Identify working hours overlap between teams — this is your "golden hour" for synchronous collaboration. Schedule important synchronous collaboration during overlap windows. Use async communication for everything outside overlap. Design interaction modes that minimize synchronous dependency.

Strategies: overlap-based collaboration — schedule important meetings (planning, demos, retros) during shared hours. Follow-the-sun handoff — end-of-day handoff to the next timezone with documented context, async updates during the other team's working hours. Async sprints — teams work independently for most of the sprint with async integration at the end. Extended overlap days — once per week, extend hours for deep collaboration if needed.

### Tools and Practices

Shared documentation: all decisions, standards, how-tos, and runbooks must be documented and accessible. Documentation is the "source of truth" — it replaces hallway conversations and tribal knowledge.

Async standup: written updates in Slack or a specialized tool (Geekbot, Standuply). Each team member answers: what did I do yesterday? What will I do today? What is blocking me? This replaces synchronous standups for remote teams.

Recorded demos: demos recorded for async consumption. Include a written summary alongside the recording for quick scanning.

Virtual collaboration spaces: persistent video rooms (like Sococo, Gather) for informal connection and spontaneous conversation. These replace the physical office's watercooler.

Collaboration tools: Figma, Miro, and Google Docs for real-time or async editing. Async-first communication: Loom for video messages, Notion for documentation, Slack for quick async communication, email for formal updates.

### Interaction Mode Adaptation for Remote

Collaboration mode in remote: requires more structure than co-located collaboration. Daily standups, shared Slack channel, and recorded design sessions. Use virtual whiteboards for collaborative design. Document decisions immediately (asynchronously). Plan for timezone overlap for the most important sync sessions.

X-as-a-Service in remote: it works naturally because the interface is already documented and self-service. Invest more in documentation quality and discoverability since there is no hallway conversation to fill gaps. Provide async support channels (Slack, documentation, recorded demos). Office hours for synchronous support if needed.

Facilitating in remote: requires more structure and intentionality. Coaching sessions should be recorded for the team to rewatch. Pairing can work remotely through screen sharing and pair programming tools (VS Code Live Share, Tuple, Zoom). The structured phases (intense → guided → light touch → disengaged) work well remotely when documented.

### Building Trust Across Distance

Trust is built through: consistent communication (regular cadence, predictable responses, showing up on time), reliability (doing what you say you'll do, meeting commitments), vulnerability (admitting mistakes, asking for help, being honest about capacity), personal connection (non-work conversations, virtual coffee breaks, team social events).

Remote team interaction needs more intentional trust-building because spontaneous trust-building moments (lunch, coffee, hallway chats) don't exist. Invest in: regular 1:1s across teams (not just within teams), rotating participation in cross-team ceremonies, occasional in-person gatherings for key relationships (quarterly or bi-annual), virtual social events and games.

## Scaling Interaction Models

### From Startup to Enterprise

Startup (1-3 teams): collaboration is natural and effective. Everyone knows everyone. No formal interaction modes needed. Communication is high-bandwidth, synchronous, and organic. Platform needs are handled within each team.

Scale-up (4-8 teams): collaboration doesn't scale — meeting overhead grows quadratically with team count. Introduce X-as-a-Service for shared capabilities. Formalize interaction modes explicitly. First platform team emerges for shared infrastructure. Enabling teams appear for capability building. Cross-team coordination structures form.

Enterprise (9+ teams): interaction modes must be explicit, documented, and managed. Platform teams are essential for reducing cognitive load. Complicated-subsystem teams for rare, deep expertise. Governance and architecture forums coordinate across teams. Cross-team coordination structures (CoPs, guilds, chapters) are the norm. Interaction mode reviews are scheduled regularly.

### Multi-Team Coordination Patterns

Hierarchical coordination: teams are grouped under tribes or value stream groups. Coordination happens primarily within groups, less across groups. Works well when domains are naturally grouped and team count is 10-50. Risks: cross-group coordination gaps (groups become silos), hierarchical decision-making slowing down cross-group work.

Network coordination: teams coordinate directly through defined interaction modes. No hierarchy or grouping. Works well when teams are mature, boundaries are clear, and team count is 4-10. Risks: coordination overhead at scale (too many point-to-point relationships), no escalation path for conflicts.

Hybrid: hierarchy for strategic alignment, network for operational coordination. Most common at enterprise scale. Tribes provide strategic alignment, resource allocation, and group-level coordination. Teams coordinate directly (through interaction modes) for day-to-day work. This combines the best of both when implemented well.

### Scaling Triggers

When to add a platform team: 3+ stream-aligned teams are building the same capability independently (waste), or cognitive load on stream-aligned teams is too high for them to be effective.

When to add an enabling team: multiple teams need the same capability improvement (testing maturity, security practices) and no one is helping them acquire it.

When to formalize interaction modes: coordination overhead is visible and measurable — teams are spending more than 10% of their time on cross-team coordination.

When to add governance: teams are making conflicting architectural decisions that create integration problems or inconsistent practices across the organization.

When to restructure: Conway's Law misalignment is blocking delivery — system architecture and org structure are fighting each other.

### Scaling Anti-Patterns

Over-structuring: too many governance bodies, coordination ceremonies, management layers, and escalation paths. Teams spend more time navigating the organizational structure than doing work.

Under-structuring: no explicit interaction modes, no dependency management, no coordination structures. Teams waste time figuring out how to work together every time.

False hierarchy: the org chart looks organized, but teams bypass it for actual work. The real communication network doesn't match the org chart. Conway's Law produces an architecture that matches the real network, not the chart.

Plateau of bureaucracy: every coordination mechanism becomes a meeting. Every governance structure creates more process. The organization becomes the opposite of what Team Topologies aims for.

## Monitoring Team Interactions

### DORA Metrics at Team Level

Deployment frequency: how often does the team deploy to production? Elite: multiple times per day. High: weekly to monthly. Medium: monthly to every 6 months. Low: less than every 6 months.

Lead time for changes: time from commit to production. Elite: less than one day. High: one week to one month. Medium: one month to six months. Low: more than six months.

Change failure rate: percentage of deployments causing a failure. Elite: <5%. High: 5-10%. Medium: 10-15%. Low: >15%.

Time to restore service: how long to recover from a failure. Elite: <1 hour. High: <1 day. Medium: <1 week. Low: >1 week.

Track these per team and across teams. If one team's metrics are significantly worse, investigate whether cross-team dependencies or poor interaction modes are the cause.

### Team Topologies Assessment

Quarterly assessment covering: team type clarity — does every team know their team type (stream-aligned, enabling, platform, complicated-subsystem)? Interaction mode clarity — are interaction modes between teams documented and understood? Interaction mode effectiveness — are teams satisfied with their current interaction modes? Cognitive load profile — what is the intrinsic/extraneous/germane split for each team? Dependency health — count, resolution time, blocked time per team. Platform adoption — are teams using available platform services? Enabling impact — have enabling engagements resulted in measurable capability transfer?

Score each dimension 1-5, track trend over quarters. Use results to guide: platform investment priorities, enabling team allocation, team boundary adjustments, and interaction mode changes.

### Flow Metrics

Cycle time: average time from work start to completion on a work item. Track by team and by work item type. WIP (work in progress): how many items are actively being worked on. High WIP causes context-switching and extended cycle times. Throughput: how many items are completed per week. Predictable throughput enables reliable planning. Flow efficiency: ratio of active work time to total elapsed time. Low efficiency (<20%) indicates excessive waiting.

Cross-team flow: map flow across team boundaries. Where does work wait between teams? What causes cross-team delays? Can interaction modes reduce wait time? Use value stream mapping to visualize the end-to-end flow and identify handoff delays.

### Team Satisfaction

Include interaction-specific questions in team health checks: "I can get what I need from other teams without excessive delay." "Our team has clear boundaries and autonomy to make decisions." "I understand how our team should interact with other teams." "Cross-team coordination is efficient and predictable in our organization." "The platform and services we depend on are reliable and self-service."

Track satisfaction by dimension over time. Investigate any drops of 0.5+ on a 5-point scale. Compare across teams to identify systemic issues vs. local ones.

## Case Studies and Examples

### Collaboration Mode Case: Payment Platform Redesign

Context: two teams — Checkout and Payments — needed to redesign the payment flow that spanned their respective domains. Neither team could do it alone because the flow required deep knowledge of both domains.

Collaboration: they formed a joint team for 8 weeks with a clear charter: "Design and document the new payment flow API." They had a shared backlog, daily standups, and a joint retro every 2 weeks. Decision protocol: technical decisions by consensus, resource decisions by the DRI (a product manager from Checkout).

Outcome: new design completed in 6 weeks, ahead of schedule. The API was documented and agreed upon. Handoff: Payments team took permanent ownership of the payment flow API. Interaction mode transitioned from collaboration to X-as-a-Service. Both teams reported high satisfaction with the collaboration.

Lesson: a well-structured, time-boxed collaboration with clear exit criteria can accelerate cross-team work without creating permanent dependency.

### X-as-a-Service Case: Internal CI/CD Platform

Context: 6 stream-aligned teams each managed their own build pipelines, deployment scripts, and CI/CD configurations. Every team solved the same problems differently. Time-to-deploy for a new service was 2-4 weeks.

Solution: a platform team formed to provide shared CI/CD as a service. They built self-service pipeline templates that teams could configure via a YAML file. Documentation included quickstarts, examples, and troubleshooting guides. Support was provided through a Slack channel with 4-hour response SLA.

Outcome: 100% adoption within 3 months. Time-to-deploy dropped from weeks to hours. Teams reported significantly reduced cognitive load. The platform team measured satisfaction quarterly and iterated based on feedback.

Lesson: X-as-a-Service works when the service is genuinely self-service, well-documented, and supported. Adoption is the metric, not mandate.

### Facilitating Mode Case: Testing Practice Adoption

Context: a stream-aligned team had low test coverage (20%), manual regression testing, and frequent production defects. They knew they needed to improve but didn't know where to start.

Approach: an enabling team with deep testing expertise paired with them for 6 weeks. Phase 1 (2 weeks): intensive pairing — facilitator worked alongside each team member on adding tests. Phase 2 (2 weeks): guided independence — facilitator reviewed test strategies and provided feedback. Phase 3 (2 weeks): light touch — facilitator available for questions, team working independently.

Outcome: test coverage increased from 20% to 70%. The team adopted TDD for new features and continued to improve coverage. Production defects dropped 60%. The enabling team disengaged after 8 weeks with a follow-up scheduled for 3 months later.

Lesson: structured facilitating with clear phases and exit criteria builds lasting capability without creating dependency.

### Failure Case: Permanent Collaboration

Context: two teams always worked together — shared Slack channel, attended each other's standups, split ownership of a monolith. They had been "collaborating" for 18 months without a formal engagement.

Problem: no clear ownership of any component. Slow decisions required both teams to agree. Blame was deflected during incidents — "the other team's code." Each team assumed the other was handling critical maintenance.

Resolution: the monolith was decomposed into two services aligned with each team's domain. Each team owned their service end-to-end. Interaction mode became X-as-a-Service via a well-defined API between the services. Collaboration: not needed after the interface was defined.

Lesson: permanent collaboration is a symptom of unclear boundaries or missing platform. Make collaboration temporary by default and use it to define interfaces.

### Failure Case: Platform That Wasn't Self-Service

Context: a platform team built services but required tickets for every action. Consuming teams had to submit requests, wait for manual provisioning, attend meetings with the platform team, and wait for changes to be made for them.

Problem: tickets created a bottleneck. The platform team was overwhelmed with requests. Consuming teams waited days or weeks for simple changes. Shadow platforms emerged as frustrated teams built their own alternatives. Platform adoption was below 30%.

Resolution: the platform team invested in automation — self-service portals, Terraform modules, and API-driven provisioning. They documented everything and set up a support channel. Ticket volume dropped 80%. Adoption increased to 90%.

Lesson: if it requires a ticket, it's not a platform. Self-service is not optional for X-as-a-Service mode.

## Best Practices

Define interaction modes explicitly for every team-to-team relationship. Document them in team APIs. Default to X-as-a-Service for stable capabilities. Use collaboration sparingly and only with timeboxes. Ensure every facilitating engagement has a clear exit criteria.

Structure collaboration carefully: define shared outcome, set timebox, agree on decision protocol, plan handoff. The more structured the collaboration is, the more effective it will be.

Build platforms that are genuinely self-service. If a consuming team needs to submit a ticket or attend a meeting, it is not self-service. Measure self-service adoption rate as the primary platform success metric.

Invest in enabling teams that work themselves out of a job. The goal is capability transfer, not permanent dependency. Measure the enabling team's impact by the autonomy of the teams they support, not by how busy they are.

Respect Conway's Law. If your system architecture doesn't match your org structure, you will have coordination problems. Use the reverse Conway maneuver to align them. Measure alignment improvement over time.

Measure cognitive load regularly. It is the single most important predictor of team health and performance. Track intrinsic, extraneous, and germane load. Investigate teams consistently over 80% capacity.

Document team APIs. Every team should publish their purpose, boundaries, dependencies, services, and SLA. This makes coordination predictable and reduces extraneous cognitive load for everyone.

Escalate interaction mode decisions when teams can't agree. Don't let conflicts fester. Use explicit decision rights and documented escalation paths to resolve conflicts quickly.

Adapt interaction modes to team maturity. Novice teams need more collaboration and facilitation. Mature teams can consume services and operate autonomously. Don't force a mature interaction model on a developing team.

Scaling requires changing interaction models. What works at 3 teams will not work at 10 teams or 30 teams. Plan for interaction mode evolution as the organization grows. Review modes quarterly.

## Common Anti-Patterns

**Collaboration addiction**: teams that default to collaboration for everything. Avoids the hard work of defining stable interfaces and clear boundaries. Fix: require collaboration to have a timebox and exit criteria.

**X-as-a-Service theater**: teams claim to provide a service, but it requires tickets, meetings, and manual handoffs. Self-service is the requirement, not the aspiration. Fix: eliminate tickets from the platform. If a human is required, it is not a service.

**Facilitating that never ends**: enabling teams that become permanent. They do the work instead of transferring capability. The team being "enabled" never becomes autonomous. Fix: require every enabling engagement to have a clear end date and exit criteria.

**Implicit interaction modes**: teams never agree on how they should interact. Every interaction is an ad-hoc negotiation. Coordination overhead is invisible but debilitating. Fix: document interaction modes in every team's API.

**Over-formalization**: every interaction requires a contract, SLA, and approval process. Kills the speed and flexibility that collaboration mode is meant to provide. Fix: match the formality to the risk and stability of the relationship.

**Org chart as architecture**: management restructures teams without considering Conway's Law. The system architecture fights the new org structure. Delivery slows down. Fix: always analyze Conway's Law implications before restructuring.

**One mode to rule them all**: an organization standardizes on a single interaction mode for all relationships. Collaboration-only is too expensive. X-as-a-Service-only slows down discovery and innovation. Different relationships need different modes. Fix: choose the mode that fits the specific relationship.

**Ignoring cognitive load**: teams are loaded beyond capacity, but no one measures or notices. The team burns out, quality drops, and delivery slows. All because no one looked at extraneous load. Fix: measure cognitive load monthly. Investigate and act when load exceeds 80%.
