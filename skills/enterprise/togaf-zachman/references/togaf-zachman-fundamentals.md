# TOGAF and Zachman Fundamentals: What Each Framework Is and How They Fit Together

TOGAF and the Zachman Framework are the two most cited enterprise architecture (EA) frameworks, but they answer different questions. TOGAF is a method (how to develop and govern architecture); Zachman is an ontology (how to classify architecture descriptions). This reference explains the core concepts of each, the vocabulary, how they complement each other and how to start. Detailed ADM phases, content, governance and Zachman cell analysis are in sibling references.

## Enterprise Architecture in One Paragraph

Enterprise architecture describes how an organization's business capabilities, information, applications and technology fit together today, what they should look like in the future, and how to get there. Its value comes from better investment decisions, reduced duplication, managed risk and faster, coherent change, not from producing diagrams.

## TOGAF at a Glance

The TOGAF Standard is published by The Open Group. The current version, the TOGAF Standard, 10th Edition (2022), is split into the **Fundamental Content** (stable core) and **Series Guides** (practical guidance on topics such as business architecture, security, agile and digital).

| Component | Purpose |
|-----------|---------|
| Architecture Development Method (ADM) | Iterative cycle for developing and managing architecture |
| ADM techniques | Stakeholder management, gap analysis, architecture principles, business scenarios, capability-based planning, risk management |
| Architecture Content Framework and Enterprise Metamodel | Standard deliverables, artifacts and building blocks, and the entities and relationships between them |
| Enterprise Continuum and Architecture Repository | Classification of architecture assets from generic to organization-specific, and where they are stored |
| Architecture Capability | How to set up and run an architecture practice (organization, skills, governance) |

### The ADM Cycle

```text
              Preliminary
                   |
          A. Architecture Vision
         /                      \
H. Architecture             B. Business Architecture
   Change Management              |
   |                         C. Information Systems Architectures (Data, Application)
G. Implementation                 |
   Governance                D. Technology Architecture
         \                        |
          F. Migration Planning - E. Opportunities and Solutions
                   (Requirements Management at the center, feeding every phase)
```

| Phase | Key output |
|-------|------------|
| Preliminary | Architecture capability, principles, tailored framework |
| A Vision | Scope, stakeholders, high-level target, Statement of Architecture Work |
| B, C, D | Baseline and target architectures per domain, gap analysis |
| E | Solution options, work packages, transition architectures |
| F | Implementation and migration plan |
| G | Architecture contracts, compliance reviews during delivery |
| H | Change management of the architecture as the business evolves |
| Requirements Management | Continuous capture and change of requirements |

The ADM is meant to be **tailored** and iterated (across phases and at different levels: strategic, segment, capability), not executed as a linear waterfall.

### Building Blocks

- **Architecture Building Block (ABB)**: a required capability described independently of implementation (for example "customer identity verification").
- **Solution Building Block (SBB)**: a concrete product or component that realizes ABBs (for example a specific identity platform).

## Zachman at a Glance

The Zachman Framework (current version 3.0, John Zachman, 2011) is a 6x6 classification schema. Columns are the basic interrogatives; rows are audience perspectives, each a different transformation of the enterprise.

| Row (perspective) | What | How | Where | Who | When | Why |
|-------------------|------|-----|-------|-----|------|-----|
| Executive (scope contexts) | Inventory identification | Process identification | Distribution identification | Responsibility identification | Timing identification | Motivation identification |
| Business management (business concepts) | Inventory definition | Process definition | Distribution definition | Responsibility definition | Timing definition | Motivation definition |
| Architect (system logic) | Inventory representation | Process representation | Distribution representation | Responsibility representation | Timing representation | Motivation representation |
| Engineer (technology physics) | Inventory specification | Process specification | Distribution specification | Responsibility specification | Timing specification | Motivation specification |
| Technician (tool components) | Inventory configuration | Process configuration | Distribution configuration | Responsibility configuration | Timing configuration | Motivation configuration |
| Enterprise (operations instances) | Inventory instantiations | Process instantiations | Distribution instantiations | Responsibility instantiations | Timing instantiations | Motivation instantiations |

Key rules:
- Each cell holds a **primitive** model: one interrogative from one perspective.
- Columns have no order of priority; each is equally important.
- Composite models (most real diagrams) combine several cells; Zachman's point is that primitives must exist to build reliable composites.
- Zachman does not prescribe a process, tools or deliverable sequence.

## TOGAF vs Zachman

| Aspect | TOGAF | Zachman |
|--------|-------|---------|
| Type | Method + content framework + capability guidance | Ontology / classification schema |
| Answers | How do we develop, plan and govern architecture? | What descriptions exist and how are they organized? |
| Process | ADM | None |
| Artifacts | Defined catalogs, matrices, diagrams | Any model, classified by cell |
| Governance | Explicit (architecture board, contracts, compliance) | Not covered |
| Typical use | Running an EA practice and transformation programs | Checking completeness and consistency of descriptions |

They are complementary: use the ADM to run the work and Zachman to check that the descriptions produced cover the necessary interrogatives and perspectives.

## Key Vocabulary

| Term | Meaning |
|------|---------|
| Stakeholder / concern | Party with interest in the system; their concerns drive which views are produced |
| View / viewpoint (ISO/IEC/IEEE 42010) | A view addresses concerns; a viewpoint defines how to construct that kind of view |
| Baseline / target architecture | Current state / desired future state |
| Transition architecture | Intermediate, implementable state between baseline and target |
| Gap analysis | Differences between baseline and target: what to add, change or retire |
| Architecture principle | Enduring rule guiding decisions (name, statement, rationale, implications) |
| Capability | What the business does or can do, independent of how (organization, process, technology) |
| Architecture repository | Store of models, standards, decisions and reference architectures |

## Getting Started

1. Identify the decision you need EA to support (for example application rationalization, cloud migration, merger integration).
2. Define a small set of architecture principles with business sponsorship.
3. Build a **capability map** (level 1 to 2) and map applications to capabilities: it immediately exposes duplication and gaps.
4. Run one lightweight ADM iteration for the chosen scope: vision, baseline/target for the relevant domains, gap analysis, roadmap.
5. Use the Zachman grid as a checklist: which interrogatives and perspectives does your target description cover? What is missing (often "Who", "When" and "Why")?
6. Set up minimal governance: architecture review for significant changes, decision records.

## Certification and Literacy

The Open Group offers TOGAF certifications (Enterprise Architecture Foundation and Practitioner levels for the 10th Edition). Certification signals vocabulary, not effectiveness; practice and stakeholder outcomes matter more.

## Common Misconceptions

| Misconception | Reality |
|---------------|---------|
| TOGAF must be implemented fully | It is explicitly meant to be tailored |
| ADM is waterfall | Phases iterate and can run at different levels and speeds |
| Zachman is a methodology | It is a classification schema; it does not say what to do first |
| EA is about documenting everything | Document what supports decisions; keep it current |
| Frameworks replace architects' judgment | They provide structure; judgment and stakeholder work remain essential |

## Checklist

- [ ] Purpose of EA effort tied to concrete business decisions
- [ ] Architecture principles agreed with sponsors
- [ ] Capability map as the anchoring artifact
- [ ] ADM tailored to scope and cadence
- [ ] Zachman used to check completeness of descriptions
- [ ] Minimal governance and a repository in place
