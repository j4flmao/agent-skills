# User Acceptance Testing (UAT) Process

## Overview

User Acceptance Testing (UAT) is the final phase of testing where end users validate that the system meets their needs, business processes, and acceptance criteria before production release. It is the last line of defense before users touch the live system.

## UAT vs System Testing

| Dimension | System Testing | UAT |
|-----------|---------------|-----|
| **Who tests** | QA engineers, developers | End users, business stakeholders |
| **Focus** | Technical correctness, requirements | Business fitness, usability, workflow |
| **Environment** | QA/staging environments | Production-like or staging |
| **Data** | Synthetic test data | Realistic or anonymized production data |
| **Criteria** | Functional requirements, technical specs | Business acceptance criteria |
| **Scope** | Full system, integration, regression | Business workflows, critical paths |
| **Pass/fail** | Binary (works/doesn't work) | Conditional (acceptable/unacceptable) |

## UAT Planning

### 1. Define the Scope
Identify which user stories, epics, or business processes require UAT sign-off. Not everything needs UAT — focus on:
- New features with user-facing impact
- Changed business workflows
- High-risk areas (financial, compliance, safety)
- Features with subjective acceptance criteria

### 2. Create UAT Scenarios
Derive scenarios from user stories and acceptance criteria:

```gherkin
Scenario: Customer completes a subscription purchase
  Given a new customer has selected a "Premium" plan
  When they enter valid payment details
  And they confirm the purchase
  Then the subscription is activated immediately
  And they receive a confirmation email
  And the first invoice is generated
```

### 3. Recruit UAT Participants
- Select users representing each target persona
- 3-5 users per persona is sufficient for most UAT cycles
- Include power users and novice users for balanced feedback
- Ensure participants have no prior involvement in the development

### 4. Prepare UAT Environment
- Production-like environment with realistic data
- Anonymized production data dump (where possible)
- Pre-configured user accounts for each persona
- Access credentials, documentation, and support channel

### 5. Define Sign-Off Criteria
| Criterion | Typical Threshold |
|-----------|------------------|
| Critical bugs | Zero open critical/blocker defects |
| Major bugs | Zero or agreed tolerance (e.g., < 3) |
| Scenario pass rate | > 95% of scenarios passing |
| User satisfaction survey | > 4/5 average rating |
| Business process coverage | 100% of defined workflows tested |

## UAT Execution Process

### Session Structure
```
1. Briefing (15 min): Walk through scenarios, expectations, support channel
2. Testing (60-120 min): Users execute scenarios, explore, report issues
3. Debrief (15 min): Collect feedback, clarify findings, note workarounds
4. Follow-up: Triage issues, fix defects, re-test if needed
```

### Participant Guidance

Provide clear instructions to UAT participants:

```
UAT GUIDE FOR CHECKOUT FLOW TESTING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Your Task:
1. Log in using the credentials provided
2. Select any product and add it to the cart
3. Proceed through checkout using the test card provided
4. Confirm the order and check for the confirmation email

What to Look For:
- Does the flow feel natural and intuitive?
- Are error messages clear and helpful?
- Does the confirmation include all expected details?
- Is anything confusing or unexpected?

How to Report Issues:
- Use the shared UAT feedback form
- Include screenshot if possible
- Describe what you expected vs what happened
- Rate severity: Showstopper / Major / Minor / Suggestion
```

### Issue Triage

UAT issues are triaged differently than development bugs:

| Category | Description | Action |
|----------|-------------|--------|
| Showstopper | Business workflow broken, cannot proceed | Must fix before sign-off |
| Major | Works but significant usability or data issue | Fix or document as known issue |
| Minor | Cosmetic, preference, corner case | Log for future sprint |
| Suggestion | Improvement idea, not a defect | Log for product backlog |

## UAT Sign-Off

### Sign-Off Document Template

```
UAT SIGN-OFF
━━━━━━━━━━━━━
Release: v3.2.0
UAT Period: 2026-05-10 to 2026-05-20
Participants: 8 (2 Admin, 3 Customer, 3 Manager)

Summary:
  Scenarios Planned: 24
  Scenarios Executed: 24 (100%)
  Scenarios Passed: 23 (95.8%)
  Scenarios Failed: 1 (documented known issue)

Defects Found:
  Showstopper: 0
  Major: 1 (invoice date format — documented, fixed in next patch)
  Minor: 4
  Suggestions: 7

Sign-Off: ✅ APPROVED
  Conditions: Invoice date format fix tracked as TECH-4321
  Signed: _________________________________
  Date: ___________________________________
```

## Common UAT Pitfalls

| Pitfall | Prevention |
|---------|-----------|
| Users don't understand what to test | Provide clear scenarios, not technical test cases |
| Environment is unstable | Freeze UAT environment, apply only critical patches |
| Users test the wrong feature | Guide sessions with structured charters |
| Too many issues, not enough detail | Provide issue templates and severity guidelines |
| Sign-off delayed indefinitely | Set hard deadline, escalate blockers |
| Users don't show up | Schedule in advance, get management commitment |
| Business vs IT disconnect | Have a business analyst present during UAT |
