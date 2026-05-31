# PRD Stakeholder Review

## Overview

The PRD review process is where product requirements are validated, challenged, and refined before engineering begins. A structured stakeholder review prevents costly rework by catching misalignment early, ensures cross-functional buy-in, and produces a stronger, more feasible product specification. This reference covers the full review lifecycle: preparing for review, conducting effective review sessions, incorporating feedback, and achieving formal approval.

## The Review Lifecycle

```
[Draft PRD] → [Internal Review] → [Cross-Functional Review]
    → [Feedback Incorporated] → [Final Review] → [Approved]

Stages:
1. Self-review: Author validates completeness and clarity
2. Peer review: Another PM reviews for structure and gaps
3. Engineering review: Feasibility, effort, technical risks
4. Design review: UX consistency and feasibility
5. QA review: Testability and edge case coverage
6. Stakeholder sign-off: Executive approval
7. Finalize: Version bump, archive, distribute
```

## Stage 1: Self-Review Checklist

Before sharing the PRD with anyone, the author must verify basic completeness:

```markdown
### Pre-Review Self-Check

**Clarity:**
- [ ] Can someone outside the project understand the problem?
- [ ] Are all acronyms and domain terms defined?
- [ ] Does the executive summary stand alone?
- [ ] Are success metrics specific and measurable?

**Completeness:**
- [ ] Are all epics from the brief covered?
- [ ] Does each story have acceptance criteria?
- [ ] Are non-functional requirements specified?
- [ ] Are edge cases documented?
- [ ] Are open questions listed with owners?

**Consistency:**
- [ ] Are user role names consistent?
- [ ] Is priority labeling consistent (P0-P3)?
- [ ] Is complexity estimation consistent?
- [ ] Are all references valid (design files, research, etc.)?
```

## Stage 2: Peer Review (Product Team)

### Purpose
Catch structural issues, gaps, and inconsistencies before involving other functions.

### Participants
1-2 other product managers familiar with the domain.

### Focus Areas
- Does the problem statement match what you understand about user needs?
- Are there missing epics or features that competitors offer?
- Are the success metrics aligned with company OKRs?
- Is the priority ordering logical?
- Are there TBDs that should be resolved before broader review?

### Peer Review Template

```markdown
## Peer Review Feedback

**Reviewer:** {name}
**Date:** {date}
**PRD Version:** {version}

### Structural Feedback
{Issues with organization, missing sections, too much/too little detail}

### Content Gaps
{Missing features, user types, edge cases, or requirements}

### Priority Concerns
{Disagreements on epic/story priorities}

### Success Metrics Feedback
{Suggestions for better or additional metrics}

### Overall Assessment
[Minor revisions needed / Major revisions needed / Ready for cross-functional]
```

## Stage 3: Engineering Review

### Purpose
Validate feasibility, estimate effort, identify technical risks and dependencies.

### Participants
Tech lead, architect, or senior engineer(s) from the implementing team.

### Preparation
Provide engineers with:
- The full PRD document at least 48 hours before the review meeting
- Context on business priorities and timeline constraints
- Known technical constraints (existing architecture, team capacity)

### Engineering Review Checklist

```markdown
## Engineering Review Checklist

**Feasibility:**
- [ ] Are all features technically feasible within the stated timeline?
- [ ] Are there any features that require research or prototyping first?
- [ ] Are there existing systems/components that can be reused?

**Architecture Impact:**
- [ ] Does this require new infrastructure or services?
- [ ] Does this change existing data models or APIs?
- [ ] Are there backward compatibility concerns?
- [ ] Are there scalability concerns with the proposed approach?

**Dependencies:**
- [ ] Are all external dependencies (third-party services, APIs) identified?
- [ ] Are the dependency timelines realistic?
- [ ] Are there fallback plans for dependency failures?

**Effort Estimation:**
- [ ] Epic-level effort estimates provided
- [ ] Story-level estimates match complexity labels
- [ ] Total effort aligned with available team capacity

**Technical Risks:**
- [ ] Are high-risk items identified and flagged?
- [ ] Are there mitigation strategies for technical risks?
- [ ] Is there a spike/exploration budget for unknowns?

**Performance:**
- [ ] Are the performance targets achievable with the proposed architecture?
- [ ] Are there any features that may need performance optimization?
- [ ] Are load testing requirements understood?
```

### Engineering Feedback Template

```markdown
## Engineering Review Feedback

**Reviewer:** {name}
**Date:** {date}
**PRD Version:** {version}

### Feasibility Summary
{Overall assessment of feasibility within timeline}

### Blocking Issues
{Issues that must be resolved before implementation can start}

### Recommendations
{Suggestions for simplifying scope, alternative approaches, sequencing}

### Effort Summary
| Epic | Estimated Effort | Confidence | Notes |
|------|-----------------|------------|-------|
| Epic 1 | 4-6 weeks | High | Reuse existing auth service |
| Epic 2 | 6-8 weeks | Medium | New ML pipeline needed |

### Technical Risks
{Risk items with probability and impact ratings}

### Dependencies
{External dependencies with timelines and fallback plans}
```

## Stage 4: Design Review

### Purpose
Ensure the requirements are implementable within the design system, consistent with UX patterns, and feasible from a UI perspective.

### Participants
Product designer(s) assigned to the project, design lead.

### Design Review Focus Areas
- Are the user flows complete and logical?
- Are there any UX gaps or inconsistencies?
- Do the requirements align with the existing design system?
- Are accessibility considerations addressed?
- Are there any features that would require significant UI innovation?
- Are mobile/responsive needs addressed?

### Questions Designers Should Ask
- What are the error states and empty states for every screen?
- What is the loading experience for data-heavy screens?
- How does this feature work on mobile vs desktop?
- What are the notification and feedback mechanisms?
- How does this fit into the existing navigation and information architecture?

## Stage 5: QA Review

### Purpose
Identify testability issues, missing edge cases, and scenarios that need additional definition before development.

### Participants
QA lead or senior test engineer.

### QA Review Focus Areas

```markdown
## QA Review Checklist

**Testability:**
- [ ] Is every acceptance criterion verifiable?
- [ ] Are acceptance criteria specific (no ambiguous terms like "fast" or "easy")?
- [ ] Are error conditions and expected behaviors documented?
- [ ] Are performance targets measurable?
- [ ] Are there test environment requirements?

**Coverage:**
- [ ] Are happy path, edge cases, and error paths covered?
- [ ] Are there accessibility test requirements?
- [ ] Are there security test requirements?
- [ ] Are there integration test scenarios?
- [ ] Are there migration/data conversion test scenarios?

**Test Data:**
- [ ] Are test data requirements documented?
- [ ] Are there specific scenarios that require particular data states?
- [ ] Is test data generation needed?

**Automation:**
- [ ] Which acceptance criteria should be automated?
- [ ] What is the expected test automation coverage?

**Risks:**
- [ ] Which areas are highest risk for defects?
- [ ] Are there platform-specific risks (browser, OS, device)?
```

## Stage 6: Stakeholder Sign-Off

### Who Needs to Sign Off
- Product Director / VP Product — strategic alignment
- Engineering Director / Tech Lead — resource commitment
- Design Lead — UX quality commitment
- QA Manager — test resource commitment
- Key business stakeholders (as appropriate)

### Sign-Off Criteria
- All blocking issues from engineering and design resolved
- TBDs have assigned owners and resolution deadlines
- Timeline and scope are agreed upon
- Resources are committed
- Risks are documented with mitigation plans

### Approval Documentation

```markdown
## PRD Approval

**Document:** PRD-2024-01-15-v1.2
**Project:** Project X

### Approvals
| Role | Name | Signature | Date | Notes |
|------|------|-----------|------|-------|
| Product | Alice | ✓ | 2024-01-20 | Approved |
| Engineering | Bob | ✓ | 2024-01-20 | With noted concerns on Epic 4 timeline |
| Design | Carol | ✓ | 2024-01-19 | Approved |
| QA | Dave | ✓ | 2024-01-20 | Approved |

### Conditions
1. Epic 4 timeline to be reviewed after Sprint 2 output is known
2. TBD on SSO to be resolved by end of Sprint 1
3. Security review to be completed before GA launch
```

## Conducting the Review Session

### Setting Up the Review

1. **Schedule early, share early**: Distribute the PRD at least 48 hours before the review meeting. Timebox reading time in stakeholders' calendars.
2. **Provide context**: Include a brief video or written summary of what changed since the last review.
3. **Set expectations**: Clarify what decisions need to be made in the meeting vs. async.
4. **Assign pre-reading**: Ask reviewers to come with their top 3 concerns or questions.

### Running the Review Meeting

```markdown
## Review Meeting Agenda (60 minutes)

| Time | Activity | Owner |
|------|----------|-------|
| 0-5 | Overview and context (what changed, what decisions are needed) | PM |
| 5-10 | Walkthrough of key changes or new sections | PM |
| 10-35 | Open discussion — structured by section | All |
| 35-50 | Decision review and action items | PM |
| 50-55 | Next steps and timeline | PM |
| 55-60 | Summary and confirm understanding | PM |
```

### Facilitation Guidelines
- Start with the most contentious topics when energy is highest.
- Capture decisions and action items visibly (shared doc or board).
- If a topic needs more discussion than time allows, create a follow-up and move on.
- End with a clear summary of what was decided, what is still open, and who owns each action.
- Send meeting notes within 24 hours.

## Handling Feedback

### Categorizing Feedback

```typescript
type FeedbackCategory = 'blocking' | 'important' | 'enhancement' | 'opinion';

interface FeedbackItem {
  id: string;
  author: string;
  category: FeedbackCategory;
  section: string;
  description: string;
  suggestedChange: string;
  resolution?: 'accepted' | 'rejected' | 'deferred' | 'needs_discussion';
  resolutionRationale?: string;
}
```

### Decision Framework

| Category | Response | Timeline |
|----------|----------|----------|
| Blocking | Must resolve before proceeding | Immediate |
| Important | Resolve before final approval | Within 1 week |
| Enhancement | Consider for future iterations | Deferred |
| Opinion | Acknowledge, note for consideration | Documented |

### Managing Disagreements

When reviewers disagree:
1. **Understand the root cause**: Is it a misunderstanding, a values difference, or a genuine trade-off?
2. **Use data where possible**: User research, analytics, competitive analysis.
3. **Define the trade-off explicitly**: "If we prioritize X, we delay Y by 2 weeks."
4. **Escalate when needed**: If the team cannot reach consensus, escalate to the product director or equivalent decision-maker.
5. **Document the decision**: Record what was decided, why, and who was consulted.

### Feedback Incorporation Process

1. Collect all feedback into a single document.
2. Categorize and prioritize each item.
3. Address blocking and important items first.
4. For each item: accept, reject (with rationale), or defer.
5. Update the PRD with accepted changes.
6. Circulate the feedback resolution document to all reviewers.
7. Schedule follow-up for any deferred or unresolved items.

## Managing Remote/Async Reviews

### Async Review Best Practices

- Use comments in the PRD document itself (Google Docs, Notion inline comments).
- Set clear deadlines for feedback submission.
- Use a decision log to track what changed and why.
- Record a Loom/screen recording walkthrough for complex changes.
- Use emoji reactions for lightweight sign-off (thumbs up = I read and agree).

### Async Review Template

```markdown
## PRD Review Request

**PRD:** [Link to document]
**Version:** 1.2
**Deadline for feedback:** {date}
**Key changes since last version:**
- Added Epic 4: Analytics Dashboard
- Updated success metrics per stakeholder feedback
- Resolved TBD on file storage limits

**Please review:**
1. Executive Summary (p.1-2)
2. Epic 4: Analytics Dashboard (p.12-15)
3. Open Questions (p.20)

**Decision needed:**
- Are we comfortable with the Epic 4 scope as defined?
- Is the P0 priority list correct?

**Please respond with:**
- Specific comments inline in the document
- Overall thumbs up/down in this thread
- Any blocking concerns before final approval
```

## Post-Approval Governance

### Version Control
- PRD versioning: `prd-2024-01-15-v{major}.{minor}.md`
- Major version bump: significant scope change, new epic added
- Minor version bump: story refinements, clarification, non-functional requirement changes
- Changelog entry required for every version change

### Change Request Process
After approval, any change to scope, priority, or requirements follows a formal process:

1. **Submit change request**: Describe the change, reason, and impact.
2. **Impact assessment**: Engineering estimates effort delta, design assesses UX impact.
3. **Review**: Product owner reviews against OKRs and capacity.
4. **Approve or reject**: If approved, update PRD version and notify all stakeholders.
5. **Communicate**: Affected teams are informed of the change.

### Change Request Template

```markdown
## PRD Change Request

**PRD:** prd-2024-01-15-v1.2
**Proposed Change:** {Description}
**Reason:** {Business justification}
**Impact:**
- Scope increase/decrease: {+/- X stories}
- Timeline impact: {+/- X days/weeks}
- Resource impact: {Additional team members or skills needed}
- Risk: {New risks introduced}

**Submitted by:** {name}
**Date:** {date}
**Decision:** [Approved / Rejected / Needs Discussion]
**Decision date:** {date}
**Decision rationale:** {Why this was decided}
```

## Common Review Anti-Patterns

| Anti-Pattern | Description | Solution |
|-------------|-------------|----------|
| Death by detail | Reviewers focus on formatting and word choice instead of substance | Set explicit review focus areas per reviewer role |
| Bike-shedding | Disproportionate time spent on trivial decisions | Timebox discussions; "If it takes more than 5 minutes to decide, it is not trivial" |
| Review by ambush | Stakeholders raise major concerns at the final approval stage | Require early engineering and design involvement |
| Too many reviewers | Everyone has an opinion on everything | Assign clear review roles and focus areas |
| Drive-by comments | Stakeholders comment without understanding the context | Provide executive summary and context document |
| Ghost reviewers | Stakeholders approve without reading | Require specific feedback, not just "LGTM" |
| Scope creep through review | Reviewers add features during review | Separate "new feature requests" from "PRD refinements" with different processes |

## Measuring Review Effectiveness

### Metrics to Track
- **Review cycle time**: Days from draft to approval. Target: 5-10 business days.
- **Number of review rounds**: Target: 2-3 before approval.
- **Change request frequency**: Post-approval changes per sprint. Target: < 3.
- **Blocking issues found**: Early detection saves rework. Track blocking issues found in review vs. found during development.
- **Stakeholder satisfaction**: Survey reviewers after each PRD cycle.

### Continuous Improvement
- Conduct a retro after each major PRD cycle.
- What worked well in the review process? What could be faster?
- Update the PRD template and review checklist based on lessons learned.
- Train new PMs on the review process using past PRDs as examples.

## References
- references/prd-collaboration.md — PRD Collaboration
- references/prd-template.md — PRD Template
- references/prd-review-checklist.md — PRD Review Checklist
- references/create-prd-advanced.md — Create PRD Advanced Topics
- references/create-prd-fundamentals.md — Create PRD Fundamentals
- references/prd-template-structure.md — PRD Template Structure
