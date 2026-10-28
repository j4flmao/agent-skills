# Advanced Business Analysis: Modeling, Decisions, Business Cases, Traceability and Strategy

Advanced techniques for senior business analysts: process modeling with BPMN, decision modeling with DMN, data and domain modeling, value stream and capability mapping, business case construction, traceability in regulated environments, product discovery practices, and evaluating outcomes.

## Process Modeling (BPMN 2.0)

Use BPMN when handoffs, waiting and exceptions matter.

| Element | Use |
|---|---|
| Pools and lanes | Organizations and roles/systems |
| Events (start, intermediate, end; message, timer, error) | Triggers and outcomes |
| Tasks (user, service, manual, business rule) | Work steps |
| Gateways (exclusive XOR, parallel AND, inclusive OR, event-based) | Branching and merging |
| Message flows | Communication between pools |

Practices:
- Model at the level the audience needs (descriptive for business, executable detail only for workflow engines like Camunda).
- Show the happy path first; add exceptions explicitly (timeouts, rejections, errors).
- Measure: annotate tasks with volumes, cycle times and wait times to find bottlenecks.
- Validate with the people doing the work, not only managers.

## Decision Modeling (DMN)

Separate decisions from processes. A DMN decision table makes rules explicit and testable.

| Customer tier | Order total | Country | Shipping fee | Free returns |
|---|---|---|---|---|
| Gold | any | any | 0 | Yes |
| Standard | >= 100 | Domestic | 0 | No |
| Standard | < 100 | Domestic | 5.00 | No |
| Standard | any | International | 15.00 | No |

Hit policy (Unique, First, Priority, Collect) must be stated. Check completeness (every combination covered) and overlaps. Decision Requirements Diagrams link decisions to their input data and knowledge sources. Rules then become test cases and, where appropriate, executable rules.

## Data and Domain Modeling

- **Glossary first**: agree on terms (customer vs. account vs. user); ambiguity in nouns drives most rework.
- **Conceptual model**: entities and relationships with cardinalities, no technical detail.
- **State models**: lifecycle of key entities (order: draft -> submitted -> approved -> fulfilled -> closed; plus cancel paths).
- **CRUD matrix**: which process creates/reads/updates/deletes which entity; finds missing ownership.
- Align with domain-driven design: bounded contexts often map to departments with different meanings for the same word.

```
Customer 1 ---- * Order 1 ---- * OrderLine * ---- 1 Product
   |                 |
   1                 * Shipment
   |
   * Address
```

## Capability and Value Stream Mapping
- **Business capability map**: stable view of what the business does (e.g. "Manage Customer Orders"), independent of org chart and systems. Heat-map capabilities by maturity, cost or strategic importance to target investment.
- **Value stream map**: end-to-end stages that deliver value to a customer (e.g. "Order to Cash"), with lead time, process time and percent complete-and-accurate per stage.
- Combine: value stream stages enabled by capabilities, implemented by systems; reveals duplicated systems and gaps.

## Business Case Construction

| Section | Content |
|---|---|
| Problem/opportunity | Evidence and current-state cost |
| Options | Do nothing, minimal, recommended, alternatives |
| Benefits | Quantified (cost savings, revenue, risk reduction) and qualitative; owner per benefit |
| Costs | One-time (build, migration, training) and recurring (licenses, run, support) over the evaluation horizon |
| Financial analysis | NPV, IRR, payback period, sensitivity analysis |
| Risks and assumptions | With mitigations; key assumptions tested in sensitivity |
| Recommendation | Option with rationale |
| Measurement plan | Baselines, KPIs, when benefits are expected |

```
NPV = sum over t of (Benefits_t - Costs_t) / (1 + r)^t
```
State the discount rate and horizon used; show best/expected/worst scenarios rather than a single number.

## Traceability

Bidirectional links from business objectives to requirements, design, tests and releases:
```
Objective -> Business requirement -> Stakeholder requirement -> Solution requirement
          -> Design element / backlog item -> Test case -> Release / defect
```
| Context | Level of traceability |
|---|---|
| Regulated (medical devices, aviation, finance, pharma) | Formal matrix, change impact analysis, audit trail |
| Enterprise programs | Objective-to-epic-to-feature links in the tool (Jira, Azure DevOps, Jama, Polarion) |
| Small agile teams | Lightweight: story links to epic and tests |

Use traceability for impact analysis when requirements change, and to prove coverage of regulatory requirements.

## Product Discovery Practices for BAs
- **Opportunity solution tree**: outcome -> opportunities (customer needs/pains) -> solutions -> experiments.
- **Assumption mapping**: list desirability, viability, feasibility and usability assumptions; test the riskiest first.
- **Experiments**: prototypes, concierge tests, fake-door tests, A/B tests with predefined success criteria.
- **Jobs to be done**: frame needs as progress customers want to make in a circumstance.
- Continuous discovery: regular customer touchpoints, not only at project start.

## Requirements for AI/Data-Driven Features
- Define the decision the model supports and the cost of false positives vs. false negatives.
- Specify data sources, quality thresholds, refresh frequency and ownership.
- Non-functional: explainability needs, fairness constraints, human-in-the-loop points, monitoring for drift.
- Acceptance criteria on evaluation metrics measured on representative data, plus fallback behavior.

## Solution Evaluation
- Compare actual KPIs with the business case baselines at agreed checkpoints.
- Analyze gaps: adoption (training, UX), solution limitations, or wrong assumptions.
- Recommend: enhance, retire, or change the business process.
- Feed lessons into future estimates and benefit assumptions.

## Facilitation at Scale
- Large workshops: clear objective and output, pre-reads, timeboxes, parking lot, decision log.
- Conflict resolution: separate positions from interests; use criteria agreed in advance for trade-offs.
- Remote collaboration: shared whiteboards, async reviews of models with comment deadlines.

## Checklist
- [ ] Processes modeled with exceptions and measured bottlenecks
- [ ] Decisions extracted into DMN tables with hit policies and completeness checks
- [ ] Glossary and conceptual data model agreed
- [ ] Capabilities and value streams used to target investment
- [ ] Business case with NPV, sensitivity and benefit owners
- [ ] Traceability level matched to regulatory context
- [ ] Riskiest assumptions tested before full build
- [ ] Outcomes evaluated against baselines after release
