# Enterprise Guide

## Multi-Team Deployment

For organizations with multiple teams, each team can maintain a fork or a subdirectory:

```bash
# Option A: Monorepo with team directories
agent-skills/
  skills/           # Standard skills (shared)
  teams/            # Team-specific overrides
    team-alpha/skills/
    team-beta/skills/
  bundles/
    team-alpha.json
    team-beta.json

# Option B: Git submodules per team
git submodule add https://github.com/j4flmao/agent-skills skills
git submodule add https://github.com/team-alpha/skills-override team-skills
```

## Custom Skill Isolation

To add proprietary skills without modifying the upstream repo:

1. Create a separate Git repository for proprietary skills
2. Maintain a custom `bundle-definitions.json` that references both standard and proprietary skills
3. Set up a CI job that merges both repos into a monorepo at clone time

## CI/CD Integration

Integrate this skill suite into your CI/CD pipeline for automated code generation:

```yaml
# .github/workflows/skill-validation.yml
jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Validate SKILL.md structure
        run: |
          for f in $(find skills -name SKILL.md); do
            head -1 $f | grep -q "^---" || echo "FAIL: $f missing frontmatter"
          done
      - name: Check reference links
        run: |
          for f in $(find skills -name SKILL.md); do
            dir=$(dirname $f)
            grep -oP 'references/[\w-]+\.md' $f | while IFS= read -r ref; do
              [ -f "$dir/$ref" ] || echo "BROKEN: $f -> $ref"
            done
          done
```

## Compliance Considerations

| Regulation | Impact |
|------------|--------|
| GDPR | Review mobile skills for data collection patterns (crash reporting, analytics) |
| SOC 2 | Ensure security skills follow access control and audit trail requirements |
| HIPAA | Backend auth-patterns must enforce PHI protection |
| PCI-DSS | Payment-related skills (in-app-purchase) must follow cardholder data rules |

## Scaling Across Teams

- **100+ skills**: Use bundle definitions to scope per team — no team loads all 105 skills
- **Multiple agents**: Each agent config points to its own bundle, reducing context size
- **Versioning**: Tag releases with semver; teams pin to specific versions via git tag
- **Deprecation**: Mark deprecated skills in their frontmatter; provide migration path in CHANGELOG

## Related

- `docs/team-guide.md` — Adding and maintaining skills
- `docs/quickstart.md` — Getting started
