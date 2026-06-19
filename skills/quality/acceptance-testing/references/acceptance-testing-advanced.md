# Acceptance Testing Advanced Topics

## Introduction
Advanced acceptance testing covers multi-environment UAT strategies, risk-based acceptance, compliance-driven testing, large-scale beta programs, and integrating acceptance testing into regulated SDLCs.

## Advanced UAT Strategies

### Multi-Cohort UAT
Run parallel UAT sessions with different user segments: internal power users (week 1), external pilot customers (week 2), broad beta (week 3-4). Each cohort focuses on different aspects: power users validate advanced workflows, pilot customers test real-world scenarios, broad beta validates scale and diversity.

### Risk-Based Acceptance Testing
Prioritize acceptance testing based on business risk. Classify features by: criticality (revenue impact, compliance, safety), complexity (integration points, new technology), and change frequency. Allocate 60% of UAT time to high-risk features, 30% to medium, 10% to low.

### Continuous Acceptance in CI/CD
Shift acceptance left by running automated acceptance tests at every stage:
- PR stage: smoke acceptance (top 10 critical scenarios, < 2 min)
- Staging deploy: full automated acceptance suite (< 10 min)
- Pre-prod: acceptance + regression suite (< 30 min)
- Production: canary acceptance (5% traffic validation)

## Large-Scale Beta Program Management

### Beta Program Architecture
```yaml
beta_program:
  phases:
    - name: "alpha"
      participants: 25
      duration: "2 weeks"
      source: "internal + invited"
      goals: ["core workflow validation", "critical bug detection"]
    - name: "closed_beta"
      participants: 200
      duration: "2 weeks"
      source: "waitlist top 200"
      goals: ["edge case discovery", "performance baseline"]
    - name: "open_beta"
      participants: 2000
      duration: "4 weeks"
      source: "public waitlist"
      goals: ["scale validation", "diverse usage patterns", "NPS measurement"]

  metrics:
    task_success_rate: "> 85%"
    error_rate: "< 2%"
    nps_target: "> 30"
    avg_session_duration: "baseline + 20%"

  feedback_channels:
    - "In-app survey (end of session, 3 questions max)"
    - "Structured feedback form (weekly)"
    - "Error tracking (automated)"
    - "Support ticket analysis"
    - "Weekly sync with power users"

  rollback_criteria:
    - "Error rate > 5% sustained for 1 hour"
    - "Any P0 security vulnerability"
    - "Data integrity issue in any workflow"
```

### Beta Participant Management
- Segment participants by persona, tech proficiency, and usage patterns
- Provide clear onboarding: welcome email, quick-start guide, known issues
- Set expectations: this is pre-release software, feedback drives improvement
- Gamify participation: top reporters get early access to future releases
- GDPR/C遮蔽: anonymize all feedback data, obtain consent, allow opt-out

## Compliance-Driven Acceptance Testing

### Regulated Industry Acceptance
For PCI DSS, HIPAA, SOC 2, or GDPR-regulated systems, acceptance testing must include:
- Security control validation: encryption, access controls, audit logging
- Data handling verification: PII masking, data retention, deletion workflows
- Audit trail confirmation: all acceptance test activities logged
- Evidence collection: screenshots, logs, sign-off forms for auditor review
- Separation of duties: tester cannot be developer, sign-off requires manager

### Acceptance Evidence Package
```yaml
evidence_package:
  test_plan:
    document_id: "ATP-SPRINT-12"
    approved_by: "QA Manager"
    date: "2026-06-15"
  execution:
    scenarios_planned: 48
    scenarios_executed: 46
    scenarios_passed: 43
    scenarios_failed: 3
    pass_rate: 93.5%
  defects:
    total: 7
    by_severity:
      P0: 0
      P1: 2
      P2: 3
      P3: 2
    fixed: 5
    deferred: 2
  sign_off:
    status: "conditional"
    conditions: ["BUG-452 fixed and verified"]
    signed_by: "Product Owner"
    date: "2026-06-20"
```

## Gherkin Anti-Patterns in Practice

### Anti-Pattern: Implementation Leakage
```gherkin
# BAD — references UI implementation
Scenario: Login
  Given I click the login button in the top-right corner
  When I type "user@example.com" in the email input with id "email-field"
  And I type "password123" in the password field
  And I click the blue submit button
  Then I see the dashboard

# GOOD — abstract, business-focused
Scenario: Successful login
  Given I am a registered user
  When I log in with valid credentials
  Then I should be redirected to my dashboard
```

### Anti-Pattern: Multiple Scenarios in One
```gherkin
# BAD — tests registration AND login AND checkout
Scenario: Complete purchase workflow
  Given I am on the registration page
  When I register with valid details
  And I log in with my new account
  And I add items to my cart
  And I checkout with my credit card
  Then I see the order confirmation

# GOOD — focused on one behavior
Scenario: New user can complete registration
  Given I am on the registration page
  When I submit valid registration details
  Then I should see a welcome message
  And I should receive a verification email
```

## Performance Considerations
- UAT sessions over 2 hours show 60% drop in defect discovery rate
- Automated acceptance suite should complete within 10 minutes for CI gating
- Beta programs need minimum 100 users for statistically significant metrics
- NPS measurement requires 380+ responses for ±5% margin of error at 95% confidence
- Feedback analysis ratio: budget 1 hour per 10 beta submissions

## Integrating with Other Testing Types
- Unit testing validates component logic; acceptance validates business outcomes
- Integration testing finds service interaction bugs; acceptance validates end-user workflows
- Performance testing establishes baselines; acceptance includes non-functional criteria
- Security testing finds vulnerabilities; acceptance validates security controls
- Regression testing ensures no regressions; acceptance suite forms regression test core

## Key Points
- Run UAT in cohorts for progressive validation across user segments
- Apply risk-based prioritization to allocate UAT time effectively
- Shift acceptance testing left into CI/CD pipeline stages
- Collect comprehensive evidence for regulated industries
- Keep Gherkin abstract and focused on business outcomes, not implementation
- Maintain traceability from requirements to scenarios to test results
