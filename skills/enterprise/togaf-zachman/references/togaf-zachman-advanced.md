# TOGAF and Zachman Advanced: Combined Use, Agile Tailoring, ArchiMate Modeling, Capability-Based Planning and EA Value

Advanced practice for architecture teams that already know the basics: using Zachman and TOGAF together, tailoring the ADM for agile delivery, modeling with ArchiMate, capability-based planning and portfolio decisions, architecture repository design, and measuring EA value. ADM phase details, governance and the Zachman cell catalog are in sibling references.

## Using Zachman and TOGAF Together

A practical division of labor:

| Activity | Framework |
|----------|-----------|
| Plan and run architecture work (scope, phases, iterations, governance) | TOGAF ADM |
| Decide which descriptions a phase must produce | Zachman: map required views to rows/columns |
| Check completeness of a target architecture | Zachman: are all interrogatives covered at the needed perspectives? |
| Define artifact types and relationships | TOGAF Content Framework / Enterprise Metamodel |
| Model notation | ArchiMate |

Mapping ADM phases to Zachman rows (approximate):

| ADM phase | Dominant Zachman rows |
|-----------|----------------------|
| Preliminary, A (Vision) | Executive (scope contexts), Why column emphasized |
| B (Business) | Business management (business concepts) |
| C (Data, Application) | Architect (system logic) |
| D (Technology) | Engineer (technology physics) |
| E, F (Solutions, Migration) | Engineer and Technician (tool components), When column emphasized |
| G (Implementation governance) | Technician, Enterprise (operations instances) |

Use the mapping to spot imbalance: many architecture repositories are rich in "What" and "How" at the architect row but have weak "Why" (motivation, principles, goals) and "When" (events, timing), which leads to designs disconnected from strategy.

## Tailoring the ADM for Agile Delivery

The TOGAF Series Guide on agile approaches positions architecture at three levels:

| Level | Horizon | Cadence | Output |
|-------|---------|---------|--------|
| Strategic | Years | Annual / semi-annual refresh | Target state, principles, capability roadmap |
| Segment / portfolio | Quarters | Quarterly (aligned with portfolio planning) | Segment targets, transition architectures, epics |
| Capability / solution | Weeks | Per increment or sprint | Just-enough design, decisions, guardrails |

Practices:
- **Architecture runway**: deliver enabling architecture work as backlog items ahead of feature needs.
- **Guardrails over gates**: publish principles, standards and reference architectures that teams apply themselves; reserve reviews for high-impact decisions.
- **Architecture decision records (ADRs)** in team repositories, indexed in the architecture repository.
- **Fitness functions**: automated checks (dependency rules, security policies, performance budgets) that verify architectural properties continuously.
- **Transition architectures** sized to release cycles so value is delivered incrementally.
- Requirements Management becomes backlog management with architectural significance tagging.

## ArchiMate Modeling

ArchiMate (The Open Group; version 3.2 published 2022) is the modeling language commonly paired with TOGAF.

| Layer / aspect | Example elements |
|----------------|------------------|
| Strategy | Capability, value stream, resource, course of action |
| Motivation | Stakeholder, driver, goal, outcome, principle, requirement, constraint |
| Business | Business actor, role, process, function, service, business object |
| Application | Application component, application service, interface, data object |
| Technology | Node, device, system software, technology service, artifact, communication network |
| Implementation and migration | Work package, deliverable, plateau, gap |

Mapping to TOGAF and Zachman:
- Motivation elements cover Zachman's "Why"; plateaus and gaps support ADM phases E and F (transition architectures and gap analysis).
- Business, application and technology layers align with ADM phases B, C and D.

Modeling discipline:
- Define a small set of viewpoints for your stakeholders (capability map, application landscape, application cooperation, technology deployment, migration roadmap) instead of using every element type.
- Maintain a single model repository (Archi with coArchi, or a commercial EA tool) rather than disconnected drawings.
- Exchange models using the Open Group ArchiMate Model Exchange File Format where tools differ.

## Capability-Based Planning

Capability-based planning links strategy to investment:

```text
Strategy / goals -> required capabilities -> capability assessment (maturity, gaps)
   -> increments of capability (people, process, information, technology)
   -> work packages / initiatives -> portfolio prioritization -> roadmap
```

| Step | Practice |
|------|----------|
| Capability map | Stable, business-owned decomposition (levels 1 to 3); no org chart, no application names |
| Heat mapping | Rate each capability on strategic importance, current performance, risk, cost |
| Application mapping | Map applications to capabilities to find redundancy, gaps and risk (end-of-support technology) |
| Value streams | Show how capabilities combine to deliver value to stakeholders; prioritize where value stream stages are weak |
| Increments | Define capability increments with measurable outcomes |
| Portfolio | Feed prioritized increments into investment decisions; track realized outcomes |

Application rationalization uses the same base, often with TIME classification (Tolerate, Invest, Migrate, Eliminate) per application based on business fit and technical health.

## Architecture Repository Design

| Repository area (TOGAF) | Practical contents |
|-------------------------|--------------------|
| Architecture metamodel | Element and relationship types you actually use, with definitions |
| Architecture capability | Team charter, processes, roles |
| Architecture landscape | Current and target models at strategic, segment and capability levels |
| Standards information base | Technology standards with lifecycle status (adopt, trial, hold, retire) |
| Reference library | Reference architectures, patterns, templates |
| Governance log | Decisions, compliance assessments, dispensations (exceptions) |

Keep the repository trustworthy:
- Assign owners per domain and per model.
- Integrate with operational sources (CMDB, cloud inventories, service catalogs like Backstage) so landscapes are populated automatically where possible.
- Show data freshness; stale models destroy trust faster than missing ones.

## Security and Risk Integration

- The TOGAF Series Guide on integrating risk and security, and alignment with SABSA, embeds security concerns in each ADM phase (security principles in Preliminary, threat and risk assessment in B to D, security work packages in E and F, compliance in G).
- In Zachman terms, security spans all columns (asset classification in What, control processes in How, trust zones in Where, roles and responsibilities in Who, events in When, risk appetite in Why).
- Map controls to frameworks the organization must comply with (ISO/IEC 27001, NIST CSF 2.0) inside the repository to support audits.

## Measuring EA Value

| Category | Example measures |
|----------|------------------|
| Portfolio | Number of redundant applications retired; % of spend on strategic capabilities |
| Risk | Applications on unsupported technology; time to remediate architecture-related findings |
| Delivery | Lead time for architecture decisions; % of initiatives with approved target architecture before funding |
| Reuse | Adoption of reference architectures and shared platforms |
| Stakeholder | Satisfaction of business and delivery leaders with architecture support |

Report outcomes, not artifact counts. Tie measures to the decisions EA was set up to support.

## Anti-Patterns

| Anti-pattern | Remedy |
|--------------|--------|
| Ivory tower architecture disconnected from delivery | Architects embedded with delivery; guardrails and runway |
| Framework fundamentalism (every phase, every artifact) | Tailor; produce only views that answer stakeholder concerns |
| Repository as a graveyard | Ownership, automated population, freshness indicators |
| Capability map mirroring the org chart | Capabilities are stable "what", independent of structure |
| Governance as a late gate | Early engagement; lightweight reviews scaled to risk |
| Zachman used as a mandatory deliverable checklist for all 36 cells | Use it to check coverage for the decision at hand |

## Checklist

- [ ] ADM tailored to strategic, segment and capability levels with matching cadences
- [ ] Zachman coverage check applied to target architectures (including Why and When)
- [ ] ArchiMate viewpoints chosen per stakeholder; single model repository
- [ ] Capability map, heat map and application mapping driving portfolio decisions
- [ ] Repository owned, integrated with operational inventories, freshness visible
- [ ] Security and risk embedded across ADM phases
- [ ] EA value measured by outcomes
