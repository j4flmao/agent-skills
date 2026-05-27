# Onboarding Templates

## Day 1: Environment Setup Template

### Checklist Template

```markdown
# Day 1 — Environment Setup

## Prerequisites
- [ ] OS: {os_type} — {os_version}
- [ ] Access to: {vpn_url}
- [ ] GitHub account added to: {org_name}
- [ ] 1Password/LastPass access granted
- [ ] Slack/Discord channels joined: #{channels}

## Development Environment
- [ ] Clone monorepo: `git clone {repo_url}`
- [ ] Install runtime: {runtime} v{version}
- [ ] Install package manager: {package_manager}
- [ ] Run `make setup` (installs all dependencies)
- [ ] Run `make test` — all tests pass
- [ ] Configure pre-commit hooks: `pre-commit install`
- [ ] Install IDE extensions (see .vscode/extensions.json)

## Service Access
- [ ] Local database: `docker compose up -d db`
- [ ] Run migrations: `make migrate`
- [ ] Seed development data: `make seed`
- [ ] Verify API works: `curl http://localhost:3000/health`

## First Task
- [ ] Pick a "good first issue" from the backlog
- [ ] Assign yourself
- [ ] Set up branch: `git checkout -b {username}/{issue-description}`
- [ ] Submit your first pull request
```

### Automated Setup Script

```bash
#!/bin/bash
# setup-new-hire.sh — Run as new hire

set -euo pipefail

ORG_NAME="${1:?Usage: $0 <org-name>}"
GITHUB_USER="${2:?Usage: $0 <org-name> <github-user>}"

echo "=== Setting up development environment ==="

# Clone repositories
REPOS=("backend" "frontend" "infra" "docs")
for repo in "${REPOS[@]}"; do
  if [ ! -d "$repo" ]; then
    gh repo clone "$ORG_NAME/$repo"
  fi
done

# Install system dependencies
if [[ "$OSTYPE" == "darwin"* ]]; then
  brew bundle --file=Brewfile
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
  sudo apt-get update
  sudo apt-get install -y $(cat apt-packages.txt)
fi

# Install project dependencies
cd backend && npm install && cd ..
cd frontend && npm install && cd ..

# Verify setup
echo "=== Verification ==="
node --version
npm --version
docker --version

echo "Running tests..."
cd backend && npm test && cd ..
cd frontend && npm test && cd ..

echo "=== Setup complete! ==="
echo "Next: Create your first PR"
```

## Week 1: Architecture Onboarding Template

### Architecture Tour Script

```typescript
interface ArchitectureModule {
  name: string;
  duration: string;
  resources: string[];
  keyConcepts: string[];
  exercise: string;
}

const WEEK_ONE_ARCHITECTURE: ArchitectureModule[] = [
  {
    name: 'System Overview',
    duration: '2 hours',
    resources: [
      'docs/architecture/system-overview.md',
      'docs/architecture/data-flow.md',
    ],
    keyConcepts: [
      'Service boundaries and responsibilities',
      'Event-driven communication between services',
      'Data consistency model (eventual vs strong)',
    ],
    exercise: 'Draw a sequence diagram for user signup flow',
  },
  {
    name: 'Backend Service Deep Dive',
    duration: '4 hours',
    resources: [
      'docs/architecture/api-gateway.md',
      'docs/architecture/service-patterns.md',
      'docs/api/openapi.yaml',
    ],
    keyConcepts: [
      'Request lifecycle through the API gateway',
      'Database-per-service pattern with CQRS',
      'Idempotency guarantees on write endpoints',
    ],
    exercise: 'Trace a request from HTTP to database and back',
  },
  {
    name: 'Data Model Review',
    duration: '2 hours',
    resources: [
      'docs/architecture/data-model.md',
      'prisma/schema.prisma',
      'dbml/schema.dbml',
    ],
    keyConcepts: [
      'Core entities and their relationships',
      'Soft-delete vs hard-delete patterns',
      'Migration strategy and rollback process',
    ],
    exercise: 'Write a migration for a new entity',
  },
  {
    name: 'Deployment Pipeline',
    duration: '2 hours',
    resources: [
      'docs/devops/cicd-pipeline.md',
      '.github/workflows/deploy.yml',
      'Dockerfile',
    ],
    keyConcepts: [
      'CI pipeline: lint → test → build → security scan',
      'CD pipeline: staging → canary → production',
      'Feature flags and gradual rollout',
    ],
    exercise: 'Deploy a one-line change to staging',
  },
];
```

## Buddy System Assignment Template

```markdown
# Buddy Assignment

## Mentor: {mentor_name} ({mentor_team})
## Mentee: {new_hire_name} ({new_hire_role})

### Week 1 Schedule

| Day | Time | Topic |
|-----|------|-------|
| Day 1 | 10:00-11:00 | Environment setup walkthrough |
| Day 1 | 14:00-15:00 | Code review: first PR |
| Day 2 | 10:00-10:30 | Standup intro |
| Day 3 | 11:00-12:00 | Architecture walkthrough |
| Day 4 | 15:00-15:30 | Retro debrief |

### Buddy Responsibilities
1. Daily 15-min check-in for first 2 weeks
2. Review first 3 PRs thoroughly with inline comments
3. Introduce to team members cross-functionally
4. Point out undocumented processes for the mentee to fix as PRs
5. Escalate blockers the mentee cannot resolve in 1 hour

### Success Criteria
- [ ] First PR merged by end of day 3
- [ ] Can run full stack locally without assistance
- [ ] Knows where to find each type of documentation
- [ ] Has submitted at least one documentation improvement PR
```

## Team Practices Onboarding

### Code Review Culture Template

```markdown
## Code Review Expectations

### For Authors
- PRs under 400 lines (smaller is better)
- Include screenshots for UI changes
- Link to related issue/ticket
- Self-review before assigning reviewers
- Respond to comments within 4 hours

### For Reviewers
- Review within 1 business day
- Focus on correctness > style (style = formatter)
- Ask questions, don't demand changes
- Approve when you'd be happy to deploy
- Block only for correctness or security issues
```

## Key Points

- Onboarding templates reduce cognitive load for new hires
- Buddy assignments should be structured with clear weekly schedules
- Automated setup scripts eliminate environment inconsistencies
- Architecture tours should include hands-on exercises
- Documentation gaps found during onboarding become the new hire's first PRs
- Success criteria must be measurable and time-bound
- Code review culture should be documented explicitly
- Templates should be living documents updated after each onboarding cycle
