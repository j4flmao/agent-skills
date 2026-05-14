# Routing — 76 skills

## Entry
`skills/core/master-orchestrator/SKILL.md` (no trigger match → route here)

## Phase Order
planning → backend → frontend → mobile → dev-loop → devops → management

## Quick Map
| Phase | Skills |
|-------|--------|
| core | master-orchestrator, project-init |
| planning | create-brief, create-prd, create-adr, create-tech-spec, create-story |
| backend-stack | nestjs, nodejs, elysia, golang, rust, python-fastapi, python-django, spring-boot, dotnet, rails |
| backend-universal | oop-principles, design-patterns, microservices, clean-architecture, api-design, api-response, database-patterns, auth-patterns, event-driven, testing |
| frontend-stack | react, react-nextjs, vue, vue-nuxt, angular, sveltekit |
| frontend-universal | patterns, state-management, accessibility, design-system, performance, testing, microfrontend |
| mobile | ios, android, mobile-deployment |
| dev-loop | code-review, debugging-strategy, refactor-guide, git-workflow, security-auditor, performance-profiler, changelog-generator, readme-writer |
| devops | docker-patterns, cicd-pipeline, kubernetes-patterns, observability, helm-patterns, terraform, ansible, jenkins, longhorn, monitoring |
| management | pm, ba, qa, qc, team-rules, security, pentesting, alerting |

## Trigger Keywords
```
brief/prd/adr/story       → planning/
nestjs/nodejs/elysia/go   → backend/{stack}/
rust/python/spring/dotnet → backend/{stack}/
rails                     → backend/ruby/rails
oop/solid/microservices   → backend/universal/
api-design/api-response   → backend/universal/
database/auth/event-driven→ backend/universal/
react/next/vue/nuxt       → frontend/
angular/sveltekit         → frontend/
state/a11y/design-system  → frontend/universal/
performance/testing       → frontend/universal/
microfrontend             → frontend/universal/
ios/swift                 → mobile/ios
android/kotlin            → mobile/android
mobile-deploy/testflight  → mobile/universal/deployment
review/debug/refactor     → dev-loop/
docker/k8s/terraform      → devops/
pm/ba/qa/qc/security      → management/
```

## Stack Detection
- `package.json`: nestjs/nodejs/elysia/react/vue/sveltekit
- `go.mod`: golang
- `Cargo.toml`: rust
- `Gemfile`: rails
- `requirements.txt/pyproject.toml`: python
- `pom.xml/build.gradle`: spring-boot
- `*.csproj/*.sln`: dotnet
