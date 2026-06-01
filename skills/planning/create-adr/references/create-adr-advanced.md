# ADR Advanced Topics

## Y-Statements
For highly consequential decisions, the Y-Statement format captures the essence in a single sentence:
"In the context of {situation}, facing {problem}, we decided for {option} to achieve {outcome}, accepting {downside}."

This format is useful as a summary at the top of a standard ADR or as a standalone minimal ADR.

## Decision-Making Frameworks

### Weighted Decision Matrix
When multiple criteria matter, weight each criterion and score each option. The total weighted score provides a quantitative comparison that supports the qualitative rationale.

### Cost of Delay
Decisions have time value. High-urgency decisions (blocking multiple teams, enabling critical features) should be made quickly with available information. Low-urgency decisions can afford deeper analysis.

### Technology Radar
Classify technologies into rings: Adopt (proven), Trial (promising, low risk), Assess (worth exploring), Hold (proceed with caution). ADRs are required for Trial and Assess; optional for Adopt.

## Compliance Mechanisms
An ADR without enforcement is aspirational. Compliance approaches include:
- **Automated**: Lint rules, architecture tests, CI checks that enforce decision
- **Process**: Code review checklists that include reviewing relevant ADRs
- **Social**: Team agreements and norms backed by lead accountability

## Decision Log Management

### Index File
Maintain a README.md in `docs/decisions/` listing all ADRs with status. This is the entry point for anyone exploring the architectural history.

### Quarterly Review
Every quarter, review the decision log. Mark superseded and deprecated ADRs. Identify decisions that are due for re-evaluation. Archive decisions older than 2 years that are no longer relevant.

### ADR Numbering
Sequential numbering (001, 002, ...) is simplest. Prefixes can indicate category (ADR-DB-001 for database decisions, ADR-API-001 for API decisions) in large projects.

## Incremental Decision-Making
Some decisions cannot be made all at once. Use the following pattern:
1. ADR-001: High-level technology direction (e.g., "we will use cloud-native architecture")
2. ADR-002: Specific technology selection (e.g., "we will use AWS as our cloud provider")
3. ADR-003: Implementation details (e.g., "we will use ECS Fargate for container orchestration")

Each ADR narrows the scope of the previous one, creating a hierarchical decision tree.

## Handling Decision Reversals
When a decision proves wrong:
1. Write a new ADR documenting what was learned
2. Reference the superseded ADR explicitly
3. Explain why the original decision no longer serves the project
4. Include what changed in context or understanding
5. Update the superseded ADR's status

## Multi-Team ADRs
When a decision affects multiple teams:
- Include stakeholders from each team in the review
- Document cross-team dependencies explicitly
- Consider writing a shared ADR with team-specific subsections
- Set a clear decision owner from the most affected team

## ADR Templates for Different Scale

### Quick ADR
For small decisions with low uncertainty: context (2-3 sentences), decision (1 sentence), rationale (1-2 sentences), 1 positive + 1 negative consequence.

### Standard ADR
For medium decisions: full MADR format with 2-4 alternatives, detailed pros/cons, and compliance mechanism.

### RFC-Style ADR
For major decisions needing broad input: include an open discussion period, collect feedback before accepting, and document dissent.

## Common Mistakes in Practice

**Biased evaluation**: Framing pros/cons to favor a preferred option. Solution: write alternatives first, then choose.

**Analysis paralysis**: Spending disproportionate time analyzing low-impact decisions. Solution: timebox research.

**Orphan ADRs**: ADRs that are written but never linked to implementation. Solution: require ADR reference in implementation PRs.

**Status neglect**: Not updating ADR statuses when decisions are superseded. Solution: quarterly review cadence.

**Audience confusion**: Writing for technical peers when stakeholders also need to understand. Solution: include an executive summary for non-technical readers.

## Integration with Documentation
ADRs should be linked from:
- Architecture documentation (C4 diagrams, system context)
- Onboarding documentation for new team members
- PRD references for major feature decisions
- Runbook entries for operational decisions
