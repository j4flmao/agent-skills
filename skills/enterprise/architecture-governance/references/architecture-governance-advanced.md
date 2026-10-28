# Architecture Governance: Advanced Topics

Advanced practices for scaling architecture governance across large or regulated organisations: federated governance, governance as code, technology lifecycle management, portfolio rationalisation, risk-based review, regulatory alignment, AI/ML system governance, and measuring governance effectiveness. Builds on `architecture-governance-fundamentals.md`.

## Federated Governance

Central boards do not scale beyond a few dozen teams. Federate:

| Level | Owns | Mechanism |
|-------|------|-----------|
| Enterprise | Principles, mandatory standards, cross-domain decisions, technology lifecycle | Architecture board, tech radar |
| Domain | Domain models, integration contracts, domain-specific standards | Domain architecture forums |
| Team | Service design within guardrails | ADRs, fitness functions |

Rules for federation:
- Enterprise sets **outcomes and guardrails**; domains choose **how**.
- Escalation path defined for cross-domain conflicts.
- Domain decisions published to a shared index so others can reuse them.

This mirrors federated computational governance in data mesh: global policies enforced automatically, local autonomy elsewhere.

## Governance as Code

Turn standards into executable checks and run them where engineers work:

| Standard | Executable form |
|----------|-----------------|
| "Services expose health endpoints and SLOs" | Portal scorecard check against catalog metadata |
| "APIs follow the style guide" | Spectral ruleset in CI on OpenAPI/AsyncAPI files |
| "Only approved data stores" | OPA/Conftest policy on Terraform plans |
| "No cross-domain database access" | Network policies + IAM policies + dependency checks |
| "Layered architecture inside services" | ArchUnit / dependency-cruiser rules |
| "Container images from approved bases" | Admission policy (Kyverno/Gatekeeper) |

Example Spectral rule:

```yaml
# .spectral.yaml
extends: ["spectral:oas"]
rules:
  operation-must-have-owner:
    description: Every operation declares an owning team
    given: $.paths[*][*]
    severity: error
    then:
      field: x-owner
      function: truthy
```

Version the policies, test them, roll them out in warn mode first, and publish violations dashboards per team.

## Technology Lifecycle Management

| Stage | Meaning | Governance action |
|-------|---------|-------------------|
| Assess | Exploring | Time-boxed spikes, no production |
| Trial | Limited production use | Named pilot teams, success criteria |
| Adopt | Default choice | Golden paths, support model |
| Hold / Contain | No new usage | New use needs exception |
| Retire | Remove by date | Migration plan, funding, tracking |

Track every technology with owner, stage, support/end-of-life dates (vendor and open-source), and number of systems using it. Lifecycle dates for runtimes, frameworks and databases drive migration roadmaps.

## Portfolio Rationalisation

- Build an application inventory with business capability mapping, owners, cost, technical health and risk.
- Classify with a TIME model (Tolerate, Invest, Migrate, Eliminate) or Gartner-style rationalisation.
- Identify duplicate capabilities (three CRM systems, five workflow engines) and choose target platforms.
- Fund migrations explicitly; governance without funding produces exceptions, not change.

## Risk-Based Reviews

Instead of reviewing by project size, score risk:

| Factor | Examples |
|--------|----------|
| Data sensitivity | Personal, financial, health, regulated data |
| Exposure | Internet-facing, partner integration |
| Criticality | Revenue impact, safety, regulatory reporting |
| Novelty | New technology, new vendor, new pattern |
| Reversibility | One-way door decisions (data model, vendor lock-in) |

Map score to review depth: low scores self-certify; high scores get threat modelling, resilience review and board decision. Revisit the scoring after incidents.

## Regulatory Alignment

| Regulation/framework (examples) | Architecture implications |
|---------------------------------|---------------------------|
| DORA (EU financial sector) | ICT risk management, resilience testing, third-party register, incident reporting |
| NIS2 (EU essential/important entities) | Security risk management, supply-chain security, reporting |
| GDPR | Data minimisation, residency, processing records, privacy by design |
| EU AI Act | Risk classification of AI systems, documentation, logging, human oversight for high-risk systems |
| SOC 2 / ISO 27001 | Control evidence: change management, access control, logging |

Governance records (ADRs, review outcomes, exceptions, inventories) double as audit evidence; design them to be queryable. Confirm applicability and obligations with legal/compliance.

## Governing AI/LLM Systems

- Inventory AI use cases with risk classification, data sources, model providers and owners.
- Standards for: approved model providers and data handling terms, evaluation before release, human-in-the-loop for consequential actions, prompt-injection defences, logging of decisions (see agent observability guidance).
- Lifecycle: model/version changes treated as changes requiring evaluation evidence.

## Architecture Debt Management

- Record architecture debt items with impact, cost of delay and owner, separate from code-level tech debt.
- Allocate capacity (e.g. a fixed share of roadmap) to reduce debt aligned with target architecture.
- Track progress toward target state per domain (transition architectures).

## Measuring Effectiveness

| Dimension | Indicators |
|-----------|-----------|
| Flow | Median decision time, review queue length, share auto-approved |
| Alignment | % systems on adopt-stage technologies, duplicate capabilities reduced |
| Risk | Open exceptions by severity and age, audit findings, incidents tied to standards gaps |
| Value | Teams' perception surveys, reuse of platforms/patterns, cost savings from rationalisation |

Review metrics quarterly with engineering leadership; change the governance process itself based on data.

## Common Failure Modes

| Failure | Remedy |
|---------|--------|
| Ivory-tower standards | Co-create with guilds; require reference implementations |
| Board as bottleneck | Tiering, delegation, async reviews, published SLAs |
| Paper compliance | Automate checks; sample-based deep reviews |
| Exceptions never expire | Expiry dates enforced; escalate overdue |
| Governance ignored by product leadership | Tie to business risks and costs; report in business terms |

## Checklist

- [ ] Federated model with clear escalation paths
- [ ] Key standards enforced as code, rolled out warn-then-enforce
- [ ] Technology lifecycle register with end-of-life tracking
- [ ] Application portfolio inventory and rationalisation plan
- [ ] Risk-based review depth
- [ ] Governance artefacts queryable as audit evidence
- [ ] AI systems inventoried and governed
- [ ] Effectiveness metrics reviewed and acted on
