# Personal Setup Kit

## Purpose
A minimal skill bundle for individual developers. This kit helps you select the right skills for your role and configure your agent for optimal performance.

## Recommended Skill Selection by Role

### Backend Developer
- `python-test-skill` — Python test generation and execution
- `commit-skill` — Conventional commit management
- `code-review-skill` — Automated code review
- `security-audit-skill` — Vulnerability scanning
- `refactoring-skill` — Structural code improvements

### Frontend Developer
- `jest-test-skill` — Jest test generation for JS/TS
- `commit-skill` — Conventional commit management
- `code-review-skill` — Automated code review
- `deploy-skill` — Build and deployment workflows

### Mobile Developer
- `commit-skill` — Conventional commit management
- `code-review-skill` — Automated code review
- `jest-test-skill` — Cross-platform test generation

### Fullstack Developer
- All backend skills
- All frontend skills
- `deploy-skill` — End-to-end deployment
- `deep-research-skill` — Multi-source investigation

### DevOps Engineer
- `deploy-skill` — CI/CD pipeline management
- `security-audit-skill` — Infrastructure security
- `code-review-skill` — Infrastructure as code review
- `deep-research-skill` — Incident investigation

### Product Manager
- `deep-research-skill` — Market and competitive research
- `commit-skill` — Release note generation

## Quick Start by Role

### Backend Dev
`master-orchestrator`, `project-init`, `api-design`, `database-patterns`, `testing`, `auth-patterns`, `caching`, `message-queue`, `docker-patterns`, `git-workflow`, `code-review`, `structured-logging`

### Frontend Dev
`master-orchestrator`, `design-system`, `state-management`, `testing`, `performance`, `accessibility`, `tailwind-css`, `data-fetching`, `form-handling`, `git-workflow`, `code-review`, `pwa`

### Mobile Dev
`master-orchestrator`, `mobile-patterns`, `mobile-testing`, `mobile-performance`, `mobile-security`, `push-notifications`, `offline-first`, `deep-linking`, `crash-reporting`, `deployment`, `git-workflow`

### Fullstack
`master-orchestrator`, `project-init`, `api-design`, `database-patterns`, `testing`, `auth-patterns`, `design-system`, `state-management`, `data-fetching`, `docker-patterns`, `cicd-pipeline`, `code-review`, `git-workflow`, `deployment`

### DevOps
`master-orchestrator`, `docker-patterns`, `cicd-pipeline`, `kubernetes-patterns`, `terraform`, `ansible`, `monitoring`, `observability`, `github-actions`, `gitops`, `vault`, `chaos-engineering`, `finops`, `backup-dr`

### PM
`master-orchestrator`, `create-brief`, `create-prd`, `create-story`, `create-roadmap`, `pm`, `sprint-retro`, `okr-kpi`, `risk-management`

## Bundle Usage Guide

To use `bundle-definitions.json`, load a predefined bundle that matches your role or project stack:

### List Available Bundles
```bash
cat bundles/bundle-definitions.json | jq '.bundles | keys'
```

### Load a Bundle (CLI)
```bash
npx skills add j4flmao/agent-skills --bundle backend-only
npx skills add j4flmao/agent-skills --bundle frontend-only
npx skills add j4flmao/agent-skills --bundle devops-only
```

### Create a Custom Bundle
Edit `bundles/bundle-definitions.json` and add your combination:

```json
{
  "bundles": {
    "my-custom-stack": [
      "master-orchestrator",
      "project-init",
      "api-design",
      "database-patterns",
      "testing",
      "docker-patterns",
      "cicd-pipeline",
      "git-workflow"
    ]
  }
}
```

### Verify Bundle Integrity
```bash
node -e "
const b = require('./bundles/bundle-definitions.json');
const fs = require('fs');
const path = require('path');
let ok = 0, fail = 0;
Object.entries(b.bundles).forEach(([name, skills]) => {
  skills.forEach(skill => {
    const found = fs.existsSync(path.join('skills', skill, 'SKILL.md'));
    if (found) ok++; else { fail++; console.log('MISSING:', skill); }
  });
});
console.log('OK:', ok, 'FAIL:', fail);
"
```

## How to Use Bundles

Edit `bundle-definitions.json` to define your custom bundle:

```json
{
  "bundles": {
    "backend-dev": ["python-test-skill", "commit-skill", "code-review-skill", "security-audit-skill", "refactoring-skill"],
    "frontend-dev": ["jest-test-skill", "commit-skill", "code-review-skill", "deploy-skill"],
    "fullstack": ["python-test-skill", "jest-test-skill", "commit-skill", "code-review-skill", "deploy-skill", "deep-research-skill"],
    "devops": ["deploy-skill", "security-audit-skill", "code-review-skill", "deep-research-skill"],
    "mobile-dev": ["commit-skill", "code-review-skill", "jest-test-skill"],
    "pm": ["deep-research-skill", "commit-skill"]
  }
}
```

Load a bundle by running the bundle loader:
```bash
# CLI
./scripts/load-bundle.sh backend-dev

# PowerShell
.\scripts\load-bundle.ps1 backend-dev
```

## Agent Configuration Quick-Start

### Claude Code
Add to `.clinerules`:
```yaml
skills:
  include:
    - skills/*/SKILL.md
```

### OpenCode
Add to `opencode.json`:
```json
{
  "skills": {
    "include": ["skills/*/SKILL.md"]
  }
}
```

### Cursor
Add to `.cursorrules`:
```yaml
skills:
  - skills/*/SKILL.md
```

### Windsurf
Add to `.windsurfrules`:
```yaml
skills:
  - skills/*/SKILL.md
```
