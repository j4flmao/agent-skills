# Test Plan Template

## Test Plan Header

```
Test Plan: {Feature/Project Name}
Version: {1.0}
Author: {Name}
Date: {YYYY-MM-DD}
Status: Draft / Reviewed / Approved
```

## 1. Scope

### In Scope
- {feature or component 1}
- {feature or component 2}
- Integration between {A} and {B}
- Regression testing for affected areas

### Out of Scope
- {feature or component excluded}
- Performance testing (covered separately)
- Security testing (covered by pentest)
- Browser compatibility beyond {list}

## 2. Test Levels

| Level | Objective | Owner | Timing | Automation |
|-------|-----------|-------|--------|------------|
| Unit | Verify individual functions/components | Developer | During development | Required (80%+ coverage) |
| Integration | Verify interface between components | Developer + QA | After unit tests | Required for critical paths |
| API | Verify API contract adherence | QA | After integration | Full automation |
| E2E | Verify critical user journeys | QA | Before release | Critical journeys only |
| Regression | Verify no existing functionality broken | CI | Every deployment | Full automation |
| UAT | Verify meets business requirements | Business owner | Before sign-off | Manual |

## 3. Test Environment

| Environment | URL | Configuration | Data | Access |
|-------------|-----|--------------|------|--------|
| Local | localhost:3000 | Dev mode | Seeded test data | Developers |
| Dev | dev.example.com | Debug enabled | Anonymized subset | Dev team |
| Staging | staging.example.com | Production-like | Full anonymized | QA team |
| Production | example.com | Production | Real data | Read-only |

## 4. Test Data Requirements

- {n} test users with varying roles (admin, user, viewer)
- {n} test orders with different statuses
- Edge cases: empty state, maximum data, boundary values
- Anonymized production data for staging (if applicable)
- API mock data for external service dependencies

## 5. Test Schedule

| Phase | Start | End | Duration | Deliverable |
|-------|-------|-----|----------|-------------|
| Test planning | Sprint 1, Day 1 | Sprint 1, Day 3 | 3 days | Test plan |
| Test case design | Sprint 1, Day 2 | Sprint 1, Day 5 | 4 days | Test cases |
| Test execution | Sprint 2, Day 1 | Sprint 2, Day 8 | 8 days | Test results |
| Regression | Sprint 2, Day 9 | Sprint 2, Day 10 | 2 days | Regression report |
| UAT | Sprint 3, Day 1 | Sprint 3, Day 3 | 3 days | UAT sign-off |

## 6. Entry/Exit Criteria

### Entry Criteria
- [ ] Code completed and code reviewed
- [ ] Unit tests passing (80%+ coverage)
- [ ] Build passes in CI
- [ ] Test environment available and configured
- [ ] Test data prepared

### Exit Criteria
- [ ] All planned tests executed
- [ ] No open Critical or High defects
- [ ] Regression suite passes
- [ ] Test summary report delivered
- [ ] UAT signed off

## 7. Defect Management

| Severity | Definition | Response | Action |
|----------|------------|----------|--------|
| Critical | System down, data loss, security | Stop release | Fix immediately |
| High | Feature broken, no workaround | Block release | Fix before release |
| Medium | Feature works with limitations | Normal priority | Fix in current sprint |
| Low | Cosmetic, minor | Low priority | Fix when time permits |

## 8. Roles and Responsibilities

| Role | Name | Responsibilities |
|------|------|-----------------|
| Test Lead | {name} | Test strategy, planning, reporting |
| QA Engineer | {name} | Test case design, execution, defect reporting |
| Developer | {name} | Unit tests, integration tests, code reviews |
| Product Owner | {name} | UAT, acceptance criteria validation |
| DevOps | {name} | Test environment, CI pipeline |

## 9. Deliverables

- [ ] Test plan (this document)
- [ ] Test cases (linked or attached)
- [ ] Test execution report
- [ ] Defect report
- [ ] Regression test results
- [ ] UAT sign-off document
- [ ] Test summary report

## 10. Risks and Mitigation

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Test environment not available | High | Medium | Provision backup environment |
| Insufficient test data | Medium | Low | Data generation scripts ready |
| Schedule pressure | High | Medium | Prioritize critical path tests |
| Third-party API changes | Medium | Medium | Contract tests with mocks |
