# PRD Advanced Topics

## Epic Scoping Strategies

### By User Journey
Map epics to the user's end-to-end journey: Discover → Onboard → Use Core Feature → Manage Account → Get Help. Each step in the journey becomes an epic.

### By Business Capability
Map epics to business capabilities: User Management, Content Management, Commerce, Analytics, Administration. Useful for enterprise products with clear functional boundaries.

### By Technical Domain
Map epics to technical domains for platform products: API Gateway, Data Pipeline, Notification Engine, Identity Provider. Useful for internal platforms and APIs.

## User Role Definitions
Define all user roles in a glossary section at the top of the PRD:

| Role | Description | Permissions |
|------|-------------|-------------|
| Anonymous User | Not logged in | View public content only |
| Registered User | Logged in with email/password | Create and manage own content |
| Admin | Elevated privileges | Manage all users and content |
| Super Admin | System-level access | Configuration, billing, audit |

## Gherkin Best Practices

### Structure
```
Given {precondition(s)}
When {action}
Then {expected result}
```

### Patterns by Scenario Type

**Happy path**: Given valid user with valid data When user performs action Then success state.

**Error handling**: Given invalid data When user attempts action Then error message shown.

**Permission check**: Given unauthorized role When user attempts action Then access denied.

**State-dependent**: Given item in state X When user performs action Then item transitions to state Y.

**Boundary**: Given data at boundary value When user performs action Then system handles correctly.

### Common Mistakes in Gherkin
- Preconditions that are not actually prerequisites
- Expected results that are not observable (e.g., "system processes" instead of "status changes to processing")
- Imperative language ("click button") instead of declarative ("submits the form")
- Multiple actions in a single When clause — split into separate scenarios

## Story Splitting Techniques

### By Operation (CRUD)
One story for Create, one for Read, one for Update, one for Delete. Useful when each operation has distinct complexity or priority.

### By User Role
One story for Admin view, one for Regular User view. Useful when different roles have different permissions and interfaces.

### By Device
One story for Desktop, one for Mobile, one for API. Useful when the feature spans multiple platforms with different implementations.

### By Complexity
Basic story (happy path only), Enhanced story (all features), Edge case story (error handling). Useful when the basic version is needed early.

### By Scenario
Story for each distinct user scenario. "User creates account with email" and "User creates account with Google SSO" are separate stories.

## Non-Functional Requirements by Domain

### E-commerce
- Performance: Catalog search < 500ms, checkout < 2s
- Security: PCI DSS compliance, fraud detection
- Availability: 99.95% uptime during peak season
- Scalability: Handle Black Friday traffic (10x normal)

### Healthcare
- Security: HIPAA compliance, audit logging, data encryption
- Availability: 99.99% uptime for critical systems
- Compliance: FDA validation for regulated features
- Performance: Clinical data retrieval < 1s

### Fintech
- Security: SOC 2 Type II, penetration testing, fraud monitoring
- Availability: 99.99% uptime, zero data loss
- Performance: Transaction processing < 100ms
- Compliance: KYC/AML, regulatory reporting

### Enterprise SaaS
- Security: SSO/SAML, RBAC, audit trails
- Availability: 99.9% uptime SLA
- Scalability: Multi-tenant isolation, data segregation
- Performance: Sub-second page loads for common operations

## Definition of Done Variations

### Standard DoD
- Code complete with unit tests (>80% coverage)
- Integration tests pass
- All acceptance criteria met
- No regressions
- Code reviewed and approved
- Documentation updated
- Deployed to staging
- Smoke tests pass

### Mobile DoD
- Works on iOS and Android
- Tested on 3 most common screen sizes
- Offline mode works
- Push notifications tested
- App store screenshots updated

### API DoD
- Request/response documented
- Error codes documented
- Rate limiting implemented
- Versioning strategy applied
- Integration tests pass
- Client SDK updated (if applicable)

### Data/ML DoD
- Data pipeline tested with sample data
- Model accuracy meets threshold
- Feature store updated
- Monitoring dashboards created
- Data quality checks pass
- Bias/fairness analysis completed

## PRD Review Checklist

### Content Review
- [ ] Every epic traces to a brief MVP feature
- [ ] Every story has at least 2 acceptance criteria
- [ ] Non-functional requirements cover all relevant categories
- [ ] Definition of Done is specific and verifiable
- [ ] Out of scope items are explicitly listed
- [ ] User roles are defined and consistent

### Quality Review
- [ ] No implementation details in requirements
- [ ] Acceptance criteria are testable and unambiguous
- [ ] Stories are appropriately sized (1-3 days)
- [ ] No orphan stories (all traced to brief)
- [ ] Consistent terminology throughout

### Stakeholder Review
- [ ] Engineering review: feasible and estimable
- [ ] Design review: covers UI/UX requirements
- [ ] QA review: testable and complete coverage
- [ ] Product review: aligns with brief and strategy

## PRD Maintenance

### Versioning
- Use date-based filenames: `prd-2026-01-15.md`
- Increment for major revisions: `prd-2026-01-15-v2.md`
- Maintain a changelog at the bottom
- Archive superseded versions rather than deleting

### Updates During Development
- Log discovered requirements as they arise
- Re-prioritize epics based on sprint learnings
- Update acceptance criteria when edge cases are discovered
- Do not change scope without stakeholder agreement

### Linking to Implementation
- Reference PRD epics in sprint planning
- Link stories in issue tracker to PRD sections
- Update PRD status: In Development, In Review, Complete
- Close out PRD when all MVP epics are delivered
