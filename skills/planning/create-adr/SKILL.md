---
name: create-adr
description: >
  Use this skill when the user says 'architecture decision', 'ADR', 'document this decision', 'why did we choose', 'record architecture choice', 'tech decision', or when a PRD exists and technology choices need to be documented. This skill records every significant technical decision with context, alternatives considered, rationale, and consequences. Uses MADR format. One ADR per decision. Do NOT use for: implementation details, code reviews, daily notes, or decisions that are already obvious or trivial.
version: "2.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [planning, phase-1, architecture, documentation]
---

# Create ADR

## Purpose
Document significant technical decisions with full context, alternatives considered, rationale, and consequences. One ADR file per decision. ADRs serve as the institutional memory of why the system is built the way it is, preventing repeated debates and providing context for future architects. A well-maintained ADR log is the single source of truth for architectural rationale — it answers "why did we do it this way?" faster than any code comment or wiki page.

## Architecture/Decision Trees

### Should You Write an ADR?
```
Is this a significant technical decision with lasting impact?
  |-- YES --> Does it affect architecture, data model, or system behavior?
  |     |-- YES --> Does it have multiple valid alternatives?
  |     |     |-- YES --> WRITE AN ADR
  |     |     |-- NO  --> Skip (trivial decision)
  |     |-- NO --> Skip (operational detail)
  |-- NO --> Is the rationale non-obvious?
        |-- YES --> WRITE AN ADR
        |-- NO --> Skip

Is this decision likely to be questioned or revisited later?
  |-- YES --> WRITE AN ADR (preempt future debates)
  |-- NO --> Is there a significant cost to reversing?
        |-- YES --> WRITE AN ADR
        |-- NO --> Skip

Does this decision affect multiple teams or systems?
  |-- YES --> WRITE AN ADR (coordination artifact)
  |-- NO --> Is it a binding constraint for future work?
        |-- YES --> WRITE AN ADR
        |-- NO --> Skip
```

### ADR Status Lifecycle
```
[Proposed] ----> [Accepted] ----> [Superseded by ADR-NNN]
    |                |
    |                └--> [Deprecated]
    └--> [Rejected]

[Proposed]: Under review, not yet binding
[Accepted]: Approved and binding
[Deprecated]: Still valid but should not be used for new work
[Superseded]: Replaced by a newer decision
[Rejected]: Considered and explicitly not chosen
```

### Decision Urgency Matrix
```
                            HIGH IMPACT
                                |
                    +---------------------+
                    |                     |
         IMMEDIATE  |   ADR NOW + PR     |   ADR WITHIN SPRINT
                    |   decision made     |   needs more research
                    |   block PR until    |   timebox investigation
                    |   ADR is written    |
                    +---------------------+
                    |                     |
         CAN WAIT   |   ADR THIS ITER    |   ADR NEXT ITER
                    |   high impact but   |   low urgency
                    |   not blocking      |   document before work
                    +---------------------+
                                |
                            LOW IMPACT
```

### ADR Depth Decision Tree
```
What kind of decision is this?
  |-- TECHNOLOGY SELECTION --> Focus on: comparison matrix, migration path, licensing, team familiarity
  |-- ARCHITECTURE PATTERN --> Focus on: trade-offs, complexity cost, alignment with existing system
  |-- API/PROTOCOL DESIGN --> Focus on: compatibility, versioning, consumer impact, migration strategy
  |-- SECURITY/COMPLIANCE --> Focus on: threat model, regulatory requirements, audit trail
  |-- DEPLOYMENT/OPS --> Focus on: availability, disaster recovery, cost, operational burden
  |-- DATA MODEL --> Focus on: consistency guarantees, query patterns, migration complexity

How certain is the decision?
  |-- HIGH CONFIDENCE --> Accept directly, document rationale
  |-- MEDIUM CONFIDENCE --> Mark as Proposed, set review date, identify unknowns
  |-- LOW CONFIDENCE --> Mark as Proposed, define research timebox, list open questions
```

## Agent Protocol

### Trigger
Exact user phrases: "architecture decision", "ADR", "document this decision", "why did we choose", "record architecture choice", "tech decision", "write an ADR", "record decision".

### Input Context
Before activating, verify:
- `docs/decisions/` directory exists. If not, create it.
- Check existing ADRs for numbering: read `docs/decisions/` and find the highest NNN number. New ADR is NNN+1.
- If user gives a specific decision to document, use that. If not, read `docs/prd.md` and `docs/brief.md` to identify decisions that need recording.
- Check for related existing ADRs that may conflict with or supersede the new decision.

### Output Artifact
Writes to `docs/decisions/ADR-{NNN}-{kebab-case-title}.md`.

### Response Format
After saving, output exactly:
```
ADR-{NNN}: {title}
Status: {Proposed/Accepted}
Saved to docs/decisions/ADR-{NNN}-{kebab-case-title}.md
```

### Completion Criteria
- [ ] At least 2 alternatives considered per decision (including "do nothing" when applicable).
- [ ] Each alternative has pros AND cons evaluated.
- [ ] Chosen option has explicit rationale (2-3 sentences minimum).
- [ ] Consequences documented (positive, negative, and mitigation).
- [ ] File saved with correct auto-incremented NNN.
- [ ] No implementation code in the ADR.
- [ ] Relationship to existing ADRs documented (supersedes, extends, conflicts).
- [ ] Compliance mechanism specified for enforcement.

### Max Response Length
Confirmation: 4 lines maximum. ADR content: unlimited in file, do not echo back in chat unless asked.

## Workflow

### Step 1: Identify Decision Scope
If the user gave a specific decision, use it. Otherwise, read `docs/prd.md` and identify pending decisions:
- Database technology (PostgreSQL vs MySQL vs MongoDB vs CockroachDB)
- API style (REST vs GraphQL vs gRPC vs WebSockets)
- Authentication method (JWT vs Session vs OAuth/OIDC vs WebAuthn)
- Frontend framework (Server Components vs Client Components vs SSR)
- State management approach (Redux vs Zustand vs Jotai vs Context API)
- Deployment model (self-hosted vs cloud vs hybrid)
- Message broker choice (Kafka vs RabbitMQ vs SQS vs NATS)
- Caching strategy (Redis vs Memcached vs CDN vs multi-tier)

### Step 2: List Alternatives
For each decision, list 2-4 realistic alternatives. Always include the "not doing this" option when it is a valid baseline.

**Alternative selection criteria**:
- Include at least one mainstream option (low risk, well-understood)
- Include at least one modern/emerging option (higher reward, higher risk)
- Include the "do nothing" or "keep existing" option when applicable
- Exclude options that are clearly non-viable (no team expertise, no ecosystem, budget-prohibitive)

### Step 3: Evaluate Each Alternative
For each alternative, document:
- **Pros**: specific strengths, minimum 2, tied to project context
- **Cons**: specific weaknesses, minimum 2
- **Key tradeoffs**: what you gain vs what you lose
- **Risk assessment**: likelihood and impact of downsides
- **Fit score**: how well this aligns with project constraints (team skills, timeline, budget)

**Evaluation template**:
```markdown
### {Option Name}
**Pros:**
- {pro specific to this project's context}
- {pro related to team/cost/timeline}

**Cons:**
- {con with mitigation feasibility noted}
- {con related to learning curve or migration}

**Risk:** Low/Medium/High — {one-sentence justification}
**Fit:** {score}/10 — {one-sentence summary}
```

### Step 4: State Decision and Rationale
```markdown
# ADR-{NNN}: {Decision Title}

## Status
Accepted

## Context
{Describe the problem, background, and forces that led to this decision. Include relevant constraints, business context, and technical environment. 3-5 sentences. Frame the decision in terms of the problem it solves, not the technology it chooses.}

## Decision
{State the decision clearly and precisely. "We will use {X} for {purpose} because {primary reason}."}

## Rationale
{2-3 sentences explaining why this is the best choice given the context. Reference specific pros/cons from the evaluation.}

## Consequences

### Positive
- {specific benefit with expected magnitude}
- {specific benefit}

### Negative
- {specific tradeoff with mitigation}
- {specific risk with mitigation}

### Mitigation
- {how we address the negative consequences}
- {contingency plan if assumption proves wrong}

## Compliance
{How we ensure this decision is followed: code review checks, lint rules, architecture tests, automated enforcement, or team agreements.}

## Alternatives Considered

### {Alternative 1}
**Pros:** {list}
**Cons:** {list}
**Why not chosen:** {1 sentence with primary reason}

### {Alternative 2}
**Pros:** {list}
**Cons:** {list}
**Why not chosen:** {1 sentence with primary reason}

## Related ADRs
- Supersedes: {ADR-NNN if applicable}
- Extended by: {ADR-NNN if applicable}
- Conflicts with: {ADR-NNN if applicable}
```

### Step 5: Save
Write to `docs/decisions/ADR-{NNN}-{kebab-case-title}.md`.

**File naming convention**: `ADR-{NNN}-{kebab-case-title}.md`. Use kebab-case descriptive titles. Title should summarize the decision, not the question. Good: `ADR-012-use-postgresql-for-primary-database.md`. Bad: `ADR-012-which-database-should-we-use.md`.

### Step 6: Update Decision Log Index
If `docs/decisions/README.md` exists, append the new ADR entry. If not, create an index file with:
```markdown
# Decision Log

| ADR | Title | Status | Date |
|-----|-------|--------|------|
| 001 | {title} | Accepted | {date} |
| 002 | {title} | Superseded by 005 | {date} |
```

## Rules
- One ADR per decision. Do not combine multiple decisions into one file.
- Be impartial when listing alternatives. Do not write pros/cons that favor the chosen option.
- ADRs are immutable once accepted. If a decision changes, write a new ADR that supersedes the old one. Update old ADR status to "Superseded by ADR-NNN."
- If the decision is obvious (e.g., "use HTTPS"), do not create an ADR. Reserve ADRs for non-trivial decisions.
- Include compliance mechanism for every decision. If you cannot enforce it, it is not a real decision.
- Keep context concise but complete — a future team member should understand the situation without external references.
- Avoid temporal language like "currently" or "at this time" — ADRs should remain valid indefinitely.
- Do not include code snippets, configuration files, or implementation details in ADRs.
- Every ADR must have at least one alternative that was seriously considered and rejected.
- If a decision is reversed, the superseding ADR must explain why the original decision no longer applies.

## Best Practices
- Write ADRs as soon as a decision is made, not weeks later when context is lost.
- Include the decision's relationship to other ADRs (supersedes, extends, conflicts with).
- Use diagrams (C4, decision trees, comparison matrices) to illustrate complex trade-offs.
- Review ADRs in the same PR as the implementation code — decision and implementation should ship together.
- Link ADRs to relevant stories or tickets for traceability.
- Keep a decision log index (README in `docs/decisions/`) for navigation.
- Use Y-Statements for extremely consequential decisions: "In the context of {situation}, facing {problem}, we decided for {option} to achieve {outcome}, accepting {downside}."
- Review and prune the decision log quarterly — mark superseded and deprecated ADRs.
- Assign a decision owner who is accountable for the outcome.
- Include measurable success criteria when possible: "This ADR is successful if p95 latency stays under 200ms."

## Decision-Making Frameworks

### Weighted Decision Matrix
| Criterion | Weight | Option A | Option B | Option C |
|-----------|--------|----------|----------|----------|
| Team expertise | 25% | 8 (2.0) | 5 (1.25) | 3 (0.75) |
| Ecosystem maturity | 20% | 9 (1.8) | 7 (1.4) | 4 (0.8) |
| Operational cost | 20% | 7 (1.4) | 6 (1.2) | 8 (1.6) |
| Performance | 15% | 6 (0.9) | 8 (1.2) | 9 (1.35) |
| Scalability | 10% | 5 (0.5) | 7 (0.7) | 9 (0.9) |
| Migration effort | 10% | 8 (0.8) | 6 (0.6) | 5 (0.5) |
| **Total** | **100%** | **7.4** | **6.35** | **5.9** |

### Cost of Delay Framework
```
Decision urgency = Value per time unit * (1 - Risk)
High urgency --> ADR required immediately
Low urgency  --> ADR within sprint is acceptable
```

### Technology Radar Classification
| Ring | Meaning | ADR Required? |
|------|---------|---------------|
| Adopt | Proven, recommended | If high impact |
| Trial | Promising, low risk | Yes |
| Assess | Worth exploring | Yes |
| Hold | Proceed with caution | Yes |

## Common Pitfalls

### 1. Documenting Obvious Decisions
Not every choice needs an ADR — reserve for non-trivial, consequential decisions with alternatives worth recording. Test: "Would a new team member in 6 months benefit from knowing why this choice was made?" If no, skip it.

### 2. Biased Alternatives
Writing pros/cons that clearly favor the chosen option undermines the ADR's value as an objective record. Ask someone who disagrees with the decision to review the alternatives section.

### 3. Missing Rationale
Stating the decision without explaining why it was made. The rationale is the most important part. A good rationale references specific constraints: "We chose X because our team has 5 years of experience with it, reducing time-to-market by an estimated 3 months."

### 4. No Compliance Mechanism
Without enforcement, an ADR is a wish rather than a decision. Compliance can be automated (lint rules, arch tests) or social (code review checklists). If neither is possible, the decision may not be enforceable.

### 5. Combining Multiple Decisions
One ADR per decision keeps the decision log clean and referenceable. If an ADR contains "and" in the title, it is probably two decisions.

### 6. Stale ADRs
ADRs that are superseded or rejected must have their status updated immediately. A stale ADR log is worse than no ADR log — it actively misleads.

### 7. Decision Without Stakeholder Input
Key decisions affect multiple teams. If a database choice affects data engineers, involve them. If API style affects mobile developers, involve them. ADRs written in isolation are more likely to be reversed.

### 8. Analysis Paralysis
Some decisions have diminishing returns on analysis. Use timeboxing: small decisions get 30 minutes of analysis, medium decisions get 1-2 hours, critical decisions get 4-8 hours. Beyond that, write down what you know and decide.

### 9. Ignoring Migration Cost
The best technology choice may be the one with the lowest switching cost rather than the best raw score. Always consider: "What does it cost to move from our current approach?"

### 10. Temporal Coupling
Decisions made in isolation that assume a specific future state. "We'll use X because when we need Y, we can Z" — validate that Z is actually feasible before accepting this reasoning.

## Process Patterns

### Pattern 1: Decision Spike
**When**: Decision has 3+ viable alternatives and significant uncertainty
**Process**: Timebox research (2-4 hours per option), build a prototype for top 2 contenders, evaluate with real metrics, then write ADR.
**Output**: ADR with prototype findings, benchmarks, and empirical evidence.

### Pattern 2: Pre-ADR Brainstorm
**When**: Team needs to explore the decision space before committing
**Process**: Create a lightweight document listing all options with one-line pros/cons. Circulate for 1-2 days. Collect feedback. Then formalize into ADR.
**Output**: Single ADR reflecting team input.

### Pattern 3: Emergency Decision
**When**: Production incident requires immediate choice (hotfix, security patch)
**Process**: Make the decision, implement the fix, write the ADR within 24 hours documenting what was decided and why.
**Output**: ADR written post-hoc, status: "Accepted (Emergency)".

### Pattern 4: Deferred Decision
**When**: Decision depends on future information or work
**Process**: Write ADR as "Proposed" with a "Decision Due" date. List the conditions that must be met before accepting. Revisit on the due date.
**Output**: ADR in Proposed state with clear acceptance criteria.

## Anti-Patterns

### Anti-Pattern 1: ADR as Design Doc
Writing an ADR that reads like a design specification rather than a decision record. ADRs capture the decision and rationale, not the implementation approach. If the content describes how something works rather than why it was chosen, it is a design doc, not an ADR.

### Anti-Pattern 2: The Kitchen Sink
A single ADR that covers multiple related decisions (e.g., "Database, API, and deployment decisions"). This makes it impossible to supersede individual decisions without rewriting the entire ADR. Split into separate ADRs per decision.

### Anti-Pattern 3: Retroactive Completeness
Writing ADRs months after decisions were made, pretending full context was known at decision time. Retroactive ADRs should be honest: "At the time, the primary factor was time pressure. We chose X because it required the least configuration."

### Anti-Pattern 4: ADR as Blame Document
Using ADRs to assign blame when decisions turn out poorly. ADRs are learning tools, not accountability artifacts. A decision that seemed right at the time with the information available was the right decision, even if the outcome was unfavorable.

### Anti-Pattern 5: Abandoned ADR Log
Starting an ADR log with enthusiasm and abandoning it after 3-4 entries. Maintenance is a team commitment. If ADRs are not kept current, the log becomes misleading noise.

## Templates

### Quick ADR (Small Decisions)
```markdown
# ADR-{NNN}: {Title}

## Status
Accepted

## Context
{2-3 sentences}

## Decision
{1 sentence}

## Rationale
{1-2 sentences}

## Consequences
{1 positive, 1 negative, 1 mitigation}
```

### Standard ADR (Medium Decisions)
See Step 4 workflow template above.

### Y-Statement ADR (Major Decisions)
```markdown
# ADR-{NNN}: {Title}

## Status
Accepted

## Y-Statement
In the context of {situation},
facing {problem},
we decided for {option}
to achieve {outcome},
accepting {downside}.

## Context
{3-5 sentences}

## Alternatives Considered
{2-4 alternatives with pros/cons/why not}

## Consequences
{positive, negative, mitigation}
```

## Success Metrics

| Metric | Target | How to Measure |
|--------|--------|----------------|
| ADR creation time | < 60 min per standard ADR | Time from trigger to save |
| ADR review time | < 2 business days | Time from PR to approval |
| ADR reversal rate | < 20% | Superseded / total ADRs |
| Decision log freshness | > 90% up to date | Quarterly audit |
| Team awareness | 100% | New team members can find and understand recent ADRs |

## Compared With

| Artifact | Purpose | Immutability | Granularity |
|----------|---------|-------------|-------------|
| ADR | Decision rationale | Immutable | One decision per ADR |
| RFC | Proposal for discussion | Mutable during review | One proposal per RFC |
| Tech spec | Implementation details | Mutable | Feature-level |
| Wiki page | General knowledge | Mutable | Unbounded |
| Code comment | Local rationale | Mutable | Line-level |
| Design doc | System design | Mutable | Component-level |

## Performance
- ADRs should be readable in under 5 minutes. Keep them concise.
- Decision log should be reviewed quarterly for superseded decisions.
- A team of 10 engineers typically produces 1-2 ADRs per sprint.
- ADR review should be part of code review, not a separate process.
- Aim for each ADR to be 200-500 words. Longer ADRs indicate scope creep.
- The index README should load in under 1 second.

## Tooling/Methodology
- **ADR tools**: adr-tools (command line), Log4bra, adr-log, Nat Pryce's adr-tools.
- **Storage**: `docs/decisions/` in the repository alongside code.
- **Templates**: MADR (Markdown Any Decision Records), Y-Statements.
- **Review**: Include ADR in the PR for the implementing code changes.
- **Index**: Maintain a README.md in `docs/decisions/` listing all ADRs with status.
- **CI checks**: Validate ADR numbering uniqueness, mandatory sections, and status transitions.
- **Notable ADR collections**: AWS Well-Architected Framework decisions, ISO 42010.

## References
  - references/create-adr-fundamentals.md — ADR Fundamentals
  - references/create-adr-advanced.md — ADR Advanced Topics
  - references/adr-best-practices.md — ADR Best Practices
  - references/adr-examples.md — ADR Examples
  - references/adr-template.md — ADR Template
  - references/adr-workflow.md — ADR Workflow
  - references/adr-decision-capture.md — ADR Decision Capture
  - references/adr-architecture-evolution.md — ADR and Architecture Evolution

## Handoff
Output: ADR files in docs/decisions/
Next skill: create-tech-spec
Carry forward: all ADR files created, key decisions with rationale.
