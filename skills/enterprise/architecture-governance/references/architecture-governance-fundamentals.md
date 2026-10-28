# Architecture Governance Fundamentals

Architecture governance is the set of decision rights, principles, standards and lightweight processes that keep technical decisions aligned with business goals without slowing delivery. This reference covers the building blocks: what to govern, who decides, principles and standards, decision records, review tiers, exceptions and metrics. Deeper material: `architecture-board.md`, `architecture-principles.md`, `architecture-reviews.md`, `decision-rights.md`.

## Goals and Anti-Goals

| Governance should | Governance should not |
|-------------------|-----------------------|
| Make important decisions explicit, recorded and reversible where possible | Approve every change centrally |
| Reduce duplicated platforms and incompatible choices | Mandate tools without explaining the problem they solve |
| Manage risk (security, compliance, resilience, cost) | Replace team accountability for their systems |
| Speed teams up with paved paths and clear guardrails | Create queues that teams route around |

## What to Govern

| Area | Examples of decisions |
|------|-----------------------|
| Technology portfolio | Languages, databases, messaging, cloud services (Tech Radar: adopt/trial/assess/hold) |
| Integration | API standards, event schemas, ownership of shared data |
| Security and compliance | Identity, data classification, encryption, regulated data flows |
| Resilience | Availability targets, multi-region strategy, DR tiers |
| Data | System of record per domain, retention, lineage |
| Cost | Commitments, shared platform spend, unit economics targets |
| Build vs buy | Vendor selection, open-source adoption policy |

Govern decisions that are expensive to reverse, cross team boundaries, or carry regulatory risk. Leave local, reversible decisions to teams.

## Decision Rights

Use a simple model (RACI or RAPID) per decision type:

| Decision type | Decides | Consulted | Informed |
|---------------|---------|-----------|----------|
| Internal design of a service | Owning team | Domain architect (optional) | |
| New externally exposed API | Owning team | API guild, security | Consumers |
| New database technology | Architecture board | Platform, SRE, security | All engineering |
| Cross-domain data ownership change | Domain architects jointly | Data governance | Affected teams |
| Exception to a mandatory standard | Board or delegated chief architect | Risk/security | Requesting team |

Write the decision-rights matrix down and publish it; ambiguity is the main source of governance friction.

## Principles and Standards

- **Principles**: few (8-12), stable, with rationale and implications. Example: "Prefer managed services over self-operated infrastructure. Rationale: operational load. Implication: self-hosting needs a documented reason."
- **Standards**: specific and testable ("Public APIs use OpenAPI 3.1 and OAuth 2.0 client credentials for service-to-service"). Classify as mandatory or recommended.
- **Guidelines and patterns**: reference implementations, templates, golden paths.

Tie each standard to the principle or risk it serves; retire standards that no longer matter.

## Architecture Decision Records (ADRs)

```markdown
# ADR-042: Use PostgreSQL for the order service
Date: 2026-03-14
Status: Accepted
Context: Orders need relational integrity and moderate write volume; team has Postgres experience.
Options: PostgreSQL (managed), DynamoDB, MongoDB
Decision: Managed PostgreSQL.
Consequences: Strong consistency and SQL; vertical scaling limits addressed by partitioning later.
Compliance: Fits standard DB-01 (approved data stores).
```

- Keep ADRs in the repository of the system they affect; index cross-cutting ADRs centrally.
- Superseded ADRs stay, with links to the replacement.
- ADRs are the primary evidence for reviews and audits.

## Review Tiers

| Tier | Trigger | Process | Turnaround target |
|------|---------|---------|-------------------|
| Self-service | Change within standards | Team checks guardrails/checklist; ADR if notable | None (no wait) |
| Peer/domain review | New service, new external API, significant data change | Async review by domain architect or guild | Days |
| Board review | New platform tech, exception to mandatory standard, high-risk/regulatory change | Scheduled board with written pre-read | Within a fixed cadence (e.g. weekly) |

Most changes should fall into self-service. If many reach the board, standards are unclear or too strict.

## Exceptions (Waivers)

Every exception records: standard affected, reason, risk assessment, compensating controls, owner, expiry date and remediation plan. Review expiring exceptions on a schedule; recurring exceptions to the same standard signal the standard needs to change.

## Fitness Functions

Automate checks where possible so governance happens in pipelines:
- Dependency rules (ArchUnit, dependency-cruiser, import-linter).
- API linting (Spectral rules for OpenAPI style guides).
- Policy as code for infrastructure (OPA/Conftest, Kyverno, cloud policies).
- Approved technology checks (allow-lists for base images, databases in IaC).
- Scorecards in the developer portal (ownership, SLOs defined, runbooks, security scans).

## Metrics

| Metric | Signal |
|--------|--------|
| Lead time for board decisions | Governance speed |
| Share of changes needing manual review | Clarity of standards |
| Number and age of open exceptions | Risk and standard fit |
| Tech radar "hold" technologies in production | Portfolio health |
| Teams' satisfaction with governance (survey) | Perceived value vs friction |
| Incidents linked to non-compliance | Effectiveness |

## Roles

- Chief/enterprise architect: owns principles, portfolio, board facilitation.
- Domain/solution architects: guide teams within domains; first-line reviewers.
- Engineering leads: accountable for decisions in their systems, write ADRs.
- Guilds/communities of practice: draft standards and patterns from practice.

## Checklist

- [ ] Decision-rights matrix published
- [ ] Principles with rationale and implications
- [ ] Standards classified mandatory/recommended and linked to principles
- [ ] ADR practice in every repository
- [ ] Tiered reviews with turnaround targets
- [ ] Exceptions with owner and expiry
- [ ] Automated fitness functions for key standards
- [ ] Governance metrics reviewed quarterly
