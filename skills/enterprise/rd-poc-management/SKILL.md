# R&D and Proof of Concept (PoC) Management

## 1. Skill Context
**Focus**: Managing the lifecycle of technological innovation, validating hypotheses rapidly, and successfully transitioning experimental code (PoC) into enterprise-grade production software.
**Triggers**: r&d, poc, prototype, mvp, architecture, adr, innovation, enterprise-rd.

## 2. The "Valley of Death"
In enterprise environments, there is a notorious "Valley of Death" between the R&D Department and Global Operations. 
- A Department builds a brilliant PoC in 3 weeks. It works perfectly in isolation.
- Global Operations rejects the PoC because it lacks monitoring, uses unapproved databases, fails compliance checks, and is undocumented.
- The PoC dies, and the Department's innovation effort is wasted.

This skill path provides the architectural and procedural patterns required to bridge that valley.

## 3. Core Principles of R&D
- **Hypothesis-Driven Engineering**: A PoC is not the first draft of an application. It is an experiment designed to answer a specific technical or business question (e.g., "Can Kafka handle 100k events/sec on our current hardware?").
- **Documented Context**: R&D decisions often look crazy to outsiders. Documenting *why* a decision was made (using ADRs) is more important than the code itself.
- **Strict Timeboxing**: A PoC must have a hard deadline. If it takes 6 months, it is not a PoC; it is a shadow IT project.

## 4. References
- `references/architecture-decision-records.md` — How to write and manage ADRs.
- `references/build-vs-buy.md` — Framework for Technology Selection.
- `references/poc-success-criteria.md` — Defining NFRs and exit criteria.
- `references/throwaway-vs-evolutionary.md` — Architecture strategies for prototypes. (Batch 2)
- `references/sandbox-environments.md` — Cloud isolation and safety. (Batch 2)
- `references/api-contract-mocking.md` — Unblocking development. (Batch 2)
- `references/poc-to-mvp-handoff.md` — The Global transition process. (Batch 3)
- `references/retrofitting-security.md` — Paying back technical debt. (Batch 3)
