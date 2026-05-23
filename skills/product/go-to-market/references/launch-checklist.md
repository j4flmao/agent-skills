# Launch Checklist

## Pre-Launch (T-4 Weeks)

### Product Readiness
- [ ] Feature complete and code frozen
- [ ] All P0/P1 bugs fixed
- [ ] Performance benchmarks meet targets
- [ ] Security review completed
- [ ] Documentation written (help center, API docs)
- [ ] Changelog drafted
- [ ] Migration plan (if replacing existing feature)

### Marketing Readiness
- [ ] Launch post drafted (blog, social)
- [ ] Email campaign prepared (segments: all users, power users, prospects)
- [ ] Landing page designed and built
- [ ] Screenshots / demo video recorded
- [ ] Press release drafted (if applicable)
- [ ] Customer case study (if available)
- [ ] Pricing page updated (if monetized)

## Launch Prep (T-2 Weeks)

### Internal Readiness
- [ ] Internal demo conducted for sales/support
- [ ] FAQ document shared with support team
- [ ] Sales enablement materials prepared
- [ ] Support team trained on new feature
- [ ] Monitoring dashboards set up
- [ ] Rollback plan documented
- [ ] Success metrics defined and baseline measured

### Technical Readiness
- [ ] Canary deployment passing
- [ ] Load testing completed
- [ ] Error budgets sufficient
- [ ] Feature flag configured
- [ ] Monitoring alerts configured
- [ ] Backup/DR tested
- [ ] Dependency updates communicated

## Launch Day (T-0)

### Rollout
- [ ] Feature flag enabled for internal team (smoke test)
- [ ] Feature flag enabled for 5% users (canary)
- [ ] Monitor metrics for 30 min
- [ ] Feature flag enabled for 25% users
- [ ] Monitor for 2 hours
- [ ] Feature flag enabled for 100%
- [ ] Status page updated if maintenance needed

### Launch Comms
- [ ] In-app announcement sent
- [ ] Email campaign sent
- [ ] Blog post published
- [ ] Social media posts scheduled
- [ ] Support team notified of launch
- [ ] Sales team notified of launch

## Post-Launch (T+1 Week)

### Monitoring
- [ ] Daily metrics review (adoption, engagement, satisfaction)
- [ ] Support ticket triage (new issues related to launch)
- [ ] Bug triage from new traffic
- [ ] Performance monitoring (no degradation)
- [ ] Cost monitoring (if AI features)
- [ ] User feedback collection

### Iteration
- [ ] Review launch metrics vs targets
- [ ] Prioritize follow-ups from feedback
- [ ] Plan A/B tests for optimization
- [ ] Schedule post-launch retrospective

## Launch Tiers

| Tier | Features | Launch | Comms | Timeline |
|------|----------|--------|-------|----------|
| Tier 1: Major | New product, major redesign | Phased rollout | Full campaign | 6-8 weeks |
| Tier 2: Medium | New feature, significant update | Canary → full | Email + blog | 2-4 weeks |
| Tier 3: Minor | Small feature, bug fix | Direct full | Changelog only | 1 week |
| Tier 4: Internal | Infrastructure, refactor | Feature flag | Internal only | Flexible |

## Rollback Criteria

Auto-rollback if any of:
- Error rate increases >1% vs pre-launch
- P95 latency increases >50%
- Core metric (revenue, retention) drops >5%
- Support tickets related to feature >50/day
- Critical security vulnerability discovered
