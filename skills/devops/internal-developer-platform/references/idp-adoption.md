# IDP Adoption Strategies

## Adoption Phases

| Phase | Goal | Timeline | Metrics |
|-------|------|----------|---------|
| 1. Pilot | 2-3 teams adopt golden paths | 1 month | NPS > 30, time-to-prod < 2h |
| 2. Early adopter | 5-10 teams onboarded | 2 months | NPS > 40, adoption > 30% |
| 3. Scale | 50%+ teams using platform | 3 months | Adoption > 50%, NPS > 50 |
| 4. Self-serve | Teams onboard without assistance | 6 months | Self-serve > 80%, NPS > 60 |

## Golden Paths

| Path | Target | Components | Time Saved |
|------|--------|------------|------------|
| New microservice | Backend teams | Repo + CI/CD + K8s + monitoring | 2 days → 30 min |
| New frontend | Frontend teams | Repo + CI/CD + CDN + analytics | 1 day → 20 min |
| Add database | Full stack | Terraform + secrets + connection | 1 day → 10 min |
| Deploy to prod | All teams | Pipeline + approval + rollout | 2 hours → 5 min |

### Golden Path Template
```yaml
# template.yaml
name: new-microservice
parameters:
  - name: service_name
    type: string
  - name: language
    type: enum
    values: [typescript, go, python, rust]
  - name: team
    type: string
steps:
  - action: create-repository
    params: { name: $service_name, visibility: private }
  - action: scaffold-code
    params: { language: $language, template: clean-arch }
  - action: create-pipeline
    params: { ci: github-actions, cd: argo-cd }
  - action: create-monitoring
    params: { dashboard: default, alerts: default }
```

## Developer Experience Metrics

| Metric | Measurement Method | Target |
|--------|-------------------|--------|
| Time to production | From template request to deploy | < 1 hour |
| Platform NPS | Quarterly survey | > 50 |
| Self-service rate | % of actions done without ticket | > 80% |
| Template usage | % new projects from templates | > 90% |
| Documentation satisfaction | Survey after each interaction | > 4.0/5.0 |

## Onboarding Playbook

1. **Day 1**: Platform demo + sandbox access
2. **Day 3**: First golden path guided exercise
3. **Day 5**: Team creates their first service via platform
4. **Week 2**: Advanced features (custom actions, plugins)
5. **Month 1**: Team becomes platform contributor

## Common Barriers

| Barrier | Solution |
|---------|----------|
| Learning curve | Pair programming sessions, office hours |
| Missing features | Feature request + prioritization board |
| Existing workflows | Migration guide, parallel run period |
| Trust | SLA guarantees, sandbox environment |
| Team culture | Executive sponsor, team-level metrics |

## Platform Marketing

| Channel | Activity | Frequency |
|---------|----------|-----------|
| Internal newsletter | Feature updates, success stories | Bi-weekly |
| Office hours | Q&A, pair programming | Weekly |
| Demos | New feature showcases | Monthly |
| Champions program | Power users as advocates | Quarterly |
| Hackathons | Platform-based innovation | Quarterly |

## Adoption Tracking Script
```python
class AdoptionTracker:
    def __init__(self, platform_api):
        self.api = platform_api

    def adoption_rate(self):
        total_teams = self.api.get_team_count()
        using_platform = self.api.get_teams_using_platform()
        return len(using_platform) / total_teams * 100

    def template_usage_rate(self):
        total_projects = self.api.get_recent_projects(days=30)
        from_template = [p for p in total_projects if p.get("from_template")]
        return len(from_template) / len(total_projects) * 100 if total_projects else 0

    def self_service_rate(self):
        total_actions = self.api.get_platform_actions(days=30)
        self_service = [a for a in total_actions if a.get("self_service")]
        return len(self_service) / len(total_actions) * 100 if total_actions else 0
```
