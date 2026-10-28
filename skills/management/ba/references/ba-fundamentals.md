# Business Analysis Fundamentals

Business analysis is the practice of enabling change by defining needs and recommending solutions that deliver value to stakeholders. This reference covers the BA role, the BABOK v3 knowledge areas and core concepts, requirement types and quality criteria, key deliverables, and how BA work fits agile and plan-driven delivery. Elicitation techniques, requirements management, Gherkin, story splitting and story mapping have dedicated sibling references.

## The BA Role

| Responsibility | Examples |
|---|---|
| Understand the problem | Current-state analysis, root cause, stakeholder needs |
| Define the future state | Goals, scope, capabilities, success measures |
| Elicit and analyze requirements | Workshops, interviews, process and data models |
| Communicate and align | Facilitate decisions, resolve conflicts, keep traceability |
| Support delivery | Refine backlog, clarify acceptance criteria, answer questions |
| Evaluate the solution | Verify outcomes against success measures after release |

BAs focus on **why** and **what**; solution design and implementation decide **how**, in collaboration.

## BABOK v3 Framework

### Business Analysis Core Concept Model (BACCM)
| Concept | Question |
|---|---|
| Change | What is being transformed? |
| Need | What problem or opportunity drives it? |
| Solution | What specific way satisfies the need? |
| Stakeholder | Who is affected or has influence? |
| Value | What worth does it deliver, to whom? |
| Context | What circumstances influence the change? |

A good analysis can answer all six for any initiative.

### Knowledge areas
| Knowledge area | Focus |
|---|---|
| Business Analysis Planning and Monitoring | Approach, stakeholder engagement, governance, information management |
| Elicitation and Collaboration | Preparing, conducting and confirming elicitation; communicating; managing stakeholder collaboration |
| Requirements Life Cycle Management | Tracing, maintaining, prioritizing, assessing changes, approving |
| Strategy Analysis | Current state, future state, risks, change strategy |
| Requirements Analysis and Design Definition | Specifying/modeling, verifying, validating, architecture, design options, recommending solutions |
| Solution Evaluation | Measuring performance, analyzing limitations, recommending actions |

## Requirement Types

| Type | Description | Example |
|---|---|---|
| Business requirement | Goal or objective of the organization | "Reduce order-handling cost by 20% within 12 months" |
| Stakeholder requirement | Needs of a stakeholder group | "Warehouse staff need to see pick lists by zone" |
| Solution requirement: functional | Behavior the solution must provide | "The system shall generate a pick list sorted by bin location" |
| Solution requirement: non-functional | Quality attributes and constraints | "Pick list generation completes within 2 seconds for 500 lines" |
| Transition requirement | Temporary needs to move to the future state | "Migrate open orders from the legacy system before cutover" |

Non-functional categories: performance, availability, security, privacy, usability, accessibility, scalability, maintainability, compliance.

## Quality of Requirements

| Criterion | Check |
|---|---|
| Atomic | One requirement per statement |
| Complete | Enough detail to design and test |
| Consistent | No conflicts with other requirements |
| Concise | No unnecessary content |
| Feasible | Achievable within constraints |
| Unambiguous | One interpretation; avoid "fast", "user-friendly", "etc." |
| Testable | Verifiable by inspection, analysis, demonstration or test |
| Prioritized | Relative importance known |
| Understandable | Readable by its audience |

Rewrite example: "The system should be fast" -> "Search results return within 1 second at the 95th percentile for catalogs up to 1 million products."

## Core Deliverables

| Deliverable | When useful |
|---|---|
| Business case | Justify investment: problem, options, costs, benefits, risks |
| Stakeholder map / RACI | Early, for engagement planning |
| Current/future process models (BPMN) | Process change |
| Context diagram, scope statement | Define boundaries |
| Data model / glossary | Shared vocabulary, data-heavy work |
| Use cases or user stories with acceptance criteria | Functional detail |
| Non-functional requirements list | Quality attributes |
| Business rules catalog / decision tables | Rule-heavy domains |
| Traceability matrix | Regulated or large programs |
| Solution evaluation report | After release |

## Prioritization Techniques
| Technique | Use |
|---|---|
| MoSCoW (Must, Should, Could, Won't this time) | Release scoping with stakeholders |
| Value vs. effort matrix | Quick triage |
| WSJF (cost of delay / job duration) | Flow-based portfolios (SAFe) |
| Kano model | Distinguish basic, performance and delight features |
| RICE (reach, impact, confidence, effort) | Product feature comparison |

## BA in Agile vs. Plan-Driven Work

| Aspect | Plan-driven | Agile |
|---|---|---|
| Timing | Most analysis up front | Just enough, just in time, continuous |
| Artifacts | Detailed requirements specification | Backlog items, acceptance criteria, models as needed |
| Change | Formal change control | Backlog reprioritization |
| BA position | Often separate phase/team | Embedded with the team, often alongside the product owner |

The Agile Extension to BABOK and IIBA's guidance describe analysis at strategy (why), initiative (what), and delivery (detail) horizons.

## Working with Stakeholders
- Identify stakeholders by influence and interest; plan engagement accordingly.
- Confirm understanding in writing (summaries, models) after each session.
- Separate needs from proposed solutions ("we need a report" -> what decision does the report support?).
- Make trade-offs explicit and documented.

## Certification Paths (for orientation)
IIBA (ECBA, CCBA, CBAP; specializations such as Agile Analysis and Product Ownership Analysis), PMI-PBA, and BCS business analysis qualifications.

## Checklist
- [ ] Need, value and stakeholders defined (BACCM)
- [ ] Requirements typed (business, stakeholder, solution, transition)
- [ ] Each requirement unambiguous, testable and prioritized
- [ ] Non-functional requirements captured with measurable targets
- [ ] Models chosen to fit the problem (process, data, rules)
- [ ] Success measures defined for solution evaluation
