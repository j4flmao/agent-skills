# Codex CLI skills map

Reference for loading skills through Codex CLI. All skills are in `skills/` directory.

## Usage

Codex loads skills via `/skill` slash command or by referencing the SKILL.md path. Skills follow the format: `skills/<phase>/<name>/SKILL.md`.

## Skills by phase

### core (2)

| Name | Path | Trigger |
|------|------|---------|
| master-orchestrator | skills/core/master-orchestrator/SKILL.md | start, help, initialize, where do I start |
| project-init | skills/core/project-init/SKILL.md | new project, scaffold, initialize repo |

### planning (5)

| Name | Path | Trigger |
|------|------|---------|
| create-brief | skills/planning/create-brief/SKILL.md | brief, product definition |
| create-prd | skills/planning/create-prd/SKILL.md | prd, requirements, epics |
| create-adr | skills/planning/create-adr/SKILL.md | adr, architecture decision |
| create-tech-spec | skills/planning/create-tech-spec/SKILL.md | tech spec, specification |
| create-story | skills/planning/create-story/SKILL.md | user story, story splitting |

### backend (20)

Stack skills: nestjs, nodejs, elysia, golang, rust, python-fastapi, python-django, spring-boot, dotnet, rails.

Universal skills: oop-principles, design-patterns, microservices, clean-architecture, api-design, api-response, database-patterns, auth-patterns, event-driven, testing.

### frontend (13)

Stack skills: react, react-nextjs, vue, vue-nuxt, angular, sveltekit.

Universal skills: patterns, state-management, accessibility, design-system, performance, testing, microfrontend.

### mobile (3)

| Name | Path | Trigger |
|------|------|---------|
| ios | skills/mobile/ios/SKILL.md | ios, swift, swiftui, uikit |
| android | skills/mobile/android/SKILL.md | android, kotlin, compose |
| mobile-deployment | skills/mobile/universal/deployment/SKILL.md | deploy, testflight, app store |

### dev-loop (8)

code-review, debugging-strategy, refactor-guide, git-workflow, security-auditor, performance-profiler, changelog-generator, readme-writer.

### devops (10)

docker-patterns, cicd-pipeline, kubernetes-patterns, observability, helm-patterns, terraform, ansible, jenkins, longhorn, monitoring.

### management (8)

pm, ba, qa, qc, team-rules, security, pentesting, alerting.

## Loading a skill

```
/skill <name>          # e.g., /skill api-response
```

Codex reads the SKILL.md, loads references from `references/`, and applies the skill rules.
