# QC Checklists

## Code Review Checklist

### Functionality
- [ ] Code implements the requirements as specified
- [ ] Edge cases handled: empty, error, boundary values
- [ ] No regression introduced (existing tests pass)
- [ ] Error paths handled (no empty catch blocks)

### Security
- [ ] No hardcoded secrets, credentials, or API keys
- [ ] Input validation on all public endpoints
- [ ] Output encoding (prevent XSS)
- [ ] Parameterized queries (prevent SQL injection)
- [ ] Authentication checks on protected endpoints
- [ ] Authorization checks for data access
- [ ] CSRF tokens for state-changing operations
- [ ] Secure headers: HSTS, CSP, X-Frame-Options

### Performance
- [ ] No N+1 queries (eager loading / batch fetching)
- [ ] Pagination on list endpoints
- [ ] Indexes on queried columns
- [ ] No unnecessary re-renders (React.memo, useMemo)
- [ ] Asset optimization (lazy loading, code splitting)

### Maintainability
- [ ] Code follows project conventions (naming, file structure)
- [ ] No deeply nested conditionals (max 3 levels)
- [ ] Functions do one thing (Single Responsibility Principle)
- [ ] No magic numbers or strings (extract to constants/enums)
- [ ] No commented-out code
- [ ] No TODO/FIXME without ticket reference

### Testing
- [ ] Unit tests cover business logic
- [ ] Integration tests cover API endpoints
- [ ] Test covers: happy path, error path, edge cases
- [ ] No tests depending on other tests (order-dependent)
- [ ] Test assertions are meaningful (not just "should work")

## Pre-Merge Checklist

- [ ] Code compiles without errors
- [ ] Lint passes (zero errors)
- [ ] Tests pass (unit + integration)
- [ ] Code coverage meets threshold (80% overall, 90% new)
- [ ] Type checking passes (zero errors)
- [ ] No security vulnerabilities introduced
- [ ] No secrets in commit history
- [ ] PR has at least one approval
- [ ] PR description clearly describes changes
- [ ] Documentation updated if behavior changed
- [ ] Changelog entry added (if applicable)

## Pre-Release Checklist

- [ ] All quality gates pass
- [ ] Regression suite passes (full run)
- [ ] Performance benchmarks within threshold
- [ ] Security scan passes (SAST + dependency scan)
- [ ] Accessibility audit passes (WCAG AA)
- [ ] Smoke tests pass in staging
- [ ] Database migrations verified
- [ ] Backup verified (rollback capability)
- [ ] Feature flags configured for rollout
- [ ] Release notes prepared
- [ ] Runbooks updated
- [ ] On-call team notified

## Post-Release Checklist

- [ ] Monitoring dashboards verified (no spike in errors)
- [ ] Alert thresholds reviewed
- [ ] Performance metrics within baseline
- [ ] Error logs reviewed (no unexpected errors)
- [ ] User feedback monitored
- [ ] Rollback procedure documented (if not already)
- [ ] Post-mortem scheduled (if incident occurred)
- [ ] Metrics compared to pre-release baseline

## Daily Quality Checklist

- [ ] CI pipeline green (all branches)
- [ ] No new critical/high vulnerabilities in dependencies
- [ ] Test suite passing (no flaky failures)
- [ ] Code coverage hasn't dropped
- [ ] Open defects reviewed and prioritized
- [ ] Quality dashboard updated

## Weekly Quality Review

- [ ] Quality gate metrics reviewed with team
- [ ] Top technical debt items prioritized
- [ ] Flaky test remediation progress checked
- [ ] Test coverage trend reviewed
- [ ] Defect arrival rate and closure rate reviewed
- [ ] Quality risks added to risk register
